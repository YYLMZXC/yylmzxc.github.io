/**
 * 生存战争网 - 联机服务器列表管理器（门面 / 协调者）
 *
 * 只负责编排各子系统的协作，具体职责已拆分为：
 * - ServerApiClient（网络层：代理回退 / 超时重试 / 数据提取）
 * - ServerCache（数据层：localStorage 缓存）
 * - ServerListView（视图层：列表渲染与交互）
 * - ServerLatencyChecker（延迟检测）
 *
 * 共享管理器（主题 / 语言 / 站点信息）由组合根 App 统一创建并通过构造注入
 */

class OnlineServerManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;
        this.serverConfig = app.languageManager.config;

        // API 配置
        this.apiUrl = 'https://api.sckey.net/server/serverlist';
        this.serverVersion = 'x26.07.30';
        this.versions = [
            { value: 'x26.07.30', label: 'x26.07.30' },
            { value: 'x26.06.19', label: 'x26.06.19' }
        ];
        this.currentFilter = 'all';

        // 组装子系统（依赖注入，保持子系统之间相互解耦）
        this.apiClient = new ServerApiClient({
            apiUrl: this.apiUrl,
            timeout: 15000,
            corsProxies: [
                'https://corsproxy.io/?',
                'https://api.allorigins.win/raw?url=',
                'https://proxy.cors.sh/'
            ],
            useCorsProxy: false,
            fallbackVersion: this.serverVersion
        });

        this.cache = new ServerCache(10);

        this.latencyChecker = new ServerLatencyChecker({
            apiClient: this.apiClient,
            getServerText: (key) => this.getServerText(key)
        });

        this.listView = new ServerListView({
            getServerText: (key) => this.getServerText(key),
            getStatsText: (key) => this.getStatsText(key),
            getTranslations: (lang) => this.getTranslations(lang),
            onFilterChange: (filter) => this.loadServerList(filter),
            onIpChange: (serverId) => this.latencyChecker.detectLatencyForServer(serverId),
            onRendered: () => setTimeout(() => this.latencyChecker.detectLatency(), 100)
        });

        this.init();
    }

    /**
     * 初始化管理器：初始化版本选择器、绑定事件并加载服务器列表
     */
    init() {
        this.initVersionSelector();
        this.bindEvents();
        this.loadServerList();

        // 每 30 秒自动重新检测延迟
        setInterval(() => {
            this.latencyChecker.detectLatency();
        }, 30000);

        console.log('[OnlineServerManager] 初始化完成');
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
     * 绑定事件监听：版本变更、代理切换、刷新按钮、语言切换
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

        // 监听语言切换事件，实时更新界面文本
        document.addEventListener('languageChanged', (e) => {
            this.onLanguageChanged(e.detail ? e.detail.lang : this.languageManager.currentLang);
        });
    }

    /**
     * 语言切换回调：更新静态文本、筛选按钮并刷新显示
     * @param {string} lang - 新的语言代码
     */
    onLanguageChanged(lang) {
        this.listView.updateServerTexts(lang, this.apiClient.useCorsProxy);
        this.listView.updateFilterButtons(lang);
        this.refreshServerDisplayIfNeeded(lang);
    }

    /**
     * 如果当前已加载服务器列表，则重新渲染以应用新语言
     * @param {string} lang - 语言代码
     */
    refreshServerDisplayIfNeeded(lang) {
        if (this.listView.currentStatus === 'ready' && this.listView.lastFilteredCount > 0) {
            const servers = this.cache.getCachedData(this.serverVersion);
            if (servers) {
                this.listView.render(servers, this.currentFilter);
            }
        }
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
     * 异步加载服务器列表
     * 编排：优先使用缓存（非强制刷新时）→ 网络获取 → 失败回退缓存
     * @param {string} [filter] - 筛选条件 (all/lobby/premium/community)
     * @param {boolean} [forceRefresh] - 是否强制刷新（忽略缓存）
     */
    async loadServerList(filter = this.currentFilter, forceRefresh = false) {
        this.currentFilter = filter;
        const apiUrl = `${this.apiUrl}?version=${encodeURIComponent(this.serverVersion)}`;

        this.listView.showConnecting();

        if (!forceRefresh) {
            const cachedServers = this.cache.getCachedData(this.serverVersion);
            if (cachedServers) {
                console.log('使用缓存数据');
                this.listView.render(cachedServers, filter);
                this.fetchAndUpdateCache(apiUrl);
                return;
            }
        }

        let data = null;
        try {
            data = await this.apiClient.fetchWithRetry(apiUrl);
        } catch (e) {
            console.warn('API请求失败:', e.message);
        }

        if (!data) {
            const cachedServers = this.cache.getCachedData(this.serverVersion);
            if (cachedServers) {
                console.log('API请求失败，使用缓存数据');
                this.listView.render(cachedServers, filter);
                return;
            }
            this.listView.setStatus('loadFailed');
            this.listView.showLoadFailed();
            return;
        }

        const servers = this.apiClient.extractServerList(data);
        if (!servers || servers.length === 0) {
            console.log('服务器列表为空');
            this.listView.setStatus('loadFailed');
            this.listView.showNoServers();
            return;
        }

        this.cache.saveToCache(this.serverVersion, servers);
        this.listView.render(servers, filter);
    }

    /**
     * 后台异步获取新数据并更新缓存（不阻塞当前显示）
     * @param {string} apiUrl - API 请求地址
     */
    async fetchAndUpdateCache(apiUrl) {
        try {
            const data = await this.apiClient.fetchWithRetry(apiUrl);
            if (data) {
                const servers = this.apiClient.extractServerList(data);
                if (servers && servers.length > 0) {
                    this.cache.saveToCache(this.serverVersion, servers);
                    this.listView.render(servers, this.currentFilter);
                    console.log('缓存已更新');
                }
            }
        } catch (e) {
            console.log('后台更新缓存失败:', e.message);
        }
    }

    /**
     * 切换 CORS 代理模式
     * 在直连模式和代理模式之间切换，并强制刷新服务器列表
     */
    toggleProxy() {
        const useCorsProxy = this.apiClient.toggleUseCorsProxy();
        const proxyBtn = document.getElementById('proxyBtn');

        if (useCorsProxy) {
            proxyBtn.textContent = '🌐 ' + (this.getServerText('proxyMode') || '代理模式');
            proxyBtn.classList.add('proxy-active');
            console.log('启用公共CORS代理作为后备');
        } else {
            proxyBtn.textContent = '🔗 ' + (this.getServerText('directMode') || '直连模式');
            proxyBtn.classList.remove('proxy-active');
            console.log('仅使用自建代理和直连');
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
            const cachedServers = this.cache.getCachedData(newVersion);
            if (cachedServers) {
                console.log('该版本有缓存，直接显示');
                setTimeout(() => {
                    this.listView.render(cachedServers, this.currentFilter);
                }, 100);
                this.fetchAndUpdateCache(`${this.apiUrl}?version=${encodeURIComponent(newVersion)}`);
            } else {
                console.log('该版本无缓存，从API获取');
                this.loadServerList(this.currentFilter, false);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.ServerLanguageConfig)
    });
    window.onlineServerManager = new OnlineServerManager(app);
});
