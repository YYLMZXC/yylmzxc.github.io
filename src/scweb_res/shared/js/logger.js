/**
 * 生存战争网 — 前端日志收集器
 * 功用：把控制台输出（log/info/warn/error/debug）、JS 运行时报错、
 *       未捕获的 Promise 拒绝统一收进内存环形缓冲（默认最近 1000 条）。
 * 使用：
 *   · 每个页面在 utils.js 之前引入本文件（越早越好，才能收到更早的日志）；
 *   · Ctrl+Shift+L 唤起 / 收起悬浮日志面板：查看、按级别过滤、复制、下载、清空；
 *   · 面板里可一键把当前日志上报到后端（POST /api/client-log，后端转手打进自己的控制台）。
 * 接口（window.SCLog）：
 *   · SCLog.get()            取全部日志副本（[{time, level, text}]）
 *   · SCLog.text()           导出纯文本（一行一条）
 *   · SCLog.clear()          清空缓冲
 *   · SCLog.report()         手动上报到后端，返回 Promise
 *   · SCLog.panel(true|false) 显式开 / 关面板
 * 注意：接管的是 console 的包装，原始输出照常打印，不影响 DevTools 观感。
 */
;(function () {
'use strict';

var MAX_ENTRIES = 1000;          // 环形缓冲容量
var entries = [];                // [{ time: '20:30:00.123', level: 'log', text: '...' }]
var native = {};                 // 原始 console 方法
var panelEl = null;              // 悬浮面板 DOM
var filterLevel = 'all';         // 面板当前过滤级别

/* ---------------- 收集 ---------------- */

function pad(n, w) {
    n = String(n);
    while (n.length < w) n = '0' + n;
    return n;
}

function stamp() {
    var d = new Date();
    return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' +
           pad(d.getSeconds(), 2) + '.' + pad(d.getMilliseconds(), 3);
}

// 任意值转成可读文本：对象给 JSON（失败再给 toString），错误对象带 stack 的带上首行
function toText(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.message + (v.stack ? '\n' + String(v.stack).split('\n')[1] : '');
    try { return JSON.stringify(v); } catch (_) {}
    try { return String(v); } catch (_) { return '(无法序列化)'; }
}

function record(level, args) {
    var text = Array.prototype.map.call(args, toText).join(' ');
    entries.push({ time: stamp(), level: level, text: text });
    if (entries.length > MAX_ENTRIES) entries.shift();
    if (panelEl) renderPanel();
}

// 包装 console：原样转发 + 入库。只包一次，页面重复引入也不叠加。
function wrapConsole() {
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function (m) {
        native[m] = console[m] ? console[m].bind(console) : function () {};
        console[m] = function () {
            native[m].apply(console, arguments);
            record(m === 'debug' ? 'log' : m, arguments);
        };
    });
}

// 运行时报错与未捕获 Promise 拒绝也收进来——这两类最容易在控制台一闪而过
window.addEventListener('error', function (e) {
    var msg = '未捕获异常：' + (e.message || '(无消息)');
    if (e.filename) msg += '（' + e.filename + ':' + (e.lineno || 0) + '）';
    native.error && native.error('[SCLog] ' + msg);
    record('error', [msg]);
});
window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    var msg = '未处理的 Promise 拒绝：' + toText(r);
    native.warn && native.warn('[SCLog] ' + msg);
    record('error', [msg]);
});

wrapConsole();

/* ---------------- 导出 / 上报 ---------------- */

function getApi() {
    // 与后端约定：/api/client-log。路径跟随页面目录（同 SCUtils.apiBase 的思路），
    // 但本文件可能先于 utils.js 加载，故此处自行计算。
    if (window.SCUtils && typeof window.SCUtils.apiBase === 'function') {
        return window.SCUtils.apiBase() + '/api/client-log';
    }
    var p = String(location.pathname || '/');
    var i = p.lastIndexOf('/');
    return (i > 0 ? p.slice(0, i) : '') + '/api/client-log';
}

function report() {
    var body = JSON.stringify({
        page: location.href,
        ua: navigator.userAgent,
        logs: entries
    });
    return fetch(getApi(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
    }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        console.log('[日志] 已上报 ' + entries.length + ' 条前端日志到后端');
    }).catch(function (e) {
        console.warn('[日志] 上报失败：' + e.message + '（后端未启动或版本过旧？）');
    });
}

/* ---------------- 悬浮面板 ---------------- */

var PANEL_CSS =
    '.sclog-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(720px,92vw);height:min(420px,60vh);' +
    'display:flex;flex-direction:column;background:#1e1e1e;color:#d4d4d4;border:1px solid #444;border-radius:8px;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.45);font:12px/1.6 Consolas,Menlo,monospace;overflow:hidden}' +
    '.sclog-head{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#2a2a2a;border-bottom:1px solid #444;flex:none}' +
    '.sclog-title{color:#fff;font-weight:700;margin-right:auto;white-space:nowrap}' +
    '.sclog-btn{background:#3a3a3a;color:#d4d4d4;border:1px solid #555;border-radius:4px;padding:2px 10px;cursor:pointer;font:inherit}' +
    '.sclog-btn:hover{background:#4a4a4a;color:#fff}' +
    '.sclog-body{flex:1;overflow:auto;padding:6px 10px;white-space:pre-wrap;word-break:break-all}' +
    '.sclog-body .lv-error{color:#f48771}.sclog-body .lv-warn{color:#cca700}.sclog-body .lv-info{color:#75beff}' +
    '.sclog-empty{color:#777;font-style:italic}';

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPanel() {
    if (!panelEl) return;
    var body = panelEl.querySelector('.sclog-body');
    var levels = filterLevel === 'all' ? null : [filterLevel];
    var shown = levels ? entries.filter(function (e) { return levels.indexOf(e.level) >= 0; }) : entries;
    body.innerHTML = shown.length
        ? shown.map(function (e) {
            return '<div class="lv-' + e.level + '">' + esc(e.time) + ' [' + e.level + '] ' + esc(e.text) + '</div>';
        }).join('')
        : '<div class="sclog-empty">（暂无' + (filterLevel === 'all' ? '' : '「' + filterLevel + '」级别') + '日志）</div>';
    body.scrollTop = body.scrollHeight;
}

function togglePanel(force) {
    var open = force !== undefined ? force : !panelEl;
    if (open && !panelEl) {
        var style = document.createElement('style');
        style.textContent = PANEL_CSS;
        document.head.appendChild(style);

        panelEl = document.createElement('div');
        panelEl.className = 'sclog-panel';
        panelEl.innerHTML =
            '<div class="sclog-head">' +
            '<span class="sclog-title">前端日志（' + entries.length + ' 条，Ctrl+Shift+L 收起）</span>' +
            '<select class="sclog-btn">' +
            '<option value="all">全部</option><option value="log">log</option>' +
            '<option value="info">info</option><option value="warn">warn</option><option value="error">error</option>' +
            '</select>' +
            '<button class="sclog-btn" data-act="copy">复制</button>' +
            '<button class="sclog-btn" data-act="download">下载</button>' +
            '<button class="sclog-btn" data-act="report">上报后端</button>' +
            '<button class="sclog-btn" data-act="clear">清空</button>' +
            '<button class="sclog-btn" data-act="close">关闭</button>' +
            '</div><div class="sclog-body"></div>';

        panelEl.querySelector('select').addEventListener('change', function () {
            filterLevel = this.value;
            renderPanel();
        });
        panelEl.querySelector('.sclog-head').addEventListener('click', function (ev) {
            var act = ev.target.getAttribute && ev.target.getAttribute('data-act');
            if (!act) return;
            if (act === 'close') { togglePanel(false); return; }
            if (act === 'clear') { entries = []; renderPanel(); console.log('[日志] 已清空前端日志'); return; }
            if (act === 'copy') { copyText(exportText()); return; }
            if (act === 'download') { downloadText(); return; }
            if (act === 'report') { report(); return; }
        });
        document.body.appendChild(panelEl);
        renderPanel();
    } else if (!open && panelEl) {
        panelEl.remove();
        panelEl = null;
    }
}

function exportText() {
    return entries.map(function (e) { return e.time + ' [' + e.level + '] ' + e.text; }).join('\n');
}

function copyText(text) {
    var done = function () { console.log('[日志] 已复制 ' + entries.length + ' 条日志到剪贴板'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function (e) {
            console.warn('[日志] 复制失败：' + e.message);
        });
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        done();
    }
}

function downloadText() {
    var blob = new Blob([exportText()], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    var d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'scweb-frontend-' + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) +
        '-' + pad(d.getHours(), 2) + pad(d.getMinutes(), 2) + pad(d.getSeconds(), 2) + '.log';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    console.log('[日志] 已下载日志文件');
}

// 快捷键：Ctrl+Shift+L（Mac 上 Cmd+Shift+L）
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        togglePanel();
    }
});

/* ---------------- 暴露接口 ---------------- */

window.SCLog = {
    get: function () { return entries.slice(); },
    text: exportText,
    clear: function () { entries = []; if (panelEl) renderPanel(); },
    report: report,
    panel: function (open) { if (document.body) togglePanel(open); }
};

console.log('[日志] 前端日志收集器已启动（Ctrl+Shift+L 查看面板，最多保留 ' + MAX_ENTRIES + ' 条）');
})();
