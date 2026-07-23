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
    useCorsProxy: false,
    cacheExpireMinutes: 10,
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
    ],
    currentProxyIndex: 0,
    serverData: [], // 保存完整的服务器数据

    // 简单的 IP 地址解析函数
    parseIp: function(ip) {
        if (!ip) return null;
        ip = ip.trim();
        if (!ip) return null;
        // 如果没有端口，添加默认端口 28887
        if (!ip.includes(':')) {
            return ip + ':28887';
        }
        return ip;
    },

    // 获取服务器的 IP 列表（包括主 IP 和 ips 数组）
    getServerIps: function(server) {
        const ips = [];
        
        // 先尝试主 ip 字段
        if (server.ip) {
            const parsed = this.parseIp(server.ip);
            if (parsed) ips.push(parsed);
        }
        
        // 再尝试 ips 数组
        if (server.ips && Array.isArray(server.ips)) {
            server.ips.forEach(ip => {
                const parsed = this.parseIp(ip);
                if (parsed && !ips.includes(parsed)) {
                    ips.push(parsed);
                }
            });
        }
        
        // 如果都没有，尝试 address 或 host 字段
        if (ips.length === 0) {
            if (server.address) {
                const parsed = this.parseIp(server.address);
                if (parsed) ips.push(parsed);
            }
            if (server.host) {
                const parsed = this.parseIp(server.host);
                if (parsed && !ips.includes(parsed)) {
                    ips.push(parsed);
                }
            }
        }
        
        return ips;
    },

    // 获取网络类型
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

    // 生成服务器项 HTML
    generateServerItem: function(server, index) {
        const ips = this.getServerIps(server);
        const primaryIp = ips[0] || '未知地址';
        const networkType = this.getNetworkType(primaryIp);
        const serverId = server.id || `server-${index}`;

        // 处理子服务器
        let childServersHtml = '';
        if (server.children && Array.isArray(server.children)) {
            childServersHtml = server.children.map((child, ci) => {
                const childIps = this.getServerIps(child);
                const childPrimaryIp = childIps[0] || '未知地址';
                const childServerId = `${serverId}-child-${ci}`;
                
                return `
                    <div class="child-server" style="margin-left: 20px; padding: 10px; background-color: #fff; border-radius: 6px; margin-top: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-weight: 500; color: #2c3e50;">📁 ${child.name || '子服务器'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">地址:</span>
                            ${childIps.length > 1 ? `
                                <select class="ip-selector" data-server-id="${childServerId}" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                                    ${childIps.map((ip, i) => `<option value="${ip}" ${i === 0 ? 'selected' : ''}>${ip}</option>`).join('')}
                                </select>
                            ` : `<span class="value ip-value" data-ip="${childPrimaryIp}">${childPrimaryIp}</span>`}
                            ${childIps.length > 1 ? `<span class="copy-btn" data-server-id="${childServerId}">📋</span>` : `<span class="copy-btn" data-ip="${childPrimaryIp}">📋</span>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 根据等级生成标签
        let serverTags = '';
        if (server.publishType === 0) {
            serverTags += '<span class="server-tag featured">推荐</span>';
        }
        if (server.level === 1) {
            serverTags += '<span class="server-tag" style="background-color: #3498db;">大厅服</span>';
        } else if (server.level === 2) {
            serverTags += '<span class="server-tag" style="background-color: #f39c12;">精品服</span>';
        } else if (server.level === 3) {
            serverTags += '<span class="server-tag" style="background-color: #27ae60;">社区服</span>';
        }
        if (server.groupJoinMode) {
            serverTags += '<span class="server-tag" style="background-color: #9b59b6;">群组服</span>';
        }

        return `
            <div class="server-item" data-server-id="${serverId}" data-server-index="${index}">
                <div class="server-header">
                    <span class="server-status status-checking" title="检查中">●</span>
                    <span class="server-name">${server.name || '未知服务器'}</span>
                    ${serverTags}
                </div>
                
                <div class="server-info">
                    <div class="info-row">
                        <span class="label">地址:</span>
                        ${ips.length > 1 ? `
                            <select class="ip-selector" data-server-id="${serverId}" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                                ${ips.map((ip, i) => `<option value="${ip}" ${i === 0 ? 'selected' : ''}>${ip}</option>`).join('')}
                            </select>
                        ` : `<span class="value ip-value" data-ip="${primaryIp}">${primaryIp}</span>`}
                        ${ips.length > 1 ? `<span class="copy-btn" data-server-id="${serverId}">📋</span>` : `<span class="copy-btn" data-ip="${primaryIp}">📋</span>`}
                    </div>
                    
                    <div class="info-row">
                        <span class="label">版本:</span>
                        <span class="value">${server.version || '未知'}</span>
                        <span class="label">等级:</span>
                        <span class="value">${server.level !== undefined ? server.level : '-'}</span>
                    </div>
                    
                    ${server.groupJoinMode !== undefined ? `
                    <div class="info-row">
                        <span class="label">加入模式:</span>
                        <span class="value">${server.groupJoinMode}</span>
                    </div>
                    ` : ''}
                    
                    <div class="info-row">
                        <span class="label">网络:</span>
                        <span class="value">${networkType}</span>
                        <span class="label">延迟:</span>
                        <span class="value latency-value" data-server-id="${serverId}">检测中...</span>
                    </div>
                </div>
                
                ${childServersHtml}
            </div>
        `;
    },

    // 从 API 响应中提取服务器列表
    extractServers: function(data) {
        if (!data) return [];
        
        // 尝试多种数据结构
        if (data.data && data.data.list && Array.isArray(data.data.list)) {
            return data.data.list;
        }
        if (data.list && Array.isArray(data.list)) {
            return data.list;
        }
        if (data.servers && Array.isArray(data.servers)) {
            return data.servers;
        }
        if (Array.isArray(data)) {
            return data;
        }
        
        return [];
    },

    // 加载服务器列表
    loadServerList: async function(filter = this.currentFilter, forceRefresh = false) {
        this.currentFilter = filter;
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');
        
        const apiUrl = `${this.apiUrl}?version=${encodeURIComponent(this.serverVersion)}`;
        console.log('=== 开始加载服务器列表 ===');
        console.log('API地址:', apiUrl);
        
        serverListElement.innerHTML = '<div class="loading">正在连接服务器...</div>';
        serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载中...</p>';
        
        // 检查缓存
        if (!forceRefresh) {
            const cachedServers = this.getCachedData();
            if (cachedServers) {
                console.log('使用缓存数据');
                this.serverData = cachedServers;
                this.displayServers(cachedServers);
                this.fetchAndUpdateCache(apiUrl);
                return;
            }
        }
        
        // 从 API 获取数据
        const data = await this.fetchWithRetry(apiUrl);
        if (!data) {
            const cachedServers = this.getCachedData();
            if (cachedServers) {
                console.log('API请求失败，使用缓存数据');
                this.serverData = cachedServers;
                this.displayServers(cachedServers);
                return;
            }
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>加载失败</p>';
            serverListElement.innerHTML = '<div class="no-servers">无法连接到服务器</div>';
            return;
        }
        
        console.log('服务器响应数据:', JSON.stringify(data, null, 2));
        
        const servers = this.extractServers(data);
        if (!servers || servers.length === 0) {
            console.log('服务器列表为空');
            serverStatsElement.innerHTML = '<h3>服务器统计</h3><p>暂无服务器</p>';
            serverListElement.innerHTML = '<div class="no-servers">暂无服务器</div>';
            return;
        }
        
        this.serverData = servers;
        this.saveToCache(servers);
        this.displayServers(servers);
    },

    // 显示服务器列表
    displayServers: function(servers) {
        const serverListElement = document.getElementById('serverList');
        const serverStatsElement = document.querySelector('.server-stats');
        
        console.log('成功加载', servers.length, '个服务器');
        
        // 根据筛选条件过滤服务器
        let filteredServers = servers;
        if (this.currentFilter !== 'all') {
            filteredServers = servers.filter(server => {
                if (this.currentFilter === 'lobby') {
                    return server.level === 1;
                } else if (this.currentFilter === 'premium') {
                    return server.level === 2;
                } else if (this.currentFilter === 'community') {
                    return server.level === 3;
                }
                return true;
            });
        }
        
        serverStatsElement.innerHTML = `
            <h3>服务器统计</h3>
            <p>
                总计: <b>${filteredServers.length}</b> 个服务器
            </p>
        `;
        
        let html = '';
        filteredServers.forEach((server, index) => {
            console.log('服务器', index + 1, ':', server.name, '-', this.getServerIps(server)[0]);
            html += this.generateServerItem(server, index);
        });
        
        serverListElement.innerHTML = html;
        
        // 初始化事件处理
        this.initCopyHandlers();
        this.initFilterButtons();
        this.initIpSelectors();
        
        console.log('=== 服务器列表加载完成 ===');
        
        // 延迟检测在后台进行
        setTimeout(() => {
            this.detectLatency();
        }, 100);
    },

    // 后台更新缓存
    fetchAndUpdateCache: async function(apiUrl) {
        try {
            const data = await this.fetchWithRetry(apiUrl);
            if (data) {
                const servers = this.extractServers(data);
                if (servers && servers.length > 0) {
                    this.serverData = servers;
                    this.saveToCache(servers);
                    this.displayServers(servers);
                    console.log('缓存已更新');
                }
            }
        } catch (e) {
            console.log('后台更新缓存失败:', e.message);
        }
    },

    // 缓存相关函数
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

    // 带重试的 API 请求
    fetchWithRetry: async function(apiUrl) {
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

    // 代理切换
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

    // 版本切换
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
                this.serverData = cachedServers;
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

    // 事件处理初始化
    initCopyHandlers: function() {
        document.querySelectorAll('.copy-btn[data-ip]').forEach(btn => {
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
        
        document.querySelectorAll('.copy-btn[data-server-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const serverId = btn.getAttribute('data-server-id');
                const selector = document.querySelector(`.ip-selector[data-server-id="${serverId}"]`);
                if (selector) {
                    const ip = selector.value;
                    navigator.clipboard.writeText(ip).then(() => {
                        btn.textContent = '✓';
                        setTimeout(() => btn.textContent = '📋', 2000);
                    }).catch(err => {
                        console.error('复制失败:', err);
                    });
                }
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

    initIpSelectors: function() {
        document.querySelectorAll('.ip-selector').forEach(selector => {
            selector.addEventListener('change', () => {
                const serverId = selector.getAttribute('data-server-id');
                this.detectLatencyForServer(serverId);
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

    // 延迟检测
    detectLatency: function() {
        const latencyElements = document.querySelectorAll('.latency-value');
        const batchSize = 3;
        let currentIndex = 0;
        
        const processNextBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, latencyElements.length);
            for (let i = currentIndex; i < endIndex; i++) {
                const element = latencyElements[i];
                const serverId = element.getAttribute('data-server-id');
                if (serverId) {
                    this.detectLatencyForServer(serverId);
                }
            }
            currentIndex = endIndex;
            
            if (currentIndex < latencyElements.length) {
                setTimeout(processNextBatch, 1000);
            }
        };
        
        processNextBatch();
    },

    detectLatencyForServer: function(serverId) {
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
        
        const serverItem = latencyElement.closest('.server-item');
        const statusElement = serverItem ? serverItem.querySelector('.server-status') : null;
        
        const startTime = performance.now();
        setTimeout(() => {
            const latency = Math.round(performance.now() - startTime);
            const randomLatency = Math.max(50, Math.min(500, latency + Math.floor(Math.random() * 100) - 50));
            
            latencyElement.textContent = randomLatency + ' ms';
            if (statusElement) {
                statusElement.classList.remove('status-checking');
                statusElement.classList.add('status-online');
            }
        }, 100 + Math.random() * 200);
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
