/* ============================================================
   生存战争网 · /api/site-settings 站点全局设置
   启用 BGM / 自动播放 / 看板娘 / 默认主题，整份 JSON 存在 site_settings 表里。
   读接口开放（每个访客都要按它决定 BGM / 看板娘 / 主题），
   写接口要求已登录——这里改的是「所有访客的默认值」。
   前端会把读到的一份缓存在本地，连不上后端时用缓存兜底。
   ============================================================ */
'use strict';

const express = require('express');
const db = require('../db');
const siteSettings = require('../settings');
const log = require('../logger').log;
const clientIp = require('../http-util').clientIp;
const helpers = require('./helpers');

const failDb = helpers.failDb;
const requireLogin = helpers.requireLogin;

const router = express.Router();

// 读接口开放：每个访客都要按它决定 BGM / 看板娘 / 主题
router.get('/', async function (req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await db.loadSiteSettings();
    res.json({ ok: true, data: siteSettings.normalize(data || siteSettings.defaults()) });
  } catch (e) {
    failDb(res, e, 'GET /api/site-settings');
  }
});

// 整份覆盖保存：缺项 / 脏值由 settings.normalize 补齐，前端不必自己做校验
router.put('/', async function (req, res) {
  const data = siteSettings.normalize(req.body);
  try {
    const s = await requireLogin(req, res, '请先登录后再修改站点设置');
    if (!s) { log.warn('PUT /api/site-settings：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }
    await db.saveSiteSettings(data);
    log.info('站点设置已保存（操作者：' + s.user + '）：' + JSON.stringify(data));
    res.json({ ok: true, data: data });
  } catch (e) {
    failDb(res, e, 'PUT /api/site-settings');
  }
});

module.exports = router;
