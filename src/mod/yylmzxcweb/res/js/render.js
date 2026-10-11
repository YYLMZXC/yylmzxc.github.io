/* ============================================================
   YYLMZXC 离线导航站 · 渲染层
   只把当前状态映射为 DOM：自身不修改数据、不调用业务动作。
   交互以 data-act 属性声明，由装配层（main.js）统一委托分派，
   因此依赖方向保持单向：actions → render，不再出现双向箭头。
   产出的类名与 data-* 字段取自 Nav.contract（见 contract.js）：
   那是本层与其他模块之间的约定，改动必须两边同步。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var dom = Nav.dom;
  var icon = Nav.icon;
  var store = Nav.store;
  var contract = Nav.contract;

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
      // 背景图常是大图：延后挂地址，把启动带宽让给视口内的导航图标。
      // 令牌防串台：两次 header()（乐观渲染 + 后端校正）各排各的，
      // 后一次的同步分支会递增令牌，作废前一次尚未到点的挂图。
      var tok = ++bgToken;
      setTimeout(function () {
        if (tok !== bgToken) return;
        bg.style.backgroundImage = "url('" + d.background + "')";
      }, 150);
    } else {
      bgToken++;
      bg.classList.add('no-image');
      bg.style.backgroundImage = '';
    }
  }

  // 页头可能被连续调用（乐观渲染 + 后端校正），背景挂图需要防串台的令牌
  var bgToken = 0;

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
    var card = document.querySelector(contract.sel.groupOf(group.id));
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
    // dataset 的键名同样取自契约：写下去的是 data-gid，读回来就得用 gid
    var keys = {};
    keys[contract.data.gid] = group.id;
    keys[contract.data.lid] = link.id;

    var a = dom.el('a', {
      class: contract.cls.link + (link.rss ? ' ' + contract.cls.rss : ''),
      href: util.normalizeUrl(link.url),
      target: '_blank',
      rel: 'noopener noreferrer',
      dataset: keys,
      draggable: store.state.editing
    });

    var name = dom.el('span', { class: 'name' });
    name.appendChild(dom.el('span', { class: 'text', text: link.title || link.url }));
    if (link.rss) {
      name.appendChild(dom.el('span', { class: 'rss-badge', text: 'RSS', title: '查看订阅内容' }));
      a.title = '点击查看 RSS 订阅内容';
    }

    a.appendChild(icon.node(link));
    a.appendChild(dom.el('div', { class: contract.cls.meta }, [
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
    var wrap = document.getElementById(contract.id.groups);
    wrap.innerHTML = '';

    var q = store.state.query.trim().toLowerCase();
    var anyVisible = false;

    var list = (store.state.data && store.state.data.groups) || [];
    var groupCount = list.length;

    list.forEach(function (group, gi) {
      var matched = group.links.filter(function (l) { return util.matchLink(l, q); });
      if (q && matched.length === 0) return;
      anyVisible = true;

      var keys = {};
      keys[contract.data.gid] = group.id;
      var card = dom.el('div', {
        class: contract.cls.group + (group.collapsed ? ' collapsed' : ''),
        dataset: keys
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

      var grip = dom.el('span', { class: contract.cls.grip, text: '⠿', title: '拖动排序' });
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

  /* ---------------- 数据落屏 ---------------- */
  // 把一份数据画到界面（页头 + 分组列表）。与最近一次落屏内容一致时跳过重绘：
  // 乐观首屏与后端结果相同时，不会白白重建整棵树、把图标请求全部重来一遍。
  // 「要不要画」是视图自身的知识——指纹怎么取、比完调哪两个函数都收在本层，
  // 装配层只把数据递进来，不必了解渲染细节。
  var lastPaint = '';
  function apply(data) {
    if (!data) return false;
    // 指纹带上搜索词：同一份数据在关键词变化后是不同的画面，不能跳过
    var fp = JSON.stringify(data) + '|' + store.state.query;
    if (fp === lastPaint) return false;
    lastPaint = fp;
    header();
    groups();
    return true;
  }

  // 清空搜索框。DOM 输入框与 store 状态必须一起改，否则列表仍按旧关键词过滤——
  // 关键词会把不匹配的分组整组滤掉，导入之后不清掉，新分组就会「看不到」。
  // 两处都属于视图状态，因此归本层管，业务层不必去摸输入框。
  function clearQuery() {
    var input = document.getElementById('search');
    if (input) input.value = '';
    store.setQuery('');
  }

  // 把刚导入的分组亮出来：滚到第一个新分组，并给这批分组一次高亮。
  // 光刷新列表是不够的：新分组排在末尾，用户盯着首屏只会以为「什么都没进来」。
  // 返回真正找到并高亮的分组数，调用方据此判断这批内容是否真的呈现在页面上。
  function reveal(ids) {
    var found = 0;
    var first = null;
    (ids || []).forEach(function (id) {
      if (!id) return;
      var card = document.querySelector(contract.sel.groupOf(id));
      if (!card) return;
      found++;
      if (!first) first = card;
      card.classList.remove('flash');
      void card.offsetWidth;      // 强制回流：连续两次导入同一批分组也能重新播放动画
      card.classList.add('flash');
      setTimeout(function () { card.classList.remove('flash'); }, 2800);
    });
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return found;
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
    apply: apply,
    header: header,
    groups: groups,
    clearQuery: clearQuery,
    reveal: reveal,
    editingState: editingState,
    setCollapsed: setCollapsed,
    editButton: editButton,
    syncModeUI: syncModeUI,
    staticStatus: staticStatus,
    linkPreview: linkPreview
  };
})(window.Nav);
