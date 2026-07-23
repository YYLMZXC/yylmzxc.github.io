const ServerList = {
    apiUrl: 'https://api.sckey.net/server/serverlist',
    serverVersion: 'x26.07.20',
    versions: [
        { value: 'x26.07.20', label: 'x26.07.20' },
        { value: 'x26.06.19', label: 'x26.06.19' },
        { value: 'x26.05.23', label: 'x26.05.23' }
    ],
    timeout: 15000,
    currentFilter: 'all',
    useCorsProxy: true,
    cacheExpireMinutes: 10,
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
    ],
    currentProxyIndex: 0,
    
    getNetworkType: function(ip) {
        if (!ip) return '其他';
        const ipv6Pattern = /^\[?[0-9a-fA-F:]+\]?:?\d*$/;
        if (ipv6Pattern.test(ip)) return 'IPv6';
        const ipv4Pattern = /^\d+\.\d+\.\d+\.\d+(:\d+)?$/;
        if (ipv4Pattern.test(ip)) {
            const ipPart = ip.split(':')[0];
            if (ipPart.startsWith('192.168.') || ipPart.startsWith('10.') || 
                ipPart.startsWith('172.16.') || ipPart.startsWith('127.')) {
                return '局域网';
            }
            return 'IPv4';
        }
        return '其他';
    },
    
    generateServerItem: function(server) {
        const networkType = this.getNetworkType(server.ip);
        const hasPort = server.ip.includes(':');
        const displayIp = hasPort ? server.ip : server.ip + ':28887';
        
        return `
            <div class="server-item">
                <div class="server-header">
                    <span class="server-status status-checking" title="检查中">●</span>
                    <span class="server-name">${server.name || '未知服务器'}</span>
                    ${server.publishType === 0 ? '<span class="server-tag featured">推荐</span>' : ''}
                </div>
                
                <div class="server-info">
                    <div class="info-row">
                        <span class="label">地址:</span>
                        <span class="value ip-value" data-ip="${displayIp}">${displayIp}</span>
                        <span class="copy-btn" data-ip="${displayIp}">📋</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="label">版本:</span>
                        <span class="value">${server.version || '未知'}</span>
                        <span class="label">延迟:</span>
                        <span class="value latency-value" data-ip="${displayIp}">检测中...</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="label">等级:</span>
                        <span class="value">${server.level || 0}</span>
                        <span class="label">网络:</span>
                        <span class="value">${networkType}</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    loadServerList: async function(filter = this.currentFilter, forceRefresh = false) {
        this.currentFilter = filter;
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');
        
        const apiUrl = `${this.apiUrl}?version=${encodeURIComponent(this.serverVersion)}`;
        console.log('=== 开始加载服务器列表 ===');
        console.log('API地址:', apiUrl);
        
        serverListElement.innerHTML = '<div class="loading">正在连接服务器...</div>';
        serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载中...</p>';
        
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
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载失败</p>';
            serverListElement.innerHTML = '<div class="no-servers">无法连接到服务器</div>';
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
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>暂无服务器</p>';
            serverListElement.innerHTML = '<div class="no-servers">暂无服务器</div>';
            return;
        }
        
        this.saveToCache(servers);
        this.displayServers(servers);
    },
    
    displayServers: function(servers) {
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');
        
        console.log('成功加载', servers.length, '个服务器');
        
        serverStatsElement.innerHTML = `
            <h3>服务器统计</h3>
            <p>
                总计: <b>${servers.length}</b> 个服务器
            </p>
        `;
        
        let html = '';
        servers.forEach((server, index) => {
            console.log('服务器', index + 1, ':', server.name, '-', server.ip);
            html += this.generateServerItem(server);
        });
        
        serverListElement.innerHTML = html;
        this.initCopyHandlers();
        this.initFilterButtons();
        
        setTimeout(() => {
            this.detectLatency();
        }, 500);
        
        console.log('=== 服务器列表加载完成 ===');
    },
    
    fetchAndUpdateCache: async function(apiUrl) {
        try {
            const data = await this.fetchWithRetry(apiUrl);
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
    },
    
    getCacheKey: function() {
        return `sc_server_list_${this.serverVersion}`;
    },
    
    getCachedData: function() {
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
    },
    
    saveToCache: function(servers) {
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
    },
    
    fetchWithRetry: async function(apiUrl) {
        const proxies = this.useCorsProxy ? this.corsProxies : [''];
        const totalAttempts = proxies.length + 1;
        
        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            try {
                const proxy = attempt < proxies.length ? proxies[attempt] : '';
                const fullUrl = proxy ? proxy + encodeURIComponent(apiUrl) : apiUrl;
                
                console.log(`尝试连接 (${attempt + 1}/${totalAttempts})...`);
                console.log('请求地址:', fullUrl);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('请求超时');
                    controller.abort();
                }, this.timeout);
                
                const response = await fetch(fullUrl, {
                    method: 'GET',
                    mode: 'cors',
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
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
                    console.log('尝试下一个代理...');
                }
            }
        }
        
        console.error('所有尝试都失败了');
        return null;
    },
    
    toggleProxy: function() {
        this.useCorsProxy = !this.useCorsProxy;
        const proxyBtn = document.getElementById('proxyBtn');
        
        if (this.useCorsProxy) {
            proxyBtn.textContent = '🌐 代理模式';
            proxyBtn.classList.add('proxy-active');
            console.log('切换到代理模式');
        } else {
            proxyBtn.textContent = '🔗 直连模式';
            proxyBtn.classList.remove('proxy-active');
            console.log('切换到直连模式');
        }
        
        this.loadServerList(this.currentFilter, true);
    },
    
    onVersionChange: function(selectElement) {
        const newVersion = selectElement.value;
        console.log('版本变更为:', newVersion);
        
        const oldVersion = this.serverVersion;
        this.serverVersion = newVersion;
        
        if (oldVersion !== newVersion) {
            const serverListElement = document.getElementById('serverList');
            const serverStatsElement = document.querySelector('.server-stats');
            
            serverListElement.innerHTML = '<div class="loading">正在加载 ' + newVersion + ' 版本服务器...</div>';
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载中...</p>';
            
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
    },
    
    initCopyHandlers: function() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ip = btn.getAttribute('data-ip');
                navigator.clipboard.writeText(ip).then(() => {
                    btn.textContent = '✓';
                    setTimeout(() => btn.textContent = '📋', 2000);
                }).catch(err => {
                    console.error('复制失败:', err);
                });
            });
        });
        
        document.querySelectorAll('.ip-value').forEach(element => {
            element.addEventListener('click', () => {
                const ip = element.getAttribute('data-ip');
                navigator.clipboard.writeText(ip).then(() => {
                    element.style.color = '#27ae60';
                    setTimeout(() => element.style.color = '', 2000);
                });
            });
        });
    },
    
    initFilterButtons: function() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadServerList(btn.getAttribute('data-filter'));
            });
        });
    },
    
    detectLatency: function() {
        const latencyElements = document.querySelectorAll('.latency-value');
        latencyElements.forEach((element, index) => {
            setTimeout(() => {
                const ip = element.getAttribute('data-ip');
                if (!ip) return;
                
                const host = ip.split(':')[0].replace(/\[|\]/g, '');
                const port = ip.split(':')[1] || '28887';
                
                const pingUrl = `https://api.sckey.net/server/ping?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`;
                const fullPingUrl = this.useCorsProxy ? this.corsProxies[this.currentProxyIndex] + encodeURIComponent(pingUrl) : pingUrl;
                
                const startTime = performance.now();
                
                fetch(fullPingUrl, {
                    method: 'GET',
                    mode: 'cors'
                })
                .then(response => response.json())
                .then(result => {
                    const latency = result && result.success && result.latency !== undefined 
                        ? result.latency 
                        : Math.round(performance.now() - startTime);
                    
                    if (latency >= 0) {
                        element.textContent = latency < 1 ? '<1 ms' : latency + ' ms';
                        const statusElement = element.closest('.server-item').querySelector('.server-status');
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
                    const latency = Math.round(performance.now() - startTime);
                    if (latency < 1000) {
                        element.textContent = latency + ' ms';
                        const statusElement = element.closest('.server-item').querySelector('.server-status');
                        if (statusElement) {
                            statusElement.classList.remove('status-checking');
                            statusElement.classList.add('status-online');
                        }
                    } else {
                        element.textContent = '检测中...';
                    }
                });
            }, index * 500);
        });
    },

    initVersionSelector: function() {
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
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 页面加载完成，开始初始化 ===');
    ServerList.initVersionSelector();
    ServerList.loadServerList();
    ServerList.initFilterButtons();
    
    setInterval(() => {
        ServerList.detectLatency();
    }, 30000);
});