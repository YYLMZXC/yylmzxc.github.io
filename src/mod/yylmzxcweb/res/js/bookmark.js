/* ============================================================
   YYLMZXC 离线导航站 · 浏览器书签编解码
   只做一件事：在「浏览器导出的书签文件」与本项目的内部数据结构之间转换。
     · parse(html, onProgress, onFinish) —— 书签文件 → 分组数组
     · serialize(data)                   —— 分组数组 → 书签文件内容
   两边都是 Netscape 书签格式：<DL> 里一串 <DT>，文件夹写作
   <DT><H3>名</H3><DL>…</DL>，书签写作 <DT><A HREF=…>名</A>。
   导入与导出互为逆操作，因此三处（导入 / 导出 / 内部数据）共用同一套字段。
   纯编解码：依赖只有 util，不碰页面状态，也不读写数据 ——
   「进度提示怎么写、追加还是覆盖」属于流程，放在 transfer.js。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var util = Nav.util;

  /* ---------------- 导出：分组数组 → 书签文件 ---------------- */

  // 属性值转义：网址可能带 & 或引号，漏掉会让浏览器导入时解析出错
  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function serialize(data) {
    var now = Math.floor(Date.now() / 1000);
    var lines = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<!-- This is an automatically generated file. -->',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>'
    ];

    var groups = (data && data.groups) || [];
    groups.forEach(function (g) {
      lines.push('    <DT><H3 ADD_DATE="' + now + '" LAST_MODIFIED="' + now + '">' +
        util.escapeHtml(g.name || '未命名') + '</H3>');
      lines.push('    <DL><p>');
      ((g && g.links) || []).forEach(function (l) {
        var url = util.normalizeUrl(l.url);
        if (!url) return;
        lines.push('        <DT><A HREF="' + escapeAttr(url) + '" ADD_DATE="' + now + '">' +
          util.escapeHtml(l.title || util.hostOf(url) || url) + '</A>');
      });
      lines.push('    </DL><p>');
    });

    lines.push('</DL><p>');
    return lines.join('\n') + '\n';
  }

  /* ---------------- 导入：书签文件 → 分组数组 ---------------- */

  // 找到文件夹对应的 <DL>：多数浏览器把它嵌在 <DT> 内，也有导出成同级兄弟节点的
  function folderDl(dt) {
    for (var i = 0; i < dt.children.length; i++) {
      if (dt.children[i].tagName === 'DL') return dt.children[i];
    }
    var sib = dt.nextElementSibling;
    while (sib && sib.tagName === 'P') sib = sib.nextElementSibling;   // 兼容 <DL><p>
    return (sib && sib.tagName === 'DL') ? sib : null;
  }

  // 目录嵌套的深度上限：正常书签不会有几十层，超过就是文件异常或有环，
  // 直接停手，避免递归把页面拖死。
  var MAX_FOLDER_DEPTH = 64;

  // 解析书签文件 → 分组数组。
  // 不再一口气算完：先把顶层目录项数出来当进度分母，再按时间片逐个处理（每片最多占用 24ms），
  // 其余时间交还浏览器刷新进度条，因此几千条书签的解析过程中页面依然有响应。
  //   onProgress(done, total)       已完成 / 总数
  //   onFinish(err, groups, stats)  失败给 err；成功给分组数组与统计
  //                                 （groups / links / skipped / ms，供调用方写日志）
  function parse(html, onProgress, onFinish) {
    var text = String(html || '');
    var t0 = Date.now();

    var doc, rootDl;
    try {
      doc = new DOMParser().parseFromString(text, 'text/html');
      rootDl = doc.querySelector('dl');
    } catch (e) {
      onFinish(e);
      return;
    }
    if (!rootDl) {
      onFinish(new Error('文件里没有找到 <DL> 书签结构，不是浏览器导出的书签文件'));
      return;
    }

    var groups = [];
    var loose = [];                 // 不在任何文件夹里的书签
    var seen = {};                  // 按网址去重，同一网址只保留首次出现
    var usedIds = {};               // 按 id 去重：id 重复会让数据库整笔写入失败
    var skipped = { nonHttp: 0, dupUrl: 0, deep: 0 };

    // id 是数据库主键，一旦重复，整笔事务都会回滚（等于什么都没存），
    // 所以这里再兜一道：发现重复就重新生成。
    function uniqueId(prefix) {
      var id = util.uid(prefix);
      while (usedIds[id]) id = util.uid(prefix);
      usedIds[id] = true;
      return id;
    }

    function makeLink(a) {
      var url = util.normalizeUrl(a.getAttribute('href') || '');
      if (!/^https?:\/\//i.test(url)) { skipped.nonHttp++; return null; }  // 跳过 javascript: / chrome:// / place: 等
      if (seen[url]) { skipped.dupUrl++; return null; }
      seen[url] = true;
      var l = {
        id: uniqueId('l'),
        title: String(a.textContent || '').trim() || util.hostOf(url),
        url: url,
        favicon: ''
      };
      var icon = a.getAttribute('icon') || '';        // 部分导出会带 ICON 属性
      if (icon && /^https?:\/\//i.test(icon)) l.favicon = icon;
      return l;
    }

    // 递归收集某个文件夹（含各级子文件夹）下的全部书签
    function collect(dl, out, depth) {
      if (depth > MAX_FOLDER_DEPTH) {                 // 防御异常文件：不再往下钻
        skipped.deep++;
        return;
      }
      Array.prototype.forEach.call(dl.children, function (node) {
        if (node.tagName !== 'DT' && node.tagName !== 'DD') return;
        if (node.querySelector('h3')) {              // 子文件夹：继续往下
          var sub = folderDl(node);
          if (sub && sub !== dl) collect(sub, out, depth + 1);
          return;
        }
        var a = node.querySelector('a');
        if (!a) return;
        var l = makeLink(a);
        if (l) out.push(l);
      });
    }

    // 处理一个顶层目录项：一级文件夹 → 一个分组；根目录下的散装书签 → 归入「其它书签」
    function processTop(node) {
      var h3 = node.querySelector('h3');
      if (h3) {
        var links = [];
        var sub = folderDl(node);
        if (sub) collect(sub, links, 1);
        if (links.length) {
          groups.push({ id: uniqueId('g'), name: String(h3.textContent || '').trim() || '未命名', column: 0, links: links });
        }
        return;
      }
      var a = node.querySelector('a');
      if (!a) return;
      var l = makeLink(a);
      if (l) loose.push(l);
    }

    function finish() {
      if (loose.length) groups.push({ id: uniqueId('g'), name: '其它书签', column: 0, links: loose });
      var total = 0;
      groups.forEach(function (g) { total += g.links.length; });
      onFinish(null, groups, {
        groups: groups.length,
        links: total,
        skipped: skipped,
        ms: Date.now() - t0
      });
    }

    var tops = [];
    Array.prototype.forEach.call(rootDl.children, function (node) {
      if (node.tagName === 'DT' || node.tagName === 'DD') tops.push(node);
    });

    // 按时间片推进：一片最多占用 24ms，剩下的时间让浏览器把进度画出来
    var i = 0;
    function step() {
      var sliceEnd = Date.now() + 24;
      while (i < tops.length && Date.now() < sliceEnd) {
        processTop(tops[i]);
        i++;
      }
      if (onProgress) onProgress(i, tops.length);
      if (i < tops.length) { setTimeout(step, 0); return; }
      finish();
    }
    step();
  }

  Nav.bookmark = { parse: parse, serialize: serialize };
})(window.Nav);
