/* ============================================================
   生存战争网 · /api 路由总装
   请求日志中间件 + 各领域子路由。server.js 只负责把这份 Router
   挂到 /api 下；具体接口按领域分在同目录的各文件里：
     health.js / clientinfo.js / site-nav.js / site-settings.js /
     account.js / mods.js / client-log.js / server-versions.js / serverlist.js / db-config.js
     ============================================================ */
'use strict';

const express = require('express');
const log = require('../logger').log;
const clientIp = require('../http-util').clientIp;

const health = require('./health');
const clientinfo = require('./clientinfo');
const siteNav = require('./site-nav');
const siteSettings = require('./site-settings');
const serverVersions = require('./server-versions');
const accountRoutes = require('./account');
const modsRoutes = require('./mods');
const clientLog = require('./client-log');
const serverList = require('./serverlist');
const dbConfigRoutes = require('./db-config');

const api = express.Router();

// /api 请求日志：方法 路径 → 状态码（耗时，来源 IP）。
// 挂在 Router 最前，res 的 finish 事件在响应发完时触发，能拿到最终状态码。
// /api/health 会被前端周期性轮询，跳过以免刷屏。
api.use(function (req, res, next) {
  const start = Date.now();
  res.on('finish', function () {
    if (req.path === '/health') return;
    log.info(req.method + ' ' + req.originalUrl + ' → ' + res.statusCode +
      '（' + (Date.now() - start) + ' ms，来自 ' + clientIp(req) + '）');
  });
  next();
});

api.use(health);
api.use(clientinfo);
api.use(serverList);
api.use(accountRoutes);
api.use(clientLog);
api.use('/site-nav', siteNav);
api.use('/site-settings', siteSettings);
api.use('/server-versions', serverVersions);
api.use('/db-config', dbConfigRoutes);
api.use('/mods', modsRoutes);

module.exports = api;
