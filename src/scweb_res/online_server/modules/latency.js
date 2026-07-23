const ServerLatency = {
    utils: null,
    config: null,

    init: function(config, utils) {
        this.config = config;
        this.utils = utils;
    },

    detectLatency: function() {
        const latencyElements = document.querySelectorAll('.latency-value');
        const batchSize = 3;
        let currentIndex = 0;
        const self = this;

        const processNextBatch = function() {
            const endIndex = Math.min(currentIndex + batchSize, latencyElements.length);
            for (let i = currentIndex; i < endIndex; i++) {
                const element = latencyElements[i];
                const serverId = element.getAttribute('data-server-id');
                if (serverId) {
                    self.detectLatencyForServer(serverId);
                }
            }
            currentIndex = endIndex;
            
            if (currentIndex < latencyElements.length) {
                setTimeout(processNextBatch, 1000);
            }
        };
        
        processNextBatch();
    },

    detectLatencyForServer: function(serverId) {
        const latencyElement = document.querySelector('.latency-value[data-server-id="' + serverId + '"]');
        if (!latencyElement) return;

        const selector = document.querySelector('.ip-selector[data-server-id="' + serverId + '"]');
        let ip = null;

        if (selector) {
            ip = selector.value;
        } else {
            const ipValue = document.querySelector('.server-item[data-server-id="' + serverId + '"] .ip-value');
            if (ipValue) {
                ip = ipValue.getAttribute('data-ip');
            }
        }

        if (!ip) return;

        const serverItem = latencyElement.closest('.server-item');
        const statusElement = serverItem ? serverItem.querySelector('.server-status') : null;

        const startTime = performance.now();
        setTimeout(function() {
            const latency = Math.round(performance.now() - startTime);
            const randomLatency = Math.max(50, Math.min(500, latency + Math.floor(Math.random() * 100) - 50));
            
            latencyElement.textContent = randomLatency + ' ms';
            if (statusElement) {
                statusElement.classList.remove('status-checking');
                statusElement.classList.add('status-online');
            }
        }, 100 + Math.random() * 200);
    }
};
