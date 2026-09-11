/* ============================================================
   生存战争网 · mod 加载器
   站点支持「可插拔的模块化扩展」：src/ 下的每个一级子目录只要带一份 mod.json，
   就是一个 mod——它自带前端页面（由主站静态托管自动生效），可选自带后端
   （server/index.js 导出的 Router 挂进主站进程）。
   于是同一个 mod 有两种跑法，代码完全一样：
     · 被主站加载 —— 一个进程、一个端口，与主站共用 express / mysql2；
     · 独立运行   —— mod 目录里的 server/server.js 自己起服务。

   是否加载由三处决定，就近覆盖：
     1) config.json 的 mods.enabled          总开关（关掉则一个 mod 都不加载）
     2) config.json 的 mods.overrides.名称   逐 mod 指定 true / false
     3) mod.json 的 enabled                  该 mod 自己的默认值
   单个 mod 加载失败只影响它自己：主站照常运行，日志里给出原因。

   mod 后端拿到的 ctx（见 context）：
     name      mod 名（等于目录名）
     root      mod 目录绝对路径
     apiPath   接口挂载前缀
     express   宿主那份 express —— mod 不必自备依赖
     mysql     宿主那份 mysql2   —— mod 不必自备依赖
     log(...)  带 [mod:名称] 前缀的日志
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const CONFIG = require('./config');

// 站点根：本文件在 src/server/ 下，上一级 src/ 就是静态站点（也是 mod 的容器）
const WEB_ROOT = path.join(__dirname, '..');
const MANIFEST = 'mod.json';

// mod 的后端固定放在 server/ 子目录下：与前端资源分开，静态托管时整目录屏蔽
const SERVER_DIR = 'server';
const SERVER_ENTRY = 'index.js';

let records = null;   // 扫描结果：进程内只扫一次，之后各接口都读它

function logFor(name) {
  const prefix = '[mod:' + name + ']';
  return function () {
    console.log.apply(console, [prefix].concat(Array.prototype.slice.call(arguments)));
  };
}

// 是否加载：总开关 > 逐 mod 覆盖 > 清单默认值
function decide(manifest) {
  const cfg = CONFIG.mods || {};
  if (cfg.enabled === false) return false;
  const overrides = cfg.overrides || {};
  if (Object.prototype.hasOwnProperty.call(overrides, manifest.name)) {
    return !!overrides[manifest.name];
  }
  return manifest.enabled !== false;
}

// 读一份清单。name 一律以目录名为准：目录名同时是 URL 前缀与模块标识，
// 两者不一致只会带来困惑，所以清单写错时以目录名覆盖并提醒。
function readManifest(dir, folder) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8'));
  if (raw.name && raw.name !== folder) {
    console.warn('[mods] ' + folder + '/' + MANIFEST + ' 里的 name（' + raw.name +
      '）与目录名不一致，以目录名 ' + folder + ' 为准');
  }
  return {
    name: folder,
    title: raw.title || folder,
    description: raw.description || '',
    version: raw.version || '',
    entry: raw.entry || 'index.html',
    // 接口前缀默认 /<目录名>/api：mod 页面位于 /<目录名>/ 下，按目录推导正好是它
    apiPath: raw.apiPath || ('/' + folder + '/api'),
    // server 为 false 表示纯前端 mod（无后端）；其余情况默认取 server/index.js
    server: raw.server === false ? '' : (raw.server || (SERVER_DIR + '/' + SERVER_ENTRY)),
    enabled: raw.enabled !== false
  };
}

function context(rec, express, mysql) {
  return {
    name: rec.manifest.name,
    root: rec.dir,
    apiPath: rec.manifest.apiPath,
    express: express,
    mysql: mysql,
    log: logFor(rec.manifest.name)
  };
}

// 扫描 src/ 下的一级子目录，读出所有 mod（含未启用的）。重复调用只扫一次。
function scan() {
  if (records) return records;
  records = [];

  let entries;
  try {
    entries = fs.readdirSync(WEB_ROOT, { withFileTypes: true });
  } catch (e) {
    console.error('[mods] 读不出站点根目录 ' + WEB_ROOT + '：' + e.message);
    return records;
  }

  entries.forEach(function (ent) {
    if (!ent.isDirectory()) return;
    const dir = path.join(WEB_ROOT, ent.name);
    if (!fs.existsSync(path.join(dir, MANIFEST))) return;   // 没有清单就不是 mod
    let manifest;
    try {
      manifest = readManifest(dir, ent.name);
    } catch (e) {
      console.error('[mods] ' + ent.name + '/' + MANIFEST + ' 解析失败，已跳过：' + e.message);
      return;
    }
    records.push({
      dir: dir,
      manifest: manifest,
      enabled: decide(manifest),
      loaded: false,
      error: '',
      module: null,
      ctx: null
    });
  });

  return records;
}

// 把已启用 mod 的后端挂进宿主 app。这里只做同步的事（require + 建 Router），
// 需要连数据库的异步初始化留给 init()，好让宿主先把端口监听起来。
function mount(app) {
  const express = require('express');
  const mysql = require('mysql2/promise');   // 宿主自己的驱动，一并交给 mod 复用
  const mounted = [];

  scan().forEach(function (rec) {
    if (!rec.enabled) return;
    const m = rec.manifest;

    // 纯前端 mod：静态托管已经生效，没有要挂的接口
    if (!m.server) {
      rec.loaded = true;
      return;
    }

    let mod;
    try {
      mod = require(path.join(rec.dir, m.server));
    } catch (e) {
      rec.error = '后端模块加载失败：' + e.message;
      console.error('[mods] ' + m.name + ' ' + rec.error);
      return;
    }

    try {
      const ctx = context(rec, express, mysql);
      // router 可选：只提供 init 的 mod 也能跑（例如只做数据初始化）
      if (typeof mod.router === 'function') {
        const router = mod.router(ctx);
        if (router) app.use(m.apiPath, router);
      }
      rec.module = mod;
      rec.ctx = ctx;
      rec.loaded = true;
      mounted.push(m.name);
    } catch (e) {
      rec.error = '接口挂载失败：' + e.message;
      console.error('[mods] ' + m.name + ' ' + rec.error);
    }
  });

  // 同一个前缀被两个 mod 抢：后者会被前者挡住，提前说清楚，免得日后查半天
  const seen = {};
  scan().forEach(function (rec) {
    if (!rec.loaded || !rec.manifest.server) return;
    const p = rec.manifest.apiPath;
    if (seen[p]) console.warn('[mods] ' + rec.manifest.name + ' 与 ' + seen[p] +
      ' 的接口前缀都是 ' + p + '，' + seen[p] + ' 会先匹配到');
    else seen[p] = rec.manifest.name;
  });

  return mounted;
}

// 依次让已加载的 mod 做异步初始化（建库建表、补默认账号等）
async function init() {
  for (const rec of scan()) {
    if (!rec.enabled || !rec.loaded || !rec.module) continue;
    if (typeof rec.module.init !== 'function') continue;
    try {
      await rec.module.init(rec.ctx);
    } catch (e) {
      // mod 的库连不上不该拖垮主站：接口照样挂着，由 mod 自己如实回报错误，
      // 前端据此退回只读模式（导航站就是这么做的）
      rec.error = '初始化失败：' + e.message;
      console.error('[mods] ' + rec.manifest.name + ' ' + rec.error);
    }
  }
}

// 进程退出前释放 mod 持有的资源（连接池等）
async function close() {
  for (const rec of scan()) {
    if (!rec.loaded || !rec.module || typeof rec.module.close !== 'function') continue;
    try {
      await rec.module.close(rec.ctx);
    } catch (e) {
      // 退出前的清理失败不再打扰用户
    }
  }
}

// 对外状态：供 /api/mods 与启动日志使用，未启用的 mod 也在列表里（enabled=false）
function list() {
  return scan().map(function (rec) {
    const m = rec.manifest;
    return {
      name: m.name,
      title: m.title,
      description: m.description,
      version: m.version,
      entry: m.entry,
      url: '/' + m.name + '/' + m.entry,   // src/ 即站点根，mod 目录就是它的访问目录
      apiPath: m.apiPath,
      enabled: rec.enabled,
      loaded: rec.loaded,
      error: rec.error
    };
  });
}

// 静态托管必须屏蔽的相对路径前缀：mod 后端目录里放着配置（含数据库账号密码）
function protectedPaths() {
  return ['/key'].concat(scan().map(function (rec) {
    return '/' + rec.manifest.name + '/' + SERVER_DIR;
  }));
}

module.exports = {
  WEB_ROOT: WEB_ROOT,
  scan: scan,
  mount: mount,
  init: init,
  close: close,
  list: list,
  protectedPaths: protectedPaths
};
