/**
 * 数据层：SC 服务器列表缓存
 * 职责：localStorage 读写与过期管理，缓存键按版本号隔离
 * 不依赖 DOM，只处理数据持久化
 */
class ServerCache {
    /**
     * @param {number} [expireMinutes] - 缓存有效期（分钟）
     */
    constructor(expireMinutes = 10) {
        this.expireMinutes = expireMinutes;
    }

    /**
     * 获取缓存键名（基于版本号）
     * @param {string} version - 服务器版本号
     * @returns {string} localStorage 缓存键
     */
    getCacheKey(version) {
        return `sc_server_list_${version}`;
    }

    /**
     * 从 localStorage 获取缓存的服务器数据
     * 检查缓存是否过期，过期则清除
     * @param {string} version - 服务器版本号
     * @returns {Array|null} 缓存的服务器数组或 null
     */
    getCachedData(version) {
        try {
            const cacheKey = this.getCacheKey(version);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            if (data.timestamp && (now - data.timestamp) < this.expireMinutes * 60 * 1000) {
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
     * @param {string} version - 服务器版本号
     * @param {Array} servers - 服务器数组
     */
    saveToCache(version, servers) {
        try {
            const cacheKey = this.getCacheKey(version);
            localStorage.setItem(cacheKey, JSON.stringify({
                servers: servers,
                timestamp: Date.now()
            }));
            console.log('数据已保存到缓存');
        } catch (e) {
            console.error('保存缓存失败:', e);
        }
    }
}

window.ServerCache = ServerCache;
