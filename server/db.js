/* ============================================================
   生存战争网 · 数据访问层（MySQL）
   自动建库建表；首次启动时用静态数据文件 scweb_res/nav/nav-default.js 填充。
   库 / 表被删掉（例如手工 DROP DATABASE）后不必重启后端：
   下一次请求会重新建库建表并重试，只是数据只能回到那份静态文件。
   数据模型：业务数据两张单行 JSON 表——site_nav（首页「社区导航」）
   与 site_settings（站点全局设置：BGM / 自动播放 / 看板娘 / 默认主题），
   外加账号与会话两张表：账号密码只存在这里，浏览器不保存任何凭据。
   静态数据文件本身的读写属于另一职责，见 sitenav.js / settings.js；
   密码哈希与会话策略属于账号服务，见 account.js；
   连接参数统一读自 config.json，见 config.js。
   ============================================================ */
'use strict';

const mysql = require('mysql2/promise');
const CONFIG = require('./config');
const sitenav = require('./sitenav');
const settings = require('./settings');

const DB_NAME = CONFIG.mysql.database || 'scweb';

let pool = null;
let ready = null;    // 建库建表的进行中 / 已完成状态（见 init）
let lastError = null; // 最近一次连接失败的原因（见 diagnose），health 如实转述给前端

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

  // 首页「社区导航」数据：整份 JSON 存一行。
  // 单行 JSON 而非拆表，是因为首页导航的数据结构（分组 + 多语言标题键）还在演进，
  // 拆成列反而每次改结构都要动表；整份读写的语义也与「导入 / 导出 / 转换」天然对齐。
  `CREATE TABLE IF NOT EXISTS site_nav (
     id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
     data LONGTEXT,
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // 站点全局设置（启用 BGM / 自动播放 / 看板娘 / 默认主题）：同样整份 JSON 存一行。
  // 与 site_nav 分表，是因为两者读写时机与权限含义不同：导航是页面内容，这里是站点开关。
  `CREATE TABLE IF NOT EXISTS site_settings (
     id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
     data LONGTEXT,
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

/* ---------------- 连接失败的诊断 ----------------
   MySQL 出问题翻来覆去就那几种，但原始报错长得都一个样。这里把错误码翻译成
   「哪种毛病 + 卡在哪一步 + 怎么办」，供后端日志、/api/health 与前端提示共用：
     server-down  服务没启动（端口没人监听）
     unreachable  网络不通 / 地址写错
     auth         账号密码不对、认证方式不支持
     privilege    账号能用，但没有这个库 / 表的权限
     missing      库或表不存在
     too-many     连接数满了
   ============================================ */

// 连接目标的展示形式：出错时直接打出来，省得再去翻 config.json
const TARGET = CONFIG.mysql.user + '@' + CONFIG.mysql.host + ':' + CONFIG.mysql.port + '/' + DB_NAME;

// 毛病的大类：日志标题、前端提示都取这里的短句，避免各写各的
const KIND_TEXT = {
  'server-down': '数据库服务未启动',
  'unreachable': '连不上数据库服务',
  'auth': 'MySQL 账号或密码不对',
  'privilege': 'MySQL 没有授权访问这个数据库',
  'missing': '数据库或数据表不存在',
  'too-many': 'MySQL 连接数已满',
  'sql': '数据库版本不兼容',
  'unknown': '连接数据库失败'
};

// 出错时所处的环节：同一个错误码在不同环节含义不同，说法要跟着变
const STAGE_TEXT = {
  'connect': '连接 MySQL 服务',
  'create-db': '创建数据库 ' + DB_NAME,
  'ddl': '创建数据表',
  'seed': '写入初始数据',
  'load': '读取数据',
  'save': '写入数据'
};

// 错误码 → { kind, reason, hint }。reason 一句话说清毛病，hint 是可以照着做的下一步。
const TROUBLE = {
  // ---- 服务没启动 / 连不上 ----
  ECONNREFUSED: {
    kind: 'server-down',
    reason: 'MySQL 拒绝了连接：这个端口上没有服务在监听',
    hint: '基本上是 MySQL 没启动。小皮面板里启动 MySQL，再重新运行本脚本。'
  },
  ENOTFOUND: {
    kind: 'unreachable',
    reason: '解析不到 config.json 里写的 MySQL 主机名',
    hint: '把 mysql.host 改成本机地址 127.0.0.1。'
  },
  EHOSTUNREACH: {
    kind: 'unreachable',
    reason: '网络到不了 config.json 里写的 MySQL 主机',
    hint: '核对该主机的地址与端口（mysql.host / mysql.port）是否写错。'
  },
  ENETUNREACH: {
    kind: 'unreachable',
    reason: '网络到不了 config.json 里写的 MySQL 主机',
    hint: '核对该主机的地址与端口（mysql.host / mysql.port）是否写错。'
  },
  ETIMEDOUT: {
    kind: 'unreachable',
    reason: '连接 MySQL 超时',
    hint: '端口被防火墙拦了，或 mysql.host / mysql.port 写错。'
  },
  ECONNRESET: {
    kind: 'unreachable',
    reason: '连接被 MySQL 重置',
    hint: '多半是 MySQL 刚重启或连接被打满，稍后重试；持续出现请看 MySQL 的错误日志。'
  },
  PROTOCOL_CONNECTION_LOST: {
    kind: 'unreachable',
    reason: '和 MySQL 的连接被中断',
    hint: '确认 MySQL 进程没有崩溃或被重启过。'
  },

  // ---- 账号与认证 ----
  ER_ACCESS_DENIED_ERROR: {
    kind: 'auth',
    reason: 'MySQL 拒绝了这个账号：用户名或密码不对',
    hint: '改 server/config.json 里的 mysql.user / mysql.password，和面板里 MySQL 的账号密码保持一致。'
  },
  ER_ACCESS_DENIED_NO_PASSWORD_ERROR: {
    kind: 'auth',
    reason: '这个账号需要密码，但 config.json 里没有填',
    hint: '在 server/config.json 里补上 mysql.password。'
  },
  ER_HOST_NOT_PRIVILEGED: {
    kind: 'auth',
    reason: 'MySQL 不允许从这个来源地址登录该账号',
    hint: '该账号只允许从别的主机登录。在面板里把它改成允许 %（任意来源）或 127.0.0.1，或换一个允许本机登录的账号。'
  },
  ER_NOT_SUPPORTED_AUTH_MODE: {
    kind: 'auth',
    reason: '账号的认证方式当前客户端不支持（MySQL 8 默认的 caching_sha2_password）',
    hint: '把该用户改成 mysql_native_password：ALTER USER 用户名@主机 IDENTIFIED WITH mysql_native_password BY "密码";'
  },

  // ---- 权限不足 ----
  ER_DBACCESS_DENIED_ERROR: {
    kind: 'privilege',
    reason: '这个账号存在，但没有访问该数据库的权限',
    hint: '用 root 给它授权（GRANT ALL PRIVILEGES ON 库名.* TO 账号;），或把 config.json 的 mysql.user 换成 root。'
  },
  ER_TABLEACCESS_DENIED_ERROR: {
    kind: 'privilege',
    reason: '这个账号没有操作数据表的权限',
    hint: '给该账号授予该库的 SELECT / INSERT / UPDATE / DELETE / CREATE 权限。'
  },
  ER_CANT_CREATE_DB: {
    kind: 'privilege',
    reason: '这个账号没有创建数据库的权限',
    hint: '用 root 先手动建好库，或把 config.json 里的 mysql.user 换成 root。'
  },

  // ---- 库 / 表不存在 ----
  ER_BAD_DB_ERROR: {
    kind: 'missing',
    reason: '这个数据库不存在',
    hint: '后端会自己建库，但账号得先有 CREATE 权限；也可以先用 root 手动建库再启动。'
  },
  ER_NO_SUCH_TABLE: {
    kind: 'missing',
    reason: '数据表不存在',
    hint: '后端会自己建表；反复出现说明这个账号没有建表权限。'
  },
  ER_NO_DB_ERROR: {
    kind: 'missing',
    reason: '没有选择要操作的数据库',
    hint: '检查 server/config.json 里的 mysql.database 是否为空。'
  },

  // ---- 连接数 ----
  ER_CON_COUNT_ERROR: {
    kind: 'too-many',
    reason: 'MySQL 的并发连接数已满',
    hint: '在面板里调大 MySQL 的 max_connections，或稍后重试。'
  },
  ER_TOO_MANY_USER_CONNECTIONS: {
    kind: 'too-many',
    reason: '这个账号的并发连接数已满',
    hint: '在面板里调大该账号的 max_user_connections。'
  },

  // ---- 版本 / SQL ----
  ER_PARSE_ERROR: {
    kind: 'sql',
    reason: 'SQL 语法错误',
    hint: '通常是数据库版本过老，本项目需要 MySQL 5.7 及以上。'
  },
  ER_UNKNOWN_CHARACTER_SET: {
    kind: 'sql',
    reason: '数据库不认识 utf8mb4 字符集',
    hint: '数据库版本过老，本项目需要 MySQL 5.7 及以上。'
  },

  // 后端自己合成的码：建库被拒，而库也确实不存在
  NAV_NO_PRIV_AND_MISSING: {
    kind: 'privilege',
    reason: '这个账号没有创建数据库的权限，而且这个库也还不存在',
    hint: '用 root 手动建库，或把 server/config.json 里的 mysql.user 换成 root。'
  }
};

function safeName() {
  return DB_NAME.replace(/`/g, '');
}

// 建库被权限拦下时 MySQL 报的就是这两个码
function isDenied(e) {
  const code = e && e.code;
  return code === 'ER_DBACCESS_DENIED_ERROR' || code === 'ER_CANT_CREATE_DB';
}

function errorCode(e) {
  if (!e) return '';
  return String(e.code || e.errno || '');
}

// 把任意一个数据库错误翻译成诊断结论
function diagnose(e, stage) {
  const code = errorCode(e);
  const known = TROUBLE[code];

  let kind = known ? known.kind : 'unknown';
  let reason = known ? known.reason : String((e && (e.sqlMessage || e.message)) || '未知错误');
  let hint = known ? known.hint
    : '看后端窗口里的完整报错；若与数据库有关，核对 server/config.json 的 mysql 段并确认 MySQL 已启动。';

  // 建库环节被拒，说的是「没有建库权限」，不是「没有这个库的权限」
  if (stage === 'create-db' && code === 'ER_DBACCESS_DENIED_ERROR') {
    kind = 'privilege';
    reason = '这个账号没有创建数据库 ' + DB_NAME + ' 的权限';
    hint = '用 root 先手动建好这个库，或把 server/config.json 里的 mysql.user 换成 root。';
  }

  return {
    code: code || 'UNKNOWN',
    kind: kind,
    label: KIND_TEXT[kind] || KIND_TEXT.unknown,
    stage: stage || '',
    stageText: STAGE_TEXT[stage] || '',
    reason: reason,
    hint: hint,
    detail: String((e && (e.sqlMessage || e.message)) || ''),
    target: TARGET,
    configFile: 'server/config.json'
  };
}

// 任何数据库错误都能被解释：初始化时抛出的错误已经带着结论，其余现算
function explain(e, stage) {
  if (e && e.dbError) return e.dbError;
  return diagnose(e, stage);
}

// 建库被拒 + 库也打不开：合成一个更准确的错误码，免得把结论说成「库不存在」
function deniedAndMissing() {
  const e = new Error('这个账号没有创建数据库的权限，而且库 ' + DB_NAME + ' 也还不存在');
  e.code = 'NAV_NO_PRIV_AND_MISSING';
  return e;
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
        if (!isDenied(e)) throw e;
        try {
          await root.query('USE `' + safeName() + '`');
        } catch (e2) {
          throw deniedAndMissing();
        }
      }
    } finally {
      await root.end();
    }

    stage = 'ddl';
    pool = mysql.createPool(Object.assign({ database: DB_NAME }, baseOptions()));
    for (const sql of DDL) await pool.query(sql);

    // 首页「社区导航」在首次启动时用静态文件填一次，
    // 否则数据库模式下第一次打开首页会是空的。
    stage = 'seed';
    const [siteRows] = await pool.query('SELECT id FROM site_nav WHERE id = 1');
    if (!siteRows.length) {
      const sd = sitenav.read();
      if (sd) {
        await writeSiteNav(pool, sd);
        console.log('已用静态数据文件初始化首页导航');
      }
    }

    // 站点全局设置同理：空库时用 site-config.js 里的默认值填一次
    const [setRows] = await pool.query('SELECT id FROM site_settings WHERE id = 1');
    if (!setRows.length) {
      await writeSiteSettings(pool, settings.defaults());
      console.log('已用 site-config.js 的默认值初始化站点设置');
    }

    lastError = null;
  } catch (e) {
    lastError = diagnose(e, stage);
    const err = new Error(lastError.reason);
    err.code = lastError.code;
    err.dbError = lastError;
    throw err;
  }
}

// 初始化只做一次；失败不缓存，下一次请求还能再试。
function init() {
  if (!ready) {
    ready = connect().catch(function (e) {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// 库或表被删掉时 MySQL 报的就是这两个错，此时重建即可继续用
function isLost(e) {
  const code = e && e.code;
  return code === 'ER_BAD_DB_ERROR' || code === 'ER_NO_SUCH_TABLE';
}

// 所有查询的统一入口：发现库 / 表不见了就先重建再重试一次，
// 所以运行中手工删库不必重启后端（代价是数据只能回到静态文件那一份）。
async function run(query) {
  await init();
  try {
    return await query(pool);
  } catch (e) {
    if (!isLost(e)) throw e;
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

/* ---------------- 首页「社区导航」数据 ----------------
   整份 JSON 存在 site_nav 单行里：读回来就是前端直接用的那份结构，
   不做字段级拆解，因此导入 / 导出 / 转换三条路径 round-trip 完全一致。 */

async function loadSiteNav() {
  const rows = await q('SELECT data FROM site_nav WHERE id = 1');
  if (!rows.length) return null;
  const d = safeParse(rows[0].data, null);
  return (d && Array.isArray(d.groups)) ? d : null;
}

// 真正落库的那一段，直接拿连接用。
// 不能走 q()/run()：初始化时 connect() 自己也要写这一行，而 run() 会 await init()，
// 那个时刻 init() 返回的正是「正在跑的 connect」——自己等自己，直接死锁。
async function writeSiteNav(conn, data) {
  await conn.query(
    `INSERT INTO site_nav (id, data) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [JSON.stringify(data)]
  );
}

async function saveSiteNav(data) {
  await run(function (p) { return writeSiteNav(p, data); });
}

/* ---------------- 站点全局设置 ----------------
   同样整份 JSON 存单行；读回来是前端直接用的那份结构（见 settings.js 的 normalize）。 */

async function loadSiteSettings() {
  const rows = await q('SELECT data FROM site_settings WHERE id = 1');
  if (!rows.length) return null;
  const d = safeParse(rows[0].data, null);
  return (d && typeof d === 'object') ? d : null;
}

// 与 writeSiteNav 同理：初始化时 connect() 自己也要写这一行，不能走 run()（会自等死锁）
async function writeSiteSettings(conn, data) {
  await conn.query(
    `INSERT INTO site_settings (id, data) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [JSON.stringify(data)]
  );
}

async function saveSiteSettings(data) {
  await run(function (p) { return writeSiteSettings(p, data); });
}

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
    return Object.assign({ ok: false, database: DB_NAME, target: TARGET }, lastError || {
      code: 'NOT_INIT',
      kind: 'unknown',
      label: KIND_TEXT.unknown,
      stage: '',
      stageText: '',
      reason: '后端还没有成功连上数据库',
      hint: '看后端窗口里的报错，或核对 server/config.json 的 mysql 段。',
      detail: ''
    });
  }
  try {
    await pool.query('SELECT id FROM site_nav WHERE id = 1');
    await pool.query('SELECT id FROM site_settings WHERE id = 1');
    await pool.query('SELECT id FROM nav_account WHERE id = 1');
    return { ok: true, database: DB_NAME, target: TARGET };
  } catch (e) {
    return Object.assign({ ok: false, database: DB_NAME, target: TARGET }, diagnose(e, 'load'));
  }
}

module.exports = {
  init: init,
  health: health,
  explain: explain,
  diagnose: diagnose,
  loadSiteNav: loadSiteNav,
  saveSiteNav: saveSiteNav,
  loadSiteSettings: loadSiteSettings,
  saveSiteSettings: saveSiteSettings,
  loadAccount: loadAccount,
  saveAccount: saveAccount,
  createSession: createSession,
  touchSession: touchSession,
  deleteSession: deleteSession,
  deleteOtherSessions: deleteOtherSessions,
  purgeSessions: purgeSessions,
  dbName: DB_NAME
};
