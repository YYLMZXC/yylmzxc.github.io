/* ============================================================
   生存战争网 · 站点全局设置的静态默认值
   五项全局设置（启用 BGM / 自动播放 / 看板娘 / 默认主题 / 导航数据来源）落库在 site_settings 表，
   数据库为空（首次启动）时用这里的默认值填充。

   默认值与 site-config.js 同源：这里直接解析那份文件里的 window.SITE_CONFIG，
   前端在 web 模式（无后端）下也读同一份文件，两边不会各说各话。
   本模块只管「默认值是什么 / 一份设置算不算合法」，不碰数据库，
   存取见 db.js，路由见 server.js。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 后端在 src/server/ 下，上一级 src/ 即站点前端根
const WEB_ROOT = path.join(__dirname, '..');
const FILE = path.join(WEB_ROOT, 'site-config.js');
const REL = 'site-config.js';

const THEMES = ['light', 'dark', 'wk-light', 'wk-dark'];
const FALLBACK_THEME = 'wk-light';

// 导航数据来源：web 只读静态文件，db 走数据库
const NAV_MODES = ['web', 'db'];
const FALLBACK_NAV_MODE = 'web';

// 读取 site-config.js 里的 window.SITE_CONFIG
function siteConfig() {
  if (!fs.existsSync(FILE)) return {};
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), { window: sandbox }, { filename: FILE });
  return sandbox.SITE_CONFIG || {};
}

function normalizeTheme(t) {
  const v = String(t || '');
  return THEMES.indexOf(v) >= 0 ? v : FALLBACK_THEME;
}

function normalizeNavMode(m) {
  const v = String(m || '');
  return NAV_MODES.indexOf(v) >= 0 ? v : FALLBACK_NAV_MODE;
}

// 出厂默认：site-config.js 里没写就是「开着」（与前端旧行为一致）
function defaults() {
  const c = siteConfig();
  const bgm = c.bgm || {};
  const live2d = c.live2d || {};
  const nav = c.nav || {};
  return {
    bgmEnabled: bgm.enabled !== false,
    bgmAutoPlay: bgm.autoPlay !== false,
    live2dEnabled: live2d.enabled !== false,
    defaultTheme: normalizeTheme(c.defaultTheme),
    navMode: normalizeNavMode(nav.mode)
  };
}

function bool(v, fallback) {
  return typeof v === 'boolean' ? v : fallback;
}

// 把任意来路的数据整理成一份合法的全局设置（缺项 / 脏值一律用默认值补齐）
function normalize(input) {
  const d = defaults();
  const o = input || {};
  return {
    bgmEnabled: bool(o.bgmEnabled, d.bgmEnabled),
    bgmAutoPlay: bool(o.bgmAutoPlay, d.bgmAutoPlay),
    live2dEnabled: bool(o.live2dEnabled, d.live2dEnabled),
    defaultTheme: normalizeTheme(o.defaultTheme || d.defaultTheme),
    navMode: normalizeNavMode(o.navMode || d.navMode)
  };
}

module.exports = {
  file: FILE,
  rel: REL,
  root: WEB_ROOT,
  themes: THEMES,
  navModes: NAV_MODES,
  defaults: defaults,
  normalize: normalize
};
