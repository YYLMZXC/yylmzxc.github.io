/* ============================================================
   YYLMZXC 导航站 · 图标视图原子
   站点图标（favicon）+ 首字母回退，被列表渲染与弹窗预览共用。
   独立成模块，避免「通用弹窗层依赖渲染层」这类反向耦合。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;

  // 构造一个书签图标节点：加载失败时自动露出首字母方块
  function node(link) {
    var url = util.faviconOf(link);
    var box = dom.el('span', { class: 'ico' });

    if (url) {
      var img = dom.el('img', { alt: '', loading: 'lazy', referrerPolicy: 'no-referrer', src: url });
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
