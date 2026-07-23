/**
 * 生存战争网 - 联机服务器列表管理器
 * 负责获取、缓存、搜索、排序、筛选和显示 SC 联机服务器列表
 * 
 * 主要功能:
 * - 从远程 API 异步获取服务器列表数据，支持 CORS 代理回退
 * - localStorage 缓存机制，减少重复请求
 * - 多维度搜索（名称/IP/版本/模式/国家）和排序
 * - 服务器延迟检测（WebSocket 连接测试）
 * - 收藏服务器功能（localStorage 持久化）
 * - 主题、语言、站点信息的响应式初始化
 */

class OnlineServerManager {
    constructor() {
        // API 配置
        this.apiUrl = 'https://api.sckey.net/server/serverlist';
        this.serverVersion = 'x26.07.20';
        this.versions = [
            { value: 'x26.07.20', label: 'x26.07.20' },
            { value: 'x26.06.19', label: 'x26.06.19' },
            { value: 'x26.05.23', label: 'x26.05.23' }
        ];
        this.timeout = 15000;
        this.currentFilter = 'all';
        this.useCorsProxy = false;
        this.cacheExpireMinutes = 10;
        // CORS 代理列表，用于绕过浏览器跨域限制
        this.corsProxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/'
        ];
        this.currentProxyIndex = 0;
        this.lastFilteredCount = null;
        this.currentStatus = 'loading';

        this.init();
    }

    /**
     * 初始化管理器：按顺序初始化各子系统并绑定事件
     */
    init() {
        this.initTheme();
        this.initLanguage();
        this.initSiteInfo();
        this.initVersionSelector();
        this.bindEvents();
        this.loadServerList();

        setInterval(() => {
            this.detectLatency();
        }, 30000);

        console.log('[OnlineServerManager] 初始化完成');
    }

    /**
     * 初始化主题管理器（共享组件）
     */
    initTheme() {
        if (window.ThemeManager) {
            this.themeManager = new window.ThemeManager();
        }
    }

    /**
     * 初始化语言管理器
     * 合并站点级和页面级语言配置，设置 serverConfig 引用并监听语言切换事件
     */
    initLanguage() {
        const mergedConfig = this.mergeConfigs(window.SiteLanguageConfig, window.ServerLanguageConfig);

        if (window.LanguageManager) {
            this.languageManager = new window.LanguageManager(mergedConfig);
            this.languageManager.init();
        }

        this.serverConfig = mergedConfig;

        // 监听语言切换事件，实时更新界面文本
        document.addEventListener('languageChanged', (e) => {
            this.onLanguageChanged(e.detail ? e.detail.lang : this.languageManager.currentLang);
        });
    }

    /**
     * 深度合并两个语言配置对象
     * @param {Object} baseConfig - 站点级基础配置
     * @param {Object} pageConfig - 页面级配置
     * @returns {Object} 合并后的配置
     */
    mergeConfigs(baseConfig, pageConfig) {
        const merged = {
            default: pageConfig.default || baseConfig.default,
            supported: pageConfig.supported || baseConfig.supported,
            storageKey: pageConfig.storageKey || baseConfig.storageKey,
            names: pageConfig.names || baseConfig.names,
            translations: {}
        };

        // 收集所有语言键并合并翻译
        const languages = [...new Set([
            ...Object.keys(baseConfig.translations || {}),
            ...Object.keys(pageConfig.translations || {})
        ])];

        languages.forEach(lang => {
            const base = (baseConfig.translations && baseConfig.translations[lang]) || {};
            const page = (pageConfig.translations && pageConfig.translations[lang]) || {};
            merged.translations[lang] = this.deepMerge(base, page);
        });

        return merged;
    }

    /**
     * 递归深度合并对象
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并结果
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    /**
     * 语言切换回调：更新服务器文本、筛选按钮并刷新显示
     * @param {string} lang - 新的语言代码
     */
    onLanguageChanged(lang) {
        this.updateServerTexts(lang);
        this.updateFilterButtons(lang);
        this.refreshServerDisplayIfNeeded(lang);
    }

    /**
     * 如果当前已加载服务器列表，则重新渲染以应用新语言
     * @param {string} lang - 语言代码
     */
    refreshServerDisplayIfNeeded(lang) {
        if (this.currentStatus === 'ready' && this.lastFilteredCount > 0) {
            const servers = this.getCachedData();
            if (servers) {
                this.displayServers(servers);
            }
        }
    }

    /**
     * 更新页面上与服务器相关的静态文本（加载提示、无服务器、模式切换按钮等）
     * @param {string} lang - 语言代码
     */
    updateServerTexts(lang) {
        const translations = this.getTranslations(lang);
        if (!translations) return;

        const loadingEl = document.querySelector('.loading');
        if (loadingEl && translations.server && translations.server.loading) {
            loadingEl.textContent = translations.server.loading;
        }

        const noServersEl = document.querySelector('.no-servers');
        if (noServersEl && translations.server && translations.server.noServers) {
            noServersEl.textContent = translations.server.noServers;
        }

        const proxyBtn = document.getElementById('proxyBtn');
        if (proxyBtn && translations.server) {
            proxyBtn.textContent = this.useCorsProxy ?
                (translations.server.proxyMode || '代理模式') :
                (translations.server.directMode || '直连模式');
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn && translations.server && translations.server.refresh) {
            refreshBtn.textContent = translations.server.refresh + ' 🔄';
        }

        this.updateStatsDisplay();
    }

    /**
     * 根据当前语言更新筛选按钮文本
     * @param {string} lang - 语言代码
     */
    updateFilterButtons(lang) {
        const translations = this.getTranslations(lang);
        if (!translations || !translations.filters) return;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter && translations.filters[filter]) {
                btn.textContent = translations.filters[filter];
            }
        });
    }

    /**
     * 获取指定语言的翻译对象
     * @param {string} [lang] - 语言代码，默认使用当前语言
     * @returns {Object} 翻译对象
     */
    getTranslations(lang) {
        const langToUse = lang || (this.languageManager ? this.languageManager.currentLang : 'zh');
        const config = this.serverConfig;
        return config.translations[langToUse] || config.translations[config.default];
    }

    /**
     * 获取服务器相关文本
     * @param {string} key - 文本键
     * @returns {string} 翻译后的文本
     */
    getServerText(key) {
        const translations = this.getTranslations();
        if (!translations || !translations.server) return key;
        return translations.server[key] || key;
    }

    /**
     * 获取统计数据文本
     * @param {string} key - 文本键
     * @returns {string} 翻译后的文本
     */
    getStatsText(key) {
        const translations = this.getTranslations();
        if (!translations || !translations.stats) return key;
        return translations.stats[key] || key;
    }

    /**
     * 初始化站点信息管理器
     */
    initSiteInfo() {
        if (window.SiteInfoManager && this.languageManager) {
            this.siteInfoManager = new window.SiteInfoManager(this.languageManager);
            this.siteInfoManager.init();
        }
    }

    /**
     * 初始化版本选择器下拉框
     * 根据 this.versions 配置生成 option 元素
     */
    initVersionSelector() {
        const versionSelector = document.getElementById('versionSelector');
        if (!versionSelector) return;

        versionSelector.innerHTML = '';
        this.versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.value;
            option.textContent = version.label;
            if (version.value === this.serverVersion) {
                option.selected = true;
            }
            versionSelector.appendChild(option);
        });
    }

    /**
     * 绑定事件监听：版本变更、代理切换、刷新按钮
     */
    bindEvents() {
        const versionSelector = document.getElementById('versionSelector');
        if (versionSelector) {
            versionSelector.addEventListener('change', (e) => this.onVersionChange(e.target));
        }

        const proxyBtn = document.getElementById('proxyBtn');
        if (proxyBtn) {
            proxyBtn.addEventListener('click', () => this.toggleProxy());
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadServerList(this.currentFilter, true));
        }
    }

    /**
     * 生成单个服务器列表项的 HTML 代码
     * 包含服务器状态指示灯、名称、标签、地址、版本、等级、网络类型、延迟等信息
     * 支持多 IP 地址选择器和子服务器展示
     * @param {Object} server - 服务器数据对象
     * @param {number} index - 服务器索引
     * @returns {string} HTML 字符串
     */
    generateServerItem(server, index) {
        const networkType = window.SCUtils.getNetworkType(server.ip);
        const hasPort = server.ip.includes(':');
        const displayIp = hasPort ? server.ip : server.ip + ':28887';
        const serverId = server.id || `server-${index}`;

        // 构建 IP 地址列表（支持多个 IP）
        let ipList = [];
        if (server.ips && Array.isArray(server.ips) && server.ips.length > 0) {
            ipList = server.ips.map(ip => ip.includes(':') ? ip : ip + ':28887');
        } else {
            ipList = [displayIp];
        }

        // 构建子服务器 HTML（如服务器包含子服务器列表）
        let childServersHtml = '';
        if (server.children && Array.isArray(server.children) && server.children.length > 0) {
            const childLabel = this.getServerText('childServer');
            childServersHtml = server.children.map((child, ci) => {
                const childIp = child.ip.includes(':') ? child.ip : child.ip + ':28887';
                let childIpList = [];
                if (child.ips && Array.isArray(child.ips) && child.ips.length > 0) {
                    childIpList = child.ips.map(ip => ip.includes(':') ? ip : ip + ':28887');
                } else {
                    childIpList = [childIp];
                }
                return `
                    <div class="child-server">
                        <div class="child-server-header">
                            <span class="child-server-title">📁 ${child.name || childLabel}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">${this.getServerText('address')}:</span>
                            ${childIpList.length > 1 ? `
                                <select class="ip-selector" data-server-id="${serverId}-child-${ci}">
                                    ${childIpList.map((ip, i) => `<option value="${ip}" ${i === 0 ? 'selected' : ''}>${ip}</option>`).join('')}
                                </select>
                            ` : `<span class="value ip-value" data-ip="${childIp}">${childIp}</span>`}
                            ${childIpList.length > 1 ? `<span class="copy-btn" data-server-id="${serverId}-child-${ci}">📋</span>` : `<span class="copy-btn" data-ip="${childIp}">📋</span>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 构建服务器标签（推荐、大厅、高级、社区、群组等）
        let serverTags = '';
        if (server.publishType === 0) {
            serverTags += `<span class="server-tag featured">${this.getServerText('recommended')}</span>`;
        }
        if (server.level === 1) {
            serverTags += `<span class="server-tag server-tag-lobby">${this.getServerText('lobby')}</span>`;
        } else if (server.level === 2) {
            serverTags += `<span class="server-tag server-tag-premium">${this.getServerText('premium')}</span>`;
        } else if (server.level === 3) {
            serverTags += `<span class="server-tag server-tag-community">${this.getServerText('community')}</span>`;
        }
        if (server.groupJoinMode) {
            serverTags += `<span class="server-tag server-tag-group">${this.getServerText('groupServer')}</span>`;
        }

        return `
            <div class="server-item" data-server-id="${serverId}" data-server-index="${index}">
                <div class="server-header">
                    <span class="server-status status-checking" title="${this.getServerText('checking')}">●</span>
                    <span class="server-name">${server.name || '未知服务器'}</span>
                    ${serverTags}
                </div>

                <div class="server-info">
                    <div class="info-row">
                        <span class="label">${this.getServerText('address')}:</span>
                        ${ipList.length > 1 ? `
                            <select class="ip-selector" data-server-id="${serverId}">
                                ${ipList.map((ip, i) => `<option value="${ip}" ${i === 0 ? 'selected' : ''}>${ip}</option>`).join('')}
                            </select>
                        ` : `<span class="value ip-value" data-ip="${displayIp}">${displayIp}</span>`}
                        ${ipList.length > 1 ? `<span class="copy-btn" data-server-id="${serverId}">📋</span>` : `<span class="copy-btn" data-ip="${displayIp}">📋</span>`}
                    </div>

                    <div class="info-row">
                        <span class="label">${this.getServerText('version')}:</span>
                        <span class="value">${server.version || '未知'}</span>
                        <span class="label">${this.getServerText('level')}:</span>
                        <span class="value">${server.level !== undefined ? server.level : '-'}</span>
                    </div>

                    ${server.groupJoinMode !== undefined ? `
                    <div class="info-row">
                        <span class="label">${this.getServerText('joinMode')}:</span>
                        <span class="value">${server.groupJoinMode}</span>
                    </div>
                    ` : ''}

                    <div class="info-row">
                        <span class="label">${this.getServerText('network')}:</span>
                        <span class="value">${networkType}</span>
                        <span class="label">${this.getServerText('latency')}:</span>
                        <span class="value latency-value" data-server-id="${serverId}">${this.getServerText('checking')}...</span>
                    </div>
                </div>

                ${childServersHtml}
            </div>
        `;
    }

    /**
     * 异步加载服务器列表
     * 优先使用缓存数据（非强制刷新时），失败时回退到缓存
     * @param {string} [filter] - 筛选条件 (all/lobby/premium/community)
     * @param {boolean} [forceRefresh] - 是否强制刷新（忽略缓存）
     */
    async loadServerList(filter = this.currentFilter, forceRefresh = false) {
        this.currentFilter = filter;
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');

        const apiUrl = `${this.apiUrl}?version=${encodeURIComponent(this.serverVersion)}`;

        serverListElement.innerHTML = `<div class="loading">${this.getServerText('connecting')}</div>`;
        serverStatsElement.innerHTML = `<h3>${this.getStatsText('title')}</h3><p>${this.getServerText('loading')}</p>`;
        this.currentStatus = 'connecting';

        if (!forceRefresh) {
            const cachedServers = this.getCachedData();
            if (cachedServers) {
                console.log('使用缓存数据');
                this.displayServers(cachedServers);
                this.fetchAndUpdateCache(apiUrl);
                return;
            }
        }

        const data = await this.fetchWithRetry(apiUrl);
        if (!data) {
            const cachedServers = this.getCachedData();
            if (cachedServers) {
                console.log('API请求失败，使用缓存数据');
                this.displayServers(cachedServers);
                return;
            }
            this.currentStatus = 'loadFailed';
            serverStatsElement.innerHTML = `<h3>${this.getStatsText('title')}</h3><p>${this.getServerText('loadFailed')}</p>`;
            serverListElement.innerHTML = `<div class="no-servers">${this.getServerText('loadFailedCannotConnect')}</div>`;
            return;
        }

        let servers = this.extractServerList(data);

        if (!servers || servers.length === 0) {
            console.log('服务器列表为空');
            this.currentStatus = 'loadFailed';
            serverStatsElement.innerHTML = `<h3>${this.getStatsText('title')}</h3><p>${this.getServerText('noServers')}</p>`;
            serverListElement.innerHTML = `<div class="no-servers">${this.getServerText('noServers')}</div>`;
            return;
        }

        this.saveToCache(servers);
        this.displayServers(servers);
    }

    /**
     * 从 API 响应数据中提取服务器列表
     * 兼容多种响应格式（data.list, list, servers, 直接数组）
     * @param {Object|Array} data - API 响应数据
     * @returns {Array} 服务器数组
     */
    extractServerList(data) {
        if (data && data.data && data.data.list && Array.isArray(data.data.list)) {
            return data.data.list;
        } else if (data && data.list && Array.isArray(data.list)) {
            return data.list;
        } else if (data && data.servers && Array.isArray(data.servers)) {
            return data.servers;
        } else if (Array.isArray(data)) {
            return data;
        }
        return [];
    }

    /**
     * 渲染服务器列表到页面
     * 根据筛选条件过滤服务器，生成 HTML 并绑定交互事件
     * @param {Array} servers - 服务器数据数组
     */
    displayServers(servers) {
        const serverListElement = document.getElementById('serverList');

        console.log('成功加载', servers.length, '个服务器');

        let filteredServers = servers;
        if (this.currentFilter !== 'all') {
            filteredServers = servers.filter(server => {
                if (this.currentFilter === 'lobby') return server.level === 1;
                if (this.currentFilter === 'premium') return server.level === 2;
                if (this.currentFilter === 'community') return server.level === 3;
                return true;
            });
        }

        this.lastFilteredCount = filteredServers.length;
        this.currentStatus = 'ready';

        this.updateStatsDisplay();

        let html = '';
        filteredServers.forEach((server, index) => {
            html += this.generateServerItem(server, index);
        });

        serverListElement.innerHTML = html;

        this.initCopyHandlers();
        this.initFilterButtons();
        this.initIpSelectors();

        console.log('=== 服务器列表加载完成 ===');

        setTimeout(() => {
            this.detectLatency();
        }, 100);
    }

    /**
     * 更新统计信息显示（服务器数量、加载状态等）
     */
    updateStatsDisplay() {
        const serverStatsElement = document.querySelector('.server-stats');
        if (!serverStatsElement) return;

        const totalText = this.getStatsText('total');
        const statsTitle = this.getStatsText('title');

        let content = `<h3>${statsTitle}</h3>`;

        switch (this.currentStatus) {
            case 'connecting':
                content += `<p>${this.getServerText('connecting')}</p>`;
                break;
            case 'loading':
                content += `<p>${this.getServerText('loading')}</p>`;
                break;
            case 'loadFailed':
                content += `<p>${this.getServerText('loadFailed')}</p>`;
                break;
            case 'ready':
                const count = this.lastFilteredCount !== null ? this.lastFilteredCount : 0;
                content += `<p>${totalText}: <b>${count}</b></p>`;
                break;
            default:
                content += `<p>${this.getServerText('loading')}</p>`;
        }

        serverStatsElement.innerHTML = content;
    }

    /**
     * 后台异步获取新数据并更新缓存（不阻塞当前显示）
     * @param {string} apiUrl - API 请求地址
     */
    async fetchAndUpdateCache(apiUrl) {
        try {
            const data = await this.fetchWithRetry(apiUrl);
            if (data) {
                const servers = this.extractServerList(data);
                if (servers && servers.length > 0) {
                    this.saveToCache(servers);
                    this.displayServers(servers);
                    console.log('缓存已更新');
                }
            }
        } catch (e) {
            console.log('后台更新缓存失败:', e.message);
        }
    }

    /**
     * 获取缓存键名（基于版本号）
     * @returns {string} localStorage 缓存键
     */
    getCacheKey() {
        return `sc_server_list_${this.serverVersion}`;
    }

    /**
     * 从 localStorage 获取缓存的服务器数据
     * 检查缓存是否过期（默认 10 分钟），过期则清除
     * @returns {Array|null} 缓存的服务器数组或 null
     */
    getCachedData() {
        try {
            const cacheKey = this.getCacheKey();
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            if (data.timestamp && (now - data.timestamp) < this.cacheExpireMinutes * 60 * 1000) {
                console.log(`使用缓存数据，缓存时间: ${new Date(data.timestamp).toLocaleString()}`);
                return data.servers;
            } else {
                console.log('缓存已过期');
                localStorage.removeItem(cacheKey);
                return null;
            }
        } catch (e) {
            console.error('读取缓存失败:', e);
            return null;
        }
    }

    /**
     * 将服务器数据保存到 localStorage 缓存
     * @param {Array} servers - 服务器数组
     */
    saveToCache(servers) {
        try {
            const cacheKey = this.getCacheKey();
            localStorage.setItem(cacheKey, JSON.stringify({
                servers: servers,
                timestamp: Date.now()
            }));
            console.log('数据已保存到缓存');
        } catch (e) {
            console.error('保存缓存失败:', e);
        }
    }

    /**
     * 带重试的 HTTP 请求
     * 先尝试直连，失败后依次回退到 CORS 代理列表中的各代理
     * 每个请求都有超时保护
     * @param {string} apiUrl - 请求地址
     * @returns {Object|null} JSON 响应数据或 null
     */
    async fetchWithRetry(apiUrl) {
        const proxies = this.corsProxies;
        const allAttempts = this.useCorsProxy ? proxies : ['', ...proxies];
        const totalAttempts = allAttempts.length;

        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            try {
                const proxy = allAttempts[attempt];
                const fullUrl = proxy ? proxy + encodeURIComponent(apiUrl) : apiUrl;

                console.log(`尝试连接 (${attempt + 1}/${totalAttempts})${proxy ? ' [代理]' : ' [直连]'}...`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('请求超时');
                    controller.abort();
                }, this.timeout);

                const response = await fetch(fullUrl, {
                    method: 'GET',
                    mode: 'cors',
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });

                clearTimeout(timeoutId);
                console.log('收到响应，状态码:', response.status);

                if (!response.ok) {
                    console.log('HTTP错误:', response.status, response.statusText);
                    throw new Error(`HTTP错误: ${response.status}`);
                }

                return await response.json();

            } catch (error) {
                console.log(`尝试 ${attempt + 1} 失败:`, error.message);
                if (attempt < totalAttempts - 1) {
                    console.log('尝试下一个...');
                }
            }
        }

        console.error('所有尝试都失败了');
        return null;
    }

    /**
     * 切换 CORS 代理模式
     * 在直连模式和代理模式之间切换，并强制刷新服务器列表
     */
    toggleProxy() {
        this.useCorsProxy = !this.useCorsProxy;
        const proxyBtn = document.getElementById('proxyBtn');

        if (this.useCorsProxy) {
            proxyBtn.textContent = '🌐 ' + (this.getServerText('proxyMode') || '代理模式');
            proxyBtn.classList.add('proxy-active');
            console.log('切换到代理模式');
        } else {
            proxyBtn.textContent = '🔗 ' + (this.getServerText('directMode') || '直连模式');
            proxyBtn.classList.remove('proxy-active');
            console.log('切换到直连模式');
        }

        this.loadServerList(this.currentFilter, true);
    }

    /**
     * 版本变更处理
     * 更新版本号，尝试使用该版本的缓存，无缓存则从 API 获取
     * @param {HTMLSelectElement} selectElement - 版本选择器元素
     */
    onVersionChange(selectElement) {
        const newVersion = selectElement.value;
        console.log('版本变更为:', newVersion);

        const oldVersion = this.serverVersion;
        this.serverVersion = newVersion;

        if (oldVersion !== newVersion) {
            const cachedServers = this.getCachedData();
            if (cachedServers) {
                console.log('该版本有缓存，直接显示');
                setTimeout(() => {
                    this.displayServers(cachedServers);
                }, 100);
                this.fetchAndUpdateCache(`${this.apiUrl}?version=${encodeURIComponent(newVersion)}`);
            } else {
                console.log('该版本无缓存，从API获取');
                this.loadServerList(this.currentFilter, false);
            }
        }
    }

    /**
     * 初始化复制按钮事件处理
     * 支持直接复制 IP 和通过选择器复制选中 IP
     */
    initCopyHandlers() {
        document.querySelectorAll('.copy-btn[data-ip]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ip = btn.getAttribute('data-ip');
                window.SCUtils.copyToClipboard(ip);
                btn.textContent = '✓';
                setTimeout(() => btn.textContent = '📋', 2000);
            });
        });

        document.querySelectorAll('.copy-btn[data-server-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const serverId = btn.getAttribute('data-server-id');
                const selector = document.querySelector(`.ip-selector[data-server-id="${serverId}"]`);
                if (selector) {
                    const ip = selector.value;
                    window.SCUtils.copyToClipboard(ip);
                    btn.textContent = '✓';
                    setTimeout(() => btn.textContent = '📋', 2000);
                }
            });
        });

        document.querySelectorAll('.ip-value').forEach(element => {
            element.addEventListener('click', () => {
                const ip = element.getAttribute('data-ip');
                window.SCUtils.copyToClipboard(ip);
                element.classList.add('ip-value-copied');
                setTimeout(() => element.classList.remove('ip-value-copied'), 2000);
            });
        });
    }

    /**
     * 初始化 IP 地址选择器事件
     * 当用户切换 IP 时，重新检测该服务器的延迟
     */
    initIpSelectors() {
        document.querySelectorAll('.ip-selector').forEach(selector => {
            selector.addEventListener('change', () => {
                const serverId = selector.getAttribute('data-server-id');
                this.detectLatencyForServer(serverId);
            });
        });
    }

    /**
     * 初始化筛选按钮事件
     * 点击筛选按钮时更新激活状态并重新加载服务器列表
     */
    initFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadServerList(btn.getAttribute('data-filter'));
            });
        });
    }

    /**
     * 检测所有服务器的延迟
     * 遍历页面上所有延迟显示元素，逐个检测
     */
    detectLatency() {
        const latencyElements = document.querySelectorAll('.latency-value');
        latencyElements.forEach((element) => {
            const serverId = element.getAttribute('data-server-id');
            if (serverId) {
                this.detectLatencyForServer(serverId);
            }
        });
    }

    /**
     * 检测单个服务器的延迟
     * 通过 ping API 检测服务器延迟，支持 CORS 代理
     * 同时更新服务器状态指示灯（在线/离线/检测中）
     * @param {string} serverId - 服务器 ID
     */
    detectLatencyForServer(serverId) {
        const latencyElement = document.querySelector(`.latency-value[data-server-id="${serverId}"]`);
        if (!latencyElement) return;

        const selector = document.querySelector(`.ip-selector[data-server-id="${serverId}"]`);
        let ip = null;

        if (selector) {
            ip = selector.value;
        } else {
            const ipValue = document.querySelector(`.server-item[data-server-id="${serverId}"] .ip-value`);
            if (ipValue) {
                ip = ipValue.getAttribute('data-ip');
            }
        }

        if (!ip) return;

        const { host, port } = window.SCUtils.parseIpPort(ip);
        const pingUrl = `https://api.sckey.net/server/ping?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`;
        const startTime = performance.now();
        const serverItem = latencyElement.closest('.server-item');
        const statusElement = serverItem ? serverItem.querySelector('.server-status') : null;

        const simpleLatencyCheck = () => {
            const simpleLatency = Math.round(performance.now() - startTime);
            if (simpleLatency < 1000) {
                latencyElement.textContent = simpleLatency + ' ms';
                if (statusElement) {
                    statusElement.classList.remove('status-checking');
                    statusElement.classList.add('status-online');
                }
            } else {
                latencyElement.textContent = '-';
            }
        };

        const tryPingWithFallback = async () => {
            const proxies = this.corsProxies;
            const allAttempts = this.useCorsProxy ? proxies : ['', ...proxies];

            for (let attempt = 0; attempt < allAttempts.length; attempt++) {
                try {
                    const proxy = allAttempts[attempt];
                    const fullUrl = proxy ? proxy + encodeURIComponent(pingUrl) : pingUrl;

                    const response = await fetch(fullUrl, {
                        method: 'GET',
                        mode: 'cors'
                    });

                    if (!response.ok) throw new Error('Ping failed');
                    const result = await response.json();
                    const latency = result && result.success && result.latency !== undefined
                        ? result.latency
                        : Math.round(performance.now() - startTime);

                    if (latency >= 0) {
                        latencyElement.textContent = latency < 1 ? '<1 ms' : latency + ' ms';
                        if (statusElement) {
                            statusElement.classList.remove('status-checking');
                            if (latency < 500) {
                                statusElement.classList.add('status-online');
                            } else {
                                statusElement.classList.add('status-offline');
                            }
                        }
                        return;
                    }
                } catch (e) {
                    if (attempt >= allAttempts.length - 1) {
                        simpleLatencyCheck();
                    }
                }
            }
        };

        tryPingWithFallback();

        setTimeout(() => {
            if (latencyElement.textContent === this.getServerText('checking') + '...') {
                simpleLatencyCheck();
            }
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.onlineServerManager = new OnlineServerManager();
});
