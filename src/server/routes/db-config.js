/* ============================================================
   生存战争网 · /api/db-config 数据库连接配置（设置面板「🗄️ 数据库」分区用）
   MySQL 的地址 / 端口 / 库名 / 账号密码原本只能手改 src/server/config.json，
   这里把它搬到界面里：读接口回显当前配置（密码绝不回明文，只说有没有），
   写接口先拿新参数试连 —— 连得上才写回 config.json 并重建连接池，
   免得改错一个字符就把后端弄到再也起不来。
   两个接口都要求已登录：数据库凭据是敏感信息。
   ============================================================ */
'use strict';

const express = require('express');
const mysql = require('mysql2/promise');
const CONFIG = require('../config');
const db = require('../db');
const dbDiagnosis = require('../db-diagnosis');
const log = require('../logger').log;
const clientIp = require('../http-util').clientIp;
const helpers = require('./helpers');

const failDb = helpers.failDb;
const requireLogin = helpers.requireLogin;

const router = express.Router();

// 回显当前配置（密码除外）：host / port / user / database / hasPassword
router.get('/', async function (req, res) {
  try {
    const s = await requireLogin(req, res, '请先登录后再查看数据库配置');
    if (!s) { log.warn('GET /api/db-config：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }
    const m = CONFIG.mysql;
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      data: {
        host: m.host,
        port: m.port,
        user: m.user,
        database: m.database || 'scweb',
        hasPassword: !!m.password
      }
    });
  } catch (e) {
    failDb(res, e, 'GET /api/db-config');
  }
});

// 保存新配置：试连通过才生效。body：{ host, port, user, password, database }，
// password 留空表示沿用现有密码（读接口不回明文，前端也没法回填）。
router.post('/', async function (req, res) {
  try {
    const s = await requireLogin(req, res, '请先登录后再修改数据库配置');
    if (!s) { log.warn('POST /api/db-config：未登录，已拒绝（来自 ' + clientIp(req) + '）'); return; }

    const body = req.body || {};
    const host = String(body.host || '').trim();
    const port = Number(body.port);
    const user = String(body.user || '').trim();
    const database = String(body.database || '').trim();
    const password = (body.password === undefined || body.password === null) ? '' : String(body.password);

    if (!host || !user || !database) {
      res.status(400).json({ ok: false, error: '主机、账号与库名都不能为空' });
      return;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      res.status(400).json({ ok: false, error: '端口必须是 1 ~ 65535 的整数' });
      return;
    }

    const next = {
      host: host,
      port: port,
      user: user,
      database: database,
      password: password === '' ? CONFIG.mysql.password : password
    };

    // 先试连：不指定库、不建库，只验证「地址通不通、账号密码对不对」。
    // 库不存在不算失败——init() 的自愈会建库建表并播种，与 config.json 手改一致。
    const probe = dbDiagnosis.create(next.database);
    let conn = null;
    try {
      conn = await mysql.createConnection({
        host: next.host,
        port: next.port,
        user: next.user,
        password: next.password,
        connectTimeout: 5000
      });
      await conn.query('SELECT 1');
    } catch (e) {
      const d = probe.diagnose(e, 'connect');
      log.warn('数据库配置试连失败（' + next.user + '@' + next.host + ':' + next.port + '）：' + d.reason);
      res.status(400).json({
        ok: false,
        error: '新配置试连失败：' + d.reason,
        hint: d.hint,
        kind: d.kind,
        label: d.label,
        reason: d.reason,
        detail: d.detail
      });
      return;
    } finally {
      if (conn) { try { await conn.end(); } catch (e) { /* 探针连接，关不掉也无妨 */ } }
    }

    // 试连通过才真正生效：原地改 config（立刻可见）+ 写回文件（重启后仍是新值）
    CONFIG.saveMysql(next);
    await db.reset();
    await db.init();   // 按新参数建库建表；新库为空时 seedHook 会自动播种

    log.info('数据库配置已更新并重连：' + next.user + '@' + next.host + ':' + next.port +
      '/' + next.database + '（操作者：' + s.user + '）');
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      data: {
        host: next.host,
        port: next.port,
        user: next.user,
        database: next.database,
        hasPassword: !!next.password
      }
    });
  } catch (e) {
    // 试连已验证过凭据，这里失败多半是建库 / 写文件环节；如实转述诊断
    failDb(res, e, 'POST /api/db-config');
  }
});

module.exports = router;
