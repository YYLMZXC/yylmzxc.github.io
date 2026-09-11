/**
 * 生存战争网 - 首页「社区导航」数据层
 *
 * 两种浏览模式，默认 web 模式（页面不依赖任何后端也能照常显示）：
 *   web 模式 'web' —— 只读。数据固定来自静态数据文件 scweb_res/nav/nav-default.js，
 *                     该文件由「转换 → 同步到静态文件」从数据库导出。
 *   db  模式 'db'  —— 可写。数据来自 MySQL，导入与转换都会写回数据库；
 *                     连不上时自动降级为只读，并显示上次从数据库取回的镜像。
 *
 * 存储键名集中在本模块、HTTP 细节交给 NavApi、静态文件细节也收在这里（就一个小函数），
 * 状态变化通过 subscribe/emit 广播，本模块不操作 DOM。
 * 挂载到全局 window.NavStore
 */
class NavStore {
    /**
     * @param {Object} [api] - 接口封装，默认取 window.NavApi
     */
    constructor(api) {
        this.api = api || window.NavApi;

        // 全部存储键名的唯一出处
        this._KEYS = {
            mode: 'site_nav_mode',          // 用户选择的浏览模式
            dbCache: 'site_nav_db_cache',   // 数据库模式：断网镜像
            sync: 'site_nav_static_sync'    // 与静态文件同步的最近时间
        };

        this._listeners = [];
        this._channel = Promise.resolve();  // 写回数据库串行化，避免并发请求顺序错乱

        this.state = {
            data: NavStore.staticFile(),    // 先用静态数据把页面填上，避免等接口时白屏
            mode: 'web',                    // 实际数据来源：'web'（静态文件）| 'db'（数据库）
            prefer: 'web',                  // 用户选择的模式，默认 web 模式
            online: true,                   // 后端是否可用（仅数据库模式有意义）
            lastError: null                 // 最近一次连不上的原因，界面据此说明「为什么连不上」
        };
    }

    /* ================================================================
     *  静态数据文件的读写（唯一出口）
     * ================================================================ */

    /** 页面当前持有的静态数据 */
    static staticFile() {
        const d = window.SITE_NAV_DEFAULT;
        return (d && Array.isArray(d.groups))
            ? NavStore.clone(d)
            : { version: 1, title: '社区导航', groups: [] };
    }

    /** 用新数据覆盖内存中的静态数据（转换后调用，使 web 模式立刻与文件一致） */
    static setStaticFile(data) {
        if (data && Array.isArray(data.groups)) window.SITE_NAV_DEFAULT = data;
        return NavStore.staticFile();
    }

    static clone(value) { return JSON.parse(JSON.stringify(value)); }

    // 重新拉取静态数据文件（带缓存穿透）；无论成败都 resolve，
    // 由调用方决定如何回退，避免把「取文件失败」扩散成异常。
    static reloadStaticFile() {
        return new Promise(resolve => {
            const s = document.createElement('script');
            s.src = NavStore.STATIC_SRC + '?t=' + Date.now();
            s.onload = () => { s.remove(); resolve(NavStore.staticFile()); };
            s.onerror = () => { s.remove(); resolve(NavStore.staticFile()); };
            document.head.appendChild(s);
        });
    }

    /* ================================================================
     *  事件广播
     * ================================================================ */

    /**
     * 订阅状态变化
     * @param {Function} fn - 收到 { type } 事件
     * @returns {Function} 取消订阅
     */
    subscribe(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter(f => f !== fn); };
    }

    emit(event) {
        this._listeners.slice().forEach(fn => {
            try { fn(event); } catch (e) { /* 单个订阅者异常不影响其它订阅者 */ }
        });
    }

    /* ================================================================
     *  本地存储（隐私模式 / 配额耗尽时安全降级）
     * ================================================================ */

    _read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    _write(key, value) {
        try { localStorage.setItem(key, String(value)); return true; } catch (e) { return false; }
    }

    _readJSON(key, fallback) {
        const raw = this._read(key);
        if (raw == null) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    /* ================================================================
     *  状态读写
     * ================================================================ */

    /** 整份数据替换（载入 / 切换模式 / 导入 / 转换后都用它） */
    setData(data) {
        this.state.data = data;
        this.emit({ type: 'data' });
        return data;
    }

    setOnline(next) {
        next = !!next;
        if (this.state.online === next) return;
        this.state.online = next;
        this.emit({ type: 'mode' });
    }

    setLastError(e) {
        this.state.lastError = e || null;
        this.emit({ type: 'mode' });
    }

    /** 只有连上数据库才允许改数据，避免出现「改了却存不下来」的错觉 */
    canEdit() { return this.state.mode === 'db' && this.state.online; }

    groups() { return (this.state.data && this.state.data.groups) || []; }

    /** 当前数据的规模，提示语里用来交代「导出了多少」 */
    stats() {
        let links = 0;
        this.groups().forEach(g => { links += (g.links || []).length; });
        return { groups: this.groups().length, links: links };
    }

    static modeText(mode) {
        return mode === 'db' ? '数据库模式' : 'web 模式（只读）';
    }

    /** 最近一次同步到静态文件的时间（0 表示从未同步） */
    syncState() {
        const s = this._readJSON(this._KEYS.sync, null) || {};
        return { at: Number(s.at) || 0 };
    }

    /* ================================================================
     *  连不上时怎么说清楚
     *  「前端连不上后端」和「后端连不上数据库」是两回事，后者还要再分出
     *  「MySQL 没启动」「账号密码不对」「没有授权」…… 结论由后端给出
     *  （随 /api/health 与各接口报错带回来），这里只挑一句能照着做的提示。
     * ================================================================ */

    describeError(e) {
        if (!e || e.code === NavStore.NOT_API) {
            return {
                kind: 'offline',
                label: '未连接后端服务',
                reason: '后端没有回应',
                hint: '请先运行「启动主页(带数据库).bat」把后端跑起来；若通过域名访问，还要确认已把 /api/ 转发到 127.0.0.1:8000。'
            };
        }
        return {
            kind: e.kind || 'unknown',
            label: e.label || '连接数据库失败',
            reason: e.message || e.label || '未知错误',
            hint: e.hint || ''
        };
    }

    /* ================================================================
     *  加载与模式切换
     * ================================================================ */

    /** 用户选择的模式：只有显式选过数据库才用数据库，其余一律 web 模式 */
    readPrefer() {
        return this._read(this._KEYS.mode) === 'db' ? 'db' : 'web';
    }

    /**
     * 启动加载：按用户选择的模式取数据
     * 无论成功失败都 resolve，界面只管渲染 state.data
     */
    load() {
        this.state.prefer = this.readPrefer();

        if (this.state.prefer === 'web') {          // web 模式：不访问后端
            this.state.mode = 'web';
            this.state.online = true;
            this.state.lastError = null;
            this.state.data = NavStore.staticFile();
            this.emit({ type: 'data' });
            return Promise.resolve(this.state.data);
        }

        return this._fetchDb().then(data => {       // 数据库模式
            this.state.mode = 'db';
            this.state.online = true;
            this.state.lastError = null;
            this.state.data = data;
            this._write(this._KEYS.dbCache, JSON.stringify(data));
            this.emit({ type: 'data' });
            return data;
        }).catch(e => {
            // 连不上数据库：降级为只读的 web 模式（prefer 保持不变，下次启动仍先试数据库），
            // 数据显示上次从数据库取回的镜像，避免联网后才发现看的是旧内容。
            this.state.mode = 'web';
            this.state.online = false;
            this.setLastError(this.describeError(e));
            const cached = this._readJSON(this._KEYS.dbCache, null);
            this.state.data = (cached && Array.isArray(cached.groups)) ? cached : NavStore.staticFile();
            this.emit({ type: 'data' });
            return this.state.data;
        });
    }

    /**
     * 切换浏览模式
     * @param {'web'|'db'} target
     * @returns {Promise<Object>} 切换后页面持有的数据
     */
    switchMode(target) {
        if (target === 'web') {
            this.state.mode = 'web';
            this.state.prefer = 'web';
            this.state.online = true;
            this.state.lastError = null;
            this._write(this._KEYS.mode, 'web');
            this.state.data = NavStore.staticFile();
            this.emit({ type: 'mode' });
            this.emit({ type: 'data' });
            return Promise.resolve(this.state.data);
        }

        return this._fetchDb().then(data => {
            this.state.mode = 'db';
            this.state.prefer = 'db';
            this.state.online = true;
            this.state.lastError = null;
            this._write(this._KEYS.mode, 'db');
            this._write(this._KEYS.dbCache, JSON.stringify(data));
            this.state.data = data;
            this.emit({ type: 'mode' });
            this.emit({ type: 'data' });
            return data;
        }).catch(e => {
            this.state.online = false;
            this.setLastError(this.describeError(e));
            throw new Error(this.state.lastError.reason);
        });
    }

    // 取回数据库数据；数据库为空（首次启动尚未填过）时退回静态数据，只读展示
    _fetchDb() {
        return this.api.getNav().then(data => data || NavStore.staticFile());
    }

    /* ================================================================
     *  保存（数据库模式 → MySQL）
     * ================================================================ */

    /**
     * 把整份数据写回数据库
     * @returns {Promise<boolean>} 本次是否真正入库
     */
    save() {
        if (this.state.mode !== 'db') return Promise.resolve(false);

        this._write(this._KEYS.dbCache, JSON.stringify(this.state.data));
        this._channel = this._channel.then(() => this.api.putNav(this.state.data).then(() => {
            this.setOnline(true);
            this.state.lastError = null;
            return true;
        }).catch(e => {
            this.setOnline(false);
            this.setLastError(this.describeError(e));
            this.emit({ type: 'error', error: this.state.lastError });
            return false;
        }));

        return this._channel;
    }

    /* ================================================================
     *  导入 / 导出 / 转换
     * ================================================================ */

    /**
     * 校验并补齐导入数据的缺失字段，格式不正确时抛出异常
     * @param {Object} parsed - JSON.parse 的结果
     */
    normalize(parsed) {
        if (!parsed || !Array.isArray(parsed.groups)) {
            throw new Error('格式不正确：缺少 groups 数组');
        }
        const data = NavStore.clone(parsed);
        data.version = data.version || 1;
        data.groups.forEach((g, gi) => {
            g.id = g.id || ('g' + (gi + 1));
            if (!g.name && !g.key) g.name = '未命名分组';
            g.links = (Array.isArray(g.links) ? g.links : []).map((l, li) => {
                l.id = l.id || (g.id + '-l' + (li + 1));
                l.url = String(l.url || '').trim();
                return l;
            }).filter(l => l.url);
        });
        return data;
    }

    /**
     * 导入一份数据：数据库模式下顺带写回数据库，web 模式只更新页面
     * @param {Object} parsed - 已解析的 JSON 对象
     * @returns {Promise<{saved:boolean,data:Object}>}
     */
    importData(parsed) {
        const data = this.normalize(parsed);
        this.state.data = data;
        this.emit({ type: 'data' });

        if (this.state.mode !== 'db') return Promise.resolve({ saved: false, data: data });
        return this.save().then(saved => ({ saved: saved, data: data }));
    }

    /** 导出当前页面的数据为 JSON 文件 */
    exportData() {
        const data = this.state.data || {};
        const name = String(data.title || '社区导航').replace(/[\\/:*?"<>|]+/g, '_');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = name + '-导航备份.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);

        return data;
    }

    /**
     * 转换：数据库 → 静态文件（web 模式的数据源）
     * 先等写回队列排空，避免刚导入完就导出、文件里少了最后一笔修改。
     * @returns {Promise<Object>} 后端回包（含 file / groups / links / data）
     */
    convertToStatic() {
        return this._channel.then(() => this.api.exportStatic()).then(r => {
            this.setOnline(true);
            this.state.lastError = null;
            // 顺手刷新内存里的静态数据：web 模式看到的必须就是刚写入文件的那份
            if (r && r.data) NavStore.setStaticFile(r.data);
            this._write(this._KEYS.sync, JSON.stringify({ at: Date.now() }));
            this.emit({ type: 'static', ok: true, result: r });
            return r;
        });
    }
}

NavStore.STATIC_SRC = 'scweb_res/nav/nav-default.js';
NavStore.NOT_API = 'NOT_API';

window.NavStore = NavStore;
