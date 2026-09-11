/* ============================================================
   生存战争网 · 配置
   config.json 的唯一读入口：只在这里读文件、只在这里解析 JSON，
   其余模块 require 本模块取配置，不再各自读盘解析。
   这样「改哪个文件」与「解析出错会怎样」都只有一处：
   配置写坏了会在启动初始化阶段直接暴露，而不是某个模块悄悄拿到 undefined。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'config.json');

// 启动时读一次：配置在进程生命周期内视为不变
module.exports = JSON.parse(fs.readFileSync(FILE, 'utf8'));
