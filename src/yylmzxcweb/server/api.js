/* ============================================================
   YYLMZXC 导航站 · 接口路由
   导航站的全部 /api 能力集中在这里，对外只产出一个「Express Router」：
   不监听端口、不解析请求体、不托管静态资源——那三件事都由宿主负责：
     · server.js              独立运行（node yylmzxcweb/server/server.js）
     · server/index.js        作为 mod 被主站加载（见仓库根的 server/mods.js）
     · 仓库根的 server/server.js  主站后端，一个进程同时连 scweb 与 yylmzxc_nav
   express 由调用方传进来（而不是这里 require），好让整个进程只有一个 express 实例，
   也使 mod 目录不必自备 node_modules。挂载前缀同样由宿主决定：
   独立运行时 /api 与 /yylmzxcweb/api 都挂；被主站加载时按 mod.json 的 apiPath 挂。
   ============================================================ */
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const rss = require('./rss');
const staticdata = require('./staticdata');
const account = require('./account');

// 导航站目录：本文件在 yylmzxcweb/server/ 下，上一级即导航站根。
// 上传图片、离线数据文件都相对它放置。
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

module.exports = function createRouter(express) {
  const api = express.Router();

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

  // 本机图片上传（背景图）：图片存进 res/uploads，回传可直接写进数据的相对路径。
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

  return api;
};
