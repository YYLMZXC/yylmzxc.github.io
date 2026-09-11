/* ============================================================
   YYLMZXC 离线导航站 · 静态数据来源
   静态数据文件 nav-default.js 的唯一出口：对外只暴露「当前数据 / 覆盖 / 重新拉取」。
     · 把 window.NAV_DEFAULT 这个全局与 <script> 注入这类浏览器副作用收在一处，
       使 store 保持「不碰 DOM」的纯粹性；
     · 同源脚本注入而非 fetch：页面要支持 file:// 直接双击打开，
       fetch 在 file:// 下会被 CORS 拦截；
     · 不感知任何业务语义，属于基础层（无依赖）。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  // 与 yylmzxc.html 中 <script src> 相同的相对路径
  var SRC = 'res/data/nav-default.js';

  function isData(d) { return !!(d && Array.isArray(d.groups)); }

  // 页面当前持有的静态数据（未加载或格式不对时为 null）
  function current() {
    return isData(window.NAV_DEFAULT) ? window.NAV_DEFAULT : null;
  }

  // 用新数据覆盖内存中的静态数据（数据库 → 静态文件同步后调用）
  function set(data) {
    if (isData(data)) window.NAV_DEFAULT = data;
    return current();
  }

  // 重新拉取静态数据文件（带缓存穿透）；无论成功失败都 resolve，
  // 由调用方决定如何回退，避免把「取文件失败」扩散成异常。
  function reload() {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = SRC + '?t=' + Date.now();
      s.onload = function () { s.remove(); resolve(current()); };
      s.onerror = function () { s.remove(); resolve(current()); };
      document.head.appendChild(s);
    });
  }

  Nav.source = { current: current, set: set, reload: reload };
})(window.Nav);
