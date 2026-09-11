/* ============================================================
   生存战争网 · 账号与会话
   账号密码只存在数据库里：scrypt + 随机盐哈希，明文既不落库也不落浏览器。
   登录态用一个 HttpOnly 会话 Cookie 承载，令牌本身同样落库，
   因此服务端可以随时撤销（退出登录 / 改密码）。
   只依赖 db（存取）与 config（首次初始化用的默认账号），不含路由编排。
   ============================================================ */
'use strict';

const crypto = require('crypto');
const db = require('./db');
const CONFIG = require('./config');

const AUTH = CONFIG.auth || {};

const COOKIE_NAME = 'scweb_sid';
const SESSION_HOURS = Number(AUTH.sessionHours) > 0 ? Number(AUTH.sessionHours) : 8;
const KEY_BYTES = 64;     // scrypt 输出长度（十六进制后 128 字符）
const SALT_BYTES = 16;

// 默认账号：建过之后 config.json 里的值就不再生效，只用于首次初始化与「删表后重建」
const DEFAULT_USER = 'admin';
const DEFAULT_PASS = 'admin';

/* ---------------- 密码哈希 ---------------- */

function hash(password, salt) {
  return crypto.scryptSync(String(password), String(salt), KEY_BYTES).toString('hex');
}

// 定长比较，避免逐个字符比较带来的时序差异
function verify(password, account) {
  if (!account || !account.salt) return false;
  const want = Buffer.from(String(account.password_hash || ''), 'hex');
  const got = Buffer.from(hash(password, account.salt), 'hex');
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

function newSalt() {
  return crypto.randomBytes(SALT_BYTES).toString('hex');
}

// 会话过期时间：每次校验都会顺延，长时间不使用才需要重新登录
function expiry() {
  return new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
}

/* ---------------- 会话 Cookie ---------------- */

// HttpOnly：脚本读不到令牌，浏览器里也就没有可被窃取的凭据；
// SameSite=Lax：跨站请求带不上它，顺带挡住跨站提交；
// 不设 Max-Age：随浏览器关闭而失效。
function tokenOf(req) {
  const parts = String(req.headers.cookie || '').split(';');
  for (let i = 0; i < parts.length; i++) {
    const at = parts[i].indexOf('=');
    if (at < 0) continue;
    if (parts[i].slice(0, at).trim() === COOKIE_NAME) {
      return decodeURIComponent(parts[i].slice(at + 1).trim());
    }
  }
  return '';
}

function setCookie(res, token) {
  res.set('Set-Cookie', COOKIE_NAME + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; SameSite=Lax');
}

function clearCookie(res) {
  res.set('Set-Cookie', COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

/* ---------------- 初始化 ---------------- */

// 首次启动建默认账号：账号名与初始密码取自 config.json 的 auth 段。
// 建过之后 config.json 里的值就不再生效——改账号密码请在页面的「账号面板」里改。
// 账号行没了（删表 / 清表）也会重建，这是「忘记密码」的恢复路径。
async function ensure() {
  const acc = await db.loadAccount();
  if (acc) return acc;

  const user = String(AUTH.user || DEFAULT_USER);
  const pass = String(AUTH.pass || DEFAULT_PASS);
  const salt = newSalt();
  await db.saveAccount({ user: user, hash: hash(pass, salt), salt: salt });
  console.log('已创建默认账号：' + user + '（初始密码见 server/config.json 的 auth.pass，请尽快在页面「账号」里修改）');
  return db.loadAccount();
}

async function init() {
  await ensure();
  await db.purgeSessions();
}

/* ---------------- 对外能力 ---------------- */

// 校验账号密码并建立会话；失败返回 null，由路由决定怎么回应。
// 走 ensure 而不是 loadAccount：账号表被删掉时也能按 config.json 重建后登录进去
// （能删表的人本来就有数据库权限，不算额外暴露）。
async function login(user, pass) {
  const acc = await ensure();
  if (!acc || String(user || '') !== String(acc.username) || !verify(pass, acc)) return null;
  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, expiry());
  return { token: token, user: acc.username };
}

async function logout(token) {
  if (token) await db.deleteSession(token);
}

// 校验会话（命中即续期），返回登录态
async function session(token) {
  if (!token) return { loggedIn: false, user: '' };
  if (!await db.touchSession(token, expiry())) return { loggedIn: false, user: '' };
  const acc = await db.loadAccount();
  if (!acc) return { loggedIn: false, user: '' };
  return { loggedIn: true, user: acc.username };
}

// 修改账号 / 密码：必须已登录，且要提供当前密码
async function update(token, body) {
  const s = await session(token);
  if (!s.loggedIn) throw fail(401, '登录已失效，请重新登录');

  const acc = await db.loadAccount();
  if (!acc) throw fail(500, '账号尚未初始化');

  const b = body || {};
  const user = String(b.user || '').trim();
  const pass = String(b.pass || '');
  if (!user) throw fail(400, '账号不能为空');
  if (!verify(b.oldPass, acc)) throw fail(400, '当前密码不正确');

  const next = { user: user, hash: acc.password_hash, salt: acc.salt };
  if (pass) {
    next.salt = newSalt();
    next.hash = hash(pass, next.salt);
  }
  await db.saveAccount(next);

  // 改过密码就让其它设备掉线，当前这个会话继续可用
  if (pass) await db.deleteOtherSessions(token);
  return { user: user };
}

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = {
  init: init,
  login: login,
  logout: logout,
  session: session,
  update: update,
  tokenOf: tokenOf,
  setCookie: setCookie,
  clearCookie: clearCookie
};
