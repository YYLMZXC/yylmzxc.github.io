/* ============================================================
   YYLMZXC 导航站 · 后端服务
   1) 托管站点根目录（scweb/src/）下的整个前端：默认首页是 index.html，
      导航站位于它的 yylmzxcweb/ 子目录（/yylmzxcweb/yylmzxc.html）；
   2) 提供 /api/nav 等接口，数据落库到 MySQL。
      同一套接口同时挂在 /api/* 与 /yylmzxcweb/api/* 两个前缀下：
      前者供主站页面 / 反向代理，后者是导航页面按所在目录推导出的基路径。
   启动：在 yylmzxcweb/ 目录下执行 node server/server.js
   ============================================================ */
'use strict';

const crypto = require('crypto');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const express = require('express');
const CONFIG = require('./config');
const db = require('./db');
const rss = require('./rss');
const staticdata = require('./staticdata');
const sitenav = require('./sitenav');
const account = require('./account');

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

// 站点根目录：后端在 yylmzxcweb/server/ 下，上两级即整个前端 src/，
// 默认首页 index.html 就放在这里；导航站则在它的 yylmzxcweb/ 子目录里。
const WEB_ROOT = path.join(__dirname, '..', '..');

// 导航站目录：后端自身的上一级。上传图片、离线数据文件都相对它放置。
const NAV_DIR = path.join(__dirname, '..');

// 上传图片的落盘位置与白名单：数据里只存相对路径，页面与静态文件都能直接用
const UPLOAD_DIR = path.join(NAV_DIR, 'res', 'uploads');
const IMAGE_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};
const MAX_IMAGE = 10 * 1024 * 1024;

const app = express();
app.use(express.json({ limit: '20mb' }));

// 接口路由集中在一个 Router 里，文件末尾统一挂到 /api 与 /yylmzxcweb/api 两个前缀下
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

// 读取整份导航数据
api.get('/nav', async function (req, res) {
  try {
    const data = await db.loadNav();
    res.json({ ok: true, data: data });
  } catch (e) {
    failDb(res, e, 'GET /api/nav');
  }
});

// 整份覆盖保存
api.put('/nav', async function (req, res) {
  const data = req.body;
  if (!data || typeof data !== 'object' || !Array.isArray(data.groups)) {
    res.status(400).json({ ok: false, error: '数据格式不正确' });
    return;
  }
  try {
    await db.saveNav(data);
    res.json({ ok: true });
  } catch (e) {
    failDb(res, e, 'PUT /api/nav');
  }
});

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

// RSS 代理：代为抓取第三方订阅源并解析为 JSON（浏览器受同源策略限制无法直接读取）
api.get('/rss', async function (req, res) {
  const url = String(req.query.url || '').trim();
  if (!url) {
    res.status(400).json({ ok: false, error: '缺少订阅地址' });
    return;
  }
  try {
    const feed = await rss.load(url);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, feed: feed });
  } catch (e) {
    console.error('[GET /api/rss]', e.message);
    res.status(502).json({ ok: false, error: e.message });
  }
});

// 数据库 → 静态前端：把数据固化为出厂数据文件，使站点可脱离数据库运行
// body.data 为页面数据；不传时直接取数据库中的数据写入，省去「先读回页面」这一步
api.post('/nav/to-static', async function (req, res) {
  try {
    const body = req.body || {};
    const data = (body.data && Array.isArray(body.data.groups)) ? body.data : await db.loadNav();
    if (!data || !Array.isArray(data.groups)) {
      res.status(400).json({ ok: false, error: '没有可导出的数据' });
      return;
    }
    const file = staticdata.write(data);
    let links = 0;
    data.groups.forEach(function (g) { links += (g.links || []).length; });
    res.json({
      ok: true,
      file: path.relative(NAV_DIR, file).split(path.sep).join('/'),
      groups: data.groups.length,
      links: links,
      data: data   // 回传实际写入文件的数据，前端据此同步本机副本
    });
  } catch (e) {
    failDb(res, e, 'POST /api/nav/to-static');
  }
});

/* ---------------- 首页「社区导航」数据 ----------------
   与上面的 /api/nav（导航站的书签起始页）是两份独立数据：
   这里放的是首页那几块社区导航区块，整份 JSON 存在 site_nav 表里。
   读接口开放（首页任何人都要能看到导航），写接口要求已登录。 */

// 写操作的统一门槛：未登录直接回 401，前端据此弹出「请先登录」的提示。
// 返回登录态对象；未登录时已自行回应，调用方看到 falsy 直接 return 即可。
async function requireLogin(req, res) {
  const s = await account.session(account.tokenOf(req));
  if (!s.loggedIn) {
    res.status(401).json({ ok: false, code: 'UNAUTHORIZED', error: '请先登录后再修改导航数据' });
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

// 整份覆盖保存
api.put('/site-nav', async function (req, res) {
  const data = req.body;
  if (!data || typeof data !== 'object' || !Array.isArray(data.groups)) {
    res.status(400).json({ ok: false, error: '数据格式不正确' });
    return;
  }
  try {
    if (!await requireLogin(req, res)) return;
    await db.saveSiteNav(data);
    res.json({ ok: true });
  } catch (e) {
    failDb(res, e, 'PUT /api/site-nav');
  }
});

// 数据库 → 静态前端：把首页导航固化成 web 模式的数据文件，
// 使站点脱离数据库也能照常显示导航（不传 data 时直接取库里的数据写入）
api.post('/site-nav/to-static', async function (req, res) {
  try {
    if (!await requireLogin(req, res)) return;
    const body = req.body || {};
    const data = (body.data && Array.isArray(body.data.groups)) ? body.data : await db.loadSiteNav();
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

// 本机图片上传（背景图）：图片存进 src/res/uploads，回传可直接写进数据的相对路径。
// 之所以不把图片本身塞进数据：nav_settings.background 是 TEXT，装不下大图的 data URL。
api.post('/upload', async function (req, res) {
  const body = req.body || {};
  const m = /^data:([\w.+-]+\/[\w.+-]+);base64,([\s\S]+)$/.exec(String(body.data || ''));
  if (!m) {
    res.status(400).json({ ok: false, error: '图片数据格式不正确' });
    return;
  }
  const ext = IMAGE_EXT[m[1].toLowerCase()];
  if (!ext) {
    res.status(400).json({ ok: false, error: '仅支持 jpg / png / webp / gif / avif 图片' });
    return;
  }
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) {
    res.status(400).json({ ok: false, error: '图片内容为空' });
    return;
  }
  if (buf.length > MAX_IMAGE) {
    res.status(413).json({ ok: false, error: '图片过大，请压缩到 10MB 以内' });
    return;
  }
  try {
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    const name = Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + '.' + ext;
    await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buf);
    res.json({ ok: true, path: 'res/uploads/' + name, size: buf.length });
  } catch (e) {
    console.error('[POST /api/upload]', e.message);
    res.status(500).json({ ok: false, error: e.message });
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

// 接口：同时挂在两个前缀下，页面无论从站点根还是从 yylmzxcweb/ 子目录访问都能找到后端
//   /api/*            —— 主站页面、线上反向代理（Apache 等）
//   /yylmzxcweb/api/* —— 导航页面按所在目录推导出的基路径（见 res/js/api.js）
app.use(['/api', '/yylmzxcweb/api'], api);

// 静态根是站点根 src/，其中有两处绝不能对外下载的内容，必须先挡掉：
//   key/                —— 网站证书与私钥（域名直连用）
//   yylmzxcweb/server/  —— 后端自身，含 config.json 里的数据库账号密码
// 再兜底一层：任何 .key / .pem 一律不给。
app.use(function (req, res, next) {
  let p = req.path.toLowerCase();
  try { p = decodeURIComponent(p); } catch (e) { /* 编码异常就按原样判断 */ }
  const blocked = p === '/key' || p.indexOf('/key/') === 0 ||
    p === '/yylmzxcweb/server' || p.indexOf('/yylmzxcweb/server/') === 0 ||
    /\.(key|pem)$/.test(p);
  if (blocked) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  next();
});

// 静态资源：整个站点根目录（含首页 index.html 与 yylmzxcweb/ 导航站）；
// 目录请求默认由 static 用同级 index.html 响应，故 / 即主站首页 index.html
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
  app.listen(PORT, HOST, function () {
    console.log('数据库已连接：' + db.dbName);
    console.log('后端已启动，监听 ' + HOST + ':' + PORT +
      '（页面与接口 /api/* 都由本进程提供，健康检查 http://' + HOST + ':' + PORT + '/api/health）');
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
