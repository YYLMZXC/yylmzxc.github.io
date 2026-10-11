/* ============================================================
   YYLMZXC 离线导航站 · 本地存储
   统一封装 localStorage / sessionStorage 的读写与 JSON 编解码：
     · 所有存储键名集中在此，避免散落各处造成冲突；
     · 存储不可用（隐私模式 / 配额耗尽）时安全降级，不抛异常，
       并回退到内存，保证本次会话内功能依旧可用。
   本模块不感知任何业务语义：只负责「按键存取字符串 / 对象」。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  // 全部存储键名的唯一出处
  var KEYS = {
    data: 'yylmzxc-nav-data-v1',        // 旧版本遗留的本机数据（仅在静态数据文件不可用时兜底，不再写入）
    dbCache: 'yylmzxc-nav-dbcache-v1',  // 数据库浏览模式：断网镜像
    sync: 'yylmzxc-nav-static-sync',    // 静态文件同步：自动开关 + 最近同步时间
    mode: 'yylmzxc-nav-mode',           // 用户选择的浏览模式
    theme: 'yylmzxc-nav-theme',         // 主题偏好
    // 旧版本遗留：账号密码与登录态曾存在浏览器里，现已移到数据库，
    // 启动时清除（见 auth.refresh），键名保留在此以免清理逻辑写死字面量
    legacyCred: 'yylmzxc-nav-auth',
    legacySession: 'yylmzxc-nav-session'
  };

  // 生成一个存储门面：真实存储不可用时自动回退到内存
  function facade(getStore) {
    var memory = {};
    var usable = true;

    function backend() {
      if (!usable) return null;
      try {
        return getStore() || null;
      } catch (e) {
        usable = false;
        return null;
      }
    }

    function read(key) {
      var s = backend();
      if (s) {
        try { return s.getItem(key); } catch (e) { usable = false; }
      }
      return (key in memory) ? memory[key] : null;
    }

    function write(key, value) {
      memory[key] = String(value);
      var s = backend();
      if (!s) return false;
      try { s.setItem(key, String(value)); return true; } catch (e) { return false; }
    }

    function remove(key) {
      delete memory[key];
      var s = backend();
      if (!s) return false;
      try { s.removeItem(key); return true; } catch (e) { return false; }
    }

    function readJSON(key, fallback) {
      var raw = read(key);
      if (raw == null) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    function writeJSON(key, value) { return write(key, JSON.stringify(value)); }

    return { read: read, write: write, remove: remove, readJSON: readJSON, writeJSON: writeJSON };
  }

  Nav.storage = {
    KEYS: KEYS,
    local: facade(function () { return window.localStorage; }),
    session: facade(function () { return window.sessionStorage; })
  };
})(window.Nav);
