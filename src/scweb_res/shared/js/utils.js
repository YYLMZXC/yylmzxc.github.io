window.SCUtils = {
    scrollToElement(elementId, behavior = 'smooth') {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior, block: 'start' });
        }
    },

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

    debounce(func, wait = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), wait);
        };
    },

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
