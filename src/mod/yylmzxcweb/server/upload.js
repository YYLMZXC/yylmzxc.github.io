/* ============================================================
   YYLMZXC 导航站 · 图片上传落盘
   只管一件事：把前端传来的 data URL 校验、解码，写进 res/uploads，
   回一个能直接写进数据的相对路径（res/uploads/xxx.jpg）。
   之所以不把图片本身塞进数据：nav_settings.background 是 TEXT，装不下大图的 data URL。
   只管存文件，不碰 HTTP：校验类的失败带 status（路由据此回 4xx），
   其余异常原样抛出（多为磁盘写失败，由路由按 500 处理）。
   ============================================================ */
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 导航站目录：本文件在 yylmzxcweb/server/ 下，上一级即导航站根
const NAV_DIR = path.join(__dirname, '..');

// 落盘位置与白名单：数据里只存相对路径，页面与静态文件都能直接用
const UPLOAD_DIR = path.join(NAV_DIR, 'res', 'uploads');
const IMAGE_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};
const MAX_IMAGE = 10 * 1024 * 1024;

// 校验类失败：带上 status，路由原样回给前端
function bad(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// data URL → 落盘，返回 { path, size }；path 是可直接写进数据的相对路径
async function save(dataUrl) {
  const m = /^data:([\w.+-]+\/[\w.+-]+);base64,([\s\S]+)$/.exec(String(dataUrl || ''));
  if (!m) throw bad(400, '图片数据格式不正确');
  const ext = IMAGE_EXT[m[1].toLowerCase()];
  if (!ext) throw bad(400, '仅支持 jpg / png / webp / gif / avif 图片');
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) throw bad(400, '图片内容为空');
  if (buf.length > MAX_IMAGE) throw bad(413, '图片过大，请压缩到 10MB 以内');

  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  const name = Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + '.' + ext;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buf);
  return { path: 'res/uploads/' + name, size: buf.length };
}

module.exports = { save: save };
