const ServerRenderer = {
    config: null,
    utils: null,

    init: function(config, utils) {
        this.config = config;
        this.utils = utils;
    },

    generateChildServerHtml: function(child, childServerId) {
        const childIps = this.utils.getServerIps(child, this.config.defaultPort);
        const childPrimaryIp = childIps[0] || '未知地址';
        
        return '<div class="child-server" style="margin-left: 20px; padding: 10px; background-color: #fff; border-radius: 6px; margin-top: 10px;">' +
            '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">' +
                '<span style="font-weight: 500; color: #2c3e50;">📁 ' + (child.name || '子服务器') + '</span>' +
            '</div>' +
            '<div class="info-row">' +
                '<span class="label">地址:</span>' +
                (childIps.length > 1 
                    ? '<select class="ip-selector" data-server-id="' + childServerId + '" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">' +
                        childIps.map((ip, i) => '<option value="' + ip + '"' + (i === 0 ? ' selected' : '') + '>' + ip + '</option>').join('') +
                        '</select>'
                    : '<span class="value ip-value" data-ip="' + childPrimaryIp + '">' + childPrimaryIp + '</span>') +
                (childIps.length > 1 
                    ? '<span class="copy-btn" data-server-id="' + childServerId + '">📋</span>'
                    : '<span class="copy-btn" data-ip="' + childPrimaryIp + '">📋</span>') +
            '</div>' +
        '</div>';
    },

    generateServerTags: function(server) {
        let tags = '';
        if (server.publishType === 0) {
            tags += '<span class="server-tag featured">推荐</span>';
        }
        if (server.level === 1) {
            tags += '<span class="server-tag" style="background-color: #3498db;">大厅服</span>';
        } else if (server.level === 2) {
            tags += '<span class="server-tag" style="background-color: #f39c12;">精品服</span>';
        } else if (server.level === 3) {
            tags += '<span class="server-tag" style="background-color: #27ae60;">社区服</span>';
        }
        if (server.groupJoinMode) {
            tags += '<span class="server-tag" style="background-color: #9b59b6;">群组服</span>';
        }
        return tags;
    },

    generateServerItem: function(server, index) {
        const ips = this.utils.getServerIps(server, this.config.defaultPort);
        const primaryIp = ips[0] || '未知地址';
        const networkType = this.utils.getNetworkType(primaryIp);
        const serverId = server.id || 'server-' + index;

        let childServersHtml = '';
        if (server.children && Array.isArray(server.children)) {
            childServersHtml = server.children.map((child, ci) => {
                return this.generateChildServerHtml(child, serverId + '-child-' + ci);
            }).join('');
        }

        const serverTags = this.generateServerTags(server);

        return '<div class="server-item" data-server-id="' + serverId + '" data-server-index="' + index + '">' +
            '<div class="server-header">' +
                '<span class="server-status status-checking" title="检查中">●</span>' +
                '<span class="server-name">' + (server.name || '未知服务器') + '</span>' +
                serverTags +
            '</div>' +
            '<div class="server-info">' +
                '<div class="info-row">' +
                    '<span class="label">地址:</span>' +
                    (ips.length > 1 
                        ? '<select class="ip-selector" data-server-id="' + serverId + '" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">' +
                            ips.map((ip, i) => '<option value="' + ip + '"' + (i === 0 ? ' selected' : '') + '>' + ip + '</option>').join('') +
                            '</select>'
                        : '<span class="value ip-value" data-ip="' + primaryIp + '">' + primaryIp + '</span>') +
                    (ips.length > 1 
                        ? '<span class="copy-btn" data-server-id="' + serverId + '">📋</span>'
                        : '<span class="copy-btn" data-ip="' + primaryIp + '">📋</span>') +
                '</div>' +
                '<div class="info-row">' +
                    '<span class="label">版本:</span>' +
                    '<span class="value">' + (server.version || '未知') + '</span>' +
                    '<span class="label">等级:</span>' +
                    '<span class="value">' + (server.level !== undefined ? server.level : '-') + '</span>' +
                '</div>' +
                (server.groupJoinMode !== undefined 
                    ? '<div class="info-row">' +
                        '<span class="label">加入模式:</span>' +
                        '<span class="value">' + server.groupJoinMode + '</span>' +
                      '</div>'
                    : '') +
                '<div class="info-row">' +
                    '<span class="label">网络:</span>' +
                    '<span class="value">' + networkType + '</span>' +
                    '<span class="label">延迟:</span>' +
                    '<span class="value latency-value" data-server-id="' + serverId + '">检测中...</span>' +
                '</div>' +
            '</div>' +
            childServersHtml +
        '</div>';
    },

    renderServerList: function(servers, container) {
        let html = '';
        servers.forEach((server, index) => {
            console.log('服务器', index + 1, ':', server.name, '-', this.utils.getServerIps(server, this.config.defaultPort)[0]);
            html += this.generateServerItem(server, index);
        });
        container.innerHTML = html;
    },

    renderServerStats: function(count, container) {
        container.innerHTML = '<h3>服务器统计</h3>' +
            '<p>总计: <b>' + count + '</b> 个服务器</p>';
    },

    renderLoading: function(container, message) {
        container.innerHTML = '<div class="loading">' + (message || '加载中...') + '</div>';
    },

    renderNoServers: function(container, message) {
        container.innerHTML = '<div class="no-servers">' + (message || '暂无服务器') + '</div>';
    },

    initVersionSelector: function(versions, currentVersion, selector) {
        selector.innerHTML = '';
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.value;
            option.textContent = version.label;
            if (version.value === currentVersion) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }
};
