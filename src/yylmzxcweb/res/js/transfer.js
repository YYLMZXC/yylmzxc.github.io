/* ============================================================
   YYLMZXC 离线导航站 · 数据搬运与浏览模式
   把「数据进出页面」这类操作集中一处，与书签编辑动作（actions.js）分开，
   避免单个模块同时承担两套互不相干的职责：
     · 导入 / 导出 / 重置（以静态文件为准）
     · 前端 ⇄ 数据库 浏览模式切换
     · 数据库 → 静态文件 的数据转换
   依赖全部指向下层（store / render / modal / dom / util / api）；
   与 actions 同属业务层但不互相引用，横向关系一律由装配层（main.js）分派。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;
  var api = Nav.api;
  var store = Nav.store;
  var render = Nav.render;
  var modal = Nav.modal;

  // 换上一份新数据后的统一编排：按需写回数据库，再刷新界面。
  // 是否写库由调用方显式给出，避免「只是切模式」也顺带发一次多余的覆盖请求。
  function showData(data, save) {
    store.setData(data);
    if (save) store.save();
    render.header();
    render.groups();
  }

  /* ---------------- 导入 / 导出 / 重置 ---------------- */

  function exportData() {
    var data = store.state.data;
    var name = (data.title || 'nav').replace(/[\\/:*?"<>|]+/g, '_');
    dom.download(name + '-导航备份.json', JSON.stringify(data, null, 2), 'application/json');
    dom.toast('已导出 JSON');
  }

  function importData() {
    dom.pickFile('.json,application/json', handleFile);
  }

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        showData(store.normalizeImported(JSON.parse(reader.result)), true);
        dom.toast('导入成功');
      } catch (e) {
        dom.toast('导入失败：' + e.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // 重置：一律以静态数据文件（res/data/nav-default.js）为准
  //   · 数据库模式：用文件内容覆盖数据库，会丢弃库中的修改
  //   · 前端模式：本来就以文件为准，等于按文件重新载入一次
  function resetData() {
    if (!store.canEdit()) {
      store.loadStatic().then(function (data) {
        showData(data, false);
        dom.toast('已按静态文件重新载入');
      });
      return;
    }

    modal.confirm('将以静态文件 res/data/nav-default.js 为准覆盖数据库中的全部数据，库中的修改会全部丢失。确定继续吗？', function () {
      store.loadStatic().then(function (data) {
        showData(data, true);              // 数据库模式：写回 MySQL
        var s = store.stats();
        dom.toast('已按静态文件重置数据库（' + s.groups + ' 组 / ' + s.links + ' 书签）');
      });
    });
  }

  /* ---------------- 浏览模式：前端 ⇄ 数据库 ---------------- */

  var MODE_TEXT = { static: '前端浏览模式（只读）', db: '数据库浏览模式' };

  function currentModeText() { return MODE_TEXT[store.state.mode] || MODE_TEXT.static; }

  function switchBrowsingMode() {
    if (store.state.editing) { dom.toast('请先退出编辑模式再切换浏览模式'); return; }

    if (store.state.mode === 'db') {
      store.switchMode('static').then(function (data) {
        showData(data, false);
        dom.toast('已切换到前端浏览模式（只读，数据来自静态文件）');
      });
      return;
    }

    store.switchMode('db').then(function (data) {
      showData(data, false);               // 拉取已由 switchMode 落库，这里只刷新界面
      var s = store.stats();
      dom.toast('已切换到数据库浏览模式（可编辑，' + s.groups + ' 组 / ' + s.links + ' 书签）');
    }).catch(function (e) {
      dom.toast('切换数据库失败：' + e.message + '，仍为只读的前端浏览模式');
    });
  }

  /* ---------------- 数据转换：数据库 → 静态文件 ---------------- */

  function requireBackend() {
    dom.toast('未检测到后端服务，请先运行「启动主页(带数据库).bat」');
  }

  // 转换面板：数据只有两个方向 —— 数据库 → 静态文件（离线页面的数据源）、数据库 → 页面
  function convertPanel() {
    // 用带诊断的版本：连不上时要说清是「MySQL 没启动」「账号不对」还是「没授权」，
    // 而不是笼统一句「未连接」（结论来自后端，见 server/db.js）
    api.healthInfo().then(function (info) {
      var online = !!(info && info.ok);
      store.setOnline(online);
      store.setLastError(online ? null : info);   // 模式按钮的提示也跟着更新

      var s = store.stats();
      var sync = store.syncState();
      var choices = online ? [
        {
          label: '同步到静态文件（数据库 → 离线页面）', cls: 'primary block',
          onClick: function (close) { close(); syncToStatic(); }
        },
        {
          label: '从数据库重新读取（丢弃页面内容）', cls: 'block',
          onClick: function (close) { close(); pullFromDatabase(); }
        },
        {
          label: '导出 JSON 备份', cls: 'block',
          onClick: function (close) { close(); exportData(); }
        }
      ] : [
        {
          label: '导出 JSON 备份', cls: 'primary block',
          onClick: function (close) { close(); exportData(); }
        }
      ];

      var body = modal.open({
        title: '数据转换',
        okLabel: false,
        cancelLabel: '关闭',
        html: render.convertPanelHtml({
          modeText: currentModeText(),
          online: online,
          dbError: online ? null : info,
          groups: s.groups,
          links: s.links,
          syncAt: sync.at ? new Date(sync.at).toLocaleString() : '尚未同步',
          auto: sync.auto
        }),
        actions: choices
      });

      // 弹窗内容是同步注入的，直接在自己那份容器里绑定开关
      var box = body && body.querySelector('#nav-autosync');
      if (box) box.addEventListener('change', function () {
        store.setAutoSync(box.checked);
        dom.toast(box.checked
          ? '已开启自动同步：编辑入库后自动刷新静态文件'
          : '已关闭自动同步：需要手动点「同步到静态文件」');
      });
    });
  }

  function exportFail(e) {
    if (e && e.code === api.NOT_API) requireBackend();
    else dom.toast('同步静态文件失败：' + (e && e.message ? e.message : '未知错误'));
  }

  // 数据库 → 静态文件：把 MySQL 里的数据写进出厂数据文件
  function syncToStatic() {
    modal.confirm('将把数据库中的数据写入 res/data/nav-default.js，作为离线页面的数据来源。继续吗？', function () {
      store.exportStatic().then(function (r) {
        var info = r.file + '（' + r.groups + ' 组 / ' + r.links + ' 书签）';
        // 前端模式的数据就来自这个文件，顺手重载一次，页面立刻与文件一致
        if (store.state.mode !== 'static') { dom.toast('静态文件已更新：' + info); return; }
        store.loadStatic().then(function (data) {
          store.setData(data);
          render.header(); render.groups();
          dom.toast('静态文件已更新并重新载入：' + info);
        });
      }).catch(exportFail);
    });
  }

  // 数据库 → 当前页面
  function pullFromDatabase() {
    modal.confirm('将用数据库中的数据覆盖当前页面内容，页面上的临时内容会丢失，确定继续吗？', function () {
      api.getNav().then(function (d) {
        if (!d) throw new Error('数据库中没有可用数据');
        showData(d, store.state.mode === 'db');   // 数据库模式顺带刷新断网镜像
        store.setOnline(true);
        dom.toast('已从数据库重新读取');
      }).catch(function (e) {
        dom.toast('读取数据库失败：' + e.message);
      });
    });
  }

  Nav.transfer = {
    exportData: exportData,
    importData: importData,
    resetData: resetData,
    switchBrowsingMode: switchBrowsingMode,
    convertPanel: convertPanel
  };
})(window.Nav);
