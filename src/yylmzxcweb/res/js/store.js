/* ============================================================
   YYLMZXC 离线导航站 · 数据层
   权威数据只有一份：MySQL。数据流是单向的，不给「同一份数据两个写入方」留口子：
     · 数据库浏览模式 'db'：数据来自 MySQL，编辑实时写回数据库，
       是唯一可编辑的形态；连不上时降级为只读的离线浏览。
     · 前端浏览模式 'static'：只读，数据固定来自静态数据文件 nav-default.js
       （由「转换 → 同步到静态文件」从数据库导出），本机不保存任何修改。
   存储细节交给 Nav.storage，HTTP 细节交给 Nav.api，静态文件细节交给 Nav.source，
   本模块只做策略编排；状态变化通过 subscribe/emit 广播，既不操作 DOM，也不依赖上层模块。

   写入归属（避免「谁都能改 state」的隐式耦合）：
     · state 对外只读，改状态一律走本模块的方法（setData / setQuery / setEditing / setDrag）；
     · 数据「内容」的编辑（分组 / 书签 / 站点信息的字段）由编辑动作层独家负责，见 actions.js；
       本模块只负责「整份数据」的替换与持久化，不掺和字段级修改。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;
  var storage = Nav.storage;
  var api = Nav.api;
  var source = Nav.source;
  var KEY = storage.KEYS;

  var state = {
    data: null,
    editing: false,
    query: '',
    drag: null,       // { type:'link'|'group', gid, lid }
    online: true,     // 后端是否可用（仅数据库模式有意义）
    mode: 'static',   // 实际数据来源：'static'（前端） | 'db'（数据库）
    prefer: 'db',     // 用户选择的浏览模式
    lastError: null   // 最近一次连不上的原因（见 connectionError），界面据此说明「为什么连不上」
  };

  /* ---------------- 事件广播 ---------------- */
  // 把「模式变化」「需要提示用户」这类事实通知给装配层，
  // 避免数据层反向依赖入口层或 UI 层。
  var listeners = [];

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  function emit(event) {
    listeners.slice().forEach(function (fn) {
      try { fn(event); } catch (e) { /* 单个订阅者异常不影响其它订阅者 */ }
    });
  }

  function notify(message) { emit({ type: 'notice', message: message }); }

  function setMode(next) {
    if (state.mode === next) return;
    state.mode = next;
    emit({ type: 'mode' });
  }

  function setOnline(next) {
    next = !!next;
    if (state.online === next) return;
    state.online = next;
    emit({ type: 'mode' });
  }

  /* ---------------- 状态写入（state 的对外写入口） ----------------
     只改状态、不广播：界面何时刷新由调用方显式决定，与直接赋值时的行为保持一致。 */

  // 整份数据替换（载入 / 切换模式 / 导入 / 从数据库重取都走这里）
  function setData(data) { state.data = data; }

  // 搜索关键词
  function setQuery(q) { state.query = String(q == null ? '' : q); }

  // 编辑模式开关
  function setEditing(on) { state.editing = !!on; }

  // 拖拽中态：{ type:'link'|'group', gid, lid }，由拖拽模块写入
  function setDrag(drag) { state.drag = drag || null; }

  /* ---------------- 连不上时怎么说清楚 ----------------
     「前端连不上后端」和「后端连不上数据库」是两回事，后者还要再分出
     「MySQL 没启动」「账号密码不对」「没有授权访问这个库」「库不存在」……
     结论由后端给出（见 server/db.js 的 diagnose，随 /api/health 与各接口报错带回来），
     这里只负责挑一句适合弹提示的短话，完整诊断留给界面显示。 */

  function setLastError(e) {
    state.lastError = e || null;
    emit({ type: 'mode' });
  }

  function connectionError(e) {
    // 静态页面能打开、/api 却打不通：后端没起，或反向代理没把 /api 转过去
    var offline = {
      kind: 'offline',
      label: '未连接后端服务',
      reason: '后端没有回应',
      hint: '请先运行「启动主页(带数据库).bat」把后端跑起来；' +
        '若通过域名访问，还要确认 Apache（小皮面板）已把 /api/ 转发到 127.0.0.1:8000。',
      short: '未连接后端服务，已切到前端浏览模式（只读）'
    };
    if (!e || e.code === api.NOT_API) return offline;

    var label = e.label || '连接数据库失败';
    return {
      kind: e.kind || 'unknown',
      label: label,
      reason: e.message || label,
      hint: e.hint || '',
      short: label + '，已切到前端浏览模式（只读）'
    };
  }

  /* ---------------- 数据构造与查询 ---------------- */

  // 静态数据文件里声明的数据（导出后刷新页面即可看到最新内容）
  function staticFile() { return source.current(); }

  function defaults() {
    return util.clone(staticFile() || { title: '导航', groups: [] });
  }

  // 只有连上数据库才允许改数据，避免出现「改了却存不下来」的错觉
  function canEdit() { return state.mode === 'db' && state.online; }

  // 校验并补齐导入数据的缺失字段，格式不正确时抛出异常
  function normalizeImported(d) {
    if (!d || !Array.isArray(d.groups)) throw new Error('格式不正确');
    d.groups.forEach(function (g) {
      g.id = g.id || util.uid('g');
      g.name = g.name || '未命名';
      g.links = Array.isArray(g.links) ? g.links : [];
      g.links.forEach(function (l) { l.id = l.id || util.uid('l'); });
    });
    return d;
  }

  function groups() { return (state.data && state.data.groups) || []; }

  function findGroup(gid) {
    return groups().filter(function (g) { return g.id === gid; })[0] || null;
  }

  function findLink(gid, lid) {
    var g = findGroup(gid);
    if (!g) return null;
    return g.links.filter(function (l) { return l.id === lid; })[0] || null;
  }

  function stats() {
    var links = 0;
    groups().forEach(function (g) { links += (g.links || []).length; });
    return { groups: groups().length, links: links };
  }

  /* ---------------- 本地数据的读写分流 ---------------- */

  function readData(key) {
    var d = storage.local.readJSON(key, null);
    return (d && Array.isArray(d.groups)) ? d : null;
  }

  // 前端模式的数据：静态数据文件 → 旧版本遗留的本机数据 → 空数据
  // 文件永远优先，因此导出后刷新页面必定是最新内容，不会被本机旧副本盖住。
  function localOrDefault() {
    var file = staticFile();
    if (file) return util.clone(file);
    return readData(KEY.data) || { title: '导航', groups: [] };
  }

  // 重新拉取静态数据文件（带缓存穿透）；文件不可用时退回页面加载时的那份。
  // 怎么取文件属于浏览器副作用，交给 Nav.source，本模块只保留「取不到怎么办」的策略。
  function loadStatic() {
    return source.reload().then(function () { return localOrDefault(); });
  }

  function readPrefer() { return storage.local.read(KEY.mode) === 'static' ? 'static' : 'db'; }

  /* ---------------- 保存与同步 ---------------- */

  // 数据库模式下串行写回，避免并发请求导致顺序错乱
  var chain = Promise.resolve();

  // 写回数据库；resolve(true/false) 表示本次是否已真正入库
  function pushToServer(data) {
    chain = chain.then(function () {
      return api.putNav(data).then(function () {
        setOnline(true);
        return true;
      }).catch(function (e) {
        if (state.online) {
          setOnline(false);
          setLastError(connectionError(e));
          notify('保存失败：' + state.lastError.reason + '，本次修改没有入库，恢复连接后请重新编辑');
        }
        return false;
      });
    });
    return chain;
  }

  // 保存：数据库模式下写回 MySQL（并刷新断网镜像）；
  // 前端浏览模式是只读的，不落任何存储，返回 false 表示本次修改未入库。
  function save() {
    if (state.mode !== 'db') return false;
    storage.local.writeJSON(KEY.dbCache, state.data);
    pushToServer(state.data).then(function (ok) {
      if (ok) scheduleAutoExport();
    });
    return true;
  }

  /* ---------------- 静态文件同步：数据库 → 离线页面 ---------------- */

  // 自动同步开关与最近一次同步时间同存一个键
  function syncState() {
    var s = storage.local.readJSON(KEY.sync, null) || {};
    return { auto: s.auto !== false, at: Number(s.at) || 0 };
  }

  function writeSyncState(patch) {
    var s = syncState();
    if (patch.auto != null) s.auto = !!patch.auto;
    if (patch.at != null) s.at = patch.at;
    storage.local.writeJSON(KEY.sync, s);
    return s;
  }

  var autoTimer = null;

  // 把数据库中的数据写进出厂数据文件（离线页面的数据源）
  // 先等写回队列排空，避免刚编辑完就导出、文件里少了最后一笔修改。
  function exportStatic() {
    return chain.then(function () {
      return api.exportStatic();
    }).then(function (r) {
      var at = Date.now();
      setOnline(true);
      // 同步刷新内存里的静态数据：切到前端模式时看到的必须就是刚写入文件的那份
      if (r && r.data) source.set(r.data);
      writeSyncState({ at: at });
      emit({ type: 'static', ok: true, at: at, file: r.file, groups: r.groups, links: r.links });
      return r;
    }, function (e) {
      emit({ type: 'static', ok: false, error: (e && e.message) || '导出失败' });
      throw e;
    });
  }

  // 编辑入库后顺带把静态文件刷新，离线页面因此始终与数据库一致
  function scheduleAutoExport() {
    if (!syncState().auto) return;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      autoTimer = null;
      if (!state.online) return;                   // 断连时静默跳过，恢复后手动同步
      exportStatic().catch(function () { /* 结果已通过 static 事件广播 */ });
    }, 600);
  }

  function setAutoSync(on) {
    writeSyncState({ auto: !!on });
    if (on) scheduleAutoExport();
  }

  /* ---------------- 加载与模式切换 ---------------- */

  // 取回数据库数据；数据库为空时用出厂数据初始化
  function fetchNav() {
    return api.getNav().then(function (data) {
      if (data) return data;
      var d = defaults();
      return api.putNav(d).then(function () { return d; }, function () { return d; });
    });
  }

  // 启动加载：按用户选择的模式取数据
  function load() {
    state.prefer = readPrefer();

    if (state.prefer === 'static') {            // 前端浏览模式：不访问后端
      setMode('static');
      setOnline(true);
      return Promise.resolve(localOrDefault());
    }

    return fetchNav().then(function (data) {    // 数据库浏览模式
      setMode('db');
      setOnline(true);
      storage.local.writeJSON(KEY.dbCache, data);
      return data;
    }).catch(function (e) {
      // 连不上数据库：降级为只读的前端浏览模式（prefer 保持不变，下次启动仍先试数据库），
      // 数据显示上次从数据库取回的镜像，避免联网后才发现看的是旧文件。
      // 提示里带上具体毛病（服务没启动 / 账号不对 / 没授权 / 没后端），完整建议在界面上。
      setMode('static');
      setOnline(false);
      setLastError(connectionError(e));
      notify(state.lastError.short);
      return readData(KEY.dbCache) || localOrDefault();
    });
  }

  // target: 'static'（前端浏览模式）| 'db'（数据库浏览模式）
  function switchMode(target) {
    if (target === 'static') {
      setMode('static');
      setOnline(true);
      state.prefer = 'static';
      storage.local.write(KEY.mode, 'static');
      emit({ type: 'mode' });                   // prefer 变化同样要刷新界面状态
      return Promise.resolve(localOrDefault());
    }

    return fetchNav().then(function (data) {
      setMode('db');
      setOnline(true);
      state.prefer = 'db';
      storage.local.write(KEY.mode, 'db');
      storage.local.writeJSON(KEY.dbCache, data);
      emit({ type: 'mode' });
      return data;
    }).catch(function (e) {
      setOnline(false);
      setLastError(connectionError(e));
      throw new Error(state.lastError.reason);
    });
  }

  Nav.store = {
    state: state,                 // 只读：写状态请走下面的 set* 方法
    subscribe: subscribe,
    setData: setData,
    setQuery: setQuery,
    setEditing: setEditing,
    setDrag: setDrag,
    load: load,
    save: save,
    loadStatic: loadStatic,
    canEdit: canEdit,
    exportStatic: exportStatic,
    setAutoSync: setAutoSync,
    syncState: syncState,
    switchMode: switchMode,
    normalizeImported: normalizeImported,
    groups: groups,
    findGroup: findGroup,
    findLink: findLink,
    stats: stats,
    setOnline: setOnline,
    setLastError: setLastError
  };
})(window.Nav);
