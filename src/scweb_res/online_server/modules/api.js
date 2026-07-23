const ServerApi = {
    config: null,
    
    init: function(config) {
        this.config = config;
    },

    getCacheKey: function(version) {
        return 'sc_server_list_' + version;
    },

    getCachedData: function() {
        try {
            const cacheKey = this.getCacheKey(this.config.serverVersion);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const now = Date.now();
            
            if (data.timestamp && (now - data.timestamp) < this.config.cacheExpireMinutes * 60 * 1000) {
                console.log('使用缓存数据，缓存时间:', new Date(data.timestamp).toLocaleString());
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
            const cacheKey = this.getCacheKey(this.config.serverVersion);
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
        const proxies = this.config.useCorsProxy ? this.config.corsProxies : [];
        const allAttempts = [''].concat(proxies);
        const totalAttempts = allAttempts.length;
        
        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            try {
                const proxy = allAttempts[attempt];
                const fullUrl = proxy ? proxy + encodeURIComponent(apiUrl) : apiUrl;
                
                console.log('尝试连接 (' + (attempt + 1) + '/' + totalAttempts + ')...');
                console.log('请求地址:', fullUrl);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('请求超时');
                    controller.abort();
                }, this.config.timeout);
                
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
                    throw new Error('HTTP错误: ' + response.status);
                }
                
                return await response.json();
                
            } catch (error) {
                console.log('尝试 ' + (attempt + 1) + ' 失败:', error.message);
                if (attempt < totalAttempts - 1) {
                    console.log('尝试下一个代理...');
                }
            }
        }
        
        console.error('所有尝试都失败了');
        return null;
    },

    getApiUrl: function(version) {
        return this.config.apiUrl + '?version=' + encodeURIComponent(version);
    }
};
