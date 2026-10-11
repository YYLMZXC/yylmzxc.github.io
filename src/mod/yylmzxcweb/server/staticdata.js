/* ============================================================
   YYLMZXC 导航站 · 出厂数据文件（nav-default.js）
   这一份文件的读写单独成模块，与数据库访问（db.js）分开：
     · 读：解析文件里的 window.NAV_DEFAULT，供首次启动填充数据库；
     · 写：把数据序列化成同一格式，离线页面据此独立运行。
   只做文件层面的编解码，不关心数据从哪来、到哪去。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 后端在 server/ 子目录里，上一级即前端根目录，静态数据文件在同级 res/data 下
const FILE = path.join(__dirname, '..', 'res', 'data', 'nav-default.js');

// 读取文件中的 window.NAV_DEFAULT
function read() {
  if (!fs.existsSync(FILE)) return null;
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), { window: sandbox }, { filename: FILE });
  return sandbox.NAV_DEFAULT || null;
}

// 生成与出厂数据格式完全一致的 js 文件内容
function serialize(data) {
  return '/* YYLMZXC 导航站静态数据文件（离线页面的只读数据源）。\n' +
    '   内容由「转换 → 同步到静态文件」从 MySQL 导出生成，请勿手改。 */\n' +
    'window.NAV_DEFAULT = ' + JSON.stringify(data, null, 2) + ';\n';
}

// 把数据写入静态文件，返回绝对路径
function write(data) {
  fs.writeFileSync(FILE, serialize(data), 'utf8');
  return FILE;
}

module.exports = { file: FILE, read: read, serialize: serialize, write: write };
