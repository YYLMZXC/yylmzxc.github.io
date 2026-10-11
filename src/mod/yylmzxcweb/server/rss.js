/* ============================================================
   YYLMZXC 导航站 · RSS 抓取与解析
   服务端代理：浏览器受同源策略限制无法直接读取第三方订阅源，
   这里代为抓取并按 RSS 2.0 / Atom 解析成统一结构，返回给前端。

   只暴露一个 load(url) → { title, link, items:[{title,link,date,summary}] }
   刻意不引入第三方解析依赖，用轻量正则适配常见订阅格式。
   ============================================================ */
'use strict';

const http = require('http');
const https = require('https');
const zlib = require('zlib');

const MAX_BYTES = 2 * 1024 * 1024;   // 单个订阅源最多读取 2MB
const TIMEOUT_MS = 12000;            // 请求超时
const MAX_REDIRECTS = 5;             // 最多跟随的重定向次数
const MAX_ITEMS = 50;                // 单次最多返回的条目数
const MAX_SUMMARY = 200;             // 摘要截断长度

const UA = 'Mozilla/5.0 (compatible; YYLMZXC-Nav/1.0; RSS-Reader)';

/* ---------------- 网络抓取 ---------------- */

// 抓取文本内容；返回 { buffer, contentType }
function fetchText(target, redirects) {
  return new Promise(function (resolve, reject) {
    let u;
    try { u = new URL(target); } catch (e) { reject(new Error('无效的订阅地址')); return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      reject(new Error('仅支持 http / https 协议'));
      return;
    }

    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(u, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    }, function (res) {
      const status = res.statusCode || 0;

      // 跟随重定向
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if ((redirects || 0) >= MAX_REDIRECTS) { reject(new Error('重定向次数过多')); return; }
        let next;
        try { next = new URL(res.headers.location, u).href; }
        catch (e) { reject(new Error('重定向地址无效')); return; }
        resolve(fetchText(next, (redirects || 0) + 1));
        return;
      }

      if (status !== 200) {
        res.resume();
        reject(new Error('订阅源返回 HTTP ' + status));
        return;
      }

      // 按 Content-Encoding 解压
      const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      let size = 0;
      stream.on('data', function (chunk) {
        size += chunk.length;
        if (size > MAX_BYTES) {
          req.destroy();
          reject(new Error('订阅内容过大'));
          return;
        }
        chunks.push(chunk);
      });
      stream.on('end', function () {
        resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '' });
      });
      stream.on('error', reject);
    });

    req.setTimeout(TIMEOUT_MS, function () {
      req.destroy();
      reject(new Error('请求订阅源超时'));
    });
    req.on('error', function (e) { reject(new Error('无法连接订阅源：' + e.message)); });
  });
}

// 按响应头 / XML 声明中的 charset 解码，兼容 GBK 等常见中文编码
function decodeBody(buffer, contentType) {
  const ctCharset = /charset=["']?([\w-]+)/i.exec(contentType || '');
  const head = buffer.slice(0, 400).toString('latin1');
  const xmlCharset = /encoding=["']([\w-]+)["']/i.exec(head);
  const charset = ((ctCharset && ctCharset[1]) || (xmlCharset && xmlCharset[1]) || 'utf-8').toLowerCase();

  if (charset === 'utf-8' || charset === 'utf8') return buffer.toString('utf8');
  try { return new TextDecoder(charset).decode(buffer); }
  catch (e) { return buffer.toString('utf8'); }
}

/* ---------------- 文本处理 ---------------- */

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, function (_, h) {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; }
    })
    .replace(/&#(\d+);/g, function (_, d) {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return ''; }
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function stripCdata(v) {
  const m = String(v).match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : v;
}

// 取标签内的原始文本（支持 CDATA），不做实体解码
function rawInner(block, tag) {
  const re = new RegExp('<' + tag + '(\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = block.match(re);
  return m ? stripCdata(m[2]).trim() : '';
}

// 去标签 + 解码实体 + 压缩空白
function plain(v) {
  return decodeEntities(String(v).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function textOf(block, tag) {
  const raw = rawInner(block, tag);
  return raw ? plain(raw) : '';
}

// 提取链接：Atom 用 <link href>，RSS 用 <link>文本</link>
function linkOf(block, isAtom) {
  if (isAtom) {
    const alt = block.match(/<link\b[^>]*\brel\s*=\s*["']alternate["'][^>]*>/i);
    const altHref = alt && alt[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (altHref) return decodeEntities(altHref[1]).trim();
    const any = block.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
    return any ? decodeEntities(any[1]).trim() : '';
  }
  return textOf(block, 'link');
}

function dateOf(block) {
  const tags = ['pubDate', 'published', 'updated', 'dc:date', 'date'];
  for (let i = 0; i < tags.length; i++) {
    const v = textOf(block, tags[i]);
    if (v) return v;
  }
  return '';
}

function summaryOf(block) {
  const tags = ['description', 'summary', 'content:encoded', 'content'];
  for (let i = 0; i < tags.length; i++) {
    const v = textOf(block, tags[i]);
    if (v) return v.length > MAX_SUMMARY ? v.slice(0, MAX_SUMMARY) + '…' : v;
  }
  return '';
}

// 频道范围：截取 <channel>/<feed> 内部并剔除 <image>，避免其内部 title/link 干扰
function channelScope(xml, isAtom) {
  const tag = isAtom ? 'feed' : 'channel';
  const m = xml.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
  return (m ? m[1] : xml).replace(/<image[\s>][\s\S]*?<\/image>/gi, '');
}

function entriesOf(xml, isAtom) {
  const tag = isAtom ? 'entry' : 'item';
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>[\\s\\S]*?<\\/' + tag + '>', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(xml)) && out.length < MAX_ITEMS) out.push(m[0]);
  return out;
}

// 取去掉声明/注释/DOCTYPE 后的根标签名，用于判断响应是否真是订阅文档
function rootTag(xml) {
  const cleaned = String(xml)
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/i, '');
  const m = cleaned.match(/<\s*([A-Za-z_][\w.:-]*)/);
  return m ? m[1].toLowerCase() : '';
}

const FEED_ROOTS = ['rss', 'feed', 'rdf:rdf', 'rdf'];

/* ---------------- 对外接口 ---------------- */

// 解析订阅内容为统一结构
// · 合法订阅文档即使没有条目也正常返回（前端提示「暂无内容」）；
// · 只有响应根本不是订阅文档（如普通网页）时才报错。
function parse(xml) {
  const text = String(xml || '');
  const isAtom = /<feed[\s>]/i.test(text) && !/<rss[\s>]/i.test(text);

  const items = entriesOf(text, isAtom).map(function (block) {
    return {
      title: textOf(block, 'title'),
      link: linkOf(block, isAtom),
      date: dateOf(block),
      summary: summaryOf(block)
    };
  }).filter(function (it) { return it.title || it.link; });

  const root = rootTag(text);
  const isFeedDoc = FEED_ROOTS.indexOf(root) >= 0 || /<channel[\s>]/i.test(text);

  if (!items.length && !isFeedDoc) {
    throw new Error('该地址返回的不是订阅源（可能是普通网页），请填写正确的 RSS/Atom 地址');
  }

  const scope = channelScope(text, isAtom);
  return {
    title: textOf(scope, 'title'),
    link: isAtom ? linkOf(scope, true) : textOf(scope, 'link'),
    items: items
  };
}

async function load(url) {
  const target = String(url || '').trim();
  if (!target) throw new Error('缺少订阅地址');

  const res = await fetchText(target, 0);
  const xml = decodeBody(res.buffer, res.contentType);
  return parse(xml);
}

module.exports = { load: load, parse: parse };
