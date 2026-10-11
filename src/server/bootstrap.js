/* ============================================================
   生存战争网 · 空库播种
   首次启动（以及删库自愈重建）时该往 site_nav / site_settings 里放什么，
   只有业务模块知道：导航的初始值在静态文件里（sitenav.read），
   设置的初始值在 site-config.js 里（settings.defaults）。
   db.js 不认识任何业务数据格式，只提供「查空 + 写入」的机制（依赖倒置）：
   由本模块在这里把两者接到一起，server.js 启动时把 seed 交给 db.init。
   ============================================================ */
'use strict';

const sitenav = require('./sitenav');
const settings = require('./settings');

// tables 由 db.js 在建表之后递进来：isEmpty(表名) 查单行 JSON 表是否为空，
// write(表名, 数据) 直接拿当前连接写一行（初始化期间不能走常规入口，见 db.js）。
async function seed(tables) {
  // 站点导航（首页 / 关于页）在首次启动时用静态文件填一次，
  // 否则数据库模式下第一次打开页面会是空的。
  if (await tables.isEmpty('site_nav')) {
    const sd = sitenav.read();
    if (sd) {
      await tables.write('site_nav', sitenav.normalize(sd) || sd);
      console.log('已用静态数据文件初始化站点导航');
    }
  }

  // 站点全局设置同理：空库时用 site-config.js 里的默认值填一次
  if (await tables.isEmpty('site_settings')) {
    await tables.write('site_settings', settings.defaults());
    console.log('已用 site-config.js 的默认值初始化站点设置');
  }
}

module.exports = { seed: seed };
