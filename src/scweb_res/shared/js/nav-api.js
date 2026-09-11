/**
 * 生存战争网 - 首页「社区导航」数据接口
 * 所有与后端打交道的 HTTP 都收在这里：
 *   /api/site-nav（读写）、/api/site-nav/to-static（转换），
 *   以及账号相关的 /api/login、/api/session、/api/logout、/api/account。
 * 只回答「请求 → 数据 / 错误」，不持有任何应用状态。
 *
 * 后端不存在时，静态服务器会把 /api/* 当成文件路径并返回一张 HTML 页面，
 * 这种情况以 code='NOT_API' 抛出，调用方据此区分「没有后端」与「后端报错」。
 * 挂载到全局 window.NavApi
 */
class NavApi {
    /**
     * 接口基路径：跟随页面所在目录（实现见 SCUtils.apiBase，与 settings-store 共用一份）。
     * 需要固定写死时，在本脚本加载之前于页面里设置 window.SITE_NAV_API_BASE。
     */
    static base() { return window.SCUtils.apiBase(); }

    /** 拼出接口地址，如 api('/site-nav') → /api/site-nav */
    static path(p) { return NavApi.base() + '/api' + p; }

    /**
     * 构造一个带 code 的错误对象，便于调用方按错误类型分支
     * @param {string} code
     * @param {string} message
     */
    static fail(code, message) {
        const e = new Error(message);
        e.code = code;
        return e;
    }

    /**
     * 统一解析响应：不是 JSON 就说明碰到的不是本项目后端
     * @param {Response} res
     */
    static parse(res) {
        const ct = res.headers.get('content-type') || '';
        if (ct.indexOf('json') < 0) {
            return Promise.reject(NavApi.fail(NavApi.NOT_API, '未连接后端服务'));
        }
        return res.json().then(body => {
            if (!res.ok) {
                // 后端把「哪种数据库毛病 / 卡在哪一步 / 怎么办」一并带回来了，原样往上传，
                // 界面层才能区分「MySQL 没启动」「账号不对」「没授权」「未登录」。
                const e = NavApi.fail((body && body.code) || 'HTTP', (body && body.error) || ('HTTP ' + res.status));
                e.status = res.status;
                e.kind = (body && body.kind) || '';
                e.label = (body && body.label) || '';
                e.stage = (body && body.stage) || '';
                e.target = (body && body.target) || '';
                e.hint = (body && body.hint) || '';
                e.detail = (body && body.detail) || '';
                throw e;
            }
            return body;
        });
    }

    /**
     * GET 请求（带会话 Cookie，账号接口靠它认人）
     * @param {string} url
     * @param {Object} [opts] - 透传给 fetch 的额外参数（如 signal）
     */
    static get(url, opts) {
        return fetch(url, Object.assign({
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store'
        }, opts || {})).then(NavApi.parse);
    }

    /**
     * 带 JSON 体的 POST / PUT 请求
     * @param {string} url
     * @param {string} method
     * @param {Object} [payload]
     */
    static send(url, method, payload) {
        return fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store',
            body: JSON.stringify(payload || {})
        }).then(NavApi.parse);
    }

    /* ---------------- 导航数据 ---------------- */

    /** 读取首页导航数据；数据库里还没有时返回 null */
    static getNav() {
        return NavApi.get(NavApi.path('/site-nav')).then(body => {
            const d = body && body.data;
            return (d && Array.isArray(d.groups)) ? d : null;
        });
    }

    /** 整份覆盖写入数据库（需已登录） */
    static putNav(data) {
        return NavApi.send(NavApi.path('/site-nav'), 'PUT', data);
    }

    /**
     * 导出为静态数据文件（写入 scweb_res/nav/nav-default.js），
     * 即「转换：数据库 → web 模式」。不传 data 时由后端取数据库中的数据写入。
     */
    static exportStatic(data) {
        const payload = (data && Array.isArray(data.groups)) ? { data: data } : {};
        return NavApi.send(NavApi.path('/site-nav/to-static'), 'POST', payload);
    }

    /* ---------------- 账号 ----------------
       凭据只在后端：这里发出去的账号密码不会被本模块保存，
       登录态由后端下发的 HttpOnly 会话 Cookie 承载（浏览器自动携带）。 */

    static login(user, pass) {
        return NavApi.send(NavApi.path('/login'), 'POST', { user: user, pass: pass });
    }

    /** 查询登录态（未登录也正常返回，不算错误） */
    static session() {
        return NavApi.get(NavApi.path('/session'));
    }

    static logout() {
        return NavApi.send(NavApi.path('/logout'), 'POST', {});
    }

    /** 修改账号 / 密码；pass 留空表示只改账号（需已登录 + 当前密码） */
    static updateAccount(payload) {
        return NavApi.send(NavApi.path('/account'), 'POST', payload);
    }
}

NavApi.NOT_API = 'NOT_API';
NavApi.UNAUTHORIZED = 'UNAUTHORIZED';

window.NavApi = NavApi;
