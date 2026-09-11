/* ============================================================
   生存战争网 · 首页「社区导航」静态数据文件（web 模式的数据源）
   这里放的是首页那几块社区导航区块，整份 JSON 存进数据库的 site_nav 表。
   本模块只管这个文件的编解码，不关心数据从哪来、到哪去：
     · 读：解析文件里的 window.SITE_NAV_DEFAULT，首次启动时用它填充数据库；
     · 写：把数据序列化成同一格式，web 模式据此独立运行（无需后端）。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 后端在 server/ 下，上一级即仓库根，站点前端在它的 src/ 里
const WEB_ROOT = path.join(__dirname, '..', 'src');
const FILE = path.join(WEB_ROOT, 'scweb_res', 'nav', 'nav-default.js');

// 对外的相对路径：写进接口回包，前端与日志都用它，避免暴露服务器绝对路径
const REL = 'scweb_res/nav/nav-default.js';

// 读取文件中的 window.SITE_NAV_DEFAULT
function read() {
  if (!fs.existsSync(FILE)) return null;
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), { window: sandbox }, { filename: FILE });
  return sandbox.SITE_NAV_DEFAULT || null;
}

// 生成与出厂数据格式完全一致的 js 文件内容
function serialize(data) {
  return '/* 生存战争网 · 首页「社区导航」静态数据文件（web 模式的数据源）。\n' +
    '   内容由「转换 → 同步到静态文件」从 MySQL 导出生成，请勿手改。 */\n' +
    'window.SITE_NAV_DEFAULT = ' + JSON.stringify(data, null, 2) + ';\n';
}

// 把数据写入静态文件，返回绝对路径
function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, serialize(data), 'utf8');
  return FILE;
}

module.exports = { file: FILE, rel: REL, root: WEB_ROOT, read: read, serialize: serialize, write: write };
