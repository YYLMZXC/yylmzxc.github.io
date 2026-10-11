/* ============================================================
   生存战争网 · 数据访问层（MySQL）
   自动建库建表；空库时该播什么数据由 bootstrap.js 递进来的播种器决定
   （依赖倒置：本模块不认识任何业务数据格式，只提供「查空 + 写入」的机制）。
   库 / 表被删掉（例如手工 DROP DATABASE）后不必重启后端：
   下一次请求会重新建库建表并重试，数据回到播种的那一份。
   数据模型：业务数据三张单行 JSON 表——site_nav（站点导航：首页 / 关于页）、
   site_settings（站点全局设置：BGM / 自动播放 / 看板娘 / 默认主题）
   与 site_versions（联机服务器页的版本下拉可选项），
   外加账号与会话两张表：账号密码只存在这里，浏览器不保存任何凭据。
   数据格式（规整 / 升级 / 默认值）属于业务模块，见 sitenav.js / settings.js / versions.js；
   密码哈希与会话策略属于账号服务，见 account.js；
   连接参数统一读自 config.json，见 config.js。
   ============================================================ */
'use strict';

const mysql = require('mysql2/promise');
const CONFIG = require('./config');
const dbDiagnosis = require('./db-diagnosis');

const DB_NAME = CONFIG.mysql.database || 'scweb';

// 诊断职责见 db-diagnosis.js：本模块只管存取数据，不背「错误码翻译表」。
// 用本模块的库名造一份诊断器，连接目标 / 建库环节的说法才与库一致。
const KIND_TEXT = dbDiagnosis.KIND_TEXT;
const diag = dbDiagnosis.create(DB_NAME);

let pool = null;
let ready = null;    // 建库建表的进行中 / 已完成状态（见 init）
let lastError = null; // 最近一次连接失败的原因（见 diagnose），health 如实转述给前端
let seedHook = null; // 空库播种器（见 bootstrap.js），init(seed) 时记下，自愈重建后重播

/* ---------------- 建库 / 建表 ---------------- */

function baseOptions() {
  return {
    host: CONFIG.mysql.host,
    port: CONFIG.mysql.port,
    user: CONFIG.mysql.user,
    password: CONFIG.mysql.password,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: CONFIG.mysql.connectionLimit || 5,
    queueLimit: 0
  };
}

const DDL = [
  // 账号只有一行（id = 1）。只存 scrypt 加盐哈希，明文密码不落库
  `CREATE TABLE IF NOT EXISTS nav_account (
     id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
     username VARCHAR(64) NOT NULL DEFAULT '',
     password_hash CHAR(128) NOT NULL DEFAULT '',
     salt CHAR(32) NOT NULL DEFAULT '',
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 登录态令牌：落库才能被服务端随时撤销（退出登录 / 改密码）
  `CREATE TABLE IF NOT EXISTS nav_sessions (
     token CHAR(64) NOT NULL PRIMARY KEY,
     expires_at DATETIME NOT NULL,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_nav_sessions_expires (expires_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 站点导航数据（首页 / 关于页）、站点全局设置（启用 BGM / 自动播放 / 看板娘 / 默认主题）
  // 与服务器版本列表（联机服务器页版本下拉）：
  // 同一形状的单行 JSON 表，用 jsonTable(name) 生成。
  // 单行 JSON 而非拆表，是因为数据结构（分页 + 分组 + 多语言标题键）还在演进，
  // 拆成列反而每次改结构都要动表；整份读写的语义也与「导入 / 导出 / 转换」天然对齐。
  // 分成多张表，是因为两者读写时机与权限含义不同：导航是页面内容，设置是站点开关，版本列表是联机页配置。
  jsonTable('site_nav'),
  jsonTable('site_settings'),
  jsonTable('site_versions')
];

// 单行 JSON 表的建表语句（site_nav / site_settings 共用）
function jsonTable(name) {
  return `CREATE TABLE IF NOT EXISTS ${name} (
     id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
     data LONGTEXT,
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
}

/* ---------------- 连接失败的诊断 ----------------
   错误码翻译表与诊断函数都搬到 db-diagnosis.js 了：本模块只管存取数据。
   对外仍导出 diagnose / explain（见文件末尾），调用方无感。 */

function safeName() {
  return DB_NAME.replace(/`/g, '');
}

/* ---------------- 初始化与自愈 ---------------- */

// 建库 + 建表 + 空库时填充初始数据。只负责「把库表准备好」，可重复执行。
// stage 记录出错时走到了哪一步：同样是权限不足，建库和写数据的提示完全不同（见 diagnose）。
async function connect() {
  let stage = 'connect';
  try {
    const root = await mysql.createConnection(baseOptions());
    try {
      stage = 'create-db';
      try {
        await root.query(
          'CREATE DATABASE IF NOT EXISTS `' + safeName() +
          '` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );
      } catch (e) {
        // MySQL 对 CREATE DATABASE IF NOT EXISTS 也会先校验 CREATE 权限：
        // 库已存在、但账号只有库内权限时会报 1044。这不算失败——探一下能不能直接打开，
        // 能打开就继续用（真正打不开时下面会抛「没权限建库 + 库也不存在」）。
        if (!diag.isDenied(e)) throw e;
        try {
          await root.query('USE `' + safeName() + '`');
        } catch (e2) {
          throw diag.deniedAndMissing();
        }
      }
    } finally {
      await root.end();
    }

    stage = 'ddl';
    pool = mysql.createPool(Object.assign({ database: DB_NAME }, baseOptions()));
    for (const sql of DDL) await pool.query(sql);

    // 空库播种：播什么、从哪读，是业务层的事（见 bootstrap.js）；
    // 这里只决定时机（建表之后、对外服务之前）和「查空 + 写入」的机制。
    // 自愈重建（见 run）走同一段，所以删库后数据也能回到播种的那一份。
    stage = 'seed';
    if (seedHook) {
      await seedHook({
        isEmpty: async function (table) {
          const rows = await pool.query('SELECT id FROM ?? WHERE id = 1', [table]);
          return !rows[0].length;
        },
        write: function (table, data) {
          return writeJsonRow(pool, table, data);
        }
      });
    }

    lastError = null;
  } catch (e) {
    lastError = diag.diagnose(e, stage);
    const err = new Error(lastError.reason);
    err.code = lastError.code;
    err.dbError = lastError;
    throw err;
  }
}

// 初始化只做一次；失败不缓存，下一次请求还能再试。
// seed 是空库播种器（见 bootstrap.js），由 server.js 启动时递进来；
// 记在模块状态里，自愈重建时 init() 不带参数也能重播。
function init(seed) {
  if (typeof seed === 'function') seedHook = seed;
  if (!ready) {
    ready = connect().catch(function (e) {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// 所有查询的统一入口：发现库 / 表不见了就先重建再重试一次，
// 所以运行中手工删库不必重启后端（代价是数据只能回到静态文件那一份）。
async function run(query) {
  await init();
  try {
    return await query(pool);
  } catch (e) {
    if (!diag.isLost(e)) throw e;
    pool = null;
    ready = null;
    await init();
    return query(pool);
  }
}

// 单条 SQL 的语法糖，只取行集
async function q(sql, params) {
  const result = await run(function (p) { return p.query(sql, params); });
  return result[0];
}

/* ---------------- 读取 ---------------- */

function safeParse(text, fallback) {
  try { return JSON.parse(text); } catch (e) { return fallback; }
}

/* ---------------- 单行 JSON 表的通用读写 ----------------
   site_nav 与 site_settings 是同一形状的两张表：整份 JSON 存在 id = 1 的单行里，
   读回来就是前端直接用的那份结构，不做字段级拆解，
   因此导入 / 导出 / 转换三条路径 round-trip 完全一致。
   「数据长什么样」（规整 / 升级 / 默认值）是业务模块的事
   （见 sitenav.js / settings.js 及 routes/site-nav.js），这里只管存取。 */

async function loadJsonRow(table) {
  const rows = await q('SELECT data FROM ?? WHERE id = 1', [table]);
  if (!rows.length) return null;
  return safeParse(rows[0].data, null);
}

// 真正落库的那一段，直接拿连接用。
// 不能走 q()/run()：初始化时 connect() 自己也要写这一行，而 run() 会 await init()，
// 那个时刻 init() 返回的正是「正在跑的 connect」——自己等自己，直接死锁。
async function writeJsonRow(conn, table, data) {
  await conn.query(
    `INSERT INTO ?? (id, data) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [table, JSON.stringify(data)]
  );
}

async function saveJsonRow(table, data) {
  await run(function (p) { return writeJsonRow(p, table, data); });
}

/* 业务表的薄封装：调用方（路由 / 播种器）不必记表名 */
async function loadSiteNav() { return loadJsonRow('site_nav'); }
async function saveSiteNav(data) { return saveJsonRow('site_nav', data); }
async function loadSiteSettings() { return loadJsonRow('site_settings'); }
async function saveSiteSettings(data) { return saveJsonRow('site_settings', data); }
async function loadServerVersions() { return loadJsonRow('site_versions'); }
async function saveServerVersions(data) { return saveJsonRow('site_versions', data); }

/* ---------------- 账号与会话 ---------------- */
async function loadAccount() {
  const rows = await q('SELECT * FROM nav_account WHERE id = 1');
  return rows.length ? rows[0] : null;
}

async function saveAccount(a) {
  await q(
    `INSERT INTO nav_account (id, username, password_hash, salt) VALUES (1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       password_hash = VALUES(password_hash),
       salt = VALUES(salt)`,
    [String(a.user || ''), String(a.hash || ''), String(a.salt || '')]
  );
}

async function createSession(token, expiresAt) {
  await q(
    'INSERT INTO nav_sessions (token, expires_at) VALUES (?, ?)',
    [String(token), expiresAt]
  );
}

// 会话有效则续期，返回是否仍然登录；过期或不存在都算未登录
async function touchSession(token, expiresAt) {
  const rows = await q(
    'SELECT token FROM nav_sessions WHERE token = ? AND expires_at > NOW()',
    [String(token)]
  );
  if (!rows.length) return false;
  await q('UPDATE nav_sessions SET expires_at = ? WHERE token = ?', [expiresAt, String(token)]);
  return true;
}

async function deleteSession(token) {
  await q('DELETE FROM nav_sessions WHERE token = ?', [String(token)]);
}

// 撤销除当前会话以外的所有登录态（改密码后让其它设备退出）
async function deleteOtherSessions(token) {
  await q('DELETE FROM nav_sessions WHERE token <> ?', [String(token)]);
}

async function purgeSessions() {
  await q('DELETE FROM nav_sessions WHERE expires_at <= NOW()');
}

/* ---------------- 健康检查 ---------------- */

// 只探真伪、不触发重建：否则「库被删了」这个事实会被自己顺手修好而永远看不出来。
// 真正需要数据时该重建自然会重建（见 run），这里的职责是如实回答。
// 除了「通不通」，还要回答「不通是因为什么」——前端据此给出能照着做的提示。
async function health() {
  // 没连上、或连上了但建表 / 写数据没成功过：如实转述上次失败的原因，
  // 而不是笼统说一句「未连接」（否则「没权限建表」会被说成「表不存在」）
  if (!pool || !ready) {
    return Object.assign({ ok: false, database: DB_NAME, target: diag.target }, lastError || {
      code: 'NOT_INIT',
      kind: 'unknown',
      label: KIND_TEXT.unknown,
      stage: '',
      stageText: '',
      reason: '后端还没有成功连上数据库',
      hint: '看后端窗口里的报错，或核对 src/server/config.json 的 mysql 段。',
      detail: ''
    });
  }
  try {
    await pool.query('SELECT id FROM site_nav WHERE id = 1');
    await pool.query('SELECT id FROM site_settings WHERE id = 1');
    await pool.query('SELECT id FROM nav_account WHERE id = 1');
    return { ok: true, database: DB_NAME, target: diag.target };
  } catch (e) {
    return Object.assign({ ok: false, database: DB_NAME, target: diag.target }, diag.diagnose(e, 'load'));
  }
}

module.exports = {
  init: init,
  health: health,
  explain: diag.explain,
  diagnose: diag.diagnose,
  loadSiteNav: loadSiteNav,
  saveSiteNav: saveSiteNav,
  loadSiteSettings: loadSiteSettings,
  saveSiteSettings: saveSiteSettings,
  loadServerVersions: loadServerVersions,
  saveServerVersions: saveServerVersions,
  loadAccount: loadAccount,
  saveAccount: saveAccount,
  createSession: createSession,
  touchSession: touchSession,
  deleteSession: deleteSession,
  deleteOtherSessions: deleteOtherSessions,
  purgeSessions: purgeSessions,
  dbName: DB_NAME
};
