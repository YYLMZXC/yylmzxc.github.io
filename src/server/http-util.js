/* ============================================================
   生存战争网 · HTTP 工具
   客户端真实 IP 的还原逻辑：转发头优先级与 proxy.php 的 getClientIp 保持一致。
   请求日志、拦截日志、信息仪表板接口都靠它；提出成模块后不再长在 server.js 里。
   ============================================================ */
'use strict';

// IPv4 映射地址（::ffff:127.0.0.1）还原成 IPv4，与 PHP 的 REMOTE_ADDR 观感一致
function normIp(ip) {
  return String(ip || '').replace(/^::ffff:/i, '');
}

// 取客户端真实 IP：转发头优先级与 proxy.php 的 getClientIp 保持一致
function clientIp(req) {
  const h = req.headers;
  const forwarded = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'client-ip'];
  for (const name of forwarded) {
    const raw = h[name];
    if (raw) {
      const first = String(raw).split(',')[0].trim();
      if (first) return normIp(first);
    }
  }
  return normIp(req.socket.remoteAddress);
}

module.exports = { normIp: normIp, clientIp: clientIp };
