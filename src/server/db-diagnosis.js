/* ============================================================
   生存战争网 · 数据库错误诊断
   把「MySQL 报错码」翻译成「哪种毛病 + 卡在哪一步 + 怎么办」。

   这块是纯知识：一张错误码字典 + 几个判定函数，与连接池、建表、
   增删改查毫无关系，因此从 db.js 抽出来单独内聚，让两边各自只干一件事：
     · db.js            —— 连接、建表、读写数据；
     · db-diagnosis.js  —— 把失败说清楚（本文件）。

   库名相关的东西（连接目标、建库环节的说法）用 create(dbName) 注入，
   免得两处各自从 config 推算库名，说法才对得上。
   调用方：db.js（本进程内唯一持有者）。
   ============================================================ */
'use strict';

const CONFIG = require('./config');

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
    hint: '改 src/server/config.json 里的 mysql.user / mysql.password，和面板里 MySQL 的账号密码保持一致。'
  },
  ER_ACCESS_DENIED_NO_PASSWORD_ERROR: {
    kind: 'auth',
    reason: '这个账号需要密码，但 config.json 里没有填',
    hint: '在 src/server/config.json 里补上 mysql.password。'
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
    hint: '检查 src/server/config.json 里的 mysql.database 是否为空。'
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
    hint: '用 root 手动建库，或把 src/server/config.json 里的 mysql.user 换成 root。'
  }
};

/**
 * 用库名造一份诊断器：连接目标与「建库环节」的说法都绑定到该库。
 * @param {string} dbName - 当前使用的数据库名（见 db.js 的 DB_NAME）
 * @returns {{target:string, diagnose:Function, explain:Function,
 *            isDenied:Function, isLost:Function, deniedAndMissing:Function}}
 */
function create(dbName) {
  // 连接目标的展示形式：出错时直接打出来，省得再去翻 config.json
  const TARGET = CONFIG.mysql.user + '@' + CONFIG.mysql.host + ':' + CONFIG.mysql.port + '/' + dbName;

  // 出错时所处的环节：同一个错误码在不同环节含义不同，说法要跟着变
  const STAGE_TEXT = {
    'connect': '连接 MySQL 服务',
    'create-db': '创建数据库 ' + dbName,
    'ddl': '创建数据表',
    'seed': '写入初始数据',
    'load': '读取数据',
    'save': '写入数据'
  };

  function errorCode(e) {
    if (!e) return '';
    return String(e.code || e.errno || '');
  }

  // 建库被权限拦下时 MySQL 报的就是这两个码
  function isDenied(e) {
    const code = e && e.code;
    return code === 'ER_DBACCESS_DENIED_ERROR' || code === 'ER_CANT_CREATE_DB';
  }

  // 库或表被删掉时 MySQL 报的就是这两个错，此时重建即可继续用
  function isLost(e) {
    const code = e && e.code;
    return code === 'ER_BAD_DB_ERROR' || code === 'ER_NO_SUCH_TABLE';
  }

  // 把任意一个数据库错误翻译成诊断结论
  function diagnose(e, stage) {
    const code = errorCode(e);
    const known = TROUBLE[code];

    let kind = known ? known.kind : 'unknown';
    let reason = known ? known.reason : String((e && (e.sqlMessage || e.message)) || '未知错误');
    let hint = known ? known.hint
      : '看后端窗口里的完整报错；若与数据库有关，核对 src/server/config.json 的 mysql 段并确认 MySQL 已启动。';

    // 建库环节被拒，说的是「没有建库权限」，不是「没有这个库的权限」
    if (stage === 'create-db' && code === 'ER_DBACCESS_DENIED_ERROR') {
      kind = 'privilege';
      reason = '这个账号没有创建数据库 ' + dbName + ' 的权限';
      hint = '用 root 先手动建好这个库，或把 src/server/config.json 里的 mysql.user 换成 root。';
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
      configFile: 'src/server/config.json'
    };
  }

  // 任何数据库错误都能被解释：初始化时抛出的错误已经带着结论，其余现算
  function explain(e, stage) {
    if (e && e.dbError) return e.dbError;
    return diagnose(e, stage);
  }

  // 建库被拒 + 库也打不开：合成一个更准确的错误码，免得把结论说成「库不存在」
  function deniedAndMissing() {
    const e = new Error('这个账号没有创建数据库的权限，而且库 ' + dbName + ' 也还不存在');
    e.code = 'NAV_NO_PRIV_AND_MISSING';
    return e;
  }

  return {
    target: TARGET,
    diagnose: diagnose,
    explain: explain,
    isDenied: isDenied,
    isLost: isLost,
    deniedAndMissing: deniedAndMissing
  };
}

module.exports = {
  KIND_TEXT: KIND_TEXT,
  create: create
};
