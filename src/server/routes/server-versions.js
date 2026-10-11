/* ============================================================
   生存战争网 · /api/server-versions 服务器版本列表
   联机服务器页版本下拉的可选项（x26.07.30 / x26.06.19 等），
   整份 JSON 存在 site_versions 表里。
   读接口开放（每个访客都要按它渲染版本下拉），
   写接口要求已登录——这里改的是「所有访客看到的版本列表」，
   且只有连上数据库才可能保存成功：没后端时前端按只读处理。
   ============================================================ */
'use strict';

const express = require('express');
const db = require('../db');
const versions = require('../versions');
const log = require('../logger').log;
const clientIp = require('../http-util').clientIp;
const helpers = require('./helpers');

const failDb = helpers.failDb;
const requireLogin = helpers.requireLogin;

const router = express.Router();

// 读接口开放：每个访客都要按它渲染版本下拉；库里还没有时回出厂默认
router.get('/', async function (req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await db.loadServerVersions();
    res.json({ ok: true, data: versions.normalize(data || versions.defaults()) });
  } catch (e) {
    failDb(res, e, 'GET /api/server-versions');
  }
});

// 整份覆盖保存：缺项 / 脏值由 versions.normalize 补齐，前端不必自己做校验
router.put('/', async function (req, res) {
  const data = versions.normalize(req.body);
  try {
    const s = await requireLogin(req, res, '请先登录后再修改版本列表');
    if (!s) { log.warn('PUT /api/server-versions：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }
    await db.saveServerVersions(data);
    log.info('服务器版本列表已保存（操作者：' + s.user + '）：' + JSON.stringify(data));
    res.json({ ok: true, data: data });
  } catch (e) {
    failDb(res, e, 'PUT /api/server-versions');
  }
});

module.exports = router;
