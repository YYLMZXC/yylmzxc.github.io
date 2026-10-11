/* ============================================================
   生存战争网 · 后端服务（独立进程，不依赖任何其它站点模块）
   1) 托管站点前端 src/：默认首页 index.html，
      站点导航（首页 / 关于页）数据来自 MySQL，落库在 config.json 指定的独立数据库里；
   2) 提供 /api/* 接口：站点导航的读写与导出、站点全局设置的读写、账号登录与会话；
   3) 加载 mod：src/ 下带 mod.json 的子目录（如 yylmzxcweb 导航站）按 config.json 的
      mods 段决定加载与否，其接口在本进程内挂载——于是一个进程可同时连多个库。

   本文件只做组装（composition root）与监听，各职责分在：
     routes/       各领域接口路由（routes/index.js 统一挂到 /api 下）
     logger.js     带时间戳的统一日志
     http-util.js  客户端真实 IP 还原
     bootstrap.js  空库播种（把业务默认值接进 db 的播种机制）
     db.js         数据存取（不认识任何业务数据格式）
     sitenav.js / settings.js  导航与设置的数据格式
     account.js    账号与会话   mods.js  mod 加载
   启动：在仓库根目录执行 node src/server/server.js
   （或双击 src/启动主页(带数据库).bat，脚本会把依赖装好并自动开浏览器）
   ============================================================ */
'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');
const CONFIG = require('./config');
const db = require('./db');
const bootstrap = require('./bootstrap');
const account = require('./account');
const mods = require('./mods');
const api = require('./routes');
const log = require('./logger').log;
const clientIp = require('./http-util').clientIp;

const PORT = CONFIG.server.port || 8000;

// 监听地址：默认只监听回环地址。线上由 Apache 反代 /api/ 访问本进程，
// 后端自己不需要对外暴露（config.json 里带着数据库账号密码，直接暴露公网风险大）。
// 需要在局域网内直连调试时，把 config.json 的 server.host 改成 "0.0.0.0"。
const HOST = CONFIG.server.host || '127.0.0.1';

// 域名直连（可选）：让本进程自己监听 80 / 443，由 Node 直接服务域名，
// 不再依赖 Apache / Nginx 反向代理。默认关闭；由启动脚本用环境变量注入，
// 也可以写进 config.json 的 server.domain 段。
// 证书用 PEM（Apache 的 crt / pem 可直接用）；证书链若是单独文件，用 SCWEB_TLS_CHAIN 传入，
// 会自动拼到站点证书后面，避免浏览器报「证书链不完整」。
const DOMAIN = CONFIG.server.domain || {};
function pickPort(envKey, cfgValue) {
  const v = Number(process.env[envKey] || cfgValue || 0);
  return (v > 0 && v < 65536) ? v : 0;
}
const DOMAIN_HTTP_PORT = pickPort('SCWEB_DOMAIN_HTTP_PORT', DOMAIN.httpPort);
const DOMAIN_HTTPS_PORT = pickPort('SCWEB_DOMAIN_HTTPS_PORT', DOMAIN.httpsPort);
const TLS_KEY = process.env.SCWEB_TLS_KEY || DOMAIN.key || '';
const TLS_CERT = process.env.SCWEB_TLS_CERT || DOMAIN.cert || '';
const TLS_CHAIN = process.env.SCWEB_TLS_CHAIN || DOMAIN.chain || '';

// 站点根目录：本进程在 src/server/ 下，上一级 src/ 就是整个前端
const WEB_ROOT = path.join(__dirname, '..');

const app = express();
app.use(express.json({ limit: '20mb' }));

// /api 路由：请求日志 + 各领域接口，见 routes/index.js
app.use('/api', api);

// mod 的后端接口：必须赶在静态托管之前挂上，否则会被当成文件路径。
// 加载哪些 mod 由 config.json 的 mods 段决定（见 mods.js 的 decide）。
mods.mount(app);

// 静态根里有几处绝不能对外下载的内容，必须先挡掉：
//   server/       —— 主站自身的后端目录（现已随代码移入 src/server/），含数据库账号密码
//   key/          —— 网站证书与私钥（域名直连用）
//   <mod>/server/ —— 各 mod 的后端目录，含 config.json 里的数据库账号密码
// 前缀清单由 mods.protectedPaths() 给出；再兜底一层：任何 .key / .pem 一律不给。
app.use(function (req, res, next) {
  let p = req.path.toLowerCase();
  try { p = decodeURIComponent(p); } catch (e) { /* 编码异常就按原样判断 */ }
  const blocked = mods.protectedPaths().some(function (prefix) {
    return p === prefix || p.indexOf(prefix + '/') === 0;
  }) || /\.(key|pem)$/.test(p);
  if (blocked) {
    log.warn('已拦截敏感路径访问：' + req.method + ' ' + req.originalUrl + '（来自 ' + clientIp(req) + '）');
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  next();
});

// 静态资源：整个前端目录 src/；目录请求默认由 static 用同级 index.html 响应，
// 故 / 即主站首页 index.html
app.use(express.static(WEB_ROOT, { extensions: ['html'], index: 'index.html' }));

// 404 兜底：走到这里的都是「接口没有、文件也没有」的请求。
// 之前控制台里 /api/site-settings、/api/session 的 404 是浏览器报的，
// 后端自己一声不吭；记下来才能看出「请求到底有没有到达后端」。
app.use(function (req, res) {
  log.warn('404：' + req.method + ' ' + req.originalUrl + '（来自 ' + clientIp(req) + '）');
  res.status(404).type('text/plain').send('Not Found');
});

// 读取 HTTPS 证书；链文件单独给出时拼到站点证书后面，形成完整链
function tlsMaterial() {
  const cert = fs.readFileSync(TLS_CERT);
  if (!TLS_CHAIN) return { key: fs.readFileSync(TLS_KEY), cert: cert };
  return {
    key: fs.readFileSync(TLS_KEY),
    cert: Buffer.concat([cert, Buffer.from('\n'), fs.readFileSync(TLS_CHAIN)])
  };
}

(async function start() {
  try {
    // 播种器（bootstrap.seed）只在这里递给 db：空库初始化与删库自愈重播都由它决定
    await db.init(bootstrap.seed);
    await account.init();       // 账号表为空时建默认账号（见 config.json 的 auth 段）
  } catch (e) {
    // 启动失败是最需要看清楚的时刻：把毛病、环节、目标、原始报错、建议一次列全
    const d = db.explain(e, 'connect');
    console.error('');
    console.error('数据库初始化失败：' + d.reason);
    console.error('  · 毛病的类型：' + d.label);
    console.error('  · 出错的环节：' + (d.stageText || '连接数据库'));
    console.error('  · 连接的目标：' + d.target + '（' + d.configFile + '）');
    console.error('  · 原始报错：' + (d.detail || '（无）') + ' [' + d.code + ']');
    console.error('  · 处理建议：' + d.hint);
    console.error('');
    process.exit(1);
  }

  // mod 各自的库连不上不该拖垮主站：接口照样挂着，由各 mod 如实回报错误，
  // 前端据此退回只读（导航站就是这么处理的）。失败原因见日志与 /api/mods。
  await mods.init();

  app.listen(PORT, HOST, function () {
    console.log('数据库已连接：' + db.dbName + '（接口与页面都由本进程提供，健康检查 http://' + HOST + ':' + PORT + '/api/health）');
    const loaded = mods.list().filter(function (m) { return m.loaded; });
    console.log('已加载 mod：' + (loaded.length
      ? loaded.map(function (m) { return m.name + ' → http://' + HOST + ':' + PORT + m.url; }).join('，')
      : '（无）'));
  });

  // 域名直连：Node 自己监听 80 / 443，不再需要 Apache 反代
  if (DOMAIN_HTTP_PORT) {
    http.createServer(app).listen(DOMAIN_HTTP_PORT, function () {
      console.log('HTTP 已直接监听 ' + DOMAIN_HTTP_PORT + ' 端口');
    }).on('error', function (e) {
      console.error('监听 ' + DOMAIN_HTTP_PORT + ' 端口失败：' + e.message);
    });
  }

  if (DOMAIN_HTTPS_PORT) {
    if (!TLS_KEY || !TLS_CERT) {
      console.error('已要求监听 ' + DOMAIN_HTTPS_PORT + ' 端口，但没有配置证书（key / cert），HTTPS 未启动。');
    } else {
      try {
        https.createServer(tlsMaterial(), app).listen(DOMAIN_HTTPS_PORT, function () {
          console.log('HTTPS 已直接监听 ' + DOMAIN_HTTPS_PORT + ' 端口');
        }).on('error', function (e) {
          console.error('监听 ' + DOMAIN_HTTPS_PORT + ' 端口失败：' + e.message);
        });
      } catch (e) {
        console.error('证书读取失败：' + e.message + '（请检查配置里的证书路径）');
      }
    }
  }
})();

// 退出前让各 mod 释放自己占用的资源（数据库连接池等）
['SIGINT', 'SIGTERM'].forEach(function (sig) {
  process.on(sig, function () {
    log.info('收到 ' + sig + '，正在关闭…');
    mods.close().then(function () {
      log.info('已退出');
      process.exit(0);
    }, function () { process.exit(0); });
  });
});
