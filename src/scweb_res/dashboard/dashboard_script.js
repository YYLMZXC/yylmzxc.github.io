/**
 * 生存战争网 - 信息仪表板页面脚本
 * 负责采集并展示当前访问信息（浏览器视角 + 服务器视角）
 *
 * 模块划分（高内聚低耦合）：
 *   - UserAgentParser        纯函数：解析 User-Agent 字符串（浏览器/版本/内核/OS）
 *   - BrowserInfoCollector   纯前端信息采集（只读 navigator/screen/window/performance，无 DOM 依赖）
 *   - DashboardPageManager   页面编排门面：渲染区块、请求服务端信息、绑定事件
 *
 * 依赖注入：共享管理器（ThemeManager/LanguageManager/SiteInfoManager）由组合根 SCApp.create 创建后注入
 */

/* ========================================================================
 * 模块一：UserAgentParser - User-Agent 解析器
 * ====================================================================== */
class UserAgentParser {
    /**
     * 解析 User-Agent 字符串
     * @param {string} ua - navigator.userAgent
     * @param {Object|null} uaData - navigator.userAgentData（Chrome 结构化数据，可能为 null）
     * @returns {{browser: string|null, browserVersion: string|null, engine: string|null, os: string|null, architecture: string|null, bitness: string|null}}
     */
    static parse(ua, uaData) {
        const result = {
            browser: null,
            browserVersion: null,
            engine: null,
            os: null,
            architecture: null,
            bitness: null
        };
        if (!ua) return result;

        // ---- 内核识别 ----
        if (/Trident|MSIE/.test(ua)) {
            result.engine = 'Trident';
        } else if (/Presto/i.test(ua)) {
            result.engine = 'Presto';
        } else if (/Gecko\/\d/.test(ua) && !/WebKit/.test(ua)) {
            result.engine = 'Gecko';
        } else if (/AppleWebKit/.test(ua)) {
            result.engine = /Chrom(e|ium)\//.test(ua) ? 'Blink' : 'WebKit';
        }

        // ---- 浏览器识别（按优先级匹配） ----
        const browserRules = [
            { name: 'Edge', re: /Edg\/([\d.]+)/ },
            { name: 'Opera', re: /OPR\/([\d.]+)/ },
            { name: 'Opera', re: /Opera\/[\s\S]*Version\/([\d.]+)/ },
            { name: 'Samsung Internet', re: /SamsungBrowser\/([\d.]+)/ },
            { name: 'UC Browser', re: /UCBrowser\/([\d.]+)/ },
            { name: 'Yandex Browser', re: /YaBrowser\/([\d.]+)/ },
            { name: 'WeChat', re: /MicroMessenger\/([\d.]+)/ },
            { name: 'Chrome', re: /Chrome\/([\d.]+)/ },
            { name: 'Firefox', re: /Firefox\/([\d.]+)/ },
            { name: 'Safari', re: /Version\/([\d.]+)[\s\S]*(?:Mobile\/|Safari)/ },
            { name: 'Internet Explorer', re: /MSIE ([\d.]+)/ },
            { name: 'Internet Explorer', re: /rv:([\d.]+)\)[\s\S]*Gecko/ }
        ];
        for (const rule of browserRules) {
            const match = ua.match(rule.re);
            if (match) {
                result.browser = rule.name;
                result.browserVersion = match[1];
                break;
            }
        }

        // ---- 操作系统识别 ----
        const winMatch = ua.match(/Windows NT ([\d.]+)/);
        if (winMatch) {
            const winVersions = {
                '10.0': 'Windows 10/11',
                '6.3': 'Windows 8.1',
                '6.2': 'Windows 8',
                '6.1': 'Windows 7',
                '6.0': 'Windows Vista',
                '5.1': 'Windows XP'
            };
            result.os = winVersions[winMatch[1]] || ('Windows NT ' + winMatch[1]);
        } else if (/CrOS/.test(ua)) {
            result.os = 'Chrome OS';
        } else if (/Android ([\d.]+)/.test(ua)) {
            result.os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
        } else if (/iPad/.test(ua)) {
            result.os = 'iPadOS';
        } else if (/iPod/.test(ua)) {
            result.os = 'iOS (iPod)';
        } else if (/iPhone/.test(ua)) {
            result.os = 'iOS (iPhone)';
        } else if (/Mac OS X ([\d_.]+)/.test(ua)) {
            result.os = 'macOS ' + ua.match(/Mac OS X ([\d_.]+)/)[1].replace(/_/g, '.');
        } else if (/Linux/.test(ua)) {
            result.os = /Ubuntu/.test(ua) ? 'Linux (Ubuntu)' : 'Linux';
        }

        // ---- 架构/位数（优先 Client Hints） ----
        if (uaData) {
            if (uaData.architecture) result.architecture = uaData.architecture;
            if (uaData.bitness) result.bitness = uaData.bitness;
        }

        return result;
    }
}

/* ========================================================================
 * 模块二：BrowserInfoCollector - 浏览器侧信息采集器
 * ====================================================================== */
class BrowserInfoCollector {
    /**
     * 采集浏览器信息
     * @returns {Object} 浏览器视角的信息对象
     */
    static collectBrowser() {
        const uaData = navigator.userAgentData || null;
        const parsed = UserAgentParser.parse(navigator.userAgent || '', uaData);
        let timezone = '';
        try {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (e) { /* 忽略 */ }

        return {
            userAgent: navigator.userAgent || '',
            browser: parsed.browser,
            browserVersion: parsed.browserVersion,
            engine: parsed.engine,
            language: navigator.language || '',
            languages: navigator.languages ? navigator.languages.join(', ') : '',
            timezone: timezone,
            cookieEnabled: navigator.cookieEnabled,
            online: navigator.onLine,
            doNotTrack: navigator.doNotTrack,
            webdriver: !!navigator.webdriver,
            pdfViewer: navigator.pdfViewerEnabled,
            maxTouchPoints: navigator.maxTouchPoints
        };
    }

    /**
     * 采集系统信息
     * @returns {Object} 系统视角的信息对象
     */
    static collectSystem() {
        const uaData = navigator.userAgentData || null;
        const parsed = UserAgentParser.parse(navigator.userAgent || '', uaData);
        let orientation = '';
        try {
            orientation = (screen.orientation && screen.orientation.type) || '';
        } catch (e) { /* 忽略 */ }

        return {
            platform: navigator.platform || '',
            os: parsed.os,
            architecture: parsed.architecture,
            bitness: parsed.bitness,
            cpuCores: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screenSize: screen.width + ' × ' + screen.height,
            availScreen: screen.availWidth + ' × ' + screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            devicePixelRatio: window.devicePixelRatio,
            viewport: window.innerWidth + ' × ' + window.innerHeight,
            orientation: orientation,
            windowPos: window.screenX + ', ' + window.screenY,
            windowSize: window.outerWidth + ' × ' + window.outerHeight
        };
    }

    /**
     * 采集网络连接信息（Network Information API，部分浏览器不支持）
     * @returns {Object} 连接信息对象，不支持的字段为 undefined
     */
    static collectConnection() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return {};
        return {
            effectiveType: conn.effectiveType,
            downlink: conn.downlink,
            rtt: conn.rtt,
            saveData: conn.saveData
        };
    }

    /**
     * 采集页面信息
     * @returns {Object} 页面视角的信息对象
     */
    static collectPage() {
        const navEntry = performance.getEntriesByType('navigation')[0];
        const timing = performance.timing;
        const loadTime = navEntry
            ? (navEntry.loadEventEnd - navEntry.startTime)
            : (timing && timing.loadEventEnd ? timing.loadEventEnd - timing.navigationStart : undefined);
        const domReady = navEntry
            ? (navEntry.domContentLoadedEventEnd - navEntry.startTime)
            : (timing && timing.domContentLoadedEventEnd ? timing.domContentLoadedEventEnd - timing.navigationStart : undefined);

        return {
            pageUrl: location.href,
            pagePath: location.pathname + location.search,
            pageReferrer: document.referrer || '',
            pageTitle: document.title,
            loadTime: loadTime,
            domReady: domReady
        };
    }
}

/* ========================================================================
 * 模块三：DashboardPageManager - 仪表板页面编排门面
 * ====================================================================== */
class DashboardPageManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;

        // 数据缓存（语言切换时重渲染使用）
        this.serverData = null;
        this.serverUnavailable = false;
        this.browserData = null;
        this.systemData = null;
        this.connectionData = null;
        this.pageData = null;

        this.init();
    }

    /**
     * 翻译辅助：获取当前语言的仪表板文案
     * @param {string} key - dashboard 命名空间下的键，如 'f_ip'
     * @returns {string}
     */
    t(key) {
        return this.languageManager.getText('dashboard.' + key);
    }

    /**
     * 初始化：采集数据 → 渲染区块 → 启动时钟 → 绑定事件 → 请求服务端信息
     */
    init() {
        this.browserData = BrowserInfoCollector.collectBrowser();
        this.systemData = BrowserInfoCollector.collectSystem();
        this.connectionData = BrowserInfoCollector.collectConnection();
        this.pageData = BrowserInfoCollector.collectPage();

        this.renderAll();
        this.startClock();
        this.bindEvents();
        this.fetchClientInfo();
        console.log('[DashboardPageManager] 初始化完成');
    }

    /* ---------------- 渲染 ---------------- */

    /**
     * 重渲染所有动态区块（语言切换 / 刷新时调用）
     */
    renderAll() {
        this.renderList('browserInfoList', this.buildBrowserRows());
        this.renderList('systemInfoList', this.buildSystemRows());
        this.renderList('connectionInfoList', this.buildConnectionRows());
        this.renderList('pageInfoList', this.buildPageRows());

        if (this.serverData) {
            this.renderServerInfo();
        } else if (this.serverUnavailable) {
            this.renderServerStatus('unavailable');
        } else {
            this.renderServerStatus('loading');
        }
        this.updateGreeting();
        this.updateClock();
    }

    /**
     * 通用渲染：将行数据绘制到指定 <dl> 容器
     * @param {string} containerId - 容器元素 ID
     * @param {Array<{k: string, v: *, badge?: boolean, badgeOn?: string, badgeOff?: string}>} rows
     */
    renderList(containerId, rows) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        rows.forEach(row => {
            const div = document.createElement('div');
            div.className = 'dash-row';

            const dt = document.createElement('dt');
            dt.textContent = this.t(row.k);

            const dd = document.createElement('dd');
            if (row.badge) {
                const on = row.v === true || row.v === 1 || row.v === '1';
                const span = document.createElement('span');
                span.className = 'dash-badge ' + (on ? 'dash-badge-yes' : 'dash-badge-no');
                span.textContent = on ? this.t(row.badgeOn || 'yes') : this.t(row.badgeOff || 'no');
                dd.appendChild(span);
            } else {
                dd.textContent = (row.v === null || row.v === undefined || row.v === '')
                    ? this.t('none')
                    : String(row.v);
            }

            div.appendChild(dt);
            div.appendChild(dd);
            container.appendChild(div);
        });
    }

    /**
     * 渲染服务器视角信息区块（服务端数据已就绪时）
     */
    renderServerInfo() {
        if (!this.serverData) return;
        this.renderList('serverInfoList', this.buildServerRows());
    }

    /**
     * 渲染服务器区块的加载中 / 不可用提示
     * @param {'loading'|'unavailable'} type
     */
    renderServerStatus(type) {
        const container = document.getElementById('serverInfoList');
        if (!container) return;
        const key = type === 'loading' ? 'loading' : 'serverUnavailable';
        container.innerHTML = '<div class="dash-' + type + '">' + this.t(key) + '</div>';
    }

    /**
     * 更新问候条（展示访客 IP）
     */
    updateGreeting() {
        const el = document.getElementById('greetingBar');
        if (!el) return;
        const ip = this.serverData && this.serverData.ip ? this.serverData.ip : this.t('unknown');
        el.textContent = this.t('greeting').replace('{ip}', ip);
    }

    /**
     * 更新时钟条（本地时间 / UTC / 偏移，每秒刷新）
     */
    updateClock() {
        const el = document.getElementById('clockBar');
        if (!el) return;
        const now = new Date();
        const local = now.toLocaleString();
        const utc = now.toUTCString();
        const offsetMin = -now.getTimezoneOffset();
        const sign = offsetMin >= 0 ? '+' : '-';
        const abs = Math.abs(offsetMin);
        const offset = 'UTC' + sign + String(Math.floor(abs / 60)).padStart(2, '0') + ':' + String(abs % 60).padStart(2, '0');

        el.innerHTML =
            '<span class="time-item"><strong>' + this.t('f_localTime') + '：</strong>' + local + '</span>' +
            '<span class="time-item"><strong>' + this.t('f_utcTime') + '：</strong>' + utc + '</span>' +
            '<span class="time-item"><strong>' + this.t('f_utcOffset') + '：</strong>' + offset + '</span>';
    }

    /* ---------------- 行数据构建 ---------------- */

    buildServerRows() {
        const d = this.serverData || {};
        const fmtTime = (ts) => {
            if (!ts) return '';
            try { return new Date(ts * 1000).toLocaleString(); } catch (e) { return String(ts); }
        };
        return [
            { k: 'f_ip', v: d.ip },
            { k: 'f_remoteAddr', v: d.remoteAddr },
            { k: 'f_xForwardedFor', v: d.xForwardedFor },
            { k: 'f_xRealIp', v: d.xRealIp },
            { k: 'f_serverUserAgent', v: d.userAgent },
            { k: 'f_acceptLanguage', v: d.acceptLanguage },
            { k: 'f_acceptEncoding', v: d.acceptEncoding },
            { k: 'f_accept', v: d.accept },
            { k: 'f_referer', v: d.referer },
            { k: 'f_requestMethod', v: d.requestMethod },
            { k: 'f_requestUri', v: d.requestUri },
            { k: 'f_requestTime', v: fmtTime(d.requestTime) },
            { k: 'f_serverName', v: d.serverName },
            { k: 'f_serverAddr', v: d.serverAddr },
            { k: 'f_serverSoftware', v: d.serverSoftware },
            { k: 'f_serverProtocol', v: d.serverProtocol },
            { k: 'f_https', v: d.https, badge: true, badgeOn: 'yes', badgeOff: 'no' },
            { k: 'f_secChUa', v: d.secChUa },
            { k: 'f_secChUaPlatform', v: d.secChUaPlatform },
            { k: 'f_secChUaMobile', v: d.secChUaMobile }
        ];
    }

    buildBrowserRows() {
        const b = this.browserData || {};
        const dnt = b.doNotTrack;
        const dntVal = dnt === '1' ? true : (dnt === '0' ? false : undefined);
        return [
            { k: 'f_userAgent', v: b.userAgent },
            { k: 'f_browser', v: b.browser },
            { k: 'f_browserVersion', v: b.browserVersion },
            { k: 'f_renderEngine', v: b.engine },
            { k: 'f_language', v: b.language },
            { k: 'f_languages', v: b.languages },
            { k: 'f_timezone', v: b.timezone },
            { k: 'f_cookieEnabled', v: b.cookieEnabled, badge: true },
            { k: 'f_online', v: b.online, badge: true, badgeOn: 'online', badgeOff: 'offline' },
            { k: 'f_doNotTrack', v: dntVal, badge: true },
            { k: 'f_webdriver', v: b.webdriver, badge: true },
            { k: 'f_pdfViewer', v: b.pdfViewer, badge: true },
            { k: 'f_maxTouchPoints', v: b.maxTouchPoints }
        ];
    }

    buildSystemRows() {
        const s = this.systemData || {};
        return [
            { k: 'f_platform', v: s.platform },
            { k: 'f_os', v: s.os },
            { k: 'f_architecture', v: s.architecture },
            { k: 'f_bitness', v: s.bitness ? s.bitness + ' bit' : '' },
            { k: 'f_cpuCores', v: s.cpuCores },
            { k: 'f_deviceMemory', v: s.deviceMemory !== undefined ? s.deviceMemory + ' ' + this.t('gb') : '' },
            { k: 'f_screenSize', v: s.screenSize },
            { k: 'f_availScreen', v: s.availScreen },
            { k: 'f_colorDepth', v: s.colorDepth },
            { k: 'f_pixelDepth', v: s.pixelDepth },
            { k: 'f_devicePixelRatio', v: s.devicePixelRatio },
            { k: 'f_viewport', v: s.viewport },
            { k: 'f_orientation', v: s.orientation },
            { k: 'f_windowPos', v: s.windowPos },
            { k: 'f_windowSize', v: s.windowSize }
        ];
    }

    buildConnectionRows() {
        const c = this.connectionData || {};
        return [
            { k: 'f_effType', v: c.effectiveType },
            { k: 'f_downlink', v: c.downlink !== undefined ? c.downlink + ' ' + this.t('mbps') : '' },
            { k: 'f_rtt', v: c.rtt !== undefined ? c.rtt + ' ms' : '' },
            { k: 'f_saveData', v: c.saveData, badge: true }
        ];
    }

    buildPageRows() {
        const p = this.pageData || {};
        const fmtMs = (v) => v !== undefined && v !== null ? Math.round(v) + ' ms' : '';
        return [
            { k: 'f_pageUrl', v: p.pageUrl },
            { k: 'f_pagePath', v: p.pagePath },
            { k: 'f_pageReferrer', v: p.pageReferrer },
            { k: 'f_pageTitle', v: p.pageTitle },
            { k: 'f_loadTime', v: fmtMs(p.loadTime) },
            { k: 'f_domReady', v: fmtMs(p.domReady) }
        ];
    }

    /* ---------------- 网络请求 ---------------- */

    /**
     * 请求服务端视角信息（proxy.php?action=clientinfo）
     * 失败时优雅降级：显示不可用提示，问候条使用"未知"
     */
    async fetchClientInfo() {
        this.serverUnavailable = false;
        this.renderServerStatus('loading');

        const btn = document.getElementById('refreshBtn');
        if (btn) btn.disabled = true;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch('./proxy.php?action=clientinfo&t=' + Date.now(), {
                headers: { 'Accept': 'application/json' },
                cache: 'no-store',
                signal: controller.signal
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const json = await response.json();
            if (!json || json.success !== true || !json.data) {
                throw new Error((json && json.msg) || 'API 响应异常');
            }

            this.serverData = json.data;
            this.renderServerInfo();
        } catch (err) {
            console.warn('[DashboardPageManager] 服务端信息获取失败：', err.message || err);
            this.serverData = null;
            this.serverUnavailable = true;
            this.renderServerStatus('unavailable');
        } finally {
            clearTimeout(timer);
            if (btn) btn.disabled = false;
        }
        this.updateGreeting();
    }

    /* ---------------- 事件与生命周期 ---------------- */

    bindEvents() {
        // 语言切换：由 LanguageManager 全局委托处理，此处仅重渲染动态区块
        document.addEventListener('languageChanged', () => this.renderAll());

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.fetchClientInfo());
    }

    startClock() {
        this.updateClock();
        this.clockTimer = setInterval(() => this.updateClock(), 1000);
    }
}

/* ==================== 组合根入口 ==================== */
document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.DashboardLanguageConfig)
    });
    window.dashboardPageManager = new DashboardPageManager(app);
});
