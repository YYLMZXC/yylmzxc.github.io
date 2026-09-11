/**
 * 生存战争网 - 站点导航数据层（首页 / 关于页共用一份数据文档）
 *
 * 数据分页：每个分组带 page 字段标明属于哪个页面（见 NavStore.PAGES），
 * 一个页面只渲染自己那一份；实例在构造时绑定「本页面身份」，
 * 编辑器可以跨页编辑（按 page 取分组，见 groups(page)）。
 *
 * 两种浏览模式，默认 web 模式（页面不依赖任何后端也能照常显示）：
 *   web 模式 'web' —— 只读。数据固定来自静态数据文件 scweb_res/nav/nav-default.js，
 *                     该文件由「转换 → 同步到静态文件」从数据库导出。
 *   db  模式 'db'  —— 可写。数据来自 MySQL，导入与转换都会写回数据库；
 *                     连不上时自动降级为只读，并显示上次从数据库取回的镜像。
 *
 * 首次访问用哪个模式：页面上的「切换模式」选过就按本机选的，没选过则用站点设置
 * 里的「导航数据来源」（个人覆盖 > 全局值 > site-config.js，见 settings-store.js）。
 *
 * 存储键名集中在本模块、HTTP 细节交给 NavApi、静态文件细节也收在这里（就一个小函数），
 * 状态变化通过 subscribe/emit 广播，本模块不操作 DOM。
 * 挂载到全局 window.NavStore
 */
class NavStore {
    /**
     * @param {Object} [api] - 接口封装，默认取 window.NavApi
     * @param {string} [page] - 本页面身份：'index'（首页）| 'about'（关于页）
     */
    constructor(api, page) {
        this.api = api || window.NavApi;
        this.page = NavStore.normalizePage(page);

        // 全部存储键名的唯一出处
        this._KEYS = {
            mode: 'site_nav_mode',          // 用户选择的浏览模式（旧键：现统一记在 settings-store 的个人覆盖里，仅在它缺席时用）
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
            : { version: 2, title: '站点导航', groups: [] };
    }

    /** 用新数据覆盖内存中的静态数据（转换后调用，使 web 模式立刻与文件一致） */
    static setStaticFile(data) {
        if (data && Array.isArray(data.groups)) window.SITE_NAV_DEFAULT = data;
        return NavStore.staticFile();
    }

    static clone(value) { return JSON.parse(JSON.stringify(value)); }

    /** 页面身份归一：没写 / 写错的分组一律算首页（v1 老数据没有 page 字段） */
    static normalizePage(page) {
        const id = String(page || '');
        return NavStore.PAGES.filter(p => p.id === id).length ? id : 'index';
    }

    /** 页面名的中文说法，提示语里用 */
    static pageText(page) {
        const p = NavStore.PAGES.filter(x => x.id === NavStore.normalizePage(page))[0];
        return p ? p.name : '首页';
    }

    /**
     * 取某个页面要用的词条表：区块标题首页在 translations.sections、关于页在
     * translations.about，链接词条两边都在 translations.links
     * @returns {{sections:Object, links:Object}} 可直接喂给 groupTitle / linkTitle
     */
    static translationsFor(page, translations) {
        const t = translations || {};
        return {
            sections: (NavStore.normalizePage(page) === 'about' ? t.about : t.sections) || {},
            links: t.links || {}
        };
    }

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

    /** 整份数据里的全部分组（两个页面混在一起；导出、按 id 查找用） */
    allGroups() { return (this.state.data && this.state.data.groups) || []; }

    /**
     * 某个页面的分组，保持数据里的先后顺序
     * @param {string} [page] - 不传则取本页面身份（this.page）
     */
    groups(page) {
        const want = NavStore.normalizePage(page || this.page);
        return this.allGroups().filter(g => NavStore.normalizePage(g.page) === want);
    }

    /** 某个分组属于哪个页面 */
    pageOf(gid) {
        const g = this.findGroup(gid);
        return NavStore.normalizePage(g && g.page);
    }

    /** 某个页面（不传则本页面）的规模，提示语里用来交代「导出了多少」 */
    stats(page) {
        return NavStore.count(this.groups(page));
    }

    /** 两个页面合计的规模 */
    statsAll() {
        return NavStore.count(this.allGroups());
    }

    static count(groups) {
        const list = groups || [];
        let links = 0;
        list.forEach(g => { links += (g.links || []).length; });
        return { groups: list.length, links: links };
    }

    /** 按 id 取分组（id 跨页面唯一），取不到返回 null */
    findGroup(gid) {
        return this.allGroups().filter(g => g.id === gid)[0] || null;
    }

    /** 按 id 取分组下的链接，取不到返回 null */
    findLink(gid, lid) {
        const g = this.findGroup(gid);
        if (!g) return null;
        return (g.links || []).filter(l => l.id === lid)[0] || null;
    }

    static modeText(mode) {
        return mode === 'db' ? '数据库模式' : 'web 模式（只读）';
    }

    /* ================================================================
     *  格式化工具（编辑器与渲染共用同一套，避免两处判定不一致）
     * ================================================================ */

    /** 生成一行内不会重复的 id，如 'g' → 'glm8x3ka4f2' */
    static uid(prefix) {
        return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    /** 补全协议头，让用户只填域名也能存 */
    static normalizeUrl(u) {
        u = String(u || '').trim();
        if (!u) return '';
        return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u) ? u : 'https://' + u;
    }

    /** 取主机名（去掉 www.），链接名称留空时用它兜底 */
    static hostOf(url) {
        try { return new URL(url).hostname.replace(/^www\./, ''); }
        catch (e) { return ''; }
    }

    /**
     * 分组标题：优先用多语言词条，取不到时回退到数据里的原文
     * @param {Object} group - { key, name }
     * @param {Object} translations - 当前语言的词条表
     */
    static groupTitle(group, translations) {
        const fromI18n = (group.key && translations && translations.sections) ? translations.sections[group.key] : '';
        return fromI18n || group.name || group.key || '';
    }

    /**
     * 链接标题：优先用多语言词条，取不到时回退到数据里的原文
     * （所以纯文本标题不需要额外准备词条也能正常显示）
     * @param {Object} link - { key, title, url }
     * @param {Object} translations - 当前语言的词条表
     */
    static linkTitle(link, translations) {
        const fromI18n = (link.key && translations && translations.links) ? translations.links[link.key] : '';
        return fromI18n || link.title || link.url || '';
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
        // 未登录：后端是通的，只是这道写操作需要身份，别跟「连不上」混为一谈
        if (e.code === NavStore.UNAUTHORIZED || e.status === 401) {
            return {
                kind: 'auth',
                label: '未登录，无法保存',
                reason: e.message || '请先登录',
                hint: '在设置下拉的「账号」里登录后再改。'
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

    /**
     * 启动时用哪种模式：站点设置里的「导航数据来源」说了算
     * （本机在「导航数据」里切过模式 = 个人覆盖，优先于全局值与 site-config.js）
     */
    readPrefer() {
        const S = window.SettingsStore;
        if (S && typeof S.getNavMode === 'function') {
            const m = S.getNavMode();
            if (m === 'db' || m === 'web') return m;
        }
        // 没加载设置数据层时的回退：老键里显式选过数据库才用数据库
        return this._read(this._KEYS.mode) === 'db' ? 'db' : 'web';
    }

    /**
     * 记下用户选的模式：统一记进站点设置的个人覆盖，设置面板里那一项读的是同一份值，
     * 免得「页面按本机选的走、面板却显示站点默认」。
     */
    _writePrefer(mode) {
        const S = window.SettingsStore;
        if (S && typeof S.setNavMode === 'function') {
            S.setNavMode(mode);
            return;
        }
        this._write(this._KEYS.mode, mode);
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
            this._writePrefer('web');
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
            this._writePrefer('db');
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
            const err = this.describeError(e);
            if (err.kind !== 'auth') this.setOnline(false);   // 未登录是权限问题，后端本身是通的
            this.setLastError(err);
            this.emit({ type: 'error', error: err });
            return false;
        }));

        return this._channel;
    }

    /* ================================================================
     *  字段级编辑（分组 / 链接的增删改与排序）
     *  编辑器上的每一次改动都走这里：改完立刻广播并写回数据库，
     *  与「整份导入」共用同一条写回队列，不会出现两份相互覆盖的写入。
     *  web 模式是只读的，调用方动手前先看 canEdit()。
     * ================================================================ */

    /** 改完数据的统一收尾：先让界面重画，再把整份数据写回数据库 */
    _commit() {
        this.emit({ type: 'data' });
        return this.save();
    }

    /**
     * 把数组里第 i 项朝 dir 方向挪一格
     * @param {Array} arr - 直接操作的原数组（来自 state，改的就是数据本身）
     * @param {number} i - 当前下标
     * @param {number} dir -  -1 上移 / 1 下移
     * @returns {boolean} 是否真的移动了（已经在头尾时返回 false，界面不必重画）
     */
    _moveIn(arr, i, dir) {
        const j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return false;

        const moved = arr.splice(i, 1)[0];
        arr.splice(j, 0, moved);
        this._commit();
        return true;
    }

    /* ---------------- 分组 ---------------- */

    /**
     * 新增分组（追加到末尾；同页面的分组相对顺序不变，跨页面互不干扰）
     * @param {Object} [attrs] - { name, key }
     * @param {string} [page] - 归属页面，不传则本页面身份
     * @returns {Object} 新分组
     */
    addGroup(attrs, page) {
        const g = Object.assign({
            id: NavStore.uid('g'),
            page: NavStore.normalizePage(page || this.page),
            name: '',
            links: []
        }, attrs || {});
        g.page = NavStore.normalizePage(g.page);
        this.allGroups().push(g);
        this._commit();
        return g;
    }

    /**
     * 修改分组字段，只覆盖传进来的那几个
     * @returns {Object|null} 改完的分组
     */
    updateGroup(gid, patch) {
        const g = this.findGroup(gid);
        if (!g) return null;

        Object.assign(g, patch);
        this._commit();
        return g;
    }

    /** 删除分组，连同组内链接一起删掉 */
    removeGroup(gid) {
        const all = this.allGroups();
        const rest = all.filter(g => g.id !== gid);
        if (rest.length === all.length) return false;

        this.state.data.groups = rest;
        this._commit();
        return true;
    }

    /**
     * 分组排序：dir 为 -1 上移、1 下移，只在所属页面内挪动
     * （两个页面的分组混在同一个数组里，先按页面算出顺序，再换算成数组里的真实位置）
     */
    moveGroup(gid, dir) {
        const list = this.groups(this.pageOf(gid));
        const i = list.map(g => g.id).indexOf(gid);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return false;

        const all = this.allGroups();
        const moved = all.splice(all.indexOf(list[i]), 1)[0];
        const anchor = all.indexOf(list[j]);
        all.splice(dir < 0 ? anchor : anchor + 1, 0, moved);
        this._commit();
        return true;
    }

    /* ---------------- 链接 ---------------- */

    /**
     * 往分组末尾添加一条链接
     * @param {string} gid
     * @param {Object} [attrs] - { title, url, key, external }
     * @returns {Object|null} 新链接；分组不存在时返回 null
     */
    addLink(gid, attrs) {
        const g = this.findGroup(gid);
        if (!g) return null;

        const l = Object.assign({ id: NavStore.uid('l'), title: '', url: '', external: true }, attrs || {});
        g.links = g.links || [];
        g.links.push(l);
        this._commit();
        return l;
    }

    /**
     * 修改链接字段，只覆盖传进来的那几个
     * @returns {Object|null} 改完的链接
     */
    updateLink(gid, lid, patch) {
        const l = this.findLink(gid, lid);
        if (!l) return null;

        Object.assign(l, patch);
        this._commit();
        return l;
    }

    /** 从分组里删掉一条链接 */
    removeLink(gid, lid) {
        const g = this.findGroup(gid);
        if (!g) return false;

        const rest = (g.links || []).filter(l => l.id !== lid);
        if (rest.length === (g.links || []).length) return false;

        g.links = rest;
        this._commit();
        return true;
    }

    /** 链接排序：dir 为 -1 上移、1 下移 */
    moveLink(gid, lid, dir) {
        const g = this.findGroup(gid);
        if (!g) return false;
        return this._moveIn(g.links || [], (g.links || []).map(l => l.id).indexOf(lid), dir);
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
        data.version = 2;   // 当前格式：分组带 page 字段（v1 老数据导进来按首页补齐）
        data.groups.forEach((g, gi) => {
            g.id = g.id || ('g' + (gi + 1));
            g.page = NavStore.normalizePage(g.page);
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

    /** 导出整份数据（首页 + 关于页）为 JSON 文件，用于备份 / 迁移 */
    exportData() {
        const data = this.state.data || {};
        const name = String(data.title || '站点导航').replace(/[\\/:*?"<>|]+/g, '_');
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
NavStore.UNAUTHORIZED = 'UNAUTHORIZED';

// 数据里允许出现的页面身份：编辑器按这个顺序出页签，数据里的 page 写别的都归到首页
NavStore.PAGES = [
    { id: 'index', name: '首页' },
    { id: 'about', name: '关于页' }
];

window.NavStore = NavStore;
