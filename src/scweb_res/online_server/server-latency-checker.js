/**
 * 延迟检测：SC 服务器在线状态与延迟检测
 * 职责：遍历页面的延迟元素，通过 API 客户端分批检测，并更新状态指示灯
 * 只依赖 ServerApiClient（网络层）与翻译回调
 */
class ServerLatencyChecker {
    /**
     * @param {Object} [options] - 配置项
     * @param {ServerApiClient} [options.apiClient] - 网络层客户端
     * @param {Function} [options.getServerText] - 翻译函数 (key) => string
     * @param {number} [options.batchSize] - 每批检测数量
     * @param {number} [options.batchInterval] - 批次间隔（毫秒）
     * @param {string} [options.pingUrl] - ping 接口地址
     */
    constructor({ apiClient, getServerText, batchSize = 3, batchInterval = 500, pingUrl = 'https://api.sckey.net/server/ping' } = {}) {
        this.apiClient = apiClient;
        this.getServerText = getServerText;
        this.batchSize = batchSize;
        this.batchInterval = batchInterval;
        this.pingUrl = pingUrl;
    }

    /**
     * 检测所有服务器的延迟（分批执行，避免并发过载）
     */
    detectLatency() {
        const latencyElements = document.querySelectorAll('.latency-value');
        const servers = [];

        latencyElements.forEach((element) => {
            const serverId = element.getAttribute('data-server-id');
            if (serverId) {
                servers.push(serverId);
            }
        });

        let index = 0;

        const processBatch = () => {
            if (index >= servers.length) return;
            const batch = servers.slice(index, index + this.batchSize);
            index += this.batchSize;
            batch.forEach((serverId) => {
                this.detectLatencyForServer(serverId);
            });
            if (index < servers.length) {
                setTimeout(processBatch, this.batchInterval);
            }
        };

        processBatch();
    }

    /**
     * 检测单个服务器的延迟，并更新状态指示灯
     * @param {string} serverId - 服务器 ID
     */
    async detectLatencyForServer(serverId) {
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
        const pingUrl = `${this.pingUrl}?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`;
        const serverItem = latencyElement.closest('.server-item');
        const statusElement = serverItem ? serverItem.querySelector('.server-status') : null;

        const setOnline = (latency) => {
            latencyElement.textContent = latency < 1 ? '<1 ms' : latency + ' ms';
            if (statusElement) {
                statusElement.classList.remove('status-checking', 'status-offline');
                statusElement.classList.add('status-online');
                statusElement.title = `在线，延迟 ${latency}ms`;
            }
        };

        const setOffline = (reason) => {
            latencyElement.textContent = reason || this.getServerText('offline');
            if (statusElement) {
                statusElement.classList.remove('status-checking', 'status-online');
                statusElement.classList.add('status-offline');
                statusElement.title = reason || this.getServerText('offline');
            }
        };

        const setChecking = () => {
            latencyElement.textContent = this.getServerText('checking') + '...';
            if (statusElement) {
                statusElement.classList.remove('status-online', 'status-offline');
                statusElement.classList.add('status-checking');
                statusElement.title = this.getServerText('checking') + '...';
            }
        };

        setChecking();

        try {
            const result = await this.apiClient.fetchWithRetry(pingUrl);

            if (result && result.online === false) {
                setOffline(this.getServerText('offline'));
                return;
            }

            if (result && result.latency !== undefined) {
                setOnline(result.latency);
            } else {
                setOnline(Math.round(performance.now()));
            }

        } catch (error) {
            console.warn(`服务器 ${host}:${port} 检测失败:`, error.message);
            setOffline(this.getServerText('unreachable'));
        }
    }
}

window.ServerLatencyChecker = ServerLatencyChecker;
