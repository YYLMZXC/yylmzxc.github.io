/* ============================================================
   生存战争网 · 路由共用件
   failDb：数据库类报错的统一回应——把「哪种毛病 / 卡在哪一步 / 怎么处理」
           一起交给前端，控制台同时留下完整诊断（见 db-diagnosis.js）。
           前端据此区分「服务没开」「账号不对」「没授权」这些不同情况。
   requireLogin：写操作的统一门槛——未登录直接回 401，前端据此弹出
           「请先登录」的提示。返回登录态对象；未登录时已自行回应，
           调用方看到 falsy 直接 return 即可。
   ============================================================ */
'use strict';

const db = require('../db');
const account = require('../account');

function failDb(res, e, tag) {
  const d = db.explain(e);
  console.error('[' + tag + '] ' + d.label + '：' + d.reason +
    (d.stageText ? '（环节：' + d.stageText + '）' : '') +
    (d.hint ? '（建议：' + d.hint + '）' : ''));
  res.status(d.kind === 'unknown' ? 500 : 503).json({
    ok: false,
    error: d.reason,
    code: d.code,
    kind: d.kind,
    label: d.label,
    stage: d.stageText,
    target: d.target,
    hint: d.hint,
    detail: d.detail
  });
}

async function requireLogin(req, res, message) {
  const s = await account.session(account.tokenOf(req));
  if (!s.loggedIn) {
    res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: message || '请先登录后再操作' });
    return null;
  }
  return s;
}

module.exports = { failDb: failDb, requireLogin: requireLogin };
