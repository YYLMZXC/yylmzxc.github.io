/* ============================================================
   生存战争网 · 配置
   config.json 的唯一读入口：只在这里读文件、只在这里解析 JSON，
   其余模块 require 本模块取配置，不再各自读盘解析。
   这样「改哪个文件」与「解析出错会怎样」都只有一处：
   配置写坏了会在启动初始化阶段直接暴露，而不是某个模块悄悄拿到 undefined。

   另有一个写出口 saveMysql（设置面板「🗄️ 数据库」用，见 routes/db-config.js）：
   MySQL 连接参数运行期可改 —— 原地合并进本对象（所有 require 方立刻取到新值），
   再把整份配置写回文件，重启后仍是新值。其余段落只在启动时读一次视为不变。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'config.json');

const CONFIG = JSON.parse(fs.readFileSync(FILE, 'utf8'));

/**
 * 更新 mysql 段并写回 config.json。
 * password 传空字符串 / undefined 表示沿用现有密码（前端改配置时密码框留空即不改）。
 * @param {Object} patch - { host, port, user, password, database }，缺项沿用现有值
 * @returns {Object} 合并后的 CONFIG.mysql
 */
function saveMysql(patch) {
  const src = patch || {};
  const next = {
    host: String(src.host || CONFIG.mysql.host),
    port: Number(src.port) || CONFIG.mysql.port,
    user: String(src.user || CONFIG.mysql.user),
    password: (src.password === undefined || src.password === null || src.password === '')
      ? CONFIG.mysql.password
      : String(src.password),
    database: String(src.database || CONFIG.mysql.database)
  };

  // 原地替换：各模块 require 到的是同一份对象引用，改完立刻生效；
  // connectionLimit 之类未在 patch 里的键原样保留
  Object.assign(CONFIG.mysql, next);

  // 整份写回（其它段落原样保留；saveMysql 是函数，JSON.stringify 会自动略过）
  fs.writeFileSync(FILE, JSON.stringify(CONFIG, null, 2) + '\n', 'utf8');
  return CONFIG.mysql;
}

module.exports = CONFIG;
module.exports.saveMysql = saveMysql;
