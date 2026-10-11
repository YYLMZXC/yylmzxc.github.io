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

  // 排到浏览器空闲帧执行；不支持 requestIdleCallback 的环境退化为定时器。
  // 「什么时候算空闲、怎么降级」属于浏览器调度细节，收在本层，
  // 调用方只表达「这件事靠后做」，不感知具体机制。
  function defer(fn) {
    if (window.requestIdleCallback) return window.requestIdleCallback(fn);
    return setTimeout(fn, 400);
  }

  /* ---------- 进度浮层 ----------
     导入 / 导出这类操作会持续数秒，中途页面还可能被同步计算占满，
     没有可见反馈时用户只会得出「点了没反应」的结论，然后反复点击。
     因此给一个带阶段文案 + 实时计时的遮罩层：既说明正在做什么，
     也在结束前挡住重复触发。*/

  var pgBox = null;

  // 只移除传入的那个浮层：浮层淡出是异步的，期间可能已经开了新的浮层，
  // 若不按引用移除，旧浮层的收尾定时器会把新浮层一起删掉。
  function pgRemove(box) {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    if (pgBox === box) pgBox = null;
  }

  function pgClock(ms) {
    var s = ms / 1000;
    if (s < 60) return s.toFixed(1) + ' 秒';
    return Math.floor(s / 60) + ' 分 ' + Math.round(s % 60) + ' 秒';
  }

  // 打开进度浮层并返回控制器：
  //   stage(text)        当前在做什么
  //   detail(text)       补充说明（为空则隐藏该行）
  //   percent(0~100)     确定进度；传 null 表示时长未知，改用流动条纹
  //   estimate(halfMs)   时长无法预估时用：进度逐渐逼近 92%，收尾时补满
  //   done()             完成并收起（默认至少可见 0.32 秒，避免一闪而过像没执行）
  //   abort()            失败/放弃：不假装完成，就地淡出
  // 同一时刻只保留一个浮层，重复调用会先收起旧的，不会叠加出多层遮罩。
  function progress(title) {
    if (pgBox) pgRemove(pgBox);

    var fill = el('i', { class: 'pg-fill' });
    fill.style.width = '0%';
    var bar = el('div', { class: 'pg-bar' }, [fill]);
    var stage = el('div', { class: 'pg-stage' });
    var clock = el('span', { class: 'pg-clock', text: '0.0 秒' });
    var detail = el('div', { class: 'pg-detail', hidden: true });

    pgBox = el('div', { class: 'pg-mask', attrs: { role: 'dialog', 'aria-live': 'polite', 'aria-busy': 'true' } }, [
      el('div', { class: 'pg-card' }, [
        el('h3', { class: 'pg-title', text: title || '处理中' }),
        el('div', { class: 'pg-head' }, [stage, clock]),
        bar,
        detail
      ])
    ]);
    document.body.appendChild(pgBox);

    var box = pgBox;
    var t0 = Date.now();
    var closed = false;
    var tick = setInterval(function () { clock.textContent = pgClock(Date.now() - t0); }, 100);
    var estTimer = null;
    var estT0 = 0;

    function stopEstimate() {
      if (estTimer) { clearInterval(estTimer); estTimer = null; }
    }

    function finish(skipComplete, minMs) {
      if (closed) return;
      closed = true;
      clearInterval(tick);
      stopEstimate();
      if (!skipComplete) {
        bar.classList.remove('indeterminate');
        fill.style.width = '100%';
      }
      var wait = Math.max(0, minMs - (Date.now() - t0));
      setTimeout(function () {
        if (!box.parentNode) return;
        box.classList.add('out');          // 淡出期间 pointer-events 已放开，不挡后续操作
        setTimeout(function () { pgRemove(box); }, 200);
      }, wait);
    }

    return {
      stage: function (text) { stage.textContent = text || ''; },
      detail: function (text) {
        detail.textContent = text || '';
        detail.hidden = !text;
      },
      percent: function (p) {
        stopEstimate();
        // null / NaN / Infinity 都视作「时长未知」：给不出比例，改用流动条纹表达「还在跑」
        if (p == null || !isFinite(p)) {
          bar.classList.add('indeterminate');
          fill.style.width = '100%';
          return;
        }
        bar.classList.remove('indeterminate');
        fill.style.width = Math.max(0, Math.min(100, p)).toFixed(1) + '%';
      },
      // 时长未知的等待（如整份事务写库）用「逐渐逼近」：比无限滚动条更能说明「正在进行、快到头了」，
      // 又不假装知道确切比例，所以停在 92%，由 done() 补满。
      estimate: function (halfLifeMs) {
        stopEstimate();
        bar.classList.remove('indeterminate');
        estT0 = Date.now();
        var half = halfLifeMs || 6000;
        fill.style.width = '0%';
        estTimer = setInterval(function () {
          var ms = Date.now() - estT0;
          var pct = 92 * (1 - Math.pow(0.5, ms / half));
          fill.style.width = pct.toFixed(1) + '%';
        }, 150);
      },
      done: function (minMs) { finish(false, minMs == null ? 320 : minMs); },
      abort: function () { finish(true, 0); }
    };
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

  // 把本地文件读成 data URL：属于浏览器副作用，收在此层，
  // 使接口层（api）只面对「字符串 → 请求」，不碰 FileReader。
  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.readAsDataURL(file);
    });
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

  Nav.dom = {
    el: el, svg: svg, toast: toast, defer: defer, progress: progress,
    download: download, pickFile: pickFile, readAsDataURL: readAsDataURL
  };
})(window.Nav);
