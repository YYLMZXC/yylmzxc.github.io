/* ============================================================
   YYLMZXC 离线导航站 · DOM 原语
   元素 / SVG 构造、轻提示，以及文件下载与选择的浏览器副作用。
   仅依赖浏览器 DOM，不感知业务数据，因此业务层可以保持纯逻辑。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  function el(tag, props, children) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null) return;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { e.dataset[d] = v[d]; });
        else if (k === 'attrs') Object.keys(v).forEach(function (a) { e.setAttribute(a, v[a]); });
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), v);
        else e[k] = v;
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function svg(paths, opt) {
    opt = opt || {};
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', opt.viewBox || '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', opt.width || 2);
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    paths.forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, 1900);
  }

  // 触发文件下载；锚点不入 DOM 树，避免污染页面结构
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // 选择本地文件：临时 input，用完即毁；取消选择时也会被回收
  function pickFile(accept, onPick) {
    var input = el('input', { type: 'file', accept: accept || '' });
    input.style.display = 'none';
    document.body.appendChild(input);

    function drop() { if (input.parentNode) input.parentNode.removeChild(input); }

    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (f) onPick(f);
      drop();
    });
    // 取消选择不会触发 change，等窗口重新获得焦点后回收
    window.addEventListener('focus', function () { setTimeout(drop, 500); }, { once: true });

    input.click();
  }

  Nav.dom = { el: el, svg: svg, toast: toast, download: download, pickFile: pickFile };
})(window.Nav);
