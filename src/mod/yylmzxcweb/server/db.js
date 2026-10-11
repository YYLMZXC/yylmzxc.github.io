/* ============================================================
   YYLMZXC 导航站 · 数据访问层（MySQL）
   自动建库建表；首次启动时用出厂数据 nav-default.js 填充。
   库 / 表被删掉（例如手工 DROP DATABASE）后不必重启后端：
   下一次请求会重新建库建表并重试，只是数据只能回到出厂数据。
   数据模型：内容三张表 settings(单行) / groups / links，
   外加账号与会话两张表：账号密码只存在这里，浏览器不保存任何凭据。
   出厂数据文件本身的读写属于另一职责，见 staticdata.js；
   密码哈希与会话策略属于账号服务，见 account.js；
   连接参数统一读自 config.json，见 config.js；
   错误码翻译成「哪种毛病 / 怎么办」见 dberror.js（本文件只负责连库与读写）。
   ============================================================ */
'use strict';

const CONFIG = require('./config');
const staticdata = require('./staticdata');
const dberror = require('./dberror');

// 数据库驱动：独立运行时用本目录自带的依赖；被主站作为 mod 加载时，
// 宿主会把它那份 mysql2 传进来（见 use），于是 mod 目录不必自备 node_modules。
// 延迟到真正连接时才 require，避免仅 require 本模块就产生一次依赖解析。
let driver = null;
function use(mysql) {
  if (mysql) driver = mysql;
}
function mysql() {
  if (!driver) driver = require('mysql2/promise');
  return driver;
}

// 库名与「连的是哪台库」由 dberror 统一算出（诊断里要拼出连接目标），这里取回自用
const DB_NAME = dberror.dbName;

// 默认头像：没有自定义头像时使用本机图片（与前端 Nav.util.DEFAULT_AVATAR 保持一致）
const DEFAULT_AVATAR = 'res/img.png';
// 旧版出厂默认头像（外部链接）；库里仍是它时一次性订正为 DEFAULT_AVATAR（见 connect）
const LEGACY_DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/a/ACg8ocKdGmvHcgUM-klYHYHRKbdhiLZl9ird-CyADSrQgrWHPQ=s96-c';

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
  `CREATE TABLE IF NOT EXISTS nav_settings (
     id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
     title VARCHAR(255) NOT NULL DEFAULT '',
     description TEXT,
     background TEXT,
     profile_name VARCHAR(255) NOT NULL DEFAULT '',
     profile_avatar TEXT,
     profile_links LONGTEXT,
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS nav_groups (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     name VARCHAR(255) NOT NULL DEFAULT '',
     sort_order INT NOT NULL DEFAULT 0,
     collapsed TINYINT(1) NOT NULL DEFAULT 0,
     column_index INT NOT NULL DEFAULT 0
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS nav_links (
     id VARCHAR(64) NOT NULL PRIMARY KEY,
     group_id VARCHAR(64) NOT NULL,
     title TEXT NOT NULL,
     url TEXT NOT NULL,
     favicon TEXT NOT NULL,
     is_rss TINYINT(1) NOT NULL DEFAULT 0,
     sort_order INT NOT NULL DEFAULT 0,
     KEY idx_nav_links_group (group_id),
     CONSTRAINT fk_nav_links_group FOREIGN KEY (group_id)
       REFERENCES nav_groups (id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

// CREATE TABLE IF NOT EXISTS 只负责「表不存在就建出来」，对已存在的表不会改任何列宽 ——
// 光改建表语句对老库无效，必须显式迁移。老库的 nav_links.url 是 VARCHAR(1024)，
// 导入浏览器书签时会被真实的长网址撞破（Data too long for column 'url'），
// 而整份数据是一个事务：一条超长，全批回滚，表现为「导入成功但一条都没存进去」。
// 这里把该列放宽到 TEXT（约 64KB），用户只要重启一次后端就自动修好，不必手工改表。
// title 与 favicon 一并放宽：它们的内容都来自外部文件（书签标题、书签自带的 ICON 链接），
// 长度不由本项目决定，今天撞的是 url，明天就可能是 title —— 都是同一种故障。
const WIDEN_TO_TEXT = ['url', 'title', 'favicon'];

async function widenColumns() {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nav_links'`,
      [DB_NAME]
    );
    const typeOf = {};
    rows.forEach(function (r) { typeOf[r.COLUMN_NAME] = String(r.DATA_TYPE || '').toLowerCase(); });

    for (const col of WIDEN_TO_TEXT) {
      const now = typeOf[col];
      if (!now || /text$/.test(now)) continue;     // 表还没建出来 / 已是文本类型（text/longtext）：不用动
      await pool.query('ALTER TABLE nav_links MODIFY COLUMN ' + col + ' TEXT NOT NULL');
      console.log('已放宽 nav_links.' + col + '：' + now + ' → TEXT（长网址不再导致整批写入回滚）');
    }
  } catch (e) {
    // 放宽失败不能拖垮整个后端：老库照样能读、能编辑，只是超长网址仍会写不进去。
    // 降级为警告，真撞上时导入会给出针对性的报错（见 TROUBLE.ER_DATA_TOO_LONG）。
    console.warn('放宽 nav_links 列宽失败（不影响浏览与普通编辑，给这个账号 ALTER 权限即可）：' +
      ((e && (e.sqlMessage || e.message)) || e));
  }
}

/* ---------------- 连接失败的诊断 ----------------
   错误码翻译表（KIND_TEXT / OFFLINE_KINDS / STAGE_TEXT / TROUBLE 与 diagnose）
   已独立成模块，见 dberror.js：那是「错误 → 人话」的职责，本文件只管连库与读写。
   本文件通过 dberror.diagnose / dberror.explain 取用，日志与接口的说法因此一致。
   ============================================ */

function safeName() {
  return DB_NAME.replace(/`/g, '');
}

/* ---------------- 初始化与自愈 ---------------- */

// 建库 + 建表 + 空库时填充出厂数据。只负责「把库表准备好」，可重复执行。
// stage 记录出错时走到了哪一步：同样是权限不足，建库和写数据的提示完全不同（见 diagnose）。
async function connect() {
  let stage = 'connect';
  try {
    const root = await mysql().createConnection(baseOptions());
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
        if (!dberror.isDenied(e)) throw e;
        try {
          await root.query('USE `' + safeName() + '`');
        } catch (e2) {
          throw dberror.deniedAndMissing();
        }
      }
    } finally {
      await root.end();
    }

    stage = 'ddl';
    pool = mysql().createPool(Object.assign({ database: DB_NAME }, baseOptions()));
    for (const sql of DDL) await pool.query(sql);
    await widenColumns();   // 老库的列宽在这里补齐，失败按「建表」环节报错

    stage = 'seed';
    const [rows] = await pool.query('SELECT id FROM nav_settings WHERE id = 1');
    if (!rows.length) {
      const d = staticdata.read();
      if (d) {
        await writeAll(d);
        console.log('已用出厂数据初始化数据库');
      }
    }

    // 默认头像由「外部链接」改为本机图片 res/img.png：老库里仍留着那个出厂链接时订正过来。
    // 只认出厂值，用户自己填的头像链接不动；改完再启动就匹配不到，等于只跑一次。
    const [fixed] = await pool.query(
      'UPDATE nav_settings SET profile_avatar = ? WHERE id = 1 AND profile_avatar = ?',
      [DEFAULT_AVATAR, LEGACY_DEFAULT_AVATAR]
    );
    if (fixed.affectedRows) console.log('默认头像已改为 ' + DEFAULT_AVATAR);

    lastError = null;
  } catch (e) {
    lastError = dberror.diagnose(e, stage);
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
// 所以运行中手工删库不必重启后端（代价是数据只能回到出厂数据）。
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

async function loadNav() {
  const settings = await q('SELECT * FROM nav_settings WHERE id = 1');
  if (!settings.length) return null;
  const s = settings[0];

  const groupRows = await q('SELECT * FROM nav_groups ORDER BY sort_order, id');
  const linkRows = await q('SELECT * FROM nav_links ORDER BY sort_order, id');

  const buckets = {};
  linkRows.forEach(function (l) {
    (buckets[l.group_id] = buckets[l.group_id] || []).push(l);
  });

  return {
    version: 1,
    title: s.title || '导航',
    description: s.description || '',
    background: s.background || '',
    profile: {
      name: s.profile_name || '',
      avatar: s.profile_avatar || '',
      links: safeParse(s.profile_links, [])
    },
    groups: groupRows.map(function (g) {
      var group = {
        id: g.id,
        name: g.name,
        column: g.column_index,
        links: (buckets[g.id] || []).map(function (l) {
          const link = { id: l.id, title: l.title, url: l.url };
          if (l.favicon) link.favicon = l.favicon;
          if (l.is_rss) link.rss = true;
          return link;
        })
      };
      if (g.collapsed) group.collapsed = true;   // 仅收起时写入，保持导出文件干净
      return group;
    })
  };
}

/* ---------------- 写入（整份覆盖，事务） ---------------- */

// 一次 INSERT 携带的行数：太少则事务里往返次数多（导入几千条书签会拖到像卡死），
// 太多则可能撞上 MySQL 的 max_allowed_packet。100 行是兼顾速度与安全的经验值：
// 网址本身可能很长（导入的这批就有超过 1024 字符的），单包体积比按「行数」想当然要大得多。
const INSERT_CHUNK = 100;

// 按块合并成多值 INSERT
async function insertRows(conn, sql, rows) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await conn.query(sql, [rows.slice(i, i + INSERT_CHUNK)]);
  }
}

// id 是主键，一旦重复，整笔事务都会因「Duplicate entry」回滚，等于一条都没存。
// 正常情况前端已保证唯一，这里再兜一道：发现重复就改名，宁可 id 变一点也不能整批丢。
function uniqueId(used, base) {
  let id = base;
  let n = 1;
  while (used.has(id)) id = base + '#' + (n++);
  used.add(id);
  return id;
}

// 真正落库的那一段：调用前连接池必须已就绪（connect 与 saveNav 都已经等过 init）
async function writeAll(data) {
  const profile = data.profile || {};
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const t0 = Date.now();

  // 先把整份数据摊平成行（不碰数据库，仅整理）：父表（分组）先落，满足外键约束。
  // 摊平放在 try 外，是为了出错日志也能引用到行数。
  const usedGroupIds = new Set();
  const usedLinkIds = new Set();
  const groupRows = [];
  const linkRows = [];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i] || {};
    const gid = uniqueId(usedGroupIds, String(g.id || ('g' + (i + 1))));
    groupRows.push([gid, String(g.name || ''), i, g.collapsed ? 1 : 0, Number(g.column) || 0]);

    const links = Array.isArray(g.links) ? g.links : [];
    for (let j = 0; j < links.length; j++) {
      const l = links[j] || {};
      linkRows.push([
        uniqueId(usedLinkIds, String(l.id || (gid + '_l' + (j + 1)))),
        gid,
        String(l.title || ''),
        String(l.url || ''),
        String(l.favicon || ''),
        l.rss ? 1 : 0,
        j
      ]);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 先删子表再删父表，避免外键约束
    await conn.query('DELETE FROM nav_links');
    await conn.query('DELETE FROM nav_groups');

    await conn.query(
      `INSERT INTO nav_settings
         (id, title, description, background, profile_name, profile_avatar, profile_links)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         background = VALUES(background),
         profile_name = VALUES(profile_name),
         profile_avatar = VALUES(profile_avatar),
         profile_links = VALUES(profile_links)`,
      [
        String(data.title || ''),
        String(data.description || ''),
        String(data.background || ''),
        String(profile.name || ''),
        String(profile.avatar || ''),
        JSON.stringify(Array.isArray(profile.links) ? profile.links : [])
      ]
    );

    await insertRows(conn,
      'INSERT INTO nav_groups (id, name, sort_order, collapsed, column_index) VALUES ?',
      groupRows);
    await insertRows(conn,
      'INSERT INTO nav_links (id, group_id, title, url, favicon, is_rss, sort_order) VALUES ?',
      linkRows);

    await conn.commit();
    console.log('数据已写入数据库：' + groupRows.length + ' 组 / ' + linkRows.length +
      ' 书签，耗时 ' + (Date.now() - t0) + 'ms');
  } catch (e) {
    await conn.rollback();
    console.error('数据写入失败并已回滚（' + groupRows.length + ' 组 / ' + linkRows.length +
      ' 书签）：' + ((e && (e.sqlMessage || e.message)) || e));
    throw e;
  } finally {
    conn.release();
  }
}

// 整份覆盖写入。库表被删掉时重建一次再整体重写，避免白改一场
async function saveNav(data) {
  await init();
  try {
    return await writeAll(data);
  } catch (e) {
    if (!isLost(e)) throw e;
    pool = null;
    ready = null;
    await init();
    return writeAll(data);
  }
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
    return Object.assign({ ok: false, database: DB_NAME, target: dberror.target }, lastError || {
      code: 'NOT_INIT',
      kind: 'unknown',
      offline: true,          // 后端自己都没连上数据库，当然算「未连接」
      label: dberror.kindText.unknown,
      stage: '',
      stageText: '',
      reason: '后端还没有成功连上数据库',
      hint: '看后端窗口里的报错，或核对 server/config.json 的 mysql 段。',
      detail: ''
    });
  }
  try {
    await pool.query('SELECT id FROM nav_settings WHERE id = 1');
    await pool.query('SELECT id FROM nav_account WHERE id = 1');
    return { ok: true, database: DB_NAME, target: dberror.target };
  } catch (e) {
    return Object.assign({ ok: false, database: DB_NAME, target: dberror.target }, dberror.diagnose(e, 'load'));
  }
}

// 释放连接池：进程退出前调用，让被主站加载的这一次运行能干净收尾
async function close() {
  const p = pool;
  pool = null;
  ready = null;
  if (p) await p.end();
}

module.exports = {
  use: use,
  close: close,
  init: init,
  health: health,
  explain: dberror.explain,
  diagnose: dberror.diagnose,
  loadNav: loadNav,
  saveNav: saveNav,
  loadAccount: loadAccount,
  saveAccount: saveAccount,
  createSession: createSession,
  touchSession: touchSession,
  deleteSession: deleteSession,
  deleteOtherSessions: deleteOtherSessions,
  purgeSessions: purgeSessions,
  dbName: DB_NAME
};
