/**
 * 生存战争网 - 通用工具函数库
 * 提供滚动、剪贴板、防抖节流、IP解析等常用功能
 * 挂载到全局 window.SCUtils
 */
window.SCUtils = {
    /**
     * 滚动到指定元素
     * @param {string} elementId - 目标元素的ID
     * @param {string} behavior - 滚动行为 (smooth | auto | instant)
     */
    scrollToElement(elementId, behavior = 'smooth') {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior, block: 'start' });
        }
    },

    /**
     * 将文本复制到剪贴板
     * 优先使用 Clipboard API，不支持时降级为 execCommand
     * @param {string} text - 要复制的文本
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text)
                .then(() => console.log('[Utils] 文本已复制到剪贴板'))
                .catch(err => console.error('[Utils] 复制失败：', err));
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('[Utils] 文本已复制到剪贴板（降级模式）');
    },

    /**
     * 防抖函数
     * 在事件触发后等待指定时间再执行，期间再次触发则重新计时
     * @param {Function} func - 需要防抖的函数
     * @param {number} wait - 等待毫秒数
     * @returns {Function} 防抖处理后的函数
     */
    debounce(func, wait = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 节流函数
     * 限制函数在指定时间间隔内最多执行一次
     * @param {Function} func - 需要节流的函数
     * @param {number} limit - 时间间隔毫秒数
     * @returns {Function} 节流处理后的函数
     */
    throttle(func, limit = 300) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= limit) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    },

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
