/* ============================================================
   YYLMZXC 导航站 · 图标视图原子
   站点图标（favicon）+ 首字母回退，被列表渲染与弹窗预览共用。
   独立成模块，避免「通用弹窗层依赖渲染层」这类反向耦合。
   慢网络优化：图标请求按视口优先——首屏可见的先发，其余等滚动到
   附近再请求；等待期间先显示首字母方块，图标到达才替换（.loaded）。
   装载策略内聚在本模块，渲染层与调用方完全无感。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;

  // 观察器全模块仅一份：节点由谁渲染都走同一装载策略。
  // 不支持 IntersectionObserver 的环境退回原生 loading=lazy（img 已带上）。
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var img = en.target;
          io.unobserve(img);
          if (img.dataset.src) img.src = img.dataset.src;
        });
      }, { rootMargin: '320px 0px' })
    : null;

  // 构造一个书签图标节点：
  //   首字母方块立即显示 → 视口内的图标先请求 → 其余滚动到附近再请求
  function node(link) {
    var url = util.faviconOf(link);
    var box = dom.el('span', { class: 'ico' });

    if (url) {
      var img = dom.el('img', { alt: '', loading: 'lazy', referrerPolicy: 'no-referrer' });
      if (io) {
        // 先不发请求：src 由观察器在节点接近视口时再补上
        img.dataset.src = url;
        io.observe(img);
      } else {
        img.src = url;
      }
      // 到达才盖过首字母；失败则保持首字母（.failed 只负责压住 img）
      img.addEventListener('load', function () { box.classList.add('loaded'); });
      img.addEventListener('error', function () { box.classList.add('failed'); });
      box.appendChild(img);
    } else {
      box.classList.add('failed');
    }

    var fb = dom.el('span', {
      class: 'fb',
      text: (String(link.title || '?').trim()[0] || '?').toUpperCase()
    });
    fb.style.background = util.colorFor(util.hostOf(link.url) || link.title);
    box.appendChild(fb);

    return box;
  }

  Nav.icon = { node: node };
})(window.Nav);
