/**
 * 生存战争网 - 服务器版本列表数据层
 *
 * 职责：版本下拉可选版本的读写与「增 / 改 / 删 / 选」。
 * 唯一权威数据源是数据库（/api/server-versions，写接口需登录）——
 * 只有连上数据库才能修改；localStorage 只作同步缓存，
 * 用于首屏即时渲染与离线兜底，本身不是修改的落点。
 * 出厂默认 x26.07.30 / x26.06.19。版本号本质是透传给 API 的 ?version=
 * 参数（见 ServerApiClient 与 proxy.php），因此不做格式强校验，
 * 只做「去空白 / 截断 / 去重 / 非空」的整理。
 *
 * HTTP 复用全局 NavApi（NOT_API 识别 / 错误归一 / 会话 Cookie）。
 * 挂载到全局 window.ServerVersionStore
 */
class ServerVersionStore {
    /** 本机缓存键：cache 为最近一次拿到的版本列表，selected 为当前选中的版本 */
    static KEYS = {
        cache: 'sc_server_versions',
        selected: 'sc_server_version'
    };

    /** 出厂默认：库里还没有数据时的兜底 */
    static DEFAULT_VERSIONS = ['x26.07.30', 'x26.06.19'];

    /** 列表上限：版本号是 API 参数，几个足够，防止无限膨胀 */
    static MAX = 20;

    /** 单个版本号最长字符数 */
    static MAX_LEN = 40;

    /**
     * 整理单个版本号：去首尾空白并截断（可能为空串）
     * @param {*} v - 任意输入
     * @returns {string}
     */
    static normOne(v) {
        return String(v == null ? '' : v).trim().slice(0, ServerVersionStore.MAX_LEN);
    }

    /**
     * 整理版本数组：丢弃空项、按出现顺序去重、截到上限
     * @param {*} input - 任意输入
     * @returns {string[]}
     */
    static normList(input) {
        const out = [];
        (Array.isArray(input) ? input : []).forEach(v => {
            const s = ServerVersionStore.normOne(v);
            if (s && out.indexOf(s) < 0) out.push(s);
        });
        return out.slice(0, ServerVersionStore.MAX);
    }

    /**
     * 读本机缓存（同步，用于首屏渲染）；没缓存 / 存坏了 / 清成空了，回出厂默认
     * @returns {string[]}
     */
    static load() {
        try {
            const raw = localStorage.getItem(ServerVersionStore.KEYS.cache);
            if (raw == null) return ServerVersionStore.DEFAULT_VERSIONS.slice();
            const list = ServerVersionStore.normList(JSON.parse(raw));
            return list.length ? list : ServerVersionStore.DEFAULT_VERSIONS.slice();
        } catch (e) {
            return ServerVersionStore.DEFAULT_VERSIONS.slice();
        }
    }

    /**
     * 写本机缓存（不是保存！修改必须走 saveRemote 落库）
     * @param {Array} list - 版本数组
     * @returns {string[]} 整理后实际缓存的列表
     */
    static save(list) {
        const clean = ServerVersionStore.normList(list);
        try {
            localStorage.setItem(ServerVersionStore.KEYS.cache, JSON.stringify(clean));
        } catch (e) {
            console.warn('[ServerVersionStore] 缓存写入失败:', e.message);
        }
        return clean;
    }

    /**
     * 从数据库拉取版本列表（读接口开放，不需要登录）。
     * 拿到就同步进本机缓存，下次离线首屏也能用；
     * 没后端 / 报错 / 空列表一律返回 null，调用方按「继续用本地」处理。
     * @returns {Promise<string[]|null>}
     */
    static fetchRemote() {
        if (!window.NavApi) return Promise.resolve(null);
        return NavApi.get(NavApi.path('/server-versions')).then(body => {
            const d = body && body.data;
            const list = d && Array.isArray(d.versions) ? ServerVersionStore.normList(d.versions) : [];
            if (!list.length) return null;
            ServerVersionStore.save(list);
            return list;
        }).catch(function (e) {
            console.log('[ServerVersionStore] 远端版本列表不可用：' + e.message);
            return null;
        });
    }

    /**
     * 保存到数据库（PUT，需已登录）——增 / 改 / 删的唯一落库入口。
     * 成功：缓存服务端确认的列表并返回；
     * 失败：抛出带 code 的错误（NOT_API=没连后端，UNAUTHORIZED=未登录），本地缓存不动。
     * @param {Array} list - 修改后的完整版本列表
     * @returns {Promise<string[]>}
     */
    static saveRemote(list) {
        if (!window.NavApi) {
            const e = new Error('未连接后端服务');
            e.code = 'NOT_API';
            return Promise.reject(e);
        }
        return NavApi.send(NavApi.path('/server-versions'), 'PUT', {
            versions: ServerVersionStore.normList(list)
        }).then(body => {
            const d = body && body.data;
            const saved = (d && Array.isArray(d.versions) && d.versions.length)
                ? d.versions
                : ServerVersionStore.normList(list);
            ServerVersionStore.save(saved);
            return saved;
        });
    }

    /**
     * 读本机选中的版本；没存过 / 不在列表里，回列表第一项
     * @param {string[]} [list] - 版本列表，缺省时自读
     * @returns {string}
     */
    static getSelected(list) {
        let sel = null;
        try {
            sel = localStorage.getItem(ServerVersionStore.KEYS.selected);
        } catch (e) {
            /* 忽略 */
        }
        const l = list || ServerVersionStore.load();
        return (sel && l.indexOf(sel) >= 0) ? sel : (l[0] || ServerVersionStore.DEFAULT_VERSIONS[0]);
    }

    /**
     * 记住本机选中的版本
     * @param {string} version - 选中版本
     */
    static setSelected(version) {
        try {
            localStorage.setItem(ServerVersionStore.KEYS.selected, String(version));
        } catch (e) {
            /* 忽略 */
        }
    }
}

window.ServerVersionStore = ServerVersionStore;
