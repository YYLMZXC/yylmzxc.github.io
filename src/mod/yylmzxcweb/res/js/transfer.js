/* ============================================================
   YYLMZXC 离线导航站 · 数据搬运与浏览模式
   把「数据进出页面」这类操作集中一处，与书签编辑动作（actions.js）分开，
   避免单个模块同时承担两套互不相干的职责：
     · 导入 / 导出 / 重置（以静态文件为准）
     · 前端 ⇄ 数据库 浏览模式切换
     · 数据库 → 静态文件 的数据转换
   浏览器书签文件的格式解析与生成不在这里，而在 Nav.bookmark（见 bookmark.js）：
   本模块只决定「怎么让用户确认、追加还是覆盖、进度怎么提示」。
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
  var bookmark = Nav.bookmark;

  // 导入流程的日志：出问题时按 F12 打开控制台，能逐步看到「读到多少字 / 解析出多少条 /
  // 合并结果 / 写库是否成功、各用了多久」，不必靠猜。
  var TAG = '[书签导入]';

  function log(step, detail) {
    var t = new Date();
    var hhmmss = [t.getHours(), t.getMinutes(), t.getSeconds()]
      .map(function (n) { return n < 10 ? '0' + n : String(n); }).join(':');
    console.log(hhmmss + '.' + String(t.getMilliseconds()).padStart(3, '0') + ' ' +
      TAG + ' ' + step + (detail == null ? '' : ' — ' + detail));
  }

  function logError(step, e) {
    console.error(TAG + ' ' + step, e);
  }

  // 换阶段：先把进度浮层的文案写进去，再让出主线程 40ms，
  // 保证这次更新真的被画出来，而不是等整段逻辑跑完才一起出现。
  function nextStage(task, stage, detail, fn) {
    task.stage(stage);
    if (detail != null) task.detail(detail);
    setTimeout(fn, 40);
  }

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

  // 导出成浏览器可导入的书签 HTML（只下载文件，不改数据，因此与导出 JSON 一样无需登录）
  // 文件内容的生成交给 Nav.bookmark（见 bookmark.js），这里只管下载与提示。
  function exportBookmarks() {
    var data = store.state.data;
    if (!data) { dom.toast('页面数据尚未载入'); return; }
    var name = (data.title || 'bookmarks').replace(/[\\/:*?"<>|]+/g, '_');
    dom.download(name + '-书签.html', bookmark.serialize(data), 'text/html');
    dom.toast('已导出浏览器书签（' + store.stats().links + ' 个书签）');
  }

  function importData() {
    dom.pickFile('.json,application/json', handleFile);
  }

  function handleFile(file) {
    log('JSON 导入：已选择文件', file.name + '（' + sizeText(file.size) + '）');

    var task = dom.progress('导入 JSON 数据');
    task.stage('正在读取文件…');
    task.percent(0);
    task.detail(file.name);

    var reader = new FileReader();
    reader.onprogress = function (e) {
      if (!e.lengthComputable) { task.percent(null); return; }
      task.percent(e.loaded / e.total * 100);
    };
    reader.onload = function () {
      var data;
      try {
        data = store.normalizeImported(JSON.parse(reader.result));
      } catch (e) {
        logError('JSON 导入：解析失败', e);
        task.abort();
        dom.toast('导入失败：' + ((e && e.message) || '文件格式不正确'));
        return;
      }

      store.setData(data);
      var s = store.stats();
      log('JSON 导入：解析完成', '分组=' + s.groups + '，书签=' + s.links);

      nextStage(task, '正在刷新页面…', '共 ' + s.groups + ' 个分组 · ' + s.links + ' 个书签', function () {
        render.header();
        render.groups();
        nextStage(task, '正在写入数据库…', '共 ' + s.links + ' 个书签，请勿关闭页面', function () {
          task.estimate(5000);
          var t0 = Date.now();
          log('JSON 导入：开始写入数据库', '书签=' + s.links);
          store.saveNow().then(function (r) {
            if (r && r.ok) {
              log('JSON 导入：写入成功', '耗时=' + (Date.now() - t0) + 'ms');
              task.done();
              dom.toast('导入成功：' + s.groups + ' 个分组 · ' + s.links + ' 个书签');
              return;
            }
            var msg = (r && r.error) || '写入数据库失败';
            logError('JSON 导入：写入失败', msg);
            task.abort();
            modal.open({
              title: '导入的数据没有保存成功',
              okLabel: false,
              cancelLabel: '知道了',
              html: '<p class="account-info">数据已临时显示在页面上，但<b>没有写入数据库</b>，刷新后会丢失。</p>' +
                '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
                '失败原因：<b>' + util.escapeHtml(String(msg)) + '</b><br>' +
                '本次导入：' + s.groups + ' 个分组 · ' + s.links + ' 个书签。<br>' +
                (r && r.offline ? '现在是只读的前端浏览模式，请先切到数据库浏览模式再导入。'
                  : '请确认已启动后端并处于数据库浏览模式后重试。') +
                '详细日志请看浏览器控制台（按 F12 → Console）。</p>'
            });
          }, function (e) {
            logError('JSON 导入：写入异常', e);
            task.abort();
            dom.toast('导入出错：' + ((e && e.message) || '未知错误'));
          });
        });
      });
    };
    reader.onerror = function () {
      logError('JSON 导入：读取文件失败', reader.error);
      task.abort();
      dom.toast('读取文件失败：' + ((reader.error && reader.error.message) || '未知错误'));
    };
    reader.readAsText(file, 'utf-8');
  }

  /* ---------------- 浏览器书签：导入（Chrome / Edge / Firefox「导出书签」的 HTML） ----------------
     文件格式的解析不在这里，而在 Nav.bookmark（见 bookmark.js）：那里只做
     「书签文件 ⇄ 分组数组」的编解码（一级文件夹 → 分组，子文件夹并入所属分组，
     非网页链接跳过），本节只负责选择文件、显示进度，以及追加还是覆盖。 */

  // 文件大小的可读写法：进度说明里带上量级，用户才好判断「文件这么大，慢一点是正常的」
  function sizeText(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function importBookmarks() {
    log('等待选择书签文件');
    dom.pickFile('.html,.htm,text/html', function (file) {
      log('已选择文件', file.name + '（' + Math.round(file.size / 1024) + ' KB）');

      var task = dom.progress('导入浏览器书签');
      task.stage('正在读取文件…');
      task.percent(0);
      task.detail(file.name + '（' + sizeText(file.size) + '）');

      var reader = new FileReader();

      // 读文件有真实的字节进度，直接换算成百分比
      reader.onprogress = function (e) {
        if (!e.lengthComputable) { task.percent(null); return; }
        task.percent(e.loaded / e.total * 100);
        task.detail('已读取 ' + sizeText(e.loaded) + ' / ' + sizeText(e.total));
      };

      reader.onload = function () {
        var text = String(reader.result || '');
        log('读取完成', '字符数=' + text.length);
        task.stage('正在解析书签…');
        task.percent(0);
        task.detail('文件 ' + sizeText(text.length) + '（按字符数估算）');
        log('开始解析', '文件字符数=' + text.length);
        // 先让这次的进度更新画出来，再开始按时间片解析
        setTimeout(function () {
          bookmark.parse(text, function (done, total) {
            task.percent(total ? done / total * 100 : null);
            task.detail('已处理 ' + done + ' / ' + total + ' 个目录项');
          }, function (err, groups, stats) {
            if (err) {
              logError('解析失败', err);
              task.abort();
              showParseError(err);
              return;
            }
            task.done();
            log('解析完成', '耗时=' + stats.ms + 'ms，分组=' + stats.groups + '，书签=' + stats.links +
              '，跳过：非网页链接=' + stats.skipped.nonHttp + '，网址重复=' + stats.skipped.dupUrl +
              (stats.skipped.deep ? '，过深层级=' + stats.skipped.deep : ''));
            if (!groups.length) {
              log('没有可导入的网页书签');
              dom.toast('没有找到可导入的网页书签（可能全被跳过或文件为空）');
              return;
            }
            var count = 0;
            groups.forEach(function (g) { count += g.links.length; });
            log('准备打开导入面板', '分组=' + groups.length + '，书签=' + count);
            openImportPanel(file.name, groups, count);
          });
        }, 50);
      };

      reader.onerror = function () {
        logError('读取文件失败', reader.error);
        task.abort();
        dom.toast('读取文件失败：' + ((reader.error && reader.error.message) || '未知错误'));
      };

      reader.readAsText(file, 'utf-8');
    });
  }

  function showParseError(err) {
    modal.open({
      title: '导入书签失败',
      okLabel: false,
      cancelLabel: '关闭',
      html: '<p class="account-info">无法解析这个文件：<b>' +
        util.escapeHtml((err && err.message) || '未知错误') + '</b></p>' +
        '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
        '请确认选择的是浏览器「导出书签」生成的 HTML 文件（Chrome / Edge / Firefox 均可）。</p>'
    });
  }

  // 导入方式二选一：追加（按分组名合并）或覆盖（清空后导入）
  function openImportPanel(filename, groups, count) {
    var s = store.stats();
    log('打开导入面板', '文件=' + filename + '，解析=' + groups.length + ' 组 / ' + count +
      ' 书签，当前=' + s.groups + ' 组 / ' + s.links + ' 书签');
    modal.open({
      title: '导入浏览器书签',
      okLabel: false,
      cancelLabel: '取消',
      html: '<p class="account-info">来源文件：<b>' + util.escapeHtml(filename) + '</b>' +
        '<br>解析结果：<b>' + groups.length + ' 个分组 · ' + count + ' 个书签</b>' +
        '<br>当前数据：<b>' + s.groups + ' 个分组 · ' + s.links + ' 个书签</b></p>' +
        '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
        '一级文件夹作为分组，子文件夹里的书签并入所属分组，非网页链接（如 javascript: / chrome://）会被跳过。' +
        '「追加」按分组名合并（同名分组追加书签，同网址自动去重），「覆盖」则替换全部分组与书签。</p>',
      actions: [
        {
          label: '追加到当前数据（合并同名分组）', cls: 'primary block',
          onClick: function (close) { log('用户选择：追加'); close(); applyImport(groups, 'merge'); }
        },
        {
          label: '覆盖当前数据（清空后导入）', cls: 'danger block',
          onClick: function (close) { log('用户选择：覆盖'); close(); confirmReplace(groups); }
        }
      ]
    });
  }

  function confirmReplace(groups) {
    modal.confirm('将用导入的书签覆盖当前全部分组与书签，库中现有内容会丢失。确定继续吗？', function () {
      applyImport(groups, 'replace');
    });
  }

  function applyImport(groups, mode) {
    if (!store.state.data) {
      log('放弃导入：页面数据尚未载入');
      dom.toast('页面数据尚未载入，请先刷新页面');
      return;
    }
    ensureWritable(function () { startImport(groups, mode); });
  }

  // 导入前先确认真能写库。
  // store.canEdit() 反映的是「上一次写库的结果」：它不会自己变回来。
  // 最典型的情形就是后端还没起来时打开了页面 —— load() 拉数据失败会把界面切成只读的前端浏览模式，
  // 等后端起来了，模式与在线标记仍停在旧值。于是导入被静默挡下，只留一条 1.9 秒就消失的提示，
  // 用户只会说「点了没反应」；偏偏「覆盖」还会先弹一次确认框，看起来像只有那个按钮才有反应。
  // 这里现场向后端问一次，按真实情况决定是继续、还是把为什么不能继续说清楚。
  function ensureWritable(next) {
    if (store.canEdit()) { next(); return; }

    log('当前不可写', '模式=' + store.state.mode + '，在线=' + store.state.online + '，向后端确认一次');
    api.healthInfo().then(function (info) {
      var online = !!(info && info.ok);
      store.setOnline(online);
      store.setLastError(online ? null : info);
      log('后端探测结果', online ? '可用' : '不可用');

      if (!online) { showNotWritable(info, null); return; }        // 真连不上：把后端给的诊断原样交代
      if (store.state.mode === 'db') { next(); return; }           // 连接没问题，只是本地的在线标记过期了

      // 后端好着，但当前是只读的前端浏览模式。切过去会替换掉页面上的数据，
      // 这是用户的浏览选择，不能替他决定，所以给一个按钮由他点。
      showNotWritable(null, function () {
        store.switchMode('db').then(function () {
          log('已切到数据库浏览模式，继续导入');
          next();
        }).catch(function () {
          showNotWritable(store.state.lastError, null);
        });
      });
    }, function () {
      showNotWritable(store.state.lastError || { label: '后端没有回应' }, null);
    });
  }

  // 「现在存不进数据库」的统一交代：当前模式、后端状态、页面数据量、下一步怎么办，一次说全。
  // 用弹窗而不是一闪而过的 toast —— 用户点的是导入，页面却毫无变化，他只会以为功能坏了。
  function showNotWritable(diag, onSwitch) {
    var s = store.stats();
    var lines = ['当前浏览模式：<b>' + currentModeText() + '</b>'];
    if (diag) {
      lines.push('后端连接：<b>' + util.escapeHtml(diag.label || diag.message || '连接失败') + '</b>');
      if (diag.reason && diag.reason !== diag.label) lines.push('原因：' + util.escapeHtml(diag.reason));
      if (diag.hint) lines.push(util.escapeHtml(diag.hint));
    } else {
      lines.push('导入要把数据写进数据库，而前端浏览模式是<b>只读</b>的。');
    }
    lines.push('本次导入尚未开始，页面上的数据没有被改动。');

    log('导入未开始：当前不可写，已向用户说明');

    modal.open({
      title: '这次导入没有开始',
      okLabel: false,
      cancelLabel: '知道了',
      html: '<p class="account-info">' + lines.join('<br>') + '</p>' +
        '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
        '当前页面数据：' + s.groups + ' 个分组 · ' + s.links + ' 个书签。' +
        '<br>详细日志请看浏览器控制台（按 F12 → Console，筛选「书签导入」）。</p>',
      actions: onSwitch ? [{
        label: '切到数据库浏览模式并继续导入', cls: 'primary block',
        onClick: function (close) { close(); onSwitch(); }
      }] : null
    });
  }

  // 真正开始导入：亮出进度浮层（它同时挡住页面，避免同一份书签被连点导入两遍），
  // 之后按阶段推进：整理数据 → 刷新页面 → 写入数据库。
  function startImport(groups, mode) {
    var task = dom.progress('导入浏览器书签');
    task.percent(null);
    nextStage(task, '正在整理数据…', '共 ' + groups.length + ' 个分组', function () {
      mergeImport(task, groups, mode);
    });
  }

  // 阶段一：把解析结果并进当前数据
  function mergeImport(task, groups, mode) {
    var data = store.state.data;
    if (!data) {
      log('放弃导入：页面数据已丢失');
      task.abort();
      dom.toast('页面数据尚未载入');
      return;
    }
    data.groups = data.groups || [];

    var t0 = Date.now();
    var added = 0;
    // 记下这次动到了哪些分组：界面据此把新内容滚到眼前并高亮。
    // 新分组是 push 到列表末尾的，若不主动亮出来，用户看到的首屏和导入前一模一样，
    // 只会得出「导入了但没看到新书签」的结论。
    var changed = { fresh: [], touched: [], mergedInto: [] };
    log('开始合并数据', '方式=' + (mode === 'replace' ? '覆盖' : '追加合并') +
      '，导入分组=' + groups.length);
    try {
      if (mode === 'replace') {
        data.groups = groups;
        groups.forEach(function (g) {
          added += g.links.length;
          changed.fresh.push(g.id);
        });
      } else {
        var byName = {};
        data.groups.forEach(function (g) { byName[String(g.name || '').trim()] = g; });
        groups.forEach(function (g) {
          var name = String(g.name || '').trim();
          var hit = byName[name];
          if (!hit) {
            data.groups.push(g);
            byName[name] = g;
            added += g.links.length;
            changed.fresh.push(g.id);
            return;
          }
          hit.links = hit.links || [];
          var seen = {};
          hit.links.forEach(function (l) { seen[l.url] = true; });
          var n = 0;
          g.links.forEach(function (l) {
            if (seen[l.url]) return;
            hit.links.push(l);
            seen[l.url] = true;
            added++;
            n++;
          });
          if (n) {                              // 同名分组合并进来多少条，回执里要说清楚
            changed.touched.push(hit.id);
            changed.mergedInto.push({ name: hit.name, count: n });
          }
        });
      }
    } catch (e) {
      logError('合并数据失败', e);
      task.abort();
      dom.toast('导入失败：' + ((e && e.message) || '合并数据出错'));
      return;
    }

    var s = store.stats();
    log('合并完成', '耗时=' + (Date.now() - t0) + 'ms，本次新增=' + added +
      '，新增分组=' + changed.fresh.length + '，并入已有分组=' + changed.mergedInto.length +
      '，当前共 ' + s.groups + ' 组 / ' + s.links + ' 书签');

    // 阶段二：刷新界面。数据量大时这一步会占住主线程，先把阶段文案画出来再动手。
    nextStage(task, '正在刷新页面…', '共 ' + s.groups + ' 个分组 · ' + s.links + ' 个书签', function () {
      // 渲染一旦抛错就绝不能静默：数据其实已经并进内存了，页面却停在旧内容上，
      // 用户只会说「导入没生效」。这里如实报错，别把毛病留给猜。
      try {
        render.clearQuery();   // 搜索关键词会把不匹配的分组整组滤掉，导入后必须先清干净
        render.header();
        render.groups();
      } catch (e) {
        logError('刷新页面失败', e);
        task.abort();
        dom.toast('导入的数据没能刷新到页面上：' + ((e && e.message) || '未知错误'));
        return;
      }

      var ids = changed.fresh.concat(changed.touched);
      var shown = render.reveal(ids);         // 滚到新内容并高亮
      if (ids.length && shown < ids.length) {
        log('提示：有分组没能出现在页面上', shown + '/' + ids.length);
      }

      // 阶段三：写库。整份数据是一个事务，后端不提供中间进度，
      // 因此让进度条逐渐逼近 92%（estimate），收尾时由 done() 补满。
      nextStage(task, '正在写入数据库…',
        '共 ' + s.links + ' 个书签；数据量较大时需要十几秒，请勿关闭页面',
        function () { saveImport(task, groups, added, s, changed); });
    });
  }

  // 导入结束的回执。以前只有一条 1.9 秒就消失的气泡：「新增了多少、新分组在哪、库里现在多少」
  // 一个字都没说，于是「导入成功但看不到书签」成了常态。这里把数字摆出来、也说清去哪儿看。
  function showImportResult(changed, s) {
    var rows = [];
    if (changed.fresh.length) {
      rows.push('新增 <b>' + changed.fresh.length + '</b> 个分组，已滚到眼前并高亮');
    }
    if (changed.mergedInto.length) {
      var names = changed.mergedInto.slice(0, 6).map(function (m) {
        return util.escapeHtml(String(m.name || '未命名')) + ' +' + m.count;
      });
      rows.push('并入已有分组 <b>' + changed.mergedInto.length + '</b> 个：' + names.join('、') +
        (changed.mergedInto.length > names.length ? ' 等' : ''));
    }
    if (!rows.length) rows.push('没有新增内容：这些网址都已经在库里了');

    modal.open({
      title: '导入完成',
      okLabel: false,
      cancelLabel: '知道了',
      html: '<p class="account-info">' + rows.join('<br>') + '</p>' +
        '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
        '当前共 <b>' + s.groups + '</b> 个分组 · <b>' + s.links + '</b> 个书签，已写入数据库。' +
        (changed.fresh.length ? '<br>新分组排在列表末尾，可用搜索定位，或在编辑模式里调整顺序。' : '') +
        '</p>'
    });
  }

  // 阶段三：等真正入库的结果再汇报，不能像普通编辑那样即发即忘
  function saveImport(task, groups, added, s, changed) {
    task.estimate(5000);
    var t1 = Date.now();
    log('开始写入数据库', '书签=' + s.links);
    store.saveNow().then(function (r) {
      if (r && r.ok) {
        log('写入成功', '耗时=' + (Date.now() - t1) + 'ms');
        task.done();
        showImportResult(changed, s);
        return;
      }

      var msg = (r && r.error) || '写入数据库失败';
      logError('写入失败', msg + ((r && r.hint) ? '｜下一步：' + r.hint : ''));
      task.abort();
      // 失败必须说清楚：页面上只是临时显示，刷新就没了；并给出可照做的下一步。
      // 下一步优先用后端给的 hint：界面自己猜的建议（「请确认 MySQL 已启动」）
      // 碰上「某条网址太长」这种毛病只会把人带偏，比不说还糟。
      var advice = (r && r.offline)
        ? '现在是只读的前端浏览模式，请先切到数据库浏览模式再导入。'
        : ((r && r.hint) ||
           '请确认已用「启动主页(带数据库).bat」启动后端、MySQL 正常运行，并处于数据库浏览模式后重试。');
      modal.open({
        title: (r && r.timeout) ? '写入超时，结果未知' : '书签没有保存成功',
        okLabel: false,
        cancelLabel: '知道了',
        html: '<p class="account-info">' +
          ((r && r.timeout)
            ? '数据库迟迟没有回应，本次写入<b>可能成功也可能失败</b>，刷新前请先确认。'
            : '数据已临时显示在页面上，但<b>没有写入数据库</b>，刷新后会丢失。') +
          '</p>' +
          '<p style="margin:0 0 13px;font-size:12.5px;line-height:1.7;color:var(--muted)">' +
          '失败原因：<b>' + util.escapeHtml(String(msg)) + '</b><br>' +
          '本次解析：' + groups.length + ' 个分组 · ' + added + ' 个书签；' +
          '当前数据：' + s.groups + ' 个分组 · ' + s.links + ' 个书签。<br>' +
          util.escapeHtml(advice) +
          '<br>详细日志请看浏览器控制台（按 F12 → Console，筛选「书签导入」）。</p>'
      });
    }, function (e) {
      logError('写入异常', e);
      task.abort();
      dom.toast('导入出错：' + ((e && e.message) || '未知错误'));
    }).catch(function (e) {
      // 上面回调自己抛出的意外也要落地：数据很可能已经写进库了（失败的是收尾的回执弹窗），
      // 静默吞掉会让用户以为「导入没反应」然后反复重导，越描越乱。
      logError('导入收尾出错（数据可能已入库，请刷新页面确认）', e);
      task.abort();
      dom.toast('导入已提交，但收尾时出错：' + ((e && e.message) || '未知错误'));
    });
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

  /* ---------------- 转换面板的标记 ----------------
     本模块其余几处弹窗（导入结果、覆盖确认、解析失败……）都是自己产出的标记，
     转换面板原先寄在通用渲染层里，是唯一一处例外；现在回到同类之间，
     render.js 只保留页面主体（页头 / 列表）与可复用的书签预览。 */

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
        html: convertPanelHtml({
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

      // 弹窗内容是同步注入的，直接在自己那份容器里绑定开关。
      // 这个 id 由上面的 convertPanelHtml 产出、这里读取，两头都在本模块内，故不放进契约。
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
    importBookmarks: importBookmarks,
    exportBookmarks: exportBookmarks,
    resetData: resetData,
    switchBrowsingMode: switchBrowsingMode,
    convertPanel: convertPanel
  };
})(window.Nav);
