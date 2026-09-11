/* ============================================================
   YYLMZXC 离线导航站 · 入口装配
   唯一允许横向引用各模块的地方：
     · 把渲染层声明的 data-act 分派到业务动作；
     · 把工具栏、搜索、快捷键接到动作上；
     · 订阅数据层广播的事件，同步界面状态。
   各层因此保持单向依赖：render 不再调用 actions，actions 不再调用入口。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var dom = Nav.dom;
  var storage = Nav.storage;
  var auth = Nav.auth;
  var store = Nav.store;
  var render = Nav.render;
  var actions = Nav.actions;
  var transfer = Nav.transfer;
  var account = Nav.account;
  var dnd = Nav.dnd;
  var feed = Nav.feed;

  /* ---------------- 主题 ---------------- */

  function setTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    storage.local.write(storage.KEYS.theme, theme);
  }

  // 数据库一旦不可用就退出编辑：所有修改都必须能落到数据库。
  // 「状态 → DOM」的按钮外观统一由渲染层负责，本层只做分发与门禁。
  function guardEditing() {
    if (store.state.editing && !store.canEdit()) {
      actions.setEditing(false);
      render.editButton();
      dom.toast('数据库连接不可用，已退出编辑模式');
    }
  }

  /* ---------------- 编辑门禁 ---------------- */
  // 会改动数据的入口统一走这里：先确认可编辑（数据库模式），再要求登录。
  // 分组与书签的增删改排序全部从这里过一遍，杜绝「某个入口忘了要登录」——
  // 「添加分组」曾因未走此门禁而可在未登录时使用。
  // 拖动落位、分组标题就地改名只可能在编辑模式下出现，因此不在分派表内重复设防。
  function guardEdit(run) {
    return function (target) {
      if (!store.canEdit()) {
        dom.toast('编辑仅在连接数据库时可用：请先运行「启动主页(带数据库).bat」，再把模式切到数据库');
        return;
      }
      account.requireLogin(function () { run(target); });
    };
  }

  /* ---------------- 列表内交互分派 ---------------- */
  // 渲染层只声明 data-act，这里统一换算成业务动作
  var HANDLERS = {
    // 折叠 / 展开属于浏览行为，不需要登录
    'toggle-group': function (t) { if (t.group) actions.toggleGroup(t.group); },

    'group-move-up': guardEdit(function (t) { if (t.group) actions.moveGroup(t.group, -1); }),
    'group-move-down': guardEdit(function (t) { if (t.group) actions.moveGroup(t.group, 1); }),
    'group-rename': guardEdit(function (t) { if (t.group) actions.renameGroup(t.group); }),
    'group-remove': guardEdit(function (t) { if (t.group) actions.removeGroup(t.group); }),
    'link-add': guardEdit(function (t) { if (t.group) actions.editLink(t.group, null); }),
    'link-edit': guardEdit(function (t) { if (t.link) actions.editLink(t.group, t.link); }),
    'link-remove': guardEdit(function (t) { if (t.link) actions.removeLink(t.group, t.link); }),
    'link-move-up': guardEdit(function (t) { if (t.link) actions.moveLink(t.group, t.link, -1); }),
    'link-move-down': guardEdit(function (t) { if (t.link) actions.moveLink(t.group, t.link, 1); })
  };

  // 由触发元素反查它所属的分组 / 书签
  function resolveTarget(el) {
    var linkEl = el.closest('.link');
    if (linkEl) {
      return {
        group: store.findGroup(linkEl.dataset.gid),
        link: store.findLink(linkEl.dataset.gid, linkEl.dataset.lid)
      };
    }
    var card = el.closest('.group');
    var gid = (card && card.dataset.gid) || el.dataset.gid;
    return { group: store.findGroup(gid), link: null };
  }

  function onGroupsClick(e) {
    var linkEl = e.target.closest('.link');

    // 编辑模式下不打开书签，避免误跳转
    if (store.state.editing && linkEl) e.preventDefault();

    // 非编辑模式下点击 RSS 书签：打开阅读面板，而不是跳转原始 XML
    if (!store.state.editing && linkEl) {
      var link = store.findLink(linkEl.dataset.gid, linkEl.dataset.lid);
      if (link && link.rss) {
        e.preventDefault();
        feed.open(link);
        return;
      }
    }

    var el = e.target.closest('[data-act]');
    if (!el) return;
    var handler = HANDLERS[el.dataset.act];
    if (!handler) return;          // 就地编辑的标题等无需分派，保留其默认焦点行为

    e.preventDefault();
    e.stopPropagation();
    handler(resolveTarget(el));
  }

  // 分组标题就地编辑：失焦即落盘
  function onGroupsFocusOut(e) {
    var titleEl = e.target.closest('[data-act="group-title"]');
    if (!titleEl) return;
    var card = titleEl.closest('.group');
    var group = card && store.findGroup(card.dataset.gid);
    if (!group) return;

    var v = titleEl.textContent.trim() || '未命名';
    titleEl.textContent = v;
    actions.setGroupName(group, v);
  }

  /* ---------------- 全局绑定 ---------------- */

  function bindEvents() {
    var search = document.getElementById('search');

    document.getElementById('btn-edit').addEventListener('click', function () {
      if (store.state.editing) { actions.setEditing(false); render.editButton(); return; }
      if (!store.canEdit()) {
        dom.toast('编辑仅在连接数据库时可用：请先运行「启动主页(带数据库).bat」，再把模式切到数据库');
        return;
      }
      account.requireLogin(function () { actions.setEditing(true); render.editButton(); });
    });

    // 添加分组属于编辑动作：与导入 / 转换 / 重置一致，要求先登录
    document.getElementById('btn-add-group').addEventListener('click', guardEdit(function () { actions.addGroup(); }));
    document.getElementById('btn-export').addEventListener('click', transfer.exportData);
    document.getElementById('btn-mode').addEventListener('click', transfer.switchBrowsingMode);

    document.getElementById('btn-theme').addEventListener('click', function () {
      setTheme(document.body.classList.contains('light') ? 'dark' : 'light');
    });

    // 会改动数据的入口需要登录；只读模式下这些入口本身也要挡住
    document.getElementById('btn-import').addEventListener('click', function () {
      if (!store.canEdit()) { dom.toast('导入会覆盖数据，仅在连接数据库时可用'); return; }
      account.requireLogin(transfer.importData);
    });
    document.getElementById('btn-convert').addEventListener('click', function () {
      account.requireLogin(transfer.convertPanel);
    });
    document.getElementById('btn-reset').addEventListener('click', function () {
      // 数据库模式下重置会覆盖数据库，需要登录；只读模式下只是按静态文件重载
      if (!store.canEdit()) { transfer.resetData(); return; }
      account.requireLogin(transfer.resetData);
    });

    search.addEventListener('input', function () {
      store.setQuery(search.value);
      render.groups();
    });

    var groupsEl = document.getElementById('groups');
    groupsEl.addEventListener('click', onGroupsClick);
    groupsEl.addEventListener('focusout', onGroupsFocusOut);

    // 头像：点击登录 / 查看账号面板
    var avatar = document.getElementById('avatar');
    avatar.title = '点击登录 / 账号';
    avatar.addEventListener('click', function (e) {
      e.stopPropagation();
      account.openAccount();
    });

    // 页头在编辑模式下可点击编辑个人信息
    document.querySelector('.brand').addEventListener('click', function () {
      if (store.state.editing) actions.editProfile();
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

      if (e.key === '/' && !typing) {
        e.preventDefault();
        search.focus();
      } else if (e.key === 'Escape') {
        if (store.state.editing && !typing) actions.setEditing(false);
        // 清空搜索：DOM 输入框与 store 状态必须一起改，否则列表仍按旧关键词过滤
        if (search.value) { search.value = ''; store.setQuery(''); render.groups(); }
      }
    });
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    // 数据层只广播事实，界面如何呈现由装配层决定
    store.subscribe(function (evt) {
      if (evt.type === 'mode') { render.syncModeUI(); guardEditing(); }
      else if (evt.type === 'notice') dom.toast(evt.message);
      else if (evt.type === 'static') render.staticStatus(evt);
    });

    setTheme(storage.local.read(storage.KEYS.theme) || 'dark');

    // 先取回数据再渲染，避免先闪一下出厂数据
    store.load().then(function (data) {
      store.setData(data);
      render.header();
      render.groups();
      actions.setEditing(false);
      render.syncModeUI();

      // 横向关系只在这里建立：account / dnd 需要的能力由装配层注入，
      // 业务层之间因此不互相引用（不形成环形与隐式耦合）。
      account.setup({
        onEnterEditing: function () { actions.setEditing(true); render.editButton(); },
        onEditProfile: actions.editProfile,
        onLogout: function () { if (store.state.editing) { actions.setEditing(false); render.editButton(); } }
      });
      dnd.setup({ moveGroupTo: actions.moveGroupTo, moveLinkTo: actions.moveLinkTo });

      // 登录态以后端为准：账号密码存在数据库里，本机只有会话 Cookie
      auth.refresh();

      feed.setup();     // 观察书签列表，为 RSS 条目补「最新一条」标题
      bindEvents();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.Nav);
