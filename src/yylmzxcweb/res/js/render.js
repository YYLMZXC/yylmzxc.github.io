/* ============================================================
   YYLMZXC 离线导航站 · 渲染层
   只把当前状态映射为 DOM：自身不修改数据、不调用业务动作。
   交互以 data-act 属性声明，由装配层（main.js）统一委托分派，
   因此依赖方向保持单向：actions → render，不再出现双向箭头。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;
  var icon = Nav.icon;
  var store = Nav.store;

  /* ---------------- 页头 ---------------- */

  function header() {
    var d = store.state.data;
    var title = d.title || '导航';

    // 标题与描述都是可编辑字段，浏览器标签名跟着标题走
    document.title = title;
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-desc').textContent = d.description || '';

    var av = document.getElementById('avatar');
    var custom = (d.profile && d.profile.avatar) || '';

    // 兜底顺序：自定义头像 → 默认头像 res/img.png → 昵称首字母生成的头像
    function lastResort() {
      av.onerror = null;
      av.src = util.letterAvatar((d.profile && d.profile.name) || title, title);
    }
    function defaultAvatar() {
      av.onerror = lastResort;
      av.src = util.DEFAULT_AVATAR;
    }

    av.style.display = '';
    if (custom) {
      av.onerror = defaultAvatar;      // 自定义头像失效时不至于空着，退回默认头像
      av.src = custom;
    } else {
      defaultAvatar();
    }

    var pl = document.getElementById('profile-links');
    pl.innerHTML = '';

    // 快捷链接只显示站点图标，域名退到 title / aria-label 上，避免占宽度
    var links = (d.profile && d.profile.links) || [];
    links.forEach(function (u) {
      var item = util.profileLink(u);
      var url = util.normalizeUrl(item.url);
      if (!url) return;
      var host = util.hostOf(url) || url;
      pl.appendChild(dom.el('a', {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        title: host,
        attrs: { 'aria-label': host }
      }, [icon.node({ title: host, url: url, favicon: item.favicon })]));
    });
    pl.style.display = links.length ? '' : 'none';

    var bg = document.getElementById('bg');
    if (d.background) {
      bg.classList.remove('no-image');
      bg.style.backgroundImage = "url('" + d.background + "')";
    } else {
      bg.classList.add('no-image');
      bg.style.backgroundImage = '';
    }
  }

  /* ---------------- 编辑模式相关外观 ---------------- */

  function editingState(on) {
    document.body.classList.toggle('editing', on);
    var btn = document.getElementById('btn-edit');
    btn.classList.toggle('primary', !on);
    btn.querySelector('.label').textContent = on ? '完成' : '编辑';
    btn.title = on ? '退出编辑模式' : '进入编辑模式';
    document.getElementById('btn-add-group').parentNode.hidden = !on;

    // 编辑模式下页头整块可点，用提示说明点它会改什么
    var brand = document.querySelector('.brand');
    if (brand) brand.title = on ? '点击修改站点标题 / 描述 / 头像 / 背景图 / 快捷链接' : '';
  }

  // 只切换折叠样式：整块重渲染会重建节点，打断展开/收起过渡
  function setCollapsed(group) {
    var card = document.querySelector('.group[data-gid="' + group.id + '"]');
    if (card) card.classList.toggle('collapsed', !!group.collapsed);
  }

  /* ---------------- 工具栏状态 ---------------- */
  // 与 store 状态一一对应的按钮外观：状态变化由装配层订阅后转发到这里，
  // 于是「状态 → DOM」的映射全部收口在渲染层，装配层只做分发。

  // 数据库模式高亮；想用数据库却连不上时转警示色
  // 连不上时把「哪种毛病 + 怎么办」写进按钮提示：不用翻控制台也能看到原因
  function offlineTip() {
    var e = store.state.lastError;
    if (!e || !e.label) return '';
    return '：' + (e.reason || e.label) + (e.hint ? '。' + e.hint : '');
  }

  function modeButton() {
    var btn = document.getElementById('btn-mode');
    if (!btn) return;
    var isDb = store.state.mode === 'db';
    var degraded = store.state.prefer !== store.state.mode;   // 想用数据库但连不上
    var warn = (isDb && !store.state.online) || degraded;
    var why = offlineTip();

    btn.querySelector('.label').textContent = isDb ? '数据库' : '前端';
    if (isDb && !warn) {
      btn.title = '数据库浏览模式（数据来自 MySQL，可编辑），点击切换到前端浏览模式';
    } else if (isDb) {
      btn.title = '数据库浏览模式但已断开' + why + '，正在显示本机镜像（只读），点击切换到前端浏览模式';
    } else if (degraded) {
      btn.title = '前端浏览模式（只读）：数据库没连上' + why + '，点击重试数据库浏览模式';
    } else {
      btn.title = '前端浏览模式（只读，数据来自静态文件），点击切换到数据库浏览模式';
    }
    btn.classList.toggle('active', isDb && !warn);
    btn.classList.toggle('warn', warn);
  }

  // 编辑只在连上数据库时可用：数据只存在数据库里
  function editButton() {
    var btn = document.getElementById('btn-edit');
    if (!btn) return;
    var ok = store.canEdit();
    btn.classList.toggle('warn', !ok && !store.state.editing);
    if (!store.state.editing) {
      btn.title = ok
        ? '进入编辑模式（修改实时写入数据库）'
        : '编辑仅在连接数据库时可用：请先运行「启动主页(带数据库).bat」';
    }
  }

  function syncModeUI() { modeButton(); editButton(); }

  // 静态文件同步结果反馈到「转换」按钮上，不弹提示打扰
  function staticStatus(evt) {
    var btn = document.getElementById('btn-convert');
    if (!btn) return;
    btn.classList.toggle('warn', !evt.ok);
    btn.title = evt.ok
      ? '数据转换 · 静态文件已于 ' + new Date(evt.at || Date.now()).toLocaleTimeString() + ' 同步'
      : '数据转换 · 静态文件同步失败：' + evt.error;
  }

  /* ---------------- 书签 ---------------- */

  function linkNode(link, group, index, total) {
    var a = dom.el('a', {
      class: 'link' + (link.rss ? ' rss' : ''),
      href: util.normalizeUrl(link.url),
      target: '_blank',
      rel: 'noopener noreferrer',
      dataset: { gid: group.id, lid: link.id },
      draggable: store.state.editing
    });

    var name = dom.el('span', { class: 'name' });
    name.appendChild(dom.el('span', { class: 'text', text: link.title || link.url }));
    if (link.rss) {
      name.appendChild(dom.el('span', { class: 'rss-badge', text: 'RSS', title: '查看订阅内容' }));
      a.title = '点击查看 RSS 订阅内容';
    }

    a.appendChild(icon.node(link));
    a.appendChild(dom.el('div', { class: 'meta' }, [
      name,
      dom.el('span', { class: 'host', text: util.hostOf(link.url) })
    ]));

    if (store.state.editing) {
      a.appendChild(dom.el('span', { class: 'actions' }, [
        dom.el('button', {
          type: 'button', title: '上移', disabled: index <= 0, dataset: { act: 'link-move-up' }
        }, [dom.svg(['M18 15l-6-6-6 6'])]),
        dom.el('button', {
          type: 'button', title: '下移', disabled: index >= total - 1, dataset: { act: 'link-move-down' }
        }, [dom.svg(['M6 9l6 6 6-6'])]),
        dom.el('button', {
          type: 'button', title: '编辑', dataset: { act: 'link-edit' }
        }, [dom.svg(['M12 20h9', 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z'])]),
        dom.el('button', {
          class: 'del', type: 'button', title: '删除', dataset: { act: 'link-remove' }
        }, [dom.svg(['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14'])])
      ]));
    }

    return a;
  }

  /* ---------------- 分组列表 ---------------- */

  function groups() {
    var wrap = document.getElementById('groups');
    wrap.innerHTML = '';

    var q = store.state.query.trim().toLowerCase();
    var anyVisible = false;

    var list = (store.state.data && store.state.data.groups) || [];
    var groupCount = list.length;

    list.forEach(function (group, gi) {
      var matched = group.links.filter(function (l) { return util.matchLink(l, q); });
      if (q && matched.length === 0) return;
      anyVisible = true;

      var card = dom.el('div', {
        class: 'group' + (group.collapsed ? ' collapsed' : ''),
        dataset: { gid: group.id }
      });

      // ---- 头部：点击整行折叠 / 展开 ----
      var titleEl = dom.el('span', { class: 'title', text: group.name || '未命名' });
      titleEl.setAttribute('contenteditable', store.state.editing ? 'true' : 'false');
      if (store.state.editing) {
        // 带 data-act 的元素会被分派器跳过，因此编辑中的标题不会触发折叠
        titleEl.dataset.act = 'group-title';
        titleEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
        });
      }

      var grip = dom.el('span', { class: 'grip', text: '⠿', title: '拖动排序' });
      grip.draggable = store.state.editing;

      var head = dom.el('div', { class: 'group-head', dataset: { act: 'toggle-group' } }, [
        grip,
        titleEl,
        dom.el('span', {
          class: 'count',
          text: q ? (matched.length + '/' + group.links.length) : String(group.links.length)
        }),
        dom.svg(['M6 9l6 6 6-6'], { viewBox: '0 0 24 24' })
      ]);
      head.lastChild.setAttribute('class', 'chev');

      // ---- 主体 ----
      var body = dom.el('div', { class: 'group-body' });
      group.links.forEach(function (link, li) {
        body.appendChild(linkNode(link, group, li, group.links.length));
      });

      if (store.state.editing) {
        body.appendChild(dom.el('button', { class: 'add-link', type: 'button', dataset: { act: 'link-add' } }, [
          dom.svg(['M12 5v14', 'M5 12h14']),
          dom.el('span', { text: '添加书签' })
        ]));
      }

      // ---- 底部（编辑态）----
      var foot = dom.el('div', { class: 'group-foot' }, [
        dom.el('button', { class: 'btn', text: '上移', type: 'button', disabled: gi === 0, dataset: { act: 'group-move-up' } }),
        dom.el('button', { class: 'btn', text: '下移', type: 'button', disabled: gi === groupCount - 1, dataset: { act: 'group-move-down' } }),
        dom.el('button', { class: 'btn', text: '重命名', type: 'button', dataset: { act: 'group-rename' } }),
        dom.el('button', { class: 'btn', text: '添加书签', type: 'button', dataset: { act: 'link-add' } }),
        dom.el('button', { class: 'btn danger', text: '删除分组', type: 'button', dataset: { act: 'group-remove' } })
      ]);

      card.appendChild(head);
      card.appendChild(body);
      card.appendChild(foot);
      wrap.appendChild(card);
    });

    document.getElementById('empty').hidden = anyVisible;
  }

  /* ---------------- 数据转换面板（弹窗内容） ---------------- */
  // 业务层只提供数据，标记由视图层产出，避免视图细节散落在业务模块里
  function convertPanelHtml(info) {
    return '<p class="account-info">当前浏览模式：<b>' + info.modeText + '</b>' +
      '<br>后端连接：<b>' + (info.online ? '正常' : '未连接') + '</b>' +
      '<br>当前页面数据：<b>' + info.groups + ' 个分组 · ' + info.links + ' 个书签</b>' +
      '<br>静态文件：<b>res/data/nav-default.js</b>（最近同步：' + util.escapeHtml(info.syncAt) + '）</p>' +
      dbErrorHtml(info.dbError) +
      '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
      (info.online
        ? '静态文件是离线页面（双击 yylmzxc.html）唯一的数据来源，内容只能由数据库导出。开启自动同步后，每次编辑入库都会顺带刷新它。'
        : '后端未连接，页面处于只读状态：编辑与入库都需要连接数据库。') +
      '</p>' +
      (info.online
        ? '<label class="preview"><input type="checkbox" id="nav-autosync"' +
          (info.auto ? ' checked' : '') + '><span>编辑数据库后自动同步静态文件</span></label>'
        : '');
  }

  // 连不上数据库时，把「哪种毛病 / 卡在哪一步 / 怎么办」摆出来。
  // 文案全部来自后端诊断（见 server/db.js 的 diagnose），比一句「未连接」有用得多。
  function dbErrorHtml(e) {
    if (!e) return '';
    var rows = [];
    if (e.label) rows.push('毛病：<b>' + util.escapeHtml(e.label) + '</b>');
    rows.push('原因：' + util.escapeHtml(e.reason || e.label || '连接数据库失败'));
    if (e.stage) rows.push('环节：' + util.escapeHtml(e.stage));
    if (e.target) rows.push('目标：' + util.escapeHtml(e.target));
    if (e.hint) rows.push('建议：' + util.escapeHtml(e.hint));
    if (e.detail) rows.push('原始报错：' + util.escapeHtml(e.detail));

    return '<div style="margin:0 0 13px;padding:10px 12px;border-left:3px solid var(--danger);' +
      'font-size:12.5px;line-height:1.75;word-break:break-all;color:var(--muted)">' +
      rows.join('<br>') + '</div>';
  }

  /* ---------------- 弹窗内的书签预览 ---------------- */
  // 由调用方作为 preview 回调传给 modal，避免弹窗层依赖渲染层
  function linkPreview(values, box) {
    var url = util.normalizeUrl(values.url || '');
    var title = (values.title || '').trim() || util.hostOf(url) || '?';

    box.innerHTML = '';
    box.appendChild(icon.node({ title: title, url: url, favicon: (values.favicon || '').trim() }));

    var s = document.createElement('span');
    s.textContent = title + (url ? ' · ' + util.hostOf(url) : '');
    box.appendChild(s);
  }

  Nav.render = {
    header: header,
    groups: groups,
    editingState: editingState,
    setCollapsed: setCollapsed,
    editButton: editButton,
    syncModeUI: syncModeUI,
    staticStatus: staticStatus,
    convertPanelHtml: convertPanelHtml,
    linkPreview: linkPreview
  };
})(window.Nav);
