/* ============================================================
   YYLMZXC 导航站 · 后端接口
   所有 HTTP 通信的唯一出口：/api/nav（读写）、/api/health、/api/rss、/api/upload、/api/nav/to-static，
   以及账号相关的 /api/login、/api/session、/api/logout、/api/account。
   只关心「请求 → 数据 / 错误」，不持有任何应用状态。
   后端不存在时返回的是一张 HTML 页面，这种情况以 code='NOT_API' 抛出，
   便于调用方区分「没有后端」与「后端报错」，避免比较错误文案。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  /* 接口基路径：默认跟随页面所在目录，使同一份代码既能部署在域名根，
     也能部署在子目录。例：
        /yylmzxcweb/yylmzxc.html → 基路径 /yylmzxcweb → /yylmzxcweb/api/nav
        /yylmzxc.html            → 基路径 ''           → /api/nav
     需要固定写死时，在本脚本加载之前于页面里设置 window.NAV_API_BASE（如 '/yylmzxcweb'）。 */
  var API_BASE = (function () {
    if (typeof window.NAV_API_BASE === 'string') return window.NAV_API_BASE.replace(/\/$/, '');
    var p = String(window.location.pathname || '/');
    var i = p.lastIndexOf('/');
    return i > 0 ? p.slice(0, i) : '';
  })();

  var NAV_URL = API_BASE + '/api/nav';
  var HEALTH_URL = API_BASE + '/api/health';
  var STATIC_URL = API_BASE + '/api/nav/to-static';
  var FEED_URL = API_BASE + '/api/rss';
  var UPLOAD_URL = API_BASE + '/api/upload';
  var LOGIN_URL = API_BASE + '/api/login';
  var SESSION_URL = API_BASE + '/api/session';
  var LOGOUT_URL = API_BASE + '/api/logout';
  var ACCOUNT_URL = API_BASE + '/api/account';

  function fail(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  // 统一解析响应：不是 JSON 就说明碰到的不是本项目后端
  function parse(res) {
    var ct = res.headers.get('content-type') || '';
    if (ct.indexOf('json') < 0) return Promise.reject(fail('NOT_API', '未连接后端服务'));
    return res.json().then(function (body) {
      if (!res.ok) {
        // 后端把「哪种数据库毛病 / 卡在哪一步 / 怎么办」一并带回来了，原样往上传，
        // 界面层才能区分「MySQL 没启动」「账号密码不对」「没有授权访问这个库」。
        var e = fail((body && body.code) || 'HTTP', (body && body.error) || ('HTTP ' + res.status));
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

  function request(url, opts) {
    return fetch(url, opts).then(parse);
  }

  function isData(d) { return !!(d && Array.isArray(d.groups)); }

  // 读取整份导航数据；数据库为空时返回 null
  function getNav() {
    return request(NAV_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (body) { return isData(body && body.data) ? body.data : null; });
  }

  // 整份覆盖写入
  function putNav(data) {
    return request(NAV_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  // 导出为静态版（写入 res/data/nav-default.js）
  // 不传 data 时由后端改用数据库中的数据写入，供「MySQL → 离线页面」直接用
  function exportStatic(data) {
    return request(STATIC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isData(data) ? { data: data } : {})
    });
  }

  // 后端完全没回应时的提示：静态页面能打开、/api 却打不通，最常见的就是这两种原因
  var BACKEND_HINT = '请先运行「启动主页(带数据库).bat」把后端跑起来（导航站作为 mod 由它一并加载）；' +
    '若通过域名访问，还要确认 Apache（小皮面板）已把 ' + (API_BASE + '/api/') + ' 转发到 127.0.0.1:8000。';

  // 健康检查的完整结果：不只回答「通不通」，还回答「不通是因为什么」。
  // 后端有回应就用后端给的诊断（见 server/db.js）；完全没回应就自己给一条。
  function healthInfo() {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 3000);
    return fetch(HEALTH_URL, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(parse)
      .catch(function (e) {
        var offline = !(e && e.label);   // 没有 label 说明根本没拿到后端的诊断
        return {
          ok: false,
          kind: offline ? 'offline' : e.kind,
          label: offline ? '未连接后端服务' : e.label,
          reason: offline ? '后端没有回应 /api/health' : (e.message || e.label),
          stage: (e && e.stage) || '',
          target: (e && e.target) || '',
          hint: offline ? BACKEND_HINT : (e.hint || ''),
          detail: (e && e.detail) || ''
        };
      })
      .then(function (info) { clearTimeout(timer); return info || { ok: false }; });
  }

  // 读取 RSS/Atom 订阅内容（经后端代理，规避浏览器同源限制）
  function getFeed(url) {
    return request(FEED_URL + '?url=' + encodeURIComponent(url), {
      headers: { Accept: 'application/json' }, cache: 'no-store'
    }).then(function (body) {
      if (!body || !body.feed) throw fail('EMPTY', '订阅源没有返回内容');
      return body.feed;
    });
  }

  // 上传本机图片（背景图）：入参为已经读好的 data URL（读文件是浏览器副作用，见 Nav.dom），
  // 交给后端落盘，回传可直接写进数据的相对路径。
  function uploadImage(dataUrl) {
    return request(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataUrl })
    }).then(function (body) {
      if (!body || !body.path) throw fail('EMPTY', '上传接口没有返回图片地址');
      return body.path;
    });
  }

  /* ---------------- 账号 ----------------
     凭据只在后端：这里发出去的账号密码不会被本模块保存，
     登录态由后端下发的 HttpOnly 会话 Cookie 承载（浏览器自动携带）。 */

  // 带 Cookie 的 JSON 提交：账号接口都靠会话 Cookie 认人
  function submit(url, payload) {
    return request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(payload || {})
    });
  }

  // 登录：成功后后端下发会话 Cookie
  function login(user, pass) {
    return submit(LOGIN_URL, { user: user, pass: pass });
  }

  // 查询登录态（未登录也正常返回，不算错误）
  function session() {
    return request(SESSION_URL, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store'
    });
  }

  function logout() {
    return submit(LOGOUT_URL, {});
  }

  // 修改账号 / 密码；pass 留空表示只改账号
  function updateAccount(payload) {
    return submit(ACCOUNT_URL, payload);
  }

  Nav.api = {
    NOT_API: 'NOT_API',
    getNav: getNav,
    putNav: putNav,
    exportStatic: exportStatic,
    getFeed: getFeed,
    uploadImage: uploadImage,
    login: login,
    session: session,
    logout: logout,
    updateAccount: updateAccount,
    healthInfo: healthInfo
  };
})(window.Nav);
