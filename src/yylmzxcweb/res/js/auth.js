/* ============================================================
   YYLMZXC 离线导航站 · 账号会话（前端侧）
   账号密码存在于数据库里，浏览器不保存任何凭据：
     · 本模块内存里只留「是否已登录 / 当前账号名」这一份镜像，
       权威始终是后端（登录态由 HttpOnly 会话 Cookie 承载）；
     · 登录、退出、改账号密码全部交给 api 走后端校验，
       账号密码只在请求里出现一次，不写任何本地存储；
     · 启动时调用一次 refresh() 向后端确认会话是否还有效，
       顺带清掉旧版本留在浏览器里的明文凭据。
   不含任何界面与业务编排（弹窗在 account.js、编辑门禁在 main.js）。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var api = Nav.api;
  var storage = Nav.storage;

  // 登录态镜像：只在内存，刷新页面即重新向后端确认
  var state = { logged: false, user: '' };

  function current() { return { logged: state.logged, user: state.user }; }

  function isLoggedIn() { return state.logged; }

  function user() { return state.user; }

  function adopt(name, logged) {
    state.user = String(name || '');
    state.logged = !!logged;
    return current();
  }

  function forget() { return adopt('', false); }

  // 向后端确认登录态（失败即视为未登录，不影响只读浏览）
  function refresh() {
    // 旧版本的账号密码与本机登录态标记都已被数据库取代，顺手清理
    storage.local.remove(storage.KEYS.legacyCred);
    storage.session.remove(storage.KEYS.legacySession);

    return api.session()
      .then(function (s) { return adopt(s && s.user, s && s.loggedIn); })
      .catch(forget);
  }

  // 校验账号密码并建立会话；失败则以错误抛出，由调用方提示
  function login(u, p) {
    return api.login(u, p).then(function (s) { return adopt(s && s.user, true); });
  }

  function logout() {
    return api.logout().then(forget, forget);
  }

  // 修改账号 / 密码（当前密码由后端校验）
  function update(payload) {
    return api.updateAccount(payload).then(function (s) {
      return adopt((s && s.user) || state.user, true);
    });
  }

  Nav.auth = {
    isLoggedIn: isLoggedIn,
    user: user,
    current: current,
    refresh: refresh,
    login: login,
    logout: logout,
    update: update
  };
})(window.Nav);
