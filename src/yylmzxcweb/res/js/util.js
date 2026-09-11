/* ============================================================
   YYLMZXC 离线导航站 · 通用纯函数
   纯计算，不依赖 DOM、不依赖全局状态，可单独复用与测试。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var PALETTE = ['#5b9dff', '#7c5cff', '#ff7a59', '#37d67a', '#e84393', '#00b8d9', '#f5a524', '#8e6bff', '#ff5c6c', '#2ecc71'];

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function uid(prefix) {
    return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (e) { return ''; }
  }

  function normalizeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) u = 'https://' + u;
    return u;
  }

  function faviconOf(link) {
    if (link.favicon) return link.favicon;
    if (link.icon && /^https?:/.test(link.icon)) return link.icon;
    // 不依赖任何第三方图标聚合服务，直接取站点自身的 favicon；失败时由渲染层回退为首字母头像。
    try { return new URL(normalizeUrl(link.url)).origin + '/favicon.ico'; }
    catch (e) { return ''; }
  }

  // 快捷链接允许两种写法：纯 URL 字符串，或 { url, favicon }（与书签字段保持一致）
  function profileLink(u) {
    if (typeof u === 'string') return { url: u, favicon: '' };
    if (!u) return { url: '', favicon: '' };
    return { url: u.url || '', favicon: u.favicon || '' };
  }

  function colorFor(seed) {
    var s = String(seed || ''), n = 0;
    for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[n % PALETTE.length];
  }

  function letterAvatar(text, seed) {
    var ch = (String(text || '?').trim()[0] || '?').toUpperCase();
    var bg = colorFor(seed || text);
    var svgStr = "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>" +
      "<rect width='64' height='64' rx='16' fill='" + bg + "'/>" +
      "<text x='32' y='42' font-size='32' font-family='Arial' font-weight='bold' fill='#fff' text-anchor='middle'>" + ch + "</text></svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function matchLink(link, q) {
    if (!q) return true;
    return (String(link.title || '').toLowerCase().indexOf(q) >= 0) ||
           (String(link.url || '').toLowerCase().indexOf(q) >= 0);
  }

  Nav.util = {
    clone: clone,
    uid: uid,
    hostOf: hostOf,
    normalizeUrl: normalizeUrl,
    faviconOf: faviconOf,
    profileLink: profileLink,
    colorFor: colorFor,
    letterAvatar: letterAvatar,
    escapeHtml: escapeHtml,
    matchLink: matchLink
  };
})(window.Nav);
