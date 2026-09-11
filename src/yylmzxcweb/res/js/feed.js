/* ============================================================
   YYLMZXC 导航站 · RSS 阅读面板
   点击带 RSS 标记的书签时，经后端代理取回订阅内容并展示条目。
      · 数据获取交给 Nav.api（同源 /api/rss），展示复用 Nav.modal；
      · 静态（无后端）模式下无法跨域抓取，给出明确提示；
      · 顺带把每个订阅源「最新一条」的标题填到书签条目标题下方。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var api = Nav.api;
  var util = Nav.util;
  var modal = Nav.modal;
  var dom = Nav.dom;
  var store = Nav.store;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // 订阅时间常见为 RFC822 / ISO8601，统一格式化；无法解析则原样返回
  function fmtDate(s) {
    if (!s) return '';
    var t = Date.parse(s);
    if (isNaN(t)) return String(s);
    var d = new Date(t);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function itemHtml(it) {
    var html = '<a class="feed-item" href="' + util.escapeHtml(it.link || '#') +
      '" target="_blank" rel="noopener noreferrer">' +
      '<div class="ft">' + util.escapeHtml(it.title || '(无标题)') + '</div>';
    var date = fmtDate(it.date);
    if (date) html += '<div class="fd">' + util.escapeHtml(date) + '</div>';
    if (it.summary) html += '<div class="fs">' + util.escapeHtml(it.summary) + '</div>';
    return html + '</a>';
  }

  function render(box, feed, link) {
    var items = (feed && feed.items) || [];
    var title = util.escapeHtml((feed && feed.title) || link.title || '');
    if (!items.length) {
      box.innerHTML =
        (title ? '<p class="feed-meta">' + title + '</p>' : '') +
        '<div class="feed-status">该订阅源暂无内容</div>';
      return;
    }
    box.innerHTML =
      '<p class="feed-meta">' + title + ' · 共 ' + items.length + ' 条</p>' +
      '<div class="feed-list">' + items.map(itemHtml).join('') + '</div>';
  }

  function fail(box, e, link) {
    // 无 code 说明是 fetch 本身失败（如 file:// 无后端），一并归为「后端不可用」
    var noBackend = e && (e.code === api.NOT_API || !e.code);
    var msg = noBackend
      ? 'RSS 阅读需要后端服务，请用「启动导航站(带数据库).bat」启动后再试。'
      : ((e && e.message) || '读取订阅失败');
    box.innerHTML =
      '<div class="feed-status feed-error">' + util.escapeHtml(msg) + '</div>' +
      '<p class="feed-meta"><a href="' + util.escapeHtml(util.normalizeUrl(link.url)) +
      '" target="_blank" rel="noopener noreferrer">直接打开订阅地址</a></p>';
  }

  /* ---------------- 书签条目内的「最新一条」标题 ---------------- */
  // 列表每次重渲染都会重建节点，这里改用 MutationObserver 感知新节点，
  // 而不是让渲染层反向调用本模块，继续保持 render → feed 的单向依赖。
  var OK_TTL = 10 * 60 * 1000;        // 读取成功：10 分钟内复用，避免反复打后端
  var FAIL_TTL = 60 * 1000;           // 读取失败：1 分钟后再允许重试
  var MAX_PARALLEL = 3;               // 订阅源多为慢速站点，限制并发以免拖住页面

  var cache = Object.create(null);    // url -> { feed: feed | null, time }
  var pending = Object.create(null);  // url -> Promise（同源的并发请求合并成一次）
  var queue = [];
  var running = 0;
  var scheduled = false;

  function fresh(url) {
    var c = cache[url];
    if (!c) return null;
    if (Date.now() - c.time > (c.feed ? OK_TTL : FAIL_TTL)) {
      delete cache[url];
      return null;
    }
    return c;
  }

  function loadOnce(url) {
    var hit = fresh(url);
    if (hit) return Promise.resolve(hit.feed);
    if (pending[url]) return pending[url];

    var p = api.getFeed(url).then(function (feed) {
      return feed;
    }, function () {
      return null;   // 无后端 / 源不可用：静默处理，不打扰导航页
    }).then(function (feed) {
      cache[url] = { feed: feed, time: Date.now() };
      delete pending[url];
      return feed;
    });

    pending[url] = p;
    return p;
  }

  function drain() {
    while (running < MAX_PARALLEL && queue.length) {
      running++;
      // 包一层 Promise：任何单个订阅源异常都不该让队列停摆
      Promise.resolve().then(queue.shift()).catch(function () {
        /* 单个订阅源读取失败：忽略即可 */
      }).then(function () {
        running--;
        drain();
      });
    }
  }

  function firstTitle(feed) {
    var items = (feed && feed.items) || [];
    return (items[0] && items[0].title) || '';
  }

  function fill(el) {
    el.dataset.feedPending = '1';   // 标记后该节点不再入队（也顺带止住自身的重扫）

    var link = store.findLink(el.dataset.gid, el.dataset.lid);
    if (!link || !link.rss || !link.url) return;

    var meta = el.querySelector('.meta');
    if (!meta) return;
    var box = meta.appendChild(dom.el('span', { class: 'latest', hidden: true }));

    queue.push(function () {
      return loadOnce(link.url).then(function (feed) {
        var title = firstTitle(feed);
        // 等待期间节点可能已被重渲染替换，需重新确认还在文档中
        if (!title || !document.contains(el)) return;
        box.textContent = title;
        box.title = title;
        box.hidden = false;
      });
    });
    drain();
  }

  function scan() {
    var list = document.querySelectorAll('#groups .link.rss');
    Array.prototype.forEach.call(list, function (el) {
      if (!el.dataset.feedPending) fill(el);
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; scan(); }, 0);
  }

  function watch() {
    var wrap = document.getElementById('groups');
    if (!wrap || typeof MutationObserver === 'undefined') return;
    new MutationObserver(schedule).observe(wrap, { childList: true, subtree: true });
    schedule();
  }

  function open(link) {
    // 内容容器由弹窗层回传，无需依赖 #modal-body 这一内部结构
    var box = modal.open({
      title: link.title || 'RSS 订阅',
      cardClass: 'feed-card',
      okLabel: false,
      cancelLabel: '关闭',
      html: '<div class="feed-status">正在加载订阅内容…</div>'
    });
    if (!box) return;

    api.getFeed(link.url).then(function (feed) {
      render(box, feed, link);
    }).catch(function (e) {
      fail(box, e, link);
    });
  }

  // 由装配层在首次渲染后调用：先观察 #groups，后续新渲染出的条目由观察器接手。
  // 不在模块加载时自启，避免「引入即产生副作用」的隐式耦合。
  function setup() { watch(); }

  Nav.feed = { open: open, setup: setup };
})(window.Nav);
