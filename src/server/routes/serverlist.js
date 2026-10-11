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

/**
 * 构建上游请求路径（纯函数：version 只透传，未知版本上游返回空列表属正常业务）
 * @param {string} version - 前端传来的版本号（tb_version.name，可空）
 * @returns {string} 上游路径（含查询串）
 */
function upstreamPath(version) {
  return version
    ? UPSTREAM_PATH + '?version=' + encodeURIComponent(version)
    : UPSTREAM_PATH;
}

/**
 * 统一的错误出口：格式、状态码、no-store 只在这一处定义
 * @param {Object} res - Express 响应
 * @param {string} msg - 人类可读的错误说明
 */
function sendUpstreamError(res, msg) {
  res.set('Cache-Control', 'no-store');
  res.status(502).json({ success: false, msg: msg, code: 502 });
}

router.get('/serverlist', function (req, res) {
  const upstream = https.request({
    hostname: UPSTREAM_HOST,
    path: upstreamPath(String(req.query.version || '').trim()),
    method: 'GET',
    timeout: UPSTREAM_TIMEOUT_MS,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; SCWebServerList/1.0)'
    }
  }, function (up) {
    if (up.statusCode !== 200) {
      up.resume();
      sendUpstreamError(res, '上游接口返回 ' + up.statusCode);
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
        sendUpstreamError(res, '上游返回的不是 JSON');
      }
    });
  });

  upstream.on('timeout', function () {
    upstream.destroy(new Error('timeout'));
  });
  upstream.on('error', function (e) {
    sendUpstreamError(res, '上游请求失败：' + e.message);
  });
  upstream.end();
});

module.exports = router;
