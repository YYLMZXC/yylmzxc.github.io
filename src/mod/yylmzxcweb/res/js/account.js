/* ============================================================
   YYLMZXC 离线导航站 · 账号界面
   登录框 / 账号面板 / 修改密码的界面编排，只依赖凭据层与弹窗层。
   账号密码存在数据库里，校验一律走后端，因此这里的提交是异步的：
   向弹窗层返回 Promise，由它的落定决定关闭还是保持打开。
   与业务动作（actions）的联动（登录后进入编辑、退出登录后退出编辑、
   打开个人信息）不由本模块直接引用 actions，而是由装配层注入回调，
   横向关系因此仍然只出现在 main.js。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;
  var auth = Nav.auth;
  var modal = Nav.modal;

  // 由装配层注入：{ onEnterEditing, onEditProfile, onLogout }
  var hooks = {};

  function setup(next) { hooks = next || {}; }

  function callHook(name) { if (typeof hooks[name] === 'function') hooks[name](); }

  function promptLogin(onSuccess) {
    modal.open({
      title: '登录账号',
      okLabel: '登录',
      fields: [
        { key: 'user', label: '账号', value: '', placeholder: '请输入账号' },
        { key: 'pass', label: '密码', type: 'password', value: '', placeholder: '请输入密码' }
      ],
      onSubmit: function (v) {
        var user = v.user.trim();
        if (!user) { dom.toast('请输入账号'); return false; }
        if (!v.pass) { dom.toast('请输入密码'); return false; }

        // 账号密码只在这次请求里出现：校验通过（resolve）才关弹窗
        return auth.login(user, v.pass).then(function () {
          dom.toast('登录成功');
          if (typeof onSuccess === 'function') onSuccess();
        }, function (e) {
          // 只有后端明确回话（code = HTTP）时才是账号密码的问题，其余都归因于没有后端
          dom.toast(e && e.code === 'HTTP'
            ? (e.message || '登录失败')
            : '登录需要连接数据库：请先启动「启动主页(带数据库).bat」');
          throw e;   // 交给弹窗层：保持打开，等待重新输入
        });
      }
    });
  }

  // 已登录直接执行，否则先登录
  function requireLogin(onOk) {
    if (auth.isLoggedIn()) {
      if (typeof onOk === 'function') onOk();
      return;
    }

    // 本机镜像可能还是页面刚打开时的旧状态，先向后端确认一次，
    // 免得会话其实还有效（例如刚刷新过页面）却让人重新登录
    auth.refresh().then(function (c) {
      if (c.logged) {
        if (typeof onOk === 'function') onOk();
        return;
      }
      promptLogin(onOk);
    });
  }

  // 修改账号 / 密码：当前密码由后端校验，成功后账号名以服务端返回为准
  function changeCred() {
    modal.open({
      title: '修改账号密码',
      okLabel: '保存',
      fields: [
        { key: 'user', label: '账号', value: auth.user(), placeholder: '登录用的账号' },
        { key: 'old', label: '当前密码', type: 'password', value: '', placeholder: '修改前先验证当前密码' },
        { key: 'p1', label: '新密码（留空则不修改）', type: 'password', value: '' },
        { key: 'p2', label: '确认新密码', type: 'password', value: '' }
      ],
      onSubmit: function (v) {
        var user = v.user.trim();
        if (!user) { dom.toast('账号不能为空'); return false; }
        if (!v.old) { dom.toast('请输入当前密码'); return false; }
        if (v.p1 !== v.p2) { dom.toast('两次输入的新密码不一致'); return false; }

        return auth.update({ user: user, oldPass: v.old, pass: v.p1 }).then(function () {
          dom.toast(v.p1 ? '账号密码已更新' : '账号已更新');
        }, function (e) {
          dom.toast(e && e.code === 'HTTP'
            ? (e.message || '保存失败')
            : '修改需要连接数据库：请先启动「启动主页(带数据库).bat」');
          throw e;
        });
      }
    });
  }

  function logout() {
    auth.logout().then(function () {
      callHook('onLogout');
      dom.toast('已退出登录');
    });
  }

  // 账号面板
  function showPanel(user) {
    modal.open({
      title: '账号',
      okLabel: false,
      cancelLabel: '关闭',
      html: '<p class="account-info">当前账号：<b>' + util.escapeHtml(user) + '</b> · 已登录</p>',
      actions: [
        { label: '编辑个人信息', cls: 'primary', onClick: function (close) { close(); callHook('onEditProfile'); } },
        { label: '修改账号密码', cls: '', onClick: function (close) { close(); changeCred(); } },
        { label: '退出登录', cls: 'danger', onClick: function (close) { close(); logout(); } }
      ]
    });
  }

  // 点击头像：未登录先登录并进入编辑模式，已登录展示账号面板
  function openAccount() {
    if (!auth.isLoggedIn()) {
      promptLogin(function () { callHook('onEnterEditing'); });
      return;
    }

    // 会话可能在服务端已经失效（过期 / 别处改过密码），先从后端确认一次
    auth.refresh().then(function (c) {
      if (!c.logged) {
        promptLogin(function () { callHook('onEnterEditing'); });
        return;
      }
      showPanel(c.user);
    });
  }

  Nav.account = {
    setup: setup,
    requireLogin: requireLogin,
    openAccount: openAccount
  };
})(window.Nav);
