class OnlineServerManager {
    constructor() {
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
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/'
        ];
        this.currentProxyIndex = 0;
        this.lastFilteredCount = null;
        this.currentStatus = 'loading';

        this.languageConfig = window.ServerLanguageConfig;
        this.currentLang = this.languageConfig.default;

        this.init();
    }

    init() {
        this.initTheme();
        this.initLanguage();
        this.initSiteInfo();
        this.initVersionSelector();
        this.bindEvents();
        this.initSidebarTranslations();
        this.loadServerList();

        setInterval(() => {
            this.detectLatency();
        }, 30000);

        console.log('[OnlineServerManager] 初始化完成');
    }

    initSiteInfo() {
        const currentUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '');

        const currentAddressEl = document.getElementById('currentAddress');
        if (currentAddressEl) {
            const translations = this.languageConfig.translations[this.currentLang];
            const prefix = translations && translations.siteInfo && translations.siteInfo.currentAddress
                ? translations.siteInfo.currentAddress
                : '本站地址：';
            currentAddressEl.textContent = prefix + currentUrl;
        }

        const shortUrlEl = document.getElementById('shortUrl');
        if (shortUrlEl) {
            const translations = this.languageConfig.translations[this.currentLang];
            const prefix = translations && translations.siteInfo && translations.siteInfo.shortUrl
                ? translations.siteInfo.shortUrl
                : '短网址：';
            shortUrlEl.innerHTML = `
                ${prefix}
                <a href="https://scnet.top/" target="_blank" rel="noopener">
                    scnet.top <span style="font-size: 0.8em; color: #666;">https://scnet.top/</span>
                </a>
                <br>
                <a href="https://schub.icu/" target="_blank" rel="noopener">
                    schub.icu <span style="font-size: 0.8em; color: #666;">https://schub.icu/</span>
                </a>
                <br>
                <a href="https://scwz.top/" target="_blank" rel="noopener">
                    scwz.top <span style="font-size: 0.8em; color: #666;">https://scwz.top/</span>
                </a>
            `;
        }
    }

    initTheme() {
        if (window.ThemeManager) {
            this.themeManager = new window.ThemeManager();
        }
    }

    initLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        let lang = urlParams.get('lang');

        if (!lang) {
            lang = localStorage.getItem(this.languageConfig.storageKey) || this.languageConfig.default;
        }

        this.setLanguage(lang);

        const buttons = document.querySelectorAll('.language-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                this.setLanguage(button.getAttribute('data-lang'));
            });
        });
    }

    setLanguage(lang) {
        if (!this.languageConfig.supported.includes(lang)) return;

        this.currentLang = lang;
        localStorage.setItem(this.languageConfig.storageKey, lang);
        this.applyLanguage(lang);
    }

    applyLanguage(lang) {
        const translations = this.languageConfig.translations[lang];
        if (!translations) return;

        if (translations.nav) {
            Object.entries(translations.nav).forEach(([key, value]) => {
                const element = document.querySelector(`[data-nav="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        }

        this.updateDynamicContentByAttr();

        if (translations.stats) {
            const statsEl = document.querySelector('.server-stats h3');
            if (statsEl && translations.stats.title) {
                statsEl.textContent = translations.stats.title;
            }
            const statsPEl = document.querySelector('.server-stats p');
            if (statsPEl) {
                this.updateStatsParagraph(statsPEl);
            }
        }

        if (translations.server) {
            this.updateDynamicTexts(translations.server);
            this.updateFilterButtons(translations.filters);
        }

        if (translations.footer) {
            const footerEl = document.querySelector('.copyright');
            if (footerEl) {
                footerEl.textContent = translations.footer;
            }
        }

        if (translations.siteInfo) {
            const currentAddressEl = document.getElementById('currentAddress');
            if (currentAddressEl && translations.siteInfo.currentAddress) {
                const baseUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
                currentAddressEl.textContent = translations.siteInfo.currentAddress + baseUrl;
            }
            const shortUrlEl = document.getElementById('shortUrl');
            if (shortUrlEl && translations.siteInfo.shortUrl) {
                shortUrlEl.innerHTML = shortUrlEl.innerHTML.replace(/^.*?(?=<a)/s, translations.siteInfo.shortUrl + '\n');
            }
        }

        document.querySelectorAll('.language-btn').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-lang') === lang);
        });
    }

    updateStatsParagraph(pEl) {
        const connectingText = this.getCurrentServerText('connecting');
        const loadingText = this.getCurrentServerText('loading');
        const loadFailedText = this.getCurrentServerText('loadFailed');
        const totalText = this.getCurrentStatsText('total');

        switch (this.currentStatus) {
            case 'connecting':
                pEl.textContent = connectingText;
                break;
            case 'loading':
                pEl.textContent = loadingText;
                break;
            case 'loadFailed':
                pEl.textContent = loadFailedText;
                break;
            case 'ready':
                const count = this.lastFilteredCount !== null ? this.lastFilteredCount : 0;
                pEl.innerHTML = `${totalText}: <b>${count}</b>`;
                break;
            default:
                pEl.textContent = loadingText;
        }
    }

    updateDynamicContentByAttr() {
        const translations = this.languageConfig.translations[this.currentLang];
        if (!translations) return;

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.getNestedText(translations, key);
            if (text) {
                element.textContent = text;
            }
        });
    }

    getNestedText(obj, path) {
        const keys = path.split('.');
        let cur = obj;
        for (const k of keys) {
            if (cur && typeof cur === 'object' && k in cur) {
                cur = cur[k];
            } else {
                return null;
            }
        }
        return typeof cur === 'string' ? cur : null;
    }

    initSidebarTranslations() {
        const translations = this.languageConfig.translations[this.currentLang];
        if (!translations) return;
        this.updateDynamicContentByAttr();
    }

    updateDynamicTexts(serverTranslations) {
        const loadingEl = document.querySelector('.loading');
        if (loadingEl && serverTranslations.loading) {
            loadingEl.textContent = serverTranslations.loading;
        }

        const noServersEl = document.querySelector('.no-servers');
        if (noServersEl && serverTranslations.noServers) {
            noServersEl.textContent = serverTranslations.noServers;
        }

        const proxyBtn = document.getElementById('proxyBtn');
        if (proxyBtn) {
            proxyBtn.textContent = this.useCorsProxy ?
                (serverTranslations.proxyMode || '代理模式') :
                (serverTranslations.directMode || '直连模式');
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn && serverTranslations.refresh) {
            refreshBtn.textContent = serverTranslations.refresh + ' 🔄';
        }
    }

    updateFilterButtons(filters) {
        if (!filters) return;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter && filters[filter]) {
                btn.textContent = filters[filter];
            }
        });
    }

    getCurrentServerText(key) {
        const translations = this.languageConfig.translations[this.currentLang];
        if (!translations || !translations.server) return key;
        return translations.server[key] || key;
    }

    getCurrentStatsText(key) {
        const translations = this.languageConfig.translations[this.currentLang];
        if (!translations || !translations.stats) return key;
        return translations.stats[key] || key;
    }

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

    generateServerItem(server, index) {
        const networkType = window.SCUtils.getNetworkType(server.ip);
        const hasPort = server.ip.includes(':');
        const displayIp = hasPort ? server.ip : server.ip + ':28887';
        const serverId = server.id || `server-${index}`;

        let ipList = [];
        if (server.ips && Array.isArray(server.ips) && server.ips.length > 0) {
            ipList = server.ips.map(ip => ip.includes(':') ? ip : ip + ':28887');
        } else {
            ipList = [displayIp];
        }

        let childServersHtml = '';
        if (server.children && Array.isArray(server.children) && server.children.length > 0) {
            const childLabel = this.getCurrentServerText('childServer');
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
                            <span class="label">${this.getCurrentServerText('address')}:</span>
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

        let serverTags = '';
        if (server.publishType === 0) {
            serverTags += `<span class="server-tag featured">${this.getCurrentServerText('recommended')}</span>`;
        }
        if (server.level === 1) {
            serverTags += `<span class="server-tag server-tag-lobby">${this.getCurrentServerText('lobby')}</span>`;
        } else if (server.level === 2) {
            serverTags += `<span class="server-tag server-tag-premium">${this.getCurrentServerText('premium')}</span>`;
        } else if (server.level === 3) {
            serverTags += `<span class="server-tag server-tag-community">${this.getCurrentServerText('community')}</span>`;
        }
        if (server.groupJoinMode) {
            serverTags += `<span class="server-tag server-tag-group">${this.getCurrentServerText('groupServer')}</span>`;
        }

        return `
            <div class="server-item" data-server-id="${serverId}" data-server-index="${index}">
                <div class="server-header">
                    <span class="server-status status-checking" title="${this.getCurrentServerText('checking')}">●</span>
                    <span class="server-name">${server.name || '未知服务器'}</span>
                    ${serverTags}
                </div>

                <div class="server-info">
                    <div class="info-row">
                        <span class="label">${this.getCurrentServerText('address')}:</span>
                        ${ipList.length > 1 ? `
                            <select class="ip-selector" data-server-id="${serverId}">
                                ${ipList.map((ip, i) => `<option value="${ip}" ${i === 0 ? 'selected' : ''}>${ip}</option>`).join('')}
                            </select>
                        ` : `<span class="value ip-value" data-ip="${displayIp}">${displayIp}</span>`}
                        ${ipList.length > 1 ? `<span class="copy-btn" data-server-id="${serverId}">📋</span>` : `<span class="copy-btn" data-ip="${displayIp}">📋</span>`}
                    </div>

                    <div class="info-row">
                        <span class="label">${this.getCurrentServerText('version')}:</span>
                        <span class="value">${server.version || '未知'}</span>
                        <span class="label">${this.getCurrentServerText('level')}:</span>
                        <span class="value">${server.level !== undefined ? server.level : '-'}</span>
                    </div>

                    ${server.groupJoinMode !== undefined ? `
                    <div class="info-row">
                        <span class="label">${this.getCurrentServerText('joinMode')}:</span>
                        <span class="value">${server.groupJoinMode}</span>
                    </div>
                    ` : ''}

                    <div class="info-row">
                        <span class="label">${this.getCurrentServerText('network')}:</span>
                        <span class="value">${networkType}</span>
                        <span class="label">${this.getCurrentServerText('latency')}:</span>
                        <span class="value latency-value" data-server-id="${serverId}">${this.getCurrentServerText('checking')}...</span>
                    </div>
                </div>

                ${childServersHtml}
            </div>
        `;
    }

    loadServerList(filter = this.currentFilter, forceRefresh = false) {
        this.currentFilter = filter;
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');

        const apiUrl = `${this.apiUrl}?version=${encodeURIComponent(this.serverVersion)}`;
        const connectingText = this.getCurrentServerText('connecting');
        const loadingText = this.getCurrentServerText('loading');
        const loadFailedText = this.getCurrentServerText('loadFailed');
        const totalText = this.getCurrentStatsText('total');
        const noServersText = this.getCurrentServerText('noServers');
        const statsTitle = this.getCurrentStatsText('title');

        console.log('=== 开始加载服务器列表 ===');
        console.log('API地址:', apiUrl);

        serverListElement.innerHTML = `<div class="loading">${connectingText}</div>`;
        serverStatsElement.innerHTML = `<h3>${statsTitle}</h3><p>${loadingText}</p>`;
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

        const data = this.fetchWithRetry(apiUrl);
        if (!data) {
            const cachedServers = this.getCachedData();
            if (cachedServers) {
                console.log('API请求失败，使用缓存数据');
                this.displayServers(cachedServers);
                return;
            }
            this.currentStatus = 'loadFailed';
            serverStatsElement.innerHTML = `<h3>${statsTitle}</h3><p>${loadFailedText}</p>`;
            serverListElement.innerHTML = `<div class="no-servers">${this.getCurrentServerText('loadFailedCannotConnect')}</div>`;
            return;
        }

        console.log('服务器响应数据:', JSON.stringify(data, null, 2));

        let servers = [];
        if (data && data.data && data.data.list && Array.isArray(data.data.list)) {
            servers = data.data.list;
            console.log('从 data.data.list 获取服务器列表，数量:', servers.length);
        } else if (data && data.list && Array.isArray(data.list)) {
            servers = data.list;
            console.log('从 data.list 获取服务器列表，数量:', servers.length);
        } else if (data && data.servers && Array.isArray(data.servers)) {
            servers = data.servers;
            console.log('从 data.servers 获取服务器列表，数量:', servers.length);
        } else if (Array.isArray(data)) {
            servers = data;
            console.log('直接获取服务器列表，数量:', servers.length);
        }

        if (!servers || servers.length === 0) {
            console.log('服务器列表为空');
            this.currentStatus = 'loadFailed';
            serverStatsElement.innerHTML = `<h3>${statsTitle}</h3><p>${noServersText}</p>`;
            serverListElement.innerHTML = `<div class="no-servers">${noServersText}</div>`;
            return;
        }

        this.saveToCache(servers);
        this.displayServers(servers);
    }

    displayServers(servers) {
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');

        const totalText = this.getCurrentStatsText('total');
        const statsTitle = this.getCurrentStatsText('title');

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

        serverStatsElement.innerHTML = `
            <h3>${statsTitle}</h3>
            <p>${totalText}: <b>${filteredServers.length}</b></p>
        `;

        let html = '';
        filteredServers.forEach((server, index) => {
            console.log('服务器', index + 1, ':', server.name, '-', server.ip);
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

    fetchAndUpdateCache(apiUrl) {
        try {
            const data = this.fetchWithRetry(apiUrl);
            if (data) {
                let servers = [];
                if (data && data.data && data.data.list && Array.isArray(data.data.list)) {
                    servers = data.data.list;
                } else if (data && data.list && Array.isArray(data.list)) {
                    servers = data.list;
                } else if (data && data.servers && Array.isArray(data.servers)) {
                    servers = data.servers;
                } else if (Array.isArray(data)) {
                    servers = data;
                }

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

    getCacheKey() {
        return `sc_server_list_${this.serverVersion}`;
    }

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

    fetchWithRetry(apiUrl) {
        const proxies = this.useCorsProxy ? this.corsProxies : [];
        const allAttempts = ['', ...proxies];
        const totalAttempts = allAttempts.length;

        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            try {
                const proxy = allAttempts[attempt];
                const fullUrl = proxy ? proxy + encodeURIComponent(apiUrl) : apiUrl;

                console.log(`尝试连接 (${attempt + 1}/${totalAttempts})...`);
                console.log('请求地址:', fullUrl);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('请求超时');
                    controller.abort();
                }, this.timeout);

                const response = fetch(fullUrl, {
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

                return response.json();

            } catch (error) {
                console.log(`尝试 ${attempt + 1} 失败:`, error.message);
                if (attempt < totalAttempts - 1) {
                    console.log('尝试下一个代理...');
                }
            }
        }

        console.error('所有尝试都失败了');
        return null;
    }

    toggleProxy() {
        this.useCorsProxy = !this.useCorsProxy;
        const proxyBtn = document.getElementById('proxyBtn');
        const proxyText = this.getCurrentServerText('proxyMode');
        const directText = this.getCurrentServerText('directMode');

        if (this.useCorsProxy) {
            proxyBtn.textContent = '🌐 ' + (proxyText || '代理模式');
            proxyBtn.classList.add('proxy-active');
            console.log('切换到代理模式');
        } else {
            proxyBtn.textContent = '🔗 ' + (directText || '直连模式');
            proxyBtn.classList.remove('proxy-active');
            console.log('切换到直连模式');
        }

        this.loadServerList(this.currentFilter, true);
    }

    onVersionChange(selectElement) {
        const newVersion = selectElement.value;
        console.log('版本变更为:', newVersion);

        const oldVersion = this.serverVersion;
        this.serverVersion = newVersion;

        if (oldVersion !== newVersion) {
            const serverListElement = document.getElementById('serverList');
            const serverStatsElement = document.querySelector('.server-stats');
            const loadingText = this.getCurrentServerText('loading');
            const statsTitle = this.getCurrentServerText('title');

            serverListElement.innerHTML = `<div class="loading">正在加载 ${newVersion} 版本服务器...</div>`;
            serverStatsElement.innerHTML = `<h3>${statsTitle}</h3><p>${loadingText}</p>`;

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

    initCopyHandlers() {
        const copiedText = this.getCurrentServerText('copied');

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

    initIpSelectors() {
        document.querySelectorAll('.ip-selector').forEach(selector => {
            selector.addEventListener('change', () => {
                const serverId = selector.getAttribute('data-server-id');
                this.detectLatencyForServer(serverId);
            });
        });
    }

    initFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadServerList(btn.getAttribute('data-filter'));
            });
        });
    }

    detectLatency() {
        const latencyElements = document.querySelectorAll('.latency-value');
        latencyElements.forEach((element) => {
            const serverId = element.getAttribute('data-server-id');
            if (serverId) {
                this.detectLatencyForServer(serverId);
            }
        });
    }

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
        const fullPingUrl = this.useCorsProxy ? (this.corsProxies[0] || '') + encodeURIComponent(pingUrl) : pingUrl;

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

        fetch(fullPingUrl, {
            method: 'GET',
            mode: 'cors'
        })
        .then(response => {
            if (!response.ok) throw new Error('Ping failed');
            return response.json();
        })
        .then(result => {
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
            }
        })
        .catch(() => {
            simpleLatencyCheck();
        });

        setTimeout(() => {
            if (latencyElement.textContent === this.getCurrentServerText('checking') + '...') {
                simpleLatencyCheck();
            }
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.onlineServerManager = new OnlineServerManager();
});
