const ServerEvents = {
    utils: null,
    latencyDetector: null,
    callbackHandler: null,

    init: function(utils, latencyDetector, callbackHandler) {
        this.utils = utils;
        this.latencyDetector = latencyDetector;
        this.callbackHandler = callbackHandler;
    },

    initCopyHandlers: function() {
        const self = this;
        
        document.querySelectorAll('.copy-btn[data-ip]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const ip = this.getAttribute('data-ip');
                self.utils.copyToClipboard(
                    ip,
                    () => {
                        this.textContent = '✓';
                        setTimeout(() => this.textContent = '📋', 2000);
                    }
                );
            });
        });
        
        document.querySelectorAll('.copy-btn[data-server-id]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const serverId = this.getAttribute('data-server-id');
                const selector = document.querySelector('.ip-selector[data-server-id="' + serverId + '"]');
                if (selector) {
                    self.utils.copyToClipboard(
                        selector.value,
                        () => {
                            this.textContent = '✓';
                            setTimeout(() => this.textContent = '📋', 2000);
                        }
                    );
                }
            });
        });
        
        document.querySelectorAll('.ip-value').forEach(element => {
            element.addEventListener('click', function() {
                const ip = this.getAttribute('data-ip');
                self.utils.copyToClipboard(
                    ip,
                    () => {
                        const originalColor = element.style.color;
                        element.style.color = '#27ae60';
                        setTimeout(() => element.style.color = originalColor, 2000);
                    }
                );
            });
        });
    },

    initIpSelectors: function() {
        const self = this;
        document.querySelectorAll('.ip-selector').forEach(selector => {
            selector.addEventListener('change', function() {
                const serverId = this.getAttribute('data-server-id');
                self.latencyDetector.detectLatencyForServer(serverId);
            });
        });
    },

    initFilterButtons: function() {
        const self = this;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                self.callbackHandler.onFilterChange(this.getAttribute('data-filter'));
            });
        });
    }
};
