/* ============================================================
   YYLMZXC 离线导航站 · 弹窗层
   通用表单弹窗与确认框，配置驱动，与具体业务解耦。
   预览区内容通过 cfg.preview(values, box) 回调由调用方填充，
   字段级附加控件通过字段上的 extra(input, refresh) 回调由调用方提供，
   提交既支持同步校验（返回 false 保持打开），也支持异步（返回 Promise），
   因此本模块不依赖渲染层，也不感知任何业务语义。
   open(cfg) 返回弹窗内容容器，调用方据此绑定自注入的节点，
   无需再去猜测 #modal-body 这类内部实现细节（降低调用方与本层的耦合）。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;

  function open(cfg) {
    var modal = document.getElementById('modal');
    var body = document.getElementById('modal-body');
    var okBtn = document.getElementById('modal-ok');
    var cancelBtn = document.getElementById('modal-cancel');

    // 允许调用方附加卡片类名（如 RSS 阅读面板需要更宽的卡片）
    var card = modal.querySelector('.modal-card');
    if (card) card.className = 'modal-card' + (cfg.cardClass ? ' ' + cfg.cardClass : '');

    document.getElementById('modal-title').textContent = cfg.title || '';
    if (cfg.okLabel === false) {
      okBtn.hidden = true;
    } else {
      okBtn.hidden = false;
      okBtn.textContent = cfg.okLabel || '确定';
    }
    if (cfg.cancelLabel === false) {
      cancelBtn.hidden = true;
    } else {
      cancelBtn.hidden = false;
      cancelBtn.textContent = cfg.cancelLabel || '取消';
    }

    body.innerHTML = cfg.html || '';

    var inputs = {};
    var previewBox = null;

    // 当前表单值（提交与预览共用同一份取值逻辑）
    function values() {
      var vals = {};
      Object.keys(inputs).forEach(function (k) {
        vals[k] = inputs[k].type === 'checkbox' ? inputs[k].checked : inputs[k].value;
      });
      return vals;
    }

    function refreshPreview() {
      if (previewBox && typeof cfg.preview === 'function') cfg.preview(values(), previewBox);
    }

    (cfg.fields || []).forEach(function (f) {
      body.appendChild(dom.el('label', { text: f.label }));
      var inp;

      if (f.type === 'textarea') {
        inp = dom.el('textarea', { value: f.value || '', placeholder: f.placeholder || '' });
      } else if (f.type === 'checkbox') {
        inp = dom.el('input', { type: 'checkbox' });
        inp.checked = !!f.value;
        body.appendChild(dom.el('label', { class: 'preview' }, [inp, dom.el('span', { text: '启用' })]));
        inputs[f.key] = inp;
        return;
      } else {
        var kind = f.type === 'password' ? 'password' : 'text';
        inp = dom.el('input', { type: kind, value: f.value || '', placeholder: f.placeholder || '' });
        if (kind === 'text') inp.addEventListener('input', refreshPreview);
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
        });
      }

      body.appendChild(inp);
      inputs[f.key] = inp;

      // 附加控件（如背景图的「选择图片」）：调用方拿到输入框后可自行写回并刷新预览
      if (typeof f.extra === 'function') {
        var extra = f.extra(inp, refreshPreview);
        if (extra) body.appendChild(extra);
      }
    });

    if (typeof cfg.preview === 'function') {
      // 复用 .preview 的排版样式，另加语义类便于区分复选框行
      previewBox = dom.el('div', { class: 'preview modal-preview' });
      body.appendChild(previewBox);
      refreshPreview();
    }

    if (cfg.actions && cfg.actions.length) {
      var actRow = dom.el('div', { class: 'modal-actions' });
      cfg.actions.forEach(function (a) {
        var b = dom.el('button', {
          class: 'btn' + (a.cls ? ' ' + a.cls : ''),
          type: 'button',
          text: a.label
        });
        b.addEventListener('click', function () { if (a.onClick) a.onClick(close); });
        actRow.appendChild(b);
      });
      body.appendChild(actRow);
    }

    // 每次打开都从 1 开始计数，用来识别「提交还没回来，弹窗已经被关掉又重开」
    var seq = 0;

    function close() {
      seq++;                       // 作废仍在等待中的异步提交
      okBtn.disabled = false;
      modal.hidden = true;
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    // onSubmit 返回 false 表示校验未通过（保持打开）；
    // 返回 Promise 表示异步提交（成功才关闭，失败保持打开，并将按钮恢复可用）。
    okBtn.onclick = function () {
      if (!cfg.onSubmit) { close(); return; }
      var r = cfg.onSubmit(values());
      if (r === false) return;
      if (r && typeof r.then === 'function') {
        var mine = seq;
        okBtn.disabled = true;
        r.then(function () { if (seq === mine) close(); }, function () {
          if (seq === mine) okBtn.disabled = false;
        });
        return;
      }
      close();
    };
    cancelBtn.onclick = close;
    modal.onclick = function (e) { if (e.target === modal) close(); };
    document.addEventListener('keydown', onKey);

    modal.hidden = false;
    var first = body.querySelector('input[type=text], input[type=password], textarea');
    if (first) { first.focus(); first.select && first.select(); }
    return body;
  }

  function confirmDialog(message, onOk) {
    open({
      title: '请确认',
      okLabel: '确定',
      html: '<p style="margin:0 0 6px;font-size:13.5px;line-height:1.6;color:var(--muted)">' + util.escapeHtml(message) + '</p>',
      onSubmit: function () { onOk(); }
    });
  }

  Nav.modal = { open: open, confirm: confirmDialog };
})(window.Nav);
