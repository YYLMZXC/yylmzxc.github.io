/**
 * 网络层：SC 联机服务器 API 客户端
 * 职责：代理回退、超时重试、响应数据提取与 URL 参数解析
 * 不依赖 DOM 与业务逻辑，只负责网络通信
 */
class ServerApiClient {
    /**
     * @param {Object} [options] - 配置项
     * @param {string} [options.apiUrl] - API 基础地址
     * @param {number} [options.timeout] - 单次请求超时（毫秒）
     * @param {string[]} [options.corsProxies] - 公共 CORS 代理列表
     * @param {boolean} [options.useCorsProxy] - 是否启用公共 CORS 代理
     * @param {string} [options.fallbackVersion] - 无法解析版本参数时的默认版本
     */
    constructor({ apiUrl = '', timeout = 15000, corsProxies = [], useCorsProxy = false, fallbackVersion = '' } = {}) {
        this.apiUrl = apiUrl;
        this.timeout = timeout;
        this.corsProxies = corsProxies;
        this.useCorsProxy = useCorsProxy;
        this.fallbackVersion = fallbackVersion;
        this.selfHostedProxies = ServerApiClient.getSelfHostedProxies();
    }

    /**
     * 生成自建代理列表：当前域名优先，其余为固定备用域名
     * @returns {string[]} 自建代理 URL 列表
     */
    static getSelfHostedProxies() {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

        const remoteDomains = [
            'https://scnet.top',
            'https://schub.icu',
            'https://scwz.top'
        ];

        let selfProxies = [];

        if (isLocalhost) {
            const currentPort = window.location.port || '80';
            selfProxies.push(`http://${hostname}${currentPort ? ':' + currentPort : ''}/proxy.php`);
        } else {
            const protocol = window.location.protocol;
            const currentDomain = `${protocol}//${window.location.host}`;
            selfProxies.push(`${currentDomain}/proxy.php`);
        }

        remoteDomains.forEach(domain => {
            selfProxies.push(`${domain}/proxy.php`);
        });

        return selfProxies;
    }

    /**
     * 切换 CORS 代理模式
     * @returns {boolean} 切换后的状态
     */
    toggleUseCorsProxy() {
        this.useCorsProxy = !this.useCorsProxy;
        return this.useCorsProxy;
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
     * 带重试的 HTTP 请求
     * 优先使用自建代理，失败后回退到直连和公共 CORS 代理
     * 每个请求都有超时保护
     * @param {string} apiUrl - 请求地址
     * @returns {Promise<Object|string>} JSON 响应数据
     */
    async fetchWithRetry(apiUrl) {
        const attempts = [];

        this.selfHostedProxies.forEach(proxy => {
            attempts.push({ type: 'self', url: proxy, targetUrl: apiUrl });
        });

        attempts.push({ type: 'direct', url: apiUrl });

        if (this.useCorsProxy) {
            this.corsProxies.forEach(proxy => {
                attempts.push({ type: 'public', url: proxy, targetUrl: apiUrl });
            });
        }

        const totalAttempts = attempts.length;

        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            const { type, url, targetUrl } = attempts[attempt];

            let fullUrl;
            let logLabel;

            if (type === 'self') {
                if (targetUrl.includes('serverlist')) {
                    const versionParam = this.extractVersion(targetUrl);
                    fullUrl = `${url}?action=serverlist&version=${encodeURIComponent(versionParam)}`;
                } else if (targetUrl.includes('ping')) {
                    const params = this.extractPingParams(targetUrl);
                    fullUrl = `${url}?action=ping&host=${encodeURIComponent(params.host)}&port=${encodeURIComponent(params.port)}`;
                } else {
                    fullUrl = `${url}?url=${encodeURIComponent(targetUrl)}`;
                }
                logLabel = ' [自建代理]';
            } else if (type === 'direct') {
                fullUrl = url;
                logLabel = ' [直连]';
            } else {
                fullUrl = url + encodeURIComponent(targetUrl);
                logLabel = ' [公共代理]';
            }

            try {
                console.log(`尝试连接 (${attempt + 1}/${totalAttempts})${logLabel}...`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, this.timeout);

                const response = await fetch(fullUrl, {
                    method: 'GET',
                    mode: 'cors',
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }

                const text = await response.text();

                try {
                    const parsed = JSON.parse(text);

                    if (parsed.success === false && parsed.code !== undefined) {
                        console.warn(`代理返回错误:`, parsed.msg);
                        throw new Error(parsed.msg || '代理请求失败');
                    }

                    console.log(`✓ 成功 (${attempt + 1}/${totalAttempts})${logLabel}`);
                    return parsed;
                } catch (e) {
                    if (e.message && !e.message.includes('Unexpected token')) {
                        throw e;
                    }
                    return text;
                }

            } catch (error) {
                console.log(`尝试 ${attempt + 1} 失败:`, error.message);
                if (attempt < totalAttempts - 1) {
                    console.log('尝试下一个...');
                }
            }
        }

        console.error('所有尝试都失败了');
        throw new Error('所有代理均无法连接');
    }

    /**
     * 从 URL 中提取 version 参数值
     * @param {string} url - URL 字符串
     * @returns {string} 版本号，默认返回 fallbackVersion
     */
    extractVersion(url) {
        const match = url.match(/version=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : this.fallbackVersion;
    }

    /**
     * 从 URL 中提取 host 和 port 参数
     * @param {string} url - URL 字符串
     * @returns {Object} { host, port }
     */
    extractPingParams(url) {
        const hostMatch = url.match(/host=([^&]+)/);
        const portMatch = url.match(/port=([^&]+)/);
        return {
            host: hostMatch ? decodeURIComponent(hostMatch[1]) : '',
            port: portMatch ? decodeURIComponent(portMatch[1]) : ''
        };
    }
}

window.ServerApiClient = ServerApiClient;
