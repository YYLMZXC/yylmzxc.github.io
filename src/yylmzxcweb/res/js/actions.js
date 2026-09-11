/* ============================================================
   YYLMZXC 离线导航站 · 编辑动作
   只管「编辑导航内容」这一件事（分组 / 书签 / 站点信息的增删改排序）：
      · 数据搬运与浏览模式是另一套职责，见 transfer.js，不混在一个模块里；
      · 按钮点击由装配层按 data-act 分派到本模块，拖拽落位也调用本模块；
      · 需要登录才能执行的动作由装配层包一层 account.requireLogin。
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

  // 统一收口「改数据 → 保存 → 重渲染」，避免每个动作重复编排同一套流程
  function commit(after) {
    store.save();
    (after || render.groups)();
  }

  /* ---------------- 编辑模式 ---------------- */

  function setEditing(on) {
    // 数据只存在数据库里，因此只有连上数据库才允许改
    if (on && !store.canEdit()) {
      dom.toast('编辑需要连接数据库：请先启动「启动导航站(带数据库).bat」，再把模式切到数据库');
      return false;
    }
    store.state.editing = !!on;
    render.editingState(store.state.editing);
    render.groups();
    return true;
  }

  /* ---------------- 分组 ---------------- */

  function renameGroup(group) {
    modal.open({
      title: '重命名分组',
      fields: [{ key: 'name', label: '分组名称', value: group.name }],
      onSubmit: function (v) {
        group.name = v.name.trim() || '未命名';
        commit();
      }
    });
  }

  // 标题就地编辑的结果（由装配层在失焦时调用）
  function setGroupName(group, name) {
    var v = String(name || '').trim() || '未命名';
    if (v === group.name) return;
    group.name = v;
    store.save();          // 就地编辑已由输入框呈现结果，无需重渲染
  }

  function toggleGroup(group) {
    group.collapsed = !group.collapsed;
    store.save();
    render.setCollapsed(group);   // 只切样式：整块重渲染会打断折叠过渡
  }

  function removeGroup(group) {
    modal.confirm('确定删除分组「' + (group.name || '') + '」及其中的 ' + group.links.length + ' 个书签吗？', function () {
      store.state.data.groups = store.state.data.groups.filter(function (g) { return g.id !== group.id; });
      commit();
      dom.toast('已删除分组');
    });
  }

  function addGroup() {
    var g = { id: util.uid('g'), name: '', column: 0, links: [] };
    store.state.data.groups.push(g);
    renameGroup(g);
    commit();
  }

  // 分组排序按钮：dir 为 -1 上移、1 下移
  function moveGroup(group, dir) {
    var arr = store.state.data.groups;
    var i = arr.indexOf(group), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    arr.splice(i, 1);
    arr.splice(j, 0, group);
    commit();
  }

  // 分组拖拽落位：把 gid 移到 toIndex（toIndex 为移除前的目标下标，与拖拽语义一致）
  function moveGroupTo(gid, toIndex) {
    var arr = store.state.data.groups;
    var from = arr.map(function (g) { return g.id; }).indexOf(gid);
    if (from < 0 || toIndex < 0 || toIndex >= arr.length || from === toIndex) return false;
    var moved = arr.splice(from, 1)[0];
    arr.splice(toIndex, 0, moved);
    commit();
    return true;
  }

  /* ---------------- 书签 ---------------- */

  function editLink(group, link) {
    var isNew = !link;
    link = link || { id: util.uid('l'), title: '', url: '', favicon: '' };

    modal.open({
      title: isNew ? '添加书签 · ' + (group.name || '') : '编辑书签',
      preview: render.linkPreview,
      fields: [
        { key: 'url', label: '网址', value: link.url, placeholder: 'https://example.com' },
        { key: 'title', label: '名称', value: link.title, placeholder: '留空则自动使用域名' },
        { key: 'favicon', label: '图标地址（可选）', value: link.favicon, placeholder: '留空则自动获取站点图标' },
        { key: 'rss', label: '标记为 RSS 订阅', type: 'checkbox', value: !!link.rss }
      ],
      onSubmit: function (v) {
        var url = util.normalizeUrl(v.url);
        if (!url) { dom.toast('请填写网址'); return false; }
        link.url = url;
        link.title = v.title.trim() || util.hostOf(url);
        link.favicon = v.favicon.trim();
        link.rss = !!v.rss;
        if (isNew) group.links.push(link);
        commit();
        dom.toast(isNew ? '已添加书签' : '已保存');
      }
    });
  }

  function removeLink(group, link) {
    modal.confirm('删除书签「' + (link.title || link.url) + '」？', function () {
      group.links = group.links.filter(function (l) { return l.id !== link.id; });
      commit();
      dom.toast('已删除书签');
    });
  }

  // 书签排序按钮：dir 为 -1 上移、1 下移
  function moveLink(group, link, dir) {
    var arr = group.links;
    var i = arr.indexOf(link), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    arr.splice(i, 1);
    arr.splice(j, 0, link);
    commit();
  }

  // 书签拖拽落位：先取出再定位，因此同组内拖动也不会算错位置
  // refLid 为参照书签；after 为 true 时插到它后面，refLid 为空则追加到末尾
  function moveLinkTo(drag, toGid, refLid, after) {
    var src = store.findGroup(drag.gid);
    var dst = store.findGroup(toGid);
    if (!src || !dst) return false;

    var at = src.links.map(function (l) { return l.id; }).indexOf(drag.lid);
    if (at < 0) return false;
    var link = src.links.splice(at, 1)[0];

    var insertAt = dst.links.length;
    if (refLid) {
      var idx = dst.links.map(function (l) { return l.id; }).indexOf(refLid);
      if (idx > -1) insertAt = after ? idx + 1 : idx;
    }

    dst.links.splice(insertAt, 0, link);
    commit();
    return true;
  }

  /* ---------------- 站点信息（页头的标题 / 描述 / 头像 / 背景图 / 快捷链接） ---------------- */

  // 背景图字段的附加控件：选本机图片 → 上传到后端 → 回填相对路径并给出缩略图。
  // 数据里只留一个短路径，页面与静态文件都能引用同一张图。
  function backgroundPicker(inp, refresh) {
    var thumb = dom.el('img', { class: 'bg-thumb', alt: '' });
    var pick = dom.el('button', { class: 'btn', type: 'button', text: '选择图片' });
    var row = dom.el('div', { class: 'field-extra' }, [pick, thumb]);

    function syncThumb() {
      var v = inp.value.trim();
      thumb.hidden = !v;
      if (v) thumb.src = v;
    }

    pick.addEventListener('click', function () {
      dom.pickFile('image/*', function (file) {
        pick.disabled = true;
        dom.toast('正在上传图片 ...');
        api.uploadImage(file).then(function (path) {
          inp.value = path;
          syncThumb();
          if (refresh) refresh();
          dom.toast('图片已上传，保存后生效');
        }).catch(function (e) {
          dom.toast('上传失败：' + e.message);
        }).then(function () { pick.disabled = false; });
      });
    });

    // 手填地址或相对路径时，缩略图跟着输入走
    inp.addEventListener('input', syncThumb);
    syncThumb();
    return row;
  }

  function editProfile() {
    var d = store.state.data;
    var p = d.profile || { name: '', avatar: '', links: [] };

    // 快捷链接支持 { url, favicon }：编辑框只展示地址，保存时按地址把自定义图标带回去
    var icons = {};
    (p.links || []).forEach(function (u) {
      var o = util.profileLink(u);
      var url = util.normalizeUrl(o.url);
      if (url && o.favicon) icons[url] = o.favicon;
    });

    modal.open({
      title: '编辑站点信息',
      fields: [
        {
          key: 'title', label: '站点标题',
          value: d.title || '', placeholder: '显示在页头，同时作为浏览器标签名'
        },
        {
          key: 'description', label: '站点描述', type: 'textarea',
          value: d.description || '', placeholder: '标题下方的一行说明'
        },
        { key: 'name', label: '昵称', value: p.name || '', placeholder: '头像加载失败时的备用文字' },
        { key: 'avatar', label: '头像地址', value: p.avatar || '' },
        {
          key: 'background', label: '背景图地址', value: d.background || '',
          placeholder: '留空用纯色背景；也可点「选择图片」上传本机图片',
          extra: backgroundPicker
        },
        {
          key: 'links', label: '快捷链接（每行一个）', type: 'textarea',
          value: (p.links || []).map(function (u) { return util.profileLink(u).url; }).join('\n')
        }
      ],
      onSubmit: function (v) {
        var links = v.links.split(/\r?\n/)
          .map(function (s) { return util.normalizeUrl(s.trim()); })
          .filter(Boolean)
          .map(function (url) { return icons[url] ? { url: url, favicon: icons[url] } : url; });

        // 标题留空会让页头与标签页失去名字，回落到默认值；描述与背景图允许为空
        store.state.data.title = v.title.trim() || '导航';
        store.state.data.description = v.description.trim();
        store.state.data.background = v.background.trim();
        store.state.data.profile = {
          name: v.name.trim(),
          avatar: v.avatar.trim(),
          links: links
        };
        commit(render.header);
        dom.toast('已保存站点信息');
      }
    });
  }

  Nav.actions = {
    setEditing: setEditing,
    renameGroup: renameGroup,
    setGroupName: setGroupName,
    toggleGroup: toggleGroup,
    removeGroup: removeGroup,
    addGroup: addGroup,
    moveGroup: moveGroup,
    moveGroupTo: moveGroupTo,
    editLink: editLink,
    removeLink: removeLink,
    moveLink: moveLink,
    moveLinkTo: moveLinkTo,
    editProfile: editProfile
  };
})(window.Nav);
