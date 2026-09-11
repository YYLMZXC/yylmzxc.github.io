/**
 * 生存战争网 - 站点全局设置数据层
 *
 * 五项站点设置：启用 BGM / 自动播放 / 看板娘 / 默认主题 / 导航数据来源。
 *
 * 两种模式（用户在本机的选择，存在 localStorage）：
 *   个人模式 'personal'（默认）—— 改动只写本机，不写数据库；
 *   全局模式 'global'          —— 改动写入数据库 site_settings，登录后可改，对所有访客生效。
 *
 * 取值优先级（页面实际生效的值）：
 *   个人覆盖（本机） > 全局值（数据库 / 离线缓存） > site-config.js 静态默认
 *   —— 所以即使管理员改了全局值，访客自己在本机设过的仍然优先。
 *
 * 连不上后端时用上次读回的全局值兜底（离线缓存），BGM / 看板娘 / 主题照常可用。
 *
 * BGM、看板娘、主题在页面初始化时同步读取，因此这里同时提供一套**纯本地**的
 * 静态解析接口（SettingsStore.getBgmEnabled 等），它们不发任何请求；
 * 需要联网的只有实例方法 load() / saveGlobal()。
 * 挂载到全局 window.SettingsStore
 */
class SettingsStore {
    /**
     * @param {Object} [options] - { autoReload: boolean } autoReload 默认 true
     */
    constructor(options) {
        this.options = options || {};

        // 本次启动时实际生效的值：拉回数据库后若与此不同，说明设置变了，需要重载页面
        this._boot = SettingsStore.signature();

        this._listeners = [];

        this.state = {
            mode: SettingsStore.readMode(),      // 面板编辑的是哪一份：'personal' | 'global'
            online: true,                        // 后端是否可用
            global: SettingsStore.global(),      // 全局值（数据库 / 缓存 / 静态默认）
            lastError: null                      // 最近一次连不上的原因
        };
    }

    /* ================================================================
     *  存储键名与读写
     * ================================================================ */

    static KEYS = {
        global: 'sc_site_settings',        // 数据库全局设置的离线缓存
        mode: 'sc_settings_mode',          // 面板模式：'personal' | 'global'
        personal: 'sc_settings_personal'   // 个人覆盖（主题除外，见 THEME_KEY）
    };

    // 个人主题沿用主题管理器既有的键，这样在主题下拉里选的也算个人覆盖
    static THEME_KEY = 'preferredTheme';

    // 旧版把「本机选定的导航来源」单独存在这里，现统一进 personal 的 navMode，仅在迁移时读一次
    static NAV_MODE_LEGACY_KEY = 'site_nav_mode';

    static RELOAD_FLAG = 'sc_settings_reloaded';

    static _read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    static _write(key, value) {
        try { localStorage.setItem(key, String(value)); return true; } catch (e) { return false; }
    }

    static _readJSON(key, fallback) {
        const raw = SettingsStore._read(key);
        if (raw == null) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    /* ================================================================
     *  静态默认 / 全局 / 个人 / 生效值（全部同步，供各模块启动时查询）
     * ================================================================ */

    static THEMES = ['light', 'dark', 'wk-light', 'wk-dark'];
    static FALLBACK_THEME = 'wk-light';

    // 导航数据来源：'web' 静态文件（只读，不依赖后端）/ 'db' 数据库
    static NAV_MODES = ['web', 'db'];
    static FALLBACK_NAV_MODE = 'web';

    static isValidTheme(t) {
        return SettingsStore.THEMES.indexOf(String(t)) >= 0;
    }

    static isValidNavMode(m) {
        return SettingsStore.NAV_MODES.indexOf(String(m)) >= 0;
    }

    /** site-config.js 里的出厂默认（本模块的最终回退） */
    static defaults() {
        const c = (window.SITE_CONFIG) || {};
        const bgm = c.bgm || {};
        const live2d = c.live2d || {};
        const nav = c.nav || {};
        return {
            bgmEnabled: bgm.enabled !== false,
            bgmAutoPlay: bgm.autoPlay !== false,
            live2dEnabled: live2d.enabled !== false,
            defaultTheme: SettingsStore.isValidTheme(c.defaultTheme) ? String(c.defaultTheme) : SettingsStore.FALLBACK_THEME,
            navMode: SettingsStore.isValidNavMode(nav.mode) ? String(nav.mode) : SettingsStore.FALLBACK_NAV_MODE
        };
    }

    /** 全局值：数据库缓存优先，缺项用静态默认补齐 */
    static global() {
        const d = SettingsStore.defaults();
        const c = SettingsStore._readJSON(SettingsStore.KEYS.global, null);
        if (!c || typeof c !== 'object') return d;

        return {
            bgmEnabled: typeof c.bgmEnabled === 'boolean' ? c.bgmEnabled : d.bgmEnabled,
            bgmAutoPlay: typeof c.bgmAutoPlay === 'boolean' ? c.bgmAutoPlay : d.bgmAutoPlay,
            live2dEnabled: typeof c.live2dEnabled === 'boolean' ? c.live2dEnabled : d.live2dEnabled,
            defaultTheme: SettingsStore.isValidTheme(c.defaultTheme) ? String(c.defaultTheme) : d.defaultTheme,
            navMode: SettingsStore.isValidNavMode(c.navMode) ? String(c.navMode) : d.navMode
        };
    }

    /** 个人覆盖：没设过的键不出现在结果里（用 undefined 表示「跟随全局」） */
    static personal() {
        const o = SettingsStore._readJSON(SettingsStore.KEYS.personal, {}) || {};
        const p = {};
        if (typeof o.bgmEnabled === 'boolean') p.bgmEnabled = o.bgmEnabled;
        if (typeof o.bgmAutoPlay === 'boolean') p.bgmAutoPlay = o.bgmAutoPlay;
        if (typeof o.live2dEnabled === 'boolean') p.live2dEnabled = o.live2dEnabled;
        if (SettingsStore.isValidNavMode(o.navMode)) p.navMode = String(o.navMode);

        const t = SettingsStore._read(SettingsStore.THEME_KEY);
        if (SettingsStore.isValidTheme(t)) p.defaultTheme = String(t);
        return p;
    }

    /** 页面实际生效的值：个人覆盖 > 全局值 */
    static effective(key) {
        const p = SettingsStore.personal();
        if (p[key] !== undefined) return p[key];
        return SettingsStore.global()[key];
    }

    static getBgmEnabled() { return !!SettingsStore.effective('bgmEnabled'); }
    static getBgmAutoPlay() { return !!SettingsStore.effective('bgmAutoPlay'); }
    static getLive2dEnabled() { return !!SettingsStore.effective('live2dEnabled'); }
    static getDefaultTheme() { return String(SettingsStore.effective('defaultTheme')); }
    static getNavMode() { return String(SettingsStore.effective('navMode') || SettingsStore.FALLBACK_NAV_MODE); }

    /** 五项生效值的指纹，用来判断「这次读回的设置是否与页面已用的一致」 */
    static signature() {
        return JSON.stringify([
            SettingsStore.effective('bgmEnabled'),
            SettingsStore.effective('bgmAutoPlay'),
            SettingsStore.effective('live2dEnabled'),
            SettingsStore.effective('defaultTheme'),
            SettingsStore.effective('navMode')
        ]);
    }

    /** 把一份来路不明的全局设置收拾干净（与后端 settings.normalize 同规则） */
    static normalize(input) {
        const d = SettingsStore.defaults();
        const o = input || {};
        return {
            bgmEnabled: typeof o.bgmEnabled === 'boolean' ? o.bgmEnabled : d.bgmEnabled,
            bgmAutoPlay: typeof o.bgmAutoPlay === 'boolean' ? o.bgmAutoPlay : d.bgmAutoPlay,
            live2dEnabled: typeof o.live2dEnabled === 'boolean' ? o.live2dEnabled : d.live2dEnabled,
            defaultTheme: SettingsStore.isValidTheme(o.defaultTheme) ? String(o.defaultTheme) : d.defaultTheme,
            navMode: SettingsStore.isValidNavMode(o.navMode) ? String(o.navMode) : d.navMode
        };
    }

    /** 旧的 settings_* 个人偏好一次性搬进统一结构，避免升级后用户设置丢失 */
    static migrate() {
        const legacy = {
            bgmEnabled: 'settings_bgm_enabled',
            bgmAutoPlay: 'settings_bgm_autoplay',
            live2dEnabled: 'settings_live2d_enabled'
        };
        const map = SettingsStore._readJSON(SettingsStore.KEYS.personal, {}) || {};
        let changed = false;

        Object.keys(legacy).forEach(k => {
            const v = SettingsStore._read(legacy[k]);
            if (map[k] === undefined && (v === 'true' || v === 'false')) {
                map[k] = (v === 'true');
                changed = true;
            }
        });

        // 旧版的「本机选定导航来源」独立存在 site_nav_mode 里，一并搬进个人覆盖
        const navLocal = SettingsStore._read(SettingsStore.NAV_MODE_LEGACY_KEY);
        if (map.navMode === undefined && SettingsStore.isValidNavMode(navLocal)) {
            map.navMode = String(navLocal);
            changed = true;
        }

        if (changed) SettingsStore._write(SettingsStore.KEYS.personal, JSON.stringify(map));
    }

    /* ================================================================
     *  模式
     * ================================================================ */

    static readMode() {
        return SettingsStore._read(SettingsStore.KEYS.mode) === 'global' ? 'global' : 'personal';
    }

    static writeMode(mode) {
        SettingsStore._write(SettingsStore.KEYS.mode, mode === 'global' ? 'global' : 'personal');
    }

    /**
     * 切换面板模式（只影响本机面板编辑的是哪一份，不写数据库）
     * @param {'personal'|'global'} mode
     */
    switchMode(mode) {
        this.state.mode = (mode === 'global') ? 'global' : 'personal';
        SettingsStore.writeMode(this.state.mode);
        this.emit({ type: 'mode' });
        return this.state.mode;
    }

    /**
     * 面板上某个开关此刻应显示的值：
     * 全局模式显示全局值；个人模式显示生效值（个人没设过就是全局值）
     */
    display(key) {
        return this.state.mode === 'global' ? this.state.global[key] : SettingsStore.effective(key);
    }

    /** 个人模式是否对某项设过值（界面上可提示「跟随全局」） */
    isPersonal(key) {
        return SettingsStore.personal()[key] !== undefined;
    }

    /* ================================================================
     *  HTTP（不依赖 NavApi；基路径取自 SCUtils，见 utils.js）
     * ================================================================ */

    static NOT_API = 'NOT_API';

    /** 接口基路径：实现见 SCUtils.apiBase（与 NavApi 共用一份） */
    static base() { return window.SCUtils.apiBase(); }

    static url(p) { return SettingsStore.base() + '/api' + p; }

    static _fail(code, message) {
        const e = new Error(message);
        e.code = code;
        return e;
    }

    static _parse(res) {
        const ct = res.headers.get('content-type') || '';
        if (ct.indexOf('json') < 0) {
            return Promise.reject(SettingsStore._fail(SettingsStore.NOT_API, '未连接后端服务'));
        }
        return res.json().then(body => {
            if (!res.ok) {
                const e = SettingsStore._fail((body && body.code) || 'HTTP', (body && body.error) || ('HTTP ' + res.status));
                e.status = res.status;
                e.kind = (body && body.kind) || '';
                e.label = (body && body.label) || '';
                e.hint = (body && body.hint) || '';
                throw e;
            }
            return (body && body.data !== undefined) ? body.data : body;
        });
    }

    static fetchSettings() {
        return fetch(SettingsStore.url('/site-settings'), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store'
        }).then(SettingsStore._parse);
    }

    static putSettings(data) {
        return fetch(SettingsStore.url('/site-settings'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store',
            body: JSON.stringify(data)
        }).then(SettingsStore._parse);
    }

    /**
     * 连不上 / 未登录 / 数据库出错，分别说清楚，界面据此提示。
     * 判断规则见 SCUtils.describeError（与导航数据层共用一份），
     * 这里只补上「离线时按本机缓存的设置运行」这句上下文。
     */
    static describeError(e) {
        return window.SCUtils.describeError(e, {
            offlineHint: '请先运行「启动主页(带数据库).bat」把后端跑起来；连不上时按本机缓存的设置运行。'
        });
    }

    /* ================================================================
     *  事件广播
     * ================================================================ */

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
     *  载入与保存
     * ================================================================ */

    /**
     * 启动加载：把数据库里的全局设置取回来并缓存；连不上则沿用缓存。
     * 无论成功失败都 resolve。
     */
    load() {
        return SettingsStore.fetchSettings().then(data => {
            const next = SettingsStore.normalize(data);
            this.state.global = next;
            this.state.online = true;
            this.state.lastError = null;
            SettingsStore._write(SettingsStore.KEYS.global, JSON.stringify(next));
            this.emit({ type: 'settings' });
            this._reloadIfChanged();
            return next;
        }).catch(e => {
            this.state.online = false;
            this.state.lastError = SettingsStore.describeError(e);
            this.emit({ type: 'settings' });
            return this.state.global;
        });
    }

    /**
     * 保存全局设置（写数据库，需在线；是否已登录由后端判定）。
     * 失败时把原因留在 state.lastError 并 reject。
     */
    saveGlobal(patch) {
        const next = Object.assign({}, this.state.global, patch);
        return SettingsStore.putSettings(next).then(data => {
            const saved = SettingsStore.normalize(data || next);
            this.state.global = saved;
            this.state.online = true;
            this.state.lastError = null;
            SettingsStore._write(SettingsStore.KEYS.global, JSON.stringify(saved));
            this.emit({ type: 'settings' });
            return saved;
        }).catch(e => {
            const err = SettingsStore.describeError(e);
            if (err.kind !== 'auth') this.state.online = false;   // 未登录是权限问题，后端本身是通的
            this.state.lastError = err;
            this.emit({ type: 'settings' });
            throw e;
        });
    }

    /** 保存个人覆盖（只写本机，不碰数据库） */
    setPersonal(patch) {
        if (patch.defaultTheme !== undefined) {
            SettingsStore._write(SettingsStore.THEME_KEY, patch.defaultTheme);
        }

        const map = SettingsStore._readJSON(SettingsStore.KEYS.personal, {}) || {};
        ['bgmEnabled', 'bgmAutoPlay', 'live2dEnabled'].forEach(k => {
            if (patch[k] !== undefined) map[k] = !!patch[k];
        });
        if (patch.navMode !== undefined) {
            map.navMode = SettingsStore.isValidNavMode(patch.navMode) ? String(patch.navMode) : SettingsStore.FALLBACK_NAV_MODE;
        }
        SettingsStore._write(SettingsStore.KEYS.personal, JSON.stringify(map));

        this.emit({ type: 'settings' });
        return patch;
    }

    /** 取消某项的个人覆盖，回到「跟随全局」 */
    clearPersonal(key) {
        if (key === 'defaultTheme') {
            try { localStorage.removeItem(SettingsStore.THEME_KEY); } catch (e) { /* 忽略 */ }
        } else {
            const map = SettingsStore._readJSON(SettingsStore.KEYS.personal, {}) || {};
            delete map[key];
            SettingsStore._write(SettingsStore.KEYS.personal, JSON.stringify(map));
        }
        this.emit({ type: 'settings' });
    }

    /**
     * 记下「本机选定的导航来源」，由 NavStore 在页面上切换模式时调用。
     * 与设置面板里的那一项是同一份值（个人覆盖），两处不会各说各话。
     */
    static setNavMode(mode) {
        const map = SettingsStore._readJSON(SettingsStore.KEYS.personal, {}) || {};
        if (SettingsStore.isValidNavMode(mode)) map.navMode = String(mode);
        else delete map.navMode;
        SettingsStore._write(SettingsStore.KEYS.personal, JSON.stringify(map));
    }

    /**
     * 全局值变了、且页面实际生效的值也跟着变了 → 重载页面。
     * BGM / 看板娘 / 主题都在初始化时一次性读取，只能靠重载重新生效；
     * 用 sessionStorage 记下「已为这份设置重载过」，避免来回刷。
     */
    _reloadIfChanged() {
        if (this.options.autoReload === false) return;

        const now = SettingsStore.signature();
        if (now === this._boot) return;      // 生效值没变，不必重载

        let last = null;
        try { last = sessionStorage.getItem(SettingsStore.RELOAD_FLAG); } catch (e) { /* 忽略 */ }
        if (last === now) return;            // 已经为这份设置刷新过一次

        try { sessionStorage.setItem(SettingsStore.RELOAD_FLAG, now); } catch (e) { /* 忽略 */ }
        console.log('[SettingsStore] 站点设置已变化，刷新页面以应用');
        location.reload();
    }
}

SettingsStore.migrate();

window.SettingsStore = SettingsStore;
