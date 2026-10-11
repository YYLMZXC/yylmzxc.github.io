'use strict';

const express = require('express');
const log = require('../logger').log;

const router = express.Router();

/* ---------------- 前端日志上报 ----------------
   浏览器侧的日志（logger.js 收集的 console 输出与报错）可通过
   面板「上报后端」按钮 POST 到这里，转手打进本进程控制台，
   排查「用户看到了什么」时不用让用户开 DevTools 截图。 */
router.post('/client-log', function (req, res) {
  const body = req.body || {};
  const logs = Array.isArray(body.logs) ? body.logs : [];
  log.info('收到前端日志上报：' + logs.length + ' 条（页面：' + (body.page || '未知') + '）');
  // 上限兜底：异常情况下前端送来超量日志也不至于刷爆控制台
  logs.slice(-200).forEach(function (e) {
    if (!e || typeof e.text !== 'string') return;
    const line = '[' + (e.time || '?') + '] [' + (e.level || 'log') + '] ' + e.text;
    if (e.level === 'error') log.error('  -> ' + line);
    else if (e.level === 'warn') log.warn('  -> ' + line);
    else log.info('  -> ' + line);
  });
  res.json({ ok: true, received: logs.length });
});

module.exports = router;
