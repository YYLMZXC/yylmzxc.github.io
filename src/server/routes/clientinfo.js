/* ============================================================
   生存战争网 · /api/clientinfo 客户端信息（服务器视角）
   信息仪表板用它显示访客的真实 IP / 请求头 / 服务端软件等。
   纯 PHP 托管时该页读 proxy.php?action=clientinfo；Node 后端运行时 PHP 不会被解释，
   于是在这里提供等价接口，前端优先走本接口、失败再回退 proxy.php。
   ============================================================ */
'use strict';

const express = require('express');
const httpUtil = require('../http-util');

const normIp = httpUtil.normIp;
const clientIp = httpUtil.clientIp;

const router = express.Router();

router.get('/clientinfo', function (req, res) {
  const h = req.headers;
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: {
      // 客户端地址信息
      ip: clientIp(req),
      remoteAddr: normIp(req.socket.remoteAddress),
      xForwardedFor: h['x-forwarded-for'] || '',
      xRealIp: h['x-real-ip'] || '',
      // 客户端请求头
      userAgent: h['user-agent'] || '',
      acceptLanguage: h['accept-language'] || '',
      acceptEncoding: h['accept-encoding'] || '',
      accept: h['accept'] || '',
      referer: h['referer'] || '',
      // 请求信息
      requestMethod: req.method,
      requestUri: req.originalUrl,
      requestTime: Math.floor(Date.now() / 1000),
      // 服务端信息
      serverAddr: normIp(req.socket.localAddress),
      serverName: String(h.host || '').split(':')[0],
      serverSoftware: 'Node.js/' + process.version + ' (Express)',
      serverProtocol: 'HTTP/' + req.httpVersion,
      https: !!req.secure,
      // Client Hints（Chrome 等浏览器可能携带，可能为空）
      secChUa: h['sec-ch-ua'] || '',
      secChUaPlatform: h['sec-ch-ua-platform'] || '',
      secChUaMobile: h['sec-ch-ua-mobile'] || ''
    }
  });
});

module.exports = router;
