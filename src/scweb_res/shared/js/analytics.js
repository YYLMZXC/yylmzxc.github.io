/**
 * 生存战争网 — 统计脚本
 * 统一管理百度统计 + Microsoft Clarity
 *
 * 使用方法：在每个页面的 </body> 前引入
 * <script src="./scweb_res/shared/js/analytics.js?v=20260827"></script>
 */
;(function () {
'use strict';

/* ================================================================
 *  配置
 * ================================================================ */
var CONFIG = {
    /* 百度统计 */
    baidu: {
        enabled: true,
        // 线上环境的百度统计 ID（替换为你自己的）
        // 获取方式：https://hm.baidu.com/hm.js?<你的ID>
        token: '49508fcc51529f79d0f7e42bd08ed491'
    },

    /* Microsoft Clarity */
    clarity: {
        enabled: true,
        // 注册 Clarity 后替换为你的项目 ID
        // 获取方式：https://clarity.microsoft.com → Setup → Copy project ID
        projectId: 'YOUR_CLARITY_ID_HERE'
    }
};

/* ================================================================
 *  百度统计
 *  文档：https://hm.baidu.com/
 * ================================================================ */
function initBaiduAnalytics(cfg) {
    if (!cfg.enabled || !cfg.token) return;

    window._hmt = window._hmt || [];
    var script = document.createElement('script');
    script.src = 'https://hm.baidu.com/hm.js?' + cfg.token;
    script.async = true;
    var firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
    } else {
        document.head.appendChild(script);
    }
    console.log('[Analytics] Baidu Analytics initialized (token: ' + cfg.token.slice(0, 6) + '...)');
}

/* ================================================================
 *  Microsoft Clarity
 *  文档：https://learn.microsoft.com/en-us/clarity/
 * ================================================================ */
function initClarity(cfg) {
    if (!cfg.enabled || !cfg.projectId || cfg.projectId === 'YOUR_CLARITY_ID_HERE') {
        if (cfg.enabled) console.log('[Analytics] Clarity skipped (no project ID configured)');
        return;
    }

    (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () {
            (c[a].q = c[a].q || []).push(arguments);
        };
        t = l.createElement(r);
        t.async = 1;
        t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', cfg.projectId);
    console.log('[Analytics] Microsoft Clarity initialized (id: ' + cfg.projectId + ')');
}

/* ================================================================
 *  启动
 * ================================================================ */
initBaiduAnalytics(CONFIG.baidu);
initClarity(CONFIG.clarity);

})();
