/* ============================================================
   YYLMZXC 导航站 · 独立运行入口
   让导航站脱离主站也能单独跑起来：只托管本目录（mod 自己的前端），
   接口挂在 /api 与 /yylmzxcweb/api 两个前缀下，数据落库到自己的库。
   被主站加载时不走这里（那时由主站的 src/server/mods.js 统一编排）：
   接口实现见 api.js，mod 入口见 index.js。
   启动：在 yylmzxcweb/ 目录下执行 node server/server.js
   ============================================================ */
'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');
const CONFIG = require('./config');
const db = require('./db');
const account = require('./account');
const createRouter = require('./api');
const MANIFEST = require('../mod.json');

const PORT = CONFIG.server.port || 8000;

// 监听地址：默认只监听回环地址。线上由 Apache 反代 /api/ 访问本进程，
// 后端自己不需要对外暴露（config.json 里带着默认账号密码，直接暴露公网风险大）。
// 需要在局域网内直连调试时，把 config.json 的 server.host 改成 "0.0.0.0"。
const HOST = CONFIG.server.host || '127.0.0.1';

// 域名直连（可选）：让本进程自己监听 80 / 443，由 Node 直接服务域名，
// 不再依赖 Apache / Nginx 反向代理。默认关闭；由启动脚本用环境变量注入，
// 也可以写进 config.json 的 server.domain 段。
// 证书用 PEM（Apache 的 crt / pem 可直接用）；证书链若是单独文件，用 NAV_TLS_CHAIN 传入，
// 会自动拼到站点证书后面，避免浏览器报「证书链不完整」。
const DOMAIN = CONFIG.server.domain || {};
function pickPort(envKey, cfgValue) {
  const v = Number(process.env[envKey] || cfgValue || 0);
  return (v > 0 && v < 65536) ? v : 0;
}
const DOMAIN_HTTP_PORT = pickPort('NAV_DOMAIN_HTTP_PORT', DOMAIN.httpPort);
const DOMAIN_HTTPS_PORT = pickPort('NAV_DOMAIN_HTTPS_PORT', DOMAIN.httpsPort);
const TLS_KEY = process.env.NAV_TLS_KEY || DOMAIN.key || '';
const TLS_CERT = process.env.NAV_TLS_CERT || DOMAIN.cert || '';
const TLS_CHAIN = process.env.NAV_TLS_CHAIN || DOMAIN.chain || '';

// 单独运行时只服务 mod 自己（本目录即站点根），首页就是 mod.json 里的 entry
const WEB_ROOT = path.join(__dirname, '..');
const INDEX = MANIFEST.entry || 'index.html';

const app = express();
app.use(express.json({ limit: '20mb' }));

// 接口：同时挂在两个前缀下，页面无论从域名根还是从子目录访问都能找到后端
//   /api/*            —— 页面按目录推导出的基路径（见 res/js/api.js）
//   /yylmzxcweb/api/* —— 与主站加载时一致的地址，便于同一份反代配置两边通用
const MOD_NAME = MANIFEST.name || path.basename(WEB_ROOT);
app.use(['/api', '/' + MOD_NAME + '/api'], createRouter(express));

// 静态根是 mod 目录，其中有两处绝不能对外下载的内容，必须先挡掉：
//   server/ —— 后端自身，含 config.json 里的数据库账号密码
//   key/    —— 域名直连用的网站证书与私钥
// 再兜底一层：任何 .key / .pem 一律不给。
app.use(function (req, res, next) {
  let p = req.path.toLowerCase();
  try { p = decodeURIComponent(p); } catch (e) { /* 编码异常就按原样判断 */ }
  const blocked = p === '/server' || p.indexOf('/server/') === 0 ||
    p === '/key' || p.indexOf('/key/') === 0 ||
    /\.(key|pem)$/.test(p);
  if (blocked) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  next();
});

// 静态资源：mod 目录本身；目录请求默认用 INDEX 响应，故 / 就是导航首页
app.use(express.static(WEB_ROOT, { extensions: ['html'], index: INDEX }));

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
    await db.init();
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
  app.listen(PORT, HOST, function () {
    console.log('数据库已连接：' + db.dbName);
    console.log('导航站（独立运行）已启动：http://' + HOST + ':' + PORT + '/' +
      (INDEX === 'index.html' ? '' : INDEX));
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
