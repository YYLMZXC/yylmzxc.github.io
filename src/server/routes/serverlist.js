/* ============================================================
   生存战争网 · /api/serverlist 联机服务器列表代理
   前端 online_server.html 需要 api.sckey.net 的服务器列表，但该 API
   只对 sckey.net 自有域名放开 CORS（见 ScKey 的 app/middleware/Cors.php），
   第三方站点与本机开发环境都无法直读响应。本接口在服务端做同源转发：
   浏览器请求本接口（同源、无 CORS 问题），后端转发上游并原样回传 JSON。
   与 clientinfo.js 同一思路：纯 PHP 托管时前端走 proxy.php，
   Node 后端托管（本进程）时走 /api/*。
   ============================================================ */
'use strict';

const express = require('express');
const https = require('https');

const UPSTREAM_HOST = 'api.sckey.net';
const UPSTREAM_PATH = '/server/serverlist';
const UPSTREAM_TIMEOUT_MS = 15000;

const router = express.Router();

router.get('/serverlist', function (req, res) {
  // version 是透传给上游的 ?version= 参数（tb_version.name），
  // 上游对未知版本返回空列表，属于正常业务结果，这里不做校验
  const version = String(req.query.version || '').trim();
  const path = version
    ? UPSTREAM_PATH + '?version=' + encodeURIComponent(version)
    : UPSTREAM_PATH;

  const upstream = https.request({
    hostname: UPSTREAM_HOST,
    path: path,
    method: 'GET',
    timeout: UPSTREAM_TIMEOUT_MS,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; SCWebServerList/1.0)'
    }
  }, function (up) {
    if (up.statusCode !== 200) {
      up.resume();
      res.set('Cache-Control', 'no-store');
      res.status(502).json({ success: false, msg: '上游接口返回 ' + up.statusCode, code: 502 });
      return;
    }

    const chunks = [];
    up.on('data', function (c) { chunks.push(c); });
    up.on('end', function () {
      const body = Buffer.concat(chunks).toString('utf8');
      let parsed = null;
      try { parsed = JSON.parse(body); } catch (e) { /* 落到 502 分支 */ }

      res.set('Cache-Control', 'no-store');
      if (parsed !== null) {
        res.json(parsed);
      } else {
        res.status(502).json({ success: false, msg: '上游返回的不是 JSON', code: 502 });
      }
    });
  });

  upstream.on('timeout', function () {
    upstream.destroy(new Error('timeout'));
  });
  upstream.on('error', function (e) {
    res.set('Cache-Control', 'no-store');
    res.status(502).json({ success: false, msg: '上游请求失败：' + e.message, code: 502 });
  });
  upstream.end();
});

module.exports = router;
