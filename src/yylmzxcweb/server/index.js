/* ============================================================
   YYLMZXC 导航站 · mod 后端入口
   被主站加载时（见 src/server/mods.js），本文件是两者之间唯一的接触面：
     · init(ctx)   —— 建库建表、补齐默认账号
     · router(ctx) —— 返回要挂到 apiPath 下的 Express Router
     · close(ctx)  —— 进程退出前释放连接池
   ctx 由宿主提供：{ name, root, apiPath, express, mysql, log }。
   依赖（express / mysql2）由宿主交进来而不是各自 require，是为了让 mod 目录
   「丢进来就能用」：不需要自带 node_modules，整个进程里也只有一个 express 实例。
   独立运行时不走这里，见同目录 server.js。
   ============================================================ */
'use strict';

const db = require('./db');
const account = require('./account');
const createRouter = require('./api');

module.exports = {
  async init(ctx) {
    db.use(ctx.mysql);          // 用宿主那份 mysql2 驱动（独立运行时自动回退到自带依赖）
    await db.init();
    await account.init();
    ctx.log('数据库已就绪：' + db.dbName);
  },

  router(ctx) {
    return createRouter(ctx.express);
  },

  async close() {
    await db.close();
  }
};
