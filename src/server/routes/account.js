/* ============================================================
   生存战争网 · /api/login、/api/session、/api/logout、/api/account
   账号与会话的路由。凭据只在数据库里，浏览器侧不保存账号密码：
   登录成功下发一个 HttpOnly 会话 Cookie，令牌落库、可被撤销。
   密码哈希与会话策略见 account.js，这里只做 HTTP 编排。
   ============================================================ */
'use strict';

const express = require('express');
const account = require('../account');
const log = require('../logger').log;
const clientIp = require('../http-util').clientIp;
const helpers = require('./helpers');

const failDb = helpers.failDb;

const router = express.Router();

router.post('/login', async function (req, res) {
  const body = req.body || {};
  try {
    const r = await account.login(body.user, body.pass);
    if (!r) {
      log.warn('登录失败：账号「' + body.user + '」或密码不对（来自 ' + clientIp(req) + '）');
      res.status(401).json({ ok: false, error: '账号或密码错误' });
      return;
    }
    account.setCookie(res, r.token);
    log.info('登录成功：' + r.user + '（来自 ' + clientIp(req) + '）');
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, user: r.user });
  } catch (e) {
    failDb(res, e, 'POST /api/login');
  }
});

// 查询当前登录态：页面启动时确认会话是否仍然有效
router.get('/session', async function (req, res) {
  try {
    const s = await account.session(account.tokenOf(req));
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, loggedIn: s.loggedIn, user: s.user });
  } catch (e) {
    failDb(res, e, 'GET /api/session');
  }
});

router.post('/logout', async function (req, res) {
  try {
    const s = await account.session(account.tokenOf(req));
    await account.logout(account.tokenOf(req));
    account.clearCookie(res);
    log.info('已登出：' + (s.loggedIn ? s.user : '（会话已失效）') + '（来自 ' + clientIp(req) + '）');
    res.json({ ok: true });
  } catch (e) {
    failDb(res, e, 'POST /api/logout');
  }
});

// 修改账号 / 密码（需已登录 + 当前密码）
router.post('/account', async function (req, res) {
  try {
    const r = await account.update(account.tokenOf(req), req.body || {});
    log.info('账号信息已更新（新用户名：' + r.user + '，来自 ' + clientIp(req) + '）');
    res.json({ ok: true, user: r.user });
  } catch (e) {
    // 校验类错误（密码不对、账号为空）自带 status，按原样回报；
    // 其余多半是连不上数据库，交给统一诊断。
    if (e.status) {
      log.warn('账号信息更新被拒绝：' + e.message + '（来自 ' + clientIp(req) + '）');
      res.status(e.status).json({ ok: false, error: e.message });
      return;
    }
    failDb(res, e, 'POST /api/account');
  }
});

module.exports = router;
