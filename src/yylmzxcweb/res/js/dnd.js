/* ============================================================
   YYLMZXC 离线导航站 · 拖拽排序
   只做两件事：把手势换算成「拖什么、落到哪」，然后调用注入的落位回调。
   数据如何变更由动作层统一负责，避免同一套排序逻辑维护两份；
   落位回调由装配层注入，本模块因此不直接引用 actions。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var store = Nav.store;

  // 由装配层注入：{ moveGroupTo(gid, toIndex), moveLinkTo(drag, toGid, refLid, after) }
  var drop = {};

  function clearMarks() {
    document.querySelectorAll('.link.drop-before, .link.drop-after, .group.drop-target, .group.dragging, .link.dragging')
      .forEach(function (n) {
        n.classList.remove('drop-before', 'drop-after', 'drop-target', 'dragging');
      });
  }

  function setup(handlers) {
    drop = handlers || {};
    var wrap = document.getElementById('groups');
    var state = store.state;

    wrap.addEventListener('dragstart', function (e) {
      if (!state.editing) return;

      var linkEl = e.target.closest('.link');
      if (linkEl) {
        store.setDrag({ type: 'link', gid: linkEl.dataset.gid, lid: linkEl.dataset.lid });
        linkEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', linkEl.dataset.lid); } catch (x) { }
        e.stopPropagation();
        return;
      }

      var grip = e.target.closest('.grip');
      var card = grip && grip.closest('.group');
      if (card) {
        store.setDrag({ type: 'group', gid: card.dataset.gid });
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.gid); } catch (x) { }
      }
    });

    wrap.addEventListener('dragover', function (e) {
      if (!state.drag) return;
      e.preventDefault();

      var card = e.target.closest('.group');
      if (!card) return;

      if (state.drag.type === 'group') {
        document.querySelectorAll('.group.drop-target').forEach(function (n) { n.classList.remove('drop-target'); });
        card.classList.add('drop-target');
        return;
      }

      document.querySelectorAll('.link.drop-before, .link.drop-after').forEach(function (n) {
        n.classList.remove('drop-before', 'drop-after');
      });
      var overLink = e.target.closest('.link');
      if (overLink) {
        var r = overLink.getBoundingClientRect();
        overLink.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
      }
    });

    wrap.addEventListener('drop', function (e) {
      if (!state.drag) return;
      e.preventDefault();

      var card = e.target.closest('.group');
      var drag = state.drag;
      store.setDrag(null);

      if (!card) { clearMarks(); return; }
      var toGid = card.dataset.gid;

      if (drag.type === 'group') {
        var toIdx = store.groups().map(function (g) { return g.id; }).indexOf(toGid);
        if (drop.moveGroupTo) drop.moveGroupTo(drag.gid, toIdx);
        clearMarks();
        return;
      }

      // 位置以「参照书签 + 前/后」表达，具体下标由动作层取出元素后再计算
      var refLid = null;
      var after = false;
      var overLink = e.target.closest('.link');
      if (overLink) {
        refLid = overLink.dataset.lid;
        var r = overLink.getBoundingClientRect();
        after = e.clientY >= r.top + r.height / 2;
      }

      if (drop.moveLinkTo) drop.moveLinkTo(drag, toGid, refLid, after);
      clearMarks();
    });

    wrap.addEventListener('dragend', function () {
      store.setDrag(null);
      clearMarks();
    });
  }

  Nav.dnd = { setup: setup };
})(window.Nav);
