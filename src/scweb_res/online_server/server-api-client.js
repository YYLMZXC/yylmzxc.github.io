/**
 * 网络层：SC 联机服务器 API 客户端
 * 职责：代理回退、超时重试、响应数据提取与 URL 参数解析
 * 不依赖 DOM 与业务逻辑，只负责网络通信
 *
 * 内部分工（各方法只做一件事，靠返回值交接，不共享中间状态）：
 * - getRequestKind   分类：判定请求种类，字符串嗅探集中于此一处
 * - buildAttempts    策略：决定尝试哪些路径、什么顺序（不含网络细节）
 * - buildRequestUrl  映射：把候选路径翻译成实际请求 URL
 * - fetchOnce        机制：单次超时受控的请求，只回传校验过的 JSON
 * - fetchWithRetry   编排：按序尝试候选，返回第一个成功的结果
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
        // Node 后端同源接口（线上由 Apache 反代 /api，本机跑 node server 时直连本进程）。
        // 上游 api.sckey.net 只对 sckey.net 自有域名放开 CORS，第三方站点与本机
        // 都读不到直连响应，因此同源代理是最优先、也是最稳的一条路。
        this.nodeApiUrl = ServerApiClient.getNodeApiUrl();
    }

    /**
     * Node 后端同源接口地址：跟随页面所在目录（兼容子目录部署）
     * @returns {string|null} 接口地址；取不到时返回 null（走其余回退链）
     */
    static getNodeApiUrl() {
        if (!window.SCUtils || typeof window.SCUtils.apiBase !== 'function') {
            return null;
        }
        return window.SCUtils.apiBase() + '/api/serverlist';
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
     * 带重试的 HTTP 请求（编排层）
     * 候选路径由 buildAttempts 决定，单次请求交给 fetchOnce，这里只负责按序推进
     * @param {string} apiUrl - 请求地址
     * @returns {Promise<Object>} JSON 响应数据
     */
    async fetchWithRetry(apiUrl) {
        const attempts = this.buildAttempts(apiUrl);
        const totalAttempts = attempts.length;

        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            const current = attempts[attempt];
            try {
                console.log(`尝试连接 (${attempt + 1}/${totalAttempts})${current.label}...`);
                const parsed = await this.fetchOnce(this.buildRequestUrl(current));
                console.log(`✓ 成功 (${attempt + 1}/${totalAttempts})${current.label}`);
                return parsed;
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
     * 判定请求种类：字符串嗅探只允许出现在这里
     * @param {string} targetUrl - 目标请求地址
     * @returns {string} 'serverlist' | 'ping' | 'generic'
     */
    static getRequestKind(targetUrl) {
        if (targetUrl.includes('serverlist')) return 'serverlist';
        if (targetUrl.includes('ping')) return 'ping';
        return 'generic';
    }

    /**
     * 构建候选路径列表（策略层，纯函数式，不发任何请求）
     * 尝试顺序：Node 同源接口 → 自建代理（proxy.php）→ 直连 → 公共 CORS 代理
     * @param {string} apiUrl - 目标请求地址
     * @returns {Array<{type: string, kind: string, url: string, targetUrl: string, label: string}>}
     */
    buildAttempts(apiUrl) {
        const kind = ServerApiClient.getRequestKind(apiUrl);
        const attempts = [];

        // 1) Node 后端同源接口：不受上游 CORS 白名单限制，本机开发与线上反代都能走
        //    （目前后端只实现了服务器列表转发，其余请求跳过这一候选）
        if (this.nodeApiUrl && kind === 'serverlist') {
            attempts.push({ type: 'node', kind, url: this.nodeApiUrl, targetUrl: apiUrl, label: ' [同源接口]' });
        }

        // 2) 自建代理（proxy.php）：纯 PHP 托管（Apache 等）时的同源路径，外加备用域名
        this.selfHostedProxies.forEach(proxy => {
            attempts.push({ type: 'self', kind, url: proxy, targetUrl: apiUrl, label: ' [自建代理]' });
        });

        // 3) 直连：上游只对白名单域名放开 CORS，多数站点读不到，作为兜底保留
        attempts.push({ type: 'direct', kind, url: apiUrl, targetUrl: apiUrl, label: ' [直连]' });

        if (this.useCorsProxy) {
            this.corsProxies.forEach(proxy => {
                attempts.push({ type: 'public', kind, url: proxy, targetUrl: apiUrl, label: ' [公共代理]' });
            });
        }

        return attempts;
    }

    /**
     * 把候选路径翻译成实际请求 URL（映射层，纯函数式）
     * @param {Object} attempt - buildAttempts 产出的候选描述
     * @returns {string} 实际请求 URL
     */
    buildRequestUrl({ type, kind, url, targetUrl }) {
        if (type === 'node') {
            return `${url}?version=${encodeURIComponent(this.extractVersion(targetUrl))}`;
        }

        if (type === 'self') {
            if (kind === 'serverlist') {
                return `${url}?action=serverlist&version=${encodeURIComponent(this.extractVersion(targetUrl))}`;
            }
            if (kind === 'ping') {
                const params = this.extractPingParams(targetUrl);
                return `${url}?action=ping&host=${encodeURIComponent(params.host)}&port=${encodeURIComponent(params.port)}`;
            }
            return `${url}?url=${encodeURIComponent(targetUrl)}`;
        }

        if (type === 'direct') {
            return url;
        }

        return url + encodeURIComponent(targetUrl);
    }

    /**
     * 单次请求（机制层）：超时受控，只回传校验过的 JSON
     * 任何失败（HTTP 非 200 / 非 JSON / 代理显式报错）都抛异常，由编排层决定去留
     * @param {string} fullUrl - 实际请求 URL
     * @returns {Promise<Object>} 校验过的 JSON 响应
     */
    async fetchOnce(fullUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.timeout);

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            const text = await response.text();

            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                // 非 JSON 的 200 响应（HTML 错误页、PHP 未被解释时回传的源码等）
                // 一律视为本次尝试失败，继续尝试下一个候选；
                // 绝不能把原文当成功结果带出去，否则会被解析成空列表。
                throw new Error('响应不是有效 JSON');
            }

            if (parsed.success === false && parsed.code !== undefined) {
                console.warn(`代理返回错误:`, parsed.msg);
                throw new Error(parsed.msg || '代理请求失败');
            }

            return parsed;
        } finally {
            clearTimeout(timeoutId);
        }
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
