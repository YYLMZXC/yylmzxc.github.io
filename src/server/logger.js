/* ============================================================
   生存战争网 · 日志
   统一带本地时间戳的控制台输出，格式：[2026/10/11 20:30:00] 消息。
   原先内联在 server.js 里，提出成模块后路由与各业务模块共用同一份。
   ============================================================ */
'use strict';

function ts() {
  const d = new Date();
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

const log = {
  info: function (msg) { console.log('[' + ts() + '] ' + msg); },
  warn: function (msg) { console.warn('[' + ts() + '] ' + msg); },
  error: function (msg) { console.error('[' + ts() + '] ' + msg); }
};

module.exports = { log: log, ts: ts };
