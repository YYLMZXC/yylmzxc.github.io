/* ============================================================
   生存战争网 · /api/health 健康检查
   真的探一次数据库。库 / 表被删掉时如实回答 false，
   前端才会显示「未连接」并转成只读，而不是显示正常却每次保存都失败。
   不通时连「为什么不通」一并返回（见 db.health），前端才能提示到点子上。
   ============================================================ */
'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/health', async function (req, res) {
  const h = await db.health();
  if (!h.ok) {
    console.error('[GET /api/health] ' + h.label + '：' + h.reason +
      (h.stageText ? '（环节：' + h.stageText + '）' : ''));
  }
  res.set('Cache-Control', 'no-store');
  res.json(h);
});

module.exports = router;
