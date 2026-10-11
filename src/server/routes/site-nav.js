/* ============================================================
   生存战争网 · /api/site-nav 站点导航数据（首页 / 关于页）
   整份 JSON 存在 site_nav 表里，分组用 page 字段区分页面；
   读接口开放（首页与关于页任何人都要能看到导航），写接口要求已登录。
   「数据长什么样」（normalize / upgrade）是导航自己的事（见 sitenav.js），
   db 只管存取，这里负责把两者接起来。
   ============================================================ */
'use strict';

const express = require('express');
const db = require('../db');
const sitenav = require('../sitenav');
const log = require('../logger').log;
const clientIp = require('../http-util').clientIp;
const helpers = require('./helpers');

const failDb = helpers.failDb;
const requireLogin = helpers.requireLogin;

const router = express.Router();

// 读库 + 老数据升级：v1 只有首页，读到就顺手升级为多页面格式并落库一次，
// 之后读到的就是当前格式。
async function loadSiteNav() {
  const d = await db.loadSiteNav();
  if (!d || !Array.isArray(d.groups)) return null;
  const up = sitenav.upgrade(d);
  if (up.changed) {
    await db.saveSiteNav(up.data);
    log.info('已把 site_nav 里的老数据升级为多页面格式（首页 + 关于页）');
  }
  return up.data;
}

// 读接口开放：首页与关于页任何人都要能看到导航
router.get('/', async function (req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, data: await loadSiteNav() });
  } catch (e) {
    failDb(res, e, 'GET /api/site-nav');
  }
});

// 整份覆盖保存：分组页号 / 缺项由 sitenav.normalize 规整，前端不必自己做校验
router.put('/', async function (req, res) {
  const data = sitenav.normalize(req.body);
  if (!data) {
    res.status(400).json({ ok: false, error: '数据格式不正确' });
    return;
  }
  try {
    const s = await requireLogin(req, res, '请先登录后再修改导航数据');
    if (!s) { log.warn('PUT /api/site-nav：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }
    await db.saveSiteNav(data);
    let links = 0;
    data.groups.forEach(function (g) { links += (g.links || []).length; });
    log.info('站点导航已保存：' + data.groups.length + ' 组 / ' + links + ' 条链接（操作者：' + s.user + '）');
    res.json({ ok: true });
  } catch (e) {
    failDb(res, e, 'PUT /api/site-nav');
  }
});

// 数据库 → 静态前端：把站点导航（首页 + 关于页）固化成 web 模式的数据文件，
// 使站点脱离数据库也能照常显示导航（不传 data 时直接取库里的数据写入）
router.post('/to-static', async function (req, res) {
  try {
    const s = await requireLogin(req, res, '请先登录后再修改导航数据');
    if (!s) { log.warn('POST /api/site-nav/to-static：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }
    const body = req.body || {};
    const data = sitenav.normalize(body.data) || await loadSiteNav();
    if (!data || !Array.isArray(data.groups)) {
      res.status(400).json({ ok: false, error: '没有可导出的数据' });
      return;
    }
    sitenav.write(data);
    let links = 0;
    data.groups.forEach(function (g) { links += (g.links || []).length; });
    log.info('站点导航已固化到静态文件：' + sitenav.rel + '（' + data.groups.length + ' 组 / ' + links + ' 条链接，操作者：' + s.user + '）');
    res.json({
      ok: true,
      file: sitenav.rel,
      groups: data.groups.length,
      links: links,
      data: data   // 回传实际写入文件的数据，前端据此同步本机副本
    });
  } catch (e) {
    failDb(res, e, 'POST /api/site-nav/to-static');
  }
});

// 静态前端 → 数据库：把 nav-default.js 的数据整份导入 site_nav 表（覆盖库里的旧数据）。
// 空库播种只在表为空时发生，库里有旧数据时切换到 db 模式看到的仍是旧内容，
// 这条接口就是给「web 模式的数据比数据库新」的场景一个手动搬移的入口。
router.post('/from-static', async function (req, res) {
  try {
    const s = await requireLogin(req, res, '请先登录后再修改导航数据');
    if (!s) { log.warn('POST /api/site-nav/from-static：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }
    const data = sitenav.normalize(sitenav.read());
    if (!data || !Array.isArray(data.groups)) {
      res.status(400).json({ ok: false, error: '静态数据文件不可用（scweb_res/nav/nav-default.js 缺失或格式不正确）' });
      return;
    }
    await db.saveSiteNav(data);
    let links = 0;
    data.groups.forEach(function (g) { links += (g.links || []).length; });
    log.info('已用静态文件覆盖数据库导航：' + sitenav.rel + ' → site_nav（' + data.groups.length + ' 组 / ' + links + ' 条链接，操作者：' + s.user + '）');
    res.json({
      ok: true,
      file: sitenav.rel,
      groups: data.groups.length,
      links: links,
      data: data   // 回传实际入库的数据，前端据此刷新页面与本地镜像
    });
  } catch (e) {
    failDb(res, e, 'POST /api/site-nav/from-static');
  }
});

module.exports = router;
