/* ============================================================
   生存战争网 · 后端服务（独立进程，不依赖任何其它站点模块）
   1) 托管站点前端 src/：默认首页 index.html，
      站点导航（首页 / 关于页）数据来自 MySQL，落库在 config.json 指定的独立数据库里；
   2) 提供 /api/* 接口：站点导航的读写与导出、站点全局设置的读写、账号登录与会话；
   3) 加载 mod：src/ 下带 mod.json 的子目录（如 yylmzxcweb 导航站）按 config.json 的
      mods 段决定加载与否，其接口在本进程内挂载——于是一个进程可同时连多个库。
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
const sitenav = require('./sitenav');
const siteSettings = require('./settings');
const account = require('./account');
const mods = require('./mods');

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

// 接口路由集中在一个 Router 里，文件末尾统一挂到 /api 下
const api = express.Router();

// 数据库类报错统一回应：把「哪种毛病 / 卡在哪一步 / 怎么处理」一起交给前端，
// 控制台同时留下完整诊断。前端据此区分「服务没开」「账号不对」「没授权」这些不同情况。
function failDb(res, e, tag) {
  const d = db.explain(e);
  console.error('[' + tag + '] ' + d.label + '：' + d.reason +
    (d.stageText ? '（环节：' + d.stageText + '）' : '') +
    (d.hint ? '（建议：' + d.hint + '）' : ''));
  res.status(d.kind === 'unknown' ? 500 : 503).json({
    ok: false,
    error: d.reason,
    code: d.code,
    kind: d.kind,
    label: d.label,
    stage: d.stageText,
    target: d.target,
    hint: d.hint,
    detail: d.detail
  });
}

// 健康检查：真的探一次数据库。库 / 表被删掉时如实回答 false，
// 前端才会显示「未连接」并转成只读，而不是显示正常却每次保存都失败。
// 不通时连「为什么不通」一并返回（见 db.health），前端才能提示到点子上。
api.get('/health', async function (req, res) {
  const h = await db.health();
  if (!h.ok) {
    console.error('[GET /api/health] ' + h.label + '：' + h.reason +
      (h.stageText ? '（环节：' + h.stageText + '）' : ''));
  }
  res.set('Cache-Control', 'no-store');
  res.json(h);
});

/* ---------------- 客户端信息（服务器视角） ----------------
   信息仪表板用它显示访客的真实 IP / 请求头 / 服务端软件等。
   纯 PHP 托管时该页读 proxy.php?action=clientinfo；Node 后端运行时 PHP 不会被解释，
   于是在这里提供等价接口，前端优先走本接口、失败再回退 proxy.php。 */

// IPv4 映射地址（::ffff:127.0.0.1）还原成 IPv4，与 PHP 的 REMOTE_ADDR 观感一致
function normIp(ip) {
  return String(ip || '').replace(/^::ffff:/i, '');
}

// 取客户端真实 IP：转发头优先级与 proxy.php 的 getClientIp 保持一致
function clientIp(req) {
  const h = req.headers;
  const forwarded = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'client-ip'];
  for (const name of forwarded) {
    const raw = h[name];
    if (raw) {
      const first = String(raw).split(',')[0].trim();
      if (first) return normIp(first);
    }
  }
  return normIp(req.socket.remoteAddress);
}

api.get('/clientinfo', function (req, res) {
  const h = req.headers;
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: {
      // 客户端地址信息
      ip: clientIp(req),
      remoteAddr: normIp(req.socket.remoteAddress),
      xForwardedFor: h['x-forwarded-for'] || '',
      xRealIp: h['x-real-ip'] || '',
      // 客户端请求头
      userAgent: h['user-agent'] || '',
      acceptLanguage: h['accept-language'] || '',
      acceptEncoding: h['accept-encoding'] || '',
      accept: h['accept'] || '',
      referer: h['referer'] || '',
      // 请求信息
      requestMethod: req.method,
      requestUri: req.originalUrl,
      requestTime: Math.floor(Date.now() / 1000),
      // 服务端信息
      serverAddr: normIp(req.socket.localAddress),
      serverName: String(h.host || '').split(':')[0],
      serverSoftware: 'Node.js/' + process.version + ' (Express)',
      serverProtocol: 'HTTP/' + req.httpVersion,
      https: !!req.secure,
      // Client Hints（Chrome 等浏览器可能携带，可能为空）
      secChUa: h['sec-ch-ua'] || '',
      secChUaPlatform: h['sec-ch-ua-platform'] || '',
      secChUaMobile: h['sec-ch-ua-mobile'] || ''
    }
  });
});

/* ---------------- 站点导航数据（首页 / 关于页） ----------------
   整份 JSON 存在 site_nav 表里，分组用 page 字段区分页面；
   读接口开放（首页与关于页任何人都要能看到导航），写接口要求已登录。
   老数据（v1 只有首页）在 db.loadSiteNav 里自动升级。 */

// 写操作的统一门槛：未登录直接回 401，前端据此弹出「请先登录」的提示。
// 返回登录态对象；未登录时已自行回应，调用方看到 falsy 直接 return 即可。
async function requireLogin(req, res, message) {
  const s = await account.session(account.tokenOf(req));
  if (!s.loggedIn) {
    res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: message || '请先登录后再操作' });
    return null;
  }
  return s;
}

api.get('/site-nav', async function (req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, data: await db.loadSiteNav() });
  } catch (e) {
    failDb(res, e, 'GET /api/site-nav');
  }
});

// 整份覆盖保存：分组页号 / 缺项由 sitenav.normalize 规整，前端不必自己做校验
api.put('/site-nav', async function (req, res) {
  const data = sitenav.normalize(req.body);
  if (!data) {
    res.status(400).json({ ok: false, error: '数据格式不正确' });
    return;
  }
  try {
    if (!await requireLogin(req, res, '请先登录后再修改导航数据')) return;
    await db.saveSiteNav(data);
    res.json({ ok: true });
  } catch (e) {
    failDb(res, e, 'PUT /api/site-nav');
  }
});

// 数据库 → 静态前端：把站点导航（首页 + 关于页）固化成 web 模式的数据文件，
// 使站点脱离数据库也能照常显示导航（不传 data 时直接取库里的数据写入）
api.post('/site-nav/to-static', async function (req, res) {
  try {
    if (!await requireLogin(req, res, '请先登录后再修改导航数据')) return;
    const body = req.body || {};
    const data = sitenav.normalize(body.data) || await db.loadSiteNav();
    if (!data || !Array.isArray(data.groups)) {
      res.status(400).json({ ok: false, error: '没有可导出的数据' });
      return;
    }
    sitenav.write(data);
    let links = 0;
    data.groups.forEach(function (g) { links += (g.links || []).length; });
    res.json({
      ok: true,
      file: sitenav.rel,
      groups: data.groups.length,
      links: links,
      data: data   // 回传实际写入文件的数据，前端据此同步本机副本
    });
  } catch (e) {
    failDb(res, e, 'POST /api/site-nav/to-static');
  }
});

/* ---------------- 站点全局设置 ----------------
   启用 BGM / 自动播放 / 看板娘 / 默认主题，整份 JSON 存在 site_settings 表里。
   读接口开放（每个访客都要按它决定 BGM / 看板娘 / 主题），
   写接口要求已登录——这里改的是「所有访客的默认值」。
   前端会把读到的一份缓存在本地，连不上后端时用缓存兜底。 */

api.get('/site-settings', async function (req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    const data = await db.loadSiteSettings();
    res.json({ ok: true, data: siteSettings.normalize(data || siteSettings.defaults()) });
  } catch (e) {
    failDb(res, e, 'GET /api/site-settings');
  }
});

// 整份覆盖保存：缺项 / 脏值由 settings.normalize 补齐，前端不必自己做校验
api.put('/site-settings', async function (req, res) {
  const data = siteSettings.normalize(req.body);
  try {
    if (!await requireLogin(req, res, '请先登录后再修改站点设置')) return;
    await db.saveSiteSettings(data);
    res.json({ ok: true, data: data });
  } catch (e) {
    failDb(res, e, 'PUT /api/site-settings');
  }
});

/* ---------------- 账号与会话 ----------------
   凭据只在数据库里，浏览器侧不保存账号密码：
   登录成功下发一个 HttpOnly 会话 Cookie，令牌落库、可被撤销。 */

api.post('/login', async function (req, res) {
  const body = req.body || {};
  try {
    const r = await account.login(body.user, body.pass);
    if (!r) {
      res.status(401).json({ ok: false, error: '账号或密码错误' });
      return;
    }
    account.setCookie(res, r.token);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, user: r.user });
  } catch (e) {
    failDb(res, e, 'POST /api/login');
  }
});

// 查询当前登录态：页面启动时确认会话是否仍然有效
api.get('/session', async function (req, res) {
  try {
    const s = await account.session(account.tokenOf(req));
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, loggedIn: s.loggedIn, user: s.user });
  } catch (e) {
    failDb(res, e, 'GET /api/session');
  }
});

api.post('/logout', async function (req, res) {
  try {
    await account.logout(account.tokenOf(req));
    account.clearCookie(res);
    res.json({ ok: true });
  } catch (e) {
    failDb(res, e, 'POST /api/logout');
  }
});

// 修改账号 / 密码（需已登录 + 当前密码）
api.post('/account', async function (req, res) {
  try {
    const r = await account.update(account.tokenOf(req), req.body || {});
    res.json({ ok: true, user: r.user });
  } catch (e) {
    // 校验类错误（密码不对、账号为空）自带 status，按原样回报；
    // 其余多半是连不上数据库，交给统一诊断。
    if (e.status) {
      res.status(e.status).json({ ok: false, error: e.message });
      return;
    }
    failDb(res, e, 'POST /api/account');
  }
});

/* ---------------- mod 状态 ----------------
   src/ 下带 mod.json 的子目录都是可插拔扩展（见 mods.js）。
   前端据此显示 / 隐藏 mod 入口；未启用的 mod 其页面文件仍可直接访问，
   但接口不会挂载，页面会像后端不在时一样退回只读模式。 */

api.get('/mods', function (req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, data: mods.list() });
});

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
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  next();
});

// 静态资源：整个前端目录 src/；目录请求默认由 static 用同级 index.html 响应，
// 故 / 即主站首页 index.html
app.use(express.static(WEB_ROOT, { extensions: ['html'], index: 'index.html' }));

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
    mods.close().then(function () { process.exit(0); }, function () { process.exit(0); });
  });
});
