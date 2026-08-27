/**
 * 生存战争网 - 服务器专用工具函数
 * 从通用 utils.js 中提取，仅服务于联机服务器模块
 * 挂载到全局 window.SCServerUtils
 */
window.SCServerUtils = {
    /**
     * 根据IP地址判断网络类型
     * @param {string} ip - IP地址字符串（支持IPv4/IPv6）
     * @returns {string} 网络类型: IPv4 | IPv6 | 局域网 | 其他
     */
    getNetworkType(ip) {
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

    /**
     * 解析IP地址和端口
     * 支持 IPv4 (host:port) 和 IPv6 ([host]:port) 格式
     * @param {string} ip - IP地址字符串
     * @returns {{host: string, port: string}} 解析后的主机和端口
     */
    parseIpPort(ip) {
        let host, port;
        const ipv6Match = ip.match(/^\[([^\]]+)\](?::(\d+))?$/);
        if (ipv6Match) {
            host = ipv6Match[1];
            port = ipv6Match[2] || '28887';
        } else {
            const lastColon = ip.lastIndexOf(':');
            if (lastColon !== -1) {
                host = ip.substring(0, lastColon);
                port = ip.substring(lastColon + 1) || '28887';
            } else {
                host = ip;
                port = '28887';
            }
        }
        return { host, port };
    }
};
