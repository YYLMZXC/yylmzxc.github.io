const ServerUtils = {
    parseIp: function(ip, defaultPort) {
        if (!ip) return null;
        ip = ip.trim();
        if (!ip) return null;
        if (!ip.includes(':')) {
            return ip + ':' + defaultPort;
        }
        return ip;
    },

    getServerIps: function(server, defaultPort) {
        const ips = [];
        
        if (server.ip) {
            const parsed = this.parseIp(server.ip, defaultPort);
            if (parsed) ips.push(parsed);
        }
        
        if (server.ips && Array.isArray(server.ips)) {
            server.ips.forEach(ip => {
                const parsed = this.parseIp(ip, defaultPort);
                if (parsed && !ips.includes(parsed)) {
                    ips.push(parsed);
                }
            });
        }
        
        if (ips.length === 0) {
            if (server.address) {
                const parsed = this.parseIp(server.address, defaultPort);
                if (parsed) ips.push(parsed);
            }
            if (server.host) {
                const parsed = this.parseIp(server.host, defaultPort);
                if (parsed && !ips.includes(parsed)) {
                    ips.push(parsed);
                }
            }
        }
        
        return ips;
    },

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

    extractServers: function(data) {
        if (!data) return [];
        
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

    copyToClipboard: function(text, successCallback, errorCallback) {
        navigator.clipboard.writeText(text)
            .then(() => {
                if (successCallback) successCallback();
            })
            .catch(err => {
                console.error('复制失败:', err);
                if (errorCallback) errorCallback(err);
            });
    }
};
