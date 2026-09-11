/* ============================================================
   生存战争网 · 站点导航静态数据文件（web 模式的数据源）
   这里放的是首页与关于页的导航区块，整份 JSON 存进数据库的 site_nav 表。
   分组用 page 字段标明归属页面（见 PAGES），一个页面只渲染自己那一份。
   本模块只管这个文件的编解码与格式规整，不关心数据从哪来、到哪去：
     · 读：解析文件里的 window.SITE_NAV_DEFAULT，首次启动时用它填充数据库；
     · 写：把数据序列化成同一格式，web 模式据此独立运行（无需后端）；
     · 规整：normalize 收拾脏数据，upgrade 把 v1 老数据升级成多页面格式。
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

// 数据里允许出现的页面身份，与前端 NavStore.PAGES 一致；写别的都归到首页
const PAGES = ['index', 'about'];

// v1：只有首页，分组没有 page 字段；v2：分组带 page（首页 + 关于页）
const CURRENT_VERSION = 2;

// 读取文件中的 window.SITE_NAV_DEFAULT
function read() {
  if (!fs.existsSync(FILE)) return null;
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), { window: sandbox }, { filename: FILE });
  return sandbox.SITE_NAV_DEFAULT || null;
}

// 生成与前端数据格式一致的 js 文件内容
function serialize(data) {
  return '/* 生存战争网 · 站点导航静态数据文件（web 模式的数据源）。\n' +
    '   内容由「转换 → 同步到静态文件」从 MySQL 导出生成，请勿手改。\n' +
    '   分组用 page 字段标明归属：index（首页）/ about（关于页）。 */\n' +
    'window.SITE_NAV_DEFAULT = ' + JSON.stringify(data, null, 2) + ';\n';
}

// 把数据写入静态文件，返回绝对路径
function write(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, serialize(data), 'utf8');
  return FILE;
}

/**
 * 把任意来路的数据规整成当前格式（规则与前端 NavStore.normalize 一致）：
 * 分组补 page 字段、缺 id / 名称的兜底，链接剔掉没有网址的。
 * 写接口用它挡住脏数据：能过这一关的才允许落库。
 * @returns {Object|null} null 表示这份数据根本不能用
 */
function normalize(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.groups)) return null;

  const data = JSON.parse(JSON.stringify(input));
  data.version = CURRENT_VERSION;
  data.title = String(data.title || '站点导航');

  data.groups = data.groups.filter(function (g) {
    return g && typeof g === 'object';
  }).map(function (g, gi) {
    g.id = String(g.id || ('g' + (gi + 1)));
    g.page = PAGES.indexOf(String(g.page)) >= 0 ? String(g.page) : PAGES[0];
    if (!g.name && !g.key) g.name = '未命名分组';

    g.links = (Array.isArray(g.links) ? g.links : []).filter(function (l) {
      return l && typeof l === 'object' && l.url;
    }).map(function (l, li) {
      l.id = String(l.id || (g.id + '-' + (li + 1)));
      l.url = String(l.url);
      l.title = String(l.title || l.url);
      l.key = l.key ? String(l.key) : '';
      l.external = l.external !== false;
      return l;
    });

    return g;
  });

  return data;
}

/**
 * 老数据升级：v1 只有首页（分组没有 page 字段），这里补上字段；
 * 若整份数据里一条关于页分组都没有 —— 那正是 v1 时期的数据 ——
 * 用静态文件里的出厂分组补齐，省得管理员在库里重新录一遍。
 * @returns {{data:Object|null, changed:boolean}} changed 为 true 时调用方应顺手落库
 */
function upgrade(input) {
  const data = normalize(input);
  if (!data) return { data: null, changed: false };

  let changed = Number(input.version) !== CURRENT_VERSION;
  if ((input.groups || []).some(function (g) { return !g.page; })) changed = true;

  if (!data.groups.some(function (g) { return g.page === 'about'; })) {
    const seed = read();
    const about = (seed && Array.isArray(seed.groups))
      ? seed.groups.filter(function (g) { return g.page === 'about'; })
      : [];
    about.forEach(function (g) { data.groups.push(JSON.parse(JSON.stringify(g))); });
    if (about.length) changed = true;
  }

  return { data: data, changed: changed };
}

module.exports = {
  file: FILE,
  rel: REL,
  root: WEB_ROOT,
  pages: PAGES,
  version: CURRENT_VERSION,
  read: read,
  serialize: serialize,
  write: write,
  normalize: normalize,
  upgrade: upgrade
};
