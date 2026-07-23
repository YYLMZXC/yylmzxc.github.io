document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化');
    
    ServerController.init();
    ServerController.initVersionSelector();
    ServerController.loadServerList();
    ServerController.events.initFilterButtons();
    
    setInterval(function() {
        ServerController.latency.detectLatency();
    }, 30000);
});
