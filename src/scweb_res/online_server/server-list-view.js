/**
 * 视图层：SC 服务器列表渲染与交互
 * 职责：服务器列表 HTML 生成、统计信息展示、复制 / IP 切换 / 筛选等交互事件
 * 通过回调注入翻译与业务行为（onFilterChange / onIpChange / onRendered），
 * 不直接依赖网络、缓存或延迟检测的实现
 */
class ServerListView {
    /**
     * @param {Object} [options] - 配置项
     * @param {Function} [options.getServerText] - 服务器文本翻译函数 (key) => string
     * @param {Function} [options.getStatsText] - 统计文本翻译函数 (key) => string
     * @param {Function} [options.getTranslations] - 翻译对象获取函数 (lang) => Object
     * @param {Function} [options.onFilterChange] - 筛选按钮点击回调 (filter) => void
     * @param {Function} [options.onIpChange] - IP 切换回调 (serverId) => void
     * @param {Function} [options.onRendered] - 列表渲染完成回调 () => void
     */
    constructor({ getServerText, getStatsText, getTranslations, onFilterChange, onIpChange, onRendered } = {}) {
        this.getServerText = getServerText;
        this.getStatsText = getStatsText;
        this.getTranslations = getTranslations;
        this.onFilterChange = onFilterChange;
        this.onIpChange = onIpChange;
        this.onRendered = onRendered;

        this.currentStatus = 'loading';
        this.lastFilteredCount = null;
    }

    /**
     * 获取服务器列表容器元素
     * @returns {HTMLElement|null}
     */
    getListElement() {
        return document.getElementById('serverList');
    }

    /**
     * 获取统计信息区域元素
     * @returns {HTMLElement|null}
     */
    getStatsElement() {
        return document.querySelector('.server-stats');
    }

    /**
     * 设置当前状态（loading/connecting/ready/loadFailed）
     * @param {string} status
     */
    setStatus(status) {
        this.currentStatus = status;
    }

    /**
     * 显示"正在连接"状态
     */
    showConnecting() {
        const listEl = this.getListElement();
        const statsEl = this.getStatsElement();
        if (listEl) listEl.innerHTML = `<div class="loading">${this.getServerText('connecting')}</div>`;
        if (statsEl) statsEl.innerHTML = `<h3>${this.getStatsText('title')}</h3><p>${this.getServerText('loading')}</p>`;
        this.currentStatus = 'connecting';
    }

    /**
     * 显示"加载失败"状态
     */
    showLoadFailed() {
        const listEl = this.getListElement();
        const statsEl = this.getStatsElement();
        if (statsEl) statsEl.innerHTML = `<h3>${this.getStatsText('title')}</h3><p>${this.getServerText('loadFailed')}</p>`;
        if (listEl) listEl.innerHTML = `<div class="no-servers">${this.getServerText('loadFailedCannotConnect')}</div>`;
        this.currentStatus = 'loadFailed';
    }

    /**
     * 显示"暂无服务器"状态
     */
    showNoServers() {
        const listEl = this.getListElement();
        const statsEl = this.getStatsElement();
        if (statsEl) statsEl.innerHTML = `<h3>${this.getStatsText('title')}</h3><p>${this.getServerText('noServers')}</p>`;
        if (listEl) listEl.innerHTML = `<div class="no-servers">${this.getServerText('noServers')}</div>`;
        this.currentStatus = 'loadFailed';
    }

    /**
     * 渲染服务器列表（过滤 + 生成 HTML + 绑定交互事件）
     * @param {Array} servers - 服务器数据数组
     * @param {string} filter - 筛选条件 (all/lobby/premium/community)
     */
    render(servers, filter) {
        const serverListElement = this.getListElement();
        if (!serverListElement) return;

        console.log('成功加载', servers.length, '个服务器');

        let filteredServers = servers;
        if (filter && filter !== 'all') {
            filteredServers = servers.filter(server => {
                if (filter === 'lobby') return server.level === 1;
                if (filter === 'premium') return server.level === 2;
                if (filter === 'community') return server.level === 3;
                return true;
            });
        }

        this.lastFilteredCount = filteredServers.length;
        this.currentStatus = 'ready';

        this.updateStatsDisplay();

        let html = '';
        filteredServers.forEach((server, index) => {
            html += this.generateServerItem(server, index);
        });

        serverListElement.innerHTML = html;

        this.initCopyHandlers();
        this.initFilterButtons();
        this.initIpSelectors();

        console.log('=== 服务器列表加载完成 ===');

        if (this.onRendered) {
            this.onRendered();
        }
    }

    /**
     * 生成单个服务器列表项的 HTML 代码
     * @param {Object} server - 服务器数据对象
     * @param {number} index - 服务器索引
     * @returns {string} HTML 字符串
     */
    generateServerItem(server, index) {
        const networkType = window.SCUtils.getNetworkType(server.ip);
        const hasPort = server.ip.includes(':');
        const displayIp = hasPort ? server.ip : server.ip + ':28887';
        const serverId = server.id || `server-${index}`;

        // 构建 IP 地址列表（支持多个 IP）
        let ipList = [];
        if (server.ips && Array.isArray(server.ips) && server.ips.length > 0) {
            ipList = server.ips.map(ip => ip.includes(':') ? ip : ip + ':28887');
        } else {
            ipList = [displayIp];
        }

        // 构建子服务器 HTML（如服务器包含子服务器列表）
        let childServersHtml = '';
        if (server.children && Array.isArray(server.children) && server.children.length > 0) {
            const childLabel = this.getServerText('childServer');
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
                            <span class="label">${this.getServerText('address')}:</span>
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

        // 构建服务器标签（推荐、大厅、高级、社区、群组等）
        let serverTags = '';
        if (server.publishType === 0) {
            serverTags += `<span class="server-tag featured">${this.getServerText('recommended')}</span>`;
        }
        if (server.level === 1) {
            serverTags += `<span class="server-tag server-tag-lobby">${this.getServerText('lobby')}</span>`;
        } else if (server.level === 2) {
            serverTags += `<span class="server-tag server-tag-premium">${this.getServerText('premium')}</span>`;
        } else if (server.level === 3) {
            serverTags += `<span class="server-tag server-tag-community">${this.getServerText('community')}</span>`;
        }
        if (server.groupJoinMode) {
            serverTags += `<span class="server-tag server-tag-group">${this.getServerText('groupServer')}</span>`;
        }

        return `
            <div class="server-item" data-server-id="${serverId}" data-server-index="${index}">
                <div class="server-header">
                    <span class="server-status status-checking" title="${this.getServerText('checking')}">●</span>
                    <span class="server-name">${server.name || '未知服务器'}</span>
                    ${serverTags}
                </div>

                <div class="server-info">
                    <div class="info-row">
                        <span class="label">${this.getServerText('address')}:</span>
                        ${ipList.length > 1 ? `
                            <select class="ip-selector" data-server-id="${serverId}">
                                ${ipList.map((ip, i) => `<option value="${ip}" ${i === 0 ? 'selected' : ''}>${ip}</option>`).join('')}
                            </select>
                        ` : `<span class="value ip-value" data-ip="${displayIp}">${displayIp}</span>`}
                        ${ipList.length > 1 ? `<span class="copy-btn" data-server-id="${serverId}">📋</span>` : `<span class="copy-btn" data-ip="${displayIp}">📋</span>`}
                    </div>

                    <div class="info-row">
                        <span class="label">${this.getServerText('version')}:</span>
                        <span class="value">${server.version || '未知'}</span>
                        <span class="label">${this.getServerText('level')}:</span>
                        <span class="value">${server.level !== undefined ? server.level : '-'}</span>
                    </div>

                    ${server.groupJoinMode !== undefined ? `
                    <div class="info-row">
                        <span class="label">${this.getServerText('joinMode')}:</span>
                        <span class="value">${server.groupJoinMode}</span>
                    </div>
                    ` : ''}

                    <div class="info-row">
                        <span class="label">${this.getServerText('network')}:</span>
                        <span class="value">${networkType}</span>
                        <span class="label">${this.getServerText('latency')}:</span>
                        <span class="value latency-value" data-server-id="${serverId}">${this.getServerText('checking')}...</span>
                    </div>
                </div>

                ${childServersHtml}
            </div>
        `;
    }

    /**
     * 更新统计信息显示（服务器数量、加载状态等）
     */
    updateStatsDisplay() {
        const serverStatsElement = this.getStatsElement();
        if (!serverStatsElement) return;

        const totalText = this.getStatsText('total');
        const statsTitle = this.getStatsText('title');

        let content = `<h3>${statsTitle}</h3>`;

        switch (this.currentStatus) {
            case 'connecting':
                content += `<p>${this.getServerText('connecting')}</p>`;
                break;
            case 'loading':
                content += `<p>${this.getServerText('loading')}</p>`;
                break;
            case 'loadFailed':
                content += `<p>${this.getServerText('loadFailed')}</p>`;
                break;
            case 'ready':
                const count = this.lastFilteredCount !== null ? this.lastFilteredCount : 0;
                content += `<p>${totalText}: <b>${count}</b></p>`;
                break;
            default:
                content += `<p>${this.getServerText('loading')}</p>`;
        }

        serverStatsElement.innerHTML = content;
    }

    /**
     * 更新页面上与服务器相关的静态文本（加载提示、无服务器、模式切换按钮等）
     * @param {string} lang - 语言代码
     * @param {boolean} useCorsProxy - 当前是否为代理模式
     */
    updateServerTexts(lang, useCorsProxy) {
        const translations = this.getTranslations(lang);
        if (!translations) return;

        const loadingEl = document.querySelector('.loading');
        if (loadingEl && translations.server && translations.server.loading) {
            loadingEl.textContent = translations.server.loading;
        }

        const noServersEl = document.querySelector('.no-servers');
        if (noServersEl && translations.server && translations.server.noServers) {
            noServersEl.textContent = translations.server.noServers;
        }

        const proxyBtn = document.getElementById('proxyBtn');
        if (proxyBtn && translations.server) {
            proxyBtn.textContent = useCorsProxy ?
                (translations.server.proxyMode || '代理模式') :
                (translations.server.directMode || '直连模式');
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn && translations.server && translations.server.refresh) {
            refreshBtn.textContent = translations.server.refresh + ' 🔄';
        }

        this.updateStatsDisplay();
    }

    /**
     * 根据当前语言更新筛选按钮文本
     * @param {string} lang - 语言代码
     */
    updateFilterButtons(lang) {
        const translations = this.getTranslations(lang);
        if (!translations || !translations.filters) return;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter && translations.filters[filter]) {
                btn.textContent = translations.filters[filter];
            }
        });
    }

    /**
     * 初始化复制按钮事件处理
     * 支持直接复制 IP 和通过选择器复制选中 IP
     */
    initCopyHandlers() {
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

    /**
     * 初始化 IP 地址选择器事件
     * 切换 IP 时通过 onIpChange 回调通知业务层重新检测延迟
     */
    initIpSelectors() {
        document.querySelectorAll('.ip-selector').forEach(selector => {
            selector.addEventListener('change', () => {
                const serverId = selector.getAttribute('data-server-id');
                if (this.onIpChange) {
                    this.onIpChange(serverId);
                }
            });
        });
    }

    /**
     * 初始化筛选按钮事件
     * 点击筛选按钮时更新激活状态，并通过 onFilterChange 回调通知业务层
     */
    initFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.onFilterChange) {
                    this.onFilterChange(btn.getAttribute('data-filter'));
                }
            });
        });
    }
}

window.ServerListView = ServerListView;
