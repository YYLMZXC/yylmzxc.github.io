/* ============================================================
   生存战争网 · 服务器版本列表（联机服务器页版本下拉的可选项）
   出厂默认 x26.07.30 / x26.06.19，整份 JSON 存在 site_versions 表里。
   版本号本质是透传给第三方 API 的 ?version= 参数，
   因此这里不做格式强校验，只做「去空白 / 截断 / 去重 / 非空」的整理。
   与 sitenav.js / settings.js 同一分工：本模块管「数据长什么样」，
   存取机制在 db.js，对外接口在 routes/server-versions.js。
   ============================================================ */
'use strict';

/** 列表上限：版本号是 API 参数，几个足够，防止无限膨胀 */
const MAX = 20;

/** 单个版本号最长字符数 */
const MAX_LEN = 40;

/** 整理单个版本号：去首尾空白并截断（可能为空串） */
function normOne(v) {
  return String(v == null ? '' : v).trim().slice(0, MAX_LEN);
}

/** 整理版本数组：丢弃空项、按出现顺序去重、截到上限 */
function normList(input) {
  const out = [];
  (Array.isArray(input) ? input : []).forEach(function (v) {
    const s = normOne(v);
    if (s && out.indexOf(s) < 0) out.push(s);
  });
  return out.slice(0, MAX);
}

function defaults() {
  return { versions: ['x26.07.30', 'x26.06.19'] };
}

/** 缺项 / 脏值补齐：整理结果为空时回默认，保证下拉永远有可选版本 */
function normalize(o) {
  const d = defaults();
  const list = normList(o && o.versions);
  return { versions: list.length ? list : d.versions };
}

module.exports = {
  defaults: defaults,
  normalize: normalize
};
