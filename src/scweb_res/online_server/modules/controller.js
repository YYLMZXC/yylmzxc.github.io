const ServerController = {
    config: null,
    utils: null,
    api: null,
    renderer: null,
    events: null,
    latency: null,
    serverData: [],

    init: function() {
        this.config = ServerConfig;
        this.utils = ServerUtils;
        
        this.api = ServerApi;
        this.api.init(this.config);
        
        this.renderer = ServerRenderer;
        this.renderer.init(this.config, this.utils);
        
        this.latency = ServerLatency;
        this.latency.init(this.config, this.utils);
        
        const self = this;
        this.events = ServerEvents;
        this.events.init(this.utils, this.latency, {
            onFilterChange: function(filter) {
                self.config.currentFilter = filter;
                self.loadServerList();
            }
        });
    },

    filterServers: function(servers) {
        if (this.config.currentFilter === 'all') {
            return servers;
        }
        return servers.filter(server => {
            switch (this.config.currentFilter) {
                case 'lobby':
                    return server.level === 1;
                case 'premium':
                    return server.level === 2;
                case 'community':
                    return server.level === 3;
                default:
                    return true;
            }
        });
    },

    displayServers: function(servers) {
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');
        
        console.log('成功加载', servers.length, '个服务器');
        
        const filteredServers = this.filterServers(servers);
        
        this.renderer.renderServerStats(filteredServers.length, serverStatsElement);
        this.renderer.renderServerList(filteredServers, serverListElement);
        
        this.events.initCopyHandlers();
        this.events.initFilterButtons();
        this.events.initIpSelectors();
        
        console.log('服务器列表加载完成');
        
        setTimeout(() => {
            this.latency.detectLatency();
        }, 100);
    },

    loadServerList: async function(forceRefresh) {
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');
        
        const apiUrl = this.api.getApiUrl(this.config.serverVersion);
        console.log('开始加载服务器列表');
        console.log('API地址:', apiUrl);
        
        this.renderer.renderLoading(serverListElement, '正在连接服务器...');
        serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载中...</p>';
        
        if (!forceRefresh) {
            const cachedServers = this.api.getCachedData();
            if (cachedServers) {
                console.log('使用缓存数据');
                this.serverData = cachedServers;
                this.displayServers(cachedServers);
                this.fetchAndUpdateCache(apiUrl);
                return;
            }
        }
        
        const data = await this.api.fetchWithRetry(apiUrl);
        if (!data) {
            const cachedServers = this.api.getCachedData();
            if (cachedServers) {
                console.log('API请求失败，使用缓存数据');
                this.serverData = cachedServers;
                this.displayServers(cachedServers);
                return;
            }
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载失败</p>';
            this.renderer.renderNoServers(serverListElement, '无法连接到服务器');
            return;
        }
        
        console.log('服务器响应数据:', JSON.stringify(data, null, 2));
        
        const servers = this.utils.extractServers(data);
        if (!servers || servers.length === 0) {
            console.log('服务器列表为空');
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>暂无服务器</p>';
            this.renderer.renderNoServers(serverListElement, '暂无服务器');
            return;
        }
        
        this.serverData = servers;
        this.api.saveToCache(servers);
        this.displayServers(servers);
    },

    fetchAndUpdateCache: async function(apiUrl) {
        const self = this;
        try {
            const data = await this.api.fetchWithRetry(apiUrl);
            if (data) {
                const servers = this.utils.extractServers(data);
                if (servers && servers.length > 0) {
                    this.serverData = servers;
                    this.api.saveToCache(servers);
                    this.displayServers(servers);
                    console.log('缓存已更新');
                }
            }
        } catch (e) {
            console.log('后台更新缓存失败:', e.message);
        }
    },

    toggleProxy: function() {
        this.config.useCorsProxy = !this.config.useCorsProxy;
        const proxyBtn = document.getElementById('proxyBtn');
        
        if (this.config.useCorsProxy) {
            proxyBtn.textContent = '🌐 代理模式';
            proxyBtn.classList.add('proxy-active');
            console.log('切换到代理模式');
        } else {
            proxyBtn.textContent = '🔗 直连模式';
            proxyBtn.classList.remove('proxy-active');
            console.log('切换到直连模式');
        }
        
        this.loadServerList(true);
    },

    onVersionChange: function(selectElement) {
        const newVersion = selectElement.value;
        console.log('版本变更为:', newVersion);
        
        const oldVersion = this.config.serverVersion;
        this.config.serverVersion = newVersion;
        
        if (oldVersion !== newVersion) {
            const serverListElement = document.getElementById('serverList');
            const serverStatsElement = document.querySelector('.server-stats');
            
            this.renderer.renderLoading(serverListElement, '正在加载 ' + newVersion + ' 版本服务器...');
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载中...</p>';
            
            const cachedServers = this.api.getCachedData();
            if (cachedServers) {
                console.log('该版本有缓存，直接显示');
                this.serverData = cachedServers;
                const self = this;
                setTimeout(function() {
                    self.displayServers(cachedServers);
                }, 100);
                this.fetchAndUpdateCache(this.api.getApiUrl(newVersion));
            } else {
                console.log('该版本无缓存，从API获取');
                this.loadServerList(false);
            }
        }
    },

    initVersionSelector: function() {
        const versionSelector = document.getElementById('versionSelector');
        if (!versionSelector) return;
        this.renderer.initVersionSelector(this.config.versions, this.config.serverVersion, versionSelector);
    }
};
