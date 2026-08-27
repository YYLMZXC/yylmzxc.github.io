/*!
 * Live2D Widget — 本地部署版
 * https://github.com/stevenjoezhang/live2d-widget
 *
 * 架构：高内聚 · 低耦合
 * ┌──────────────────────────────────────────────┐
 * │  Live2DInit（编排层）                         │
 * │  ├─ Live2DConfig — 配置（路径/模型/功能开关）│
 * │  └─ Live2DLoader — 资源加载（CSS/JS）        │
 * └──────────────────────────────────────────────┘
 */

/* ================================================================
 *  Live2DConfig — 配置中心
 *  职责：集中管理所有可配置项，修改此处即可定制看板娘
 * ================================================================ */
const Live2DConfig = {
    /* --- 路径 --- */
    localPath:  './live2d/',
    cdnPath:    'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/',

    /* --- 模型 --- */
    modelId:    0,

    /* --- 功能开关 --- */
    drag:                   true,
    showToggleAfterQuit:    true,
    tools:                  ['hitokoto', 'photo', 'quit'],
    logLevel:               'warn',

    /* --- 派生路径（只读） --- */
    get waifuCss()     { return this.localPath + 'waifu.css'; },
    get waifuTipsJs()  { return this.localPath + 'waifu-tips.js'; },
    get waifuJson()    { return this.localPath + 'waifu-tips.json'; },
    get cubism2Core()  { return this.localPath + 'live2d.min.js'; },
};

/* ================================================================
 *  Live2DLoader — 资源加载器
 *  职责：动态加载 CSS / JS，屏蔽 DOM 操作细节
 * ================================================================ */
const Live2DLoader = {
    /**
     * 加载单个外部资源
     * @param {string} url  资源地址
     * @param {'css'|'js'} type  资源类型
     * @returns {Promise<string>} 加载成功返回 url
     */
    load: function (url, type) {
        console.log('[Live2D] Loading ' + type + ': ' + url);
        return new Promise(function (resolve, reject) {
            var tag;
            if (type === 'css') {
                tag = document.createElement('link');
                tag.rel = 'stylesheet';
                tag.href = url;
            } else if (type === 'js') {
                tag = document.createElement('script');
                tag.type = 'module';
                tag.src = url;
            }
            if (tag) {
                tag.onload  = function () {
                    console.log('[Live2D] ✓ Loaded ' + type + ': ' + url);
                    resolve(url);
                };
                tag.onerror = function () {
                    console.error('[Live2D] ✗ Failed to load ' + type + ': ' + url);
                    reject(url);
                };
                document.head.appendChild(tag);
            } else {
                console.error('[Live2D] Unknown resource type: ' + type);
                reject(url);
            }
        });
    },

    /**
     * 批量加载多个资源
     * @param {Array<{url:string, type:string}>} items
     * @returns {Promise<void>}
     */
    loadAll: function (items) {
        console.log('[Live2D] Loading ' + items.length + ' resources...');
        return Promise.all(items.map(function (item) {
            return Live2DLoader.load(item.url, item.type);
        })).then(function () {
            console.log('[Live2D] All resources loaded successfully');
        });
    },

    /**
     * 修复跨域 Image（Live2D Cubism 需要）
     */
    patchImageCORS: function () {
        console.log('[Live2D] Patching Image constructor for CORS');
        var OrigImage = window.Image;
        window.Image = function () {
            var img = new (Function.prototype.bind.apply(OrigImage, [null].concat(Array.from(arguments))));
            img.crossOrigin = 'anonymous';
            return img;
        };
        window.Image.prototype = OrigImage.prototype;
    },

    /**
     * 为移动端添加触摸拖拽支持
     * 原版 live2d-widget 只绑定了 mousedown，手机无法拖动
     */
    patchTouchDrag: function () {
        var waifu = document.getElementById('waifu');
        if (!waifu) {
            console.warn('[Live2D] #waifu element not found, skipping touch drag patch');
            return;
        }
        console.log('[Live2D] Patching touch drag support');

        var startLeft = 0;
        var startTop = 0;
        var startX = 0;
        var startY = 0;
        var dragging = false;
        var moved = false;
        var DRAG_THRESHOLD = 10; // 移动超过 10px 才判定为拖拽

        function onTouchStart(e) {
            if (e.touches.length !== 1) return;
            var t = e.touches[0];
            // 从 bottom 切换到 top/left 布局，与 initWidget 的桌面拖拽保持一致
            var curBottom = parseInt(waifu.style.bottom, 10);
            if (!isNaN(curBottom)) {
                waifu.style.top  = (window.innerHeight - curBottom - waifu.offsetHeight) + 'px';
            }
            waifu.classList.add('waifu-dragging');
            startLeft = parseInt(waifu.style.left, 10) || 0;
            startTop  = parseInt(waifu.style.top, 10)  || 0;
            startX = t.clientX;
            startY = t.clientY;
            dragging = false;
            moved = false;
            console.log('[Live2D] Touch start at (' + t.clientX + ', ' + t.clientY + ')');

            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }

        function onTouchMove(ev) {
            var t = ev.touches[0];
            var dx = t.clientX - startX;
            var dy = t.clientY - startY;

            if (!dragging) {
                // 移动距离超过阈值才开始拖拽，否则放行给对话/点击
                if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                    dragging = true;
                } else {
                    return;
                }
            }

            moved = true;
            ev.preventDefault(); // 只在确认拖拽后才阻止默认行为
            var x = Math.max(0, Math.min(startLeft + dx, window.innerWidth  - waifu.offsetWidth));
            var y = Math.max(0, Math.min(startTop  + dy, window.innerHeight - waifu.offsetHeight));
            waifu.style.left = x + 'px';
            waifu.style.top  = y + 'px';
        }

        function onTouchEnd() {
            if (moved) console.log('[Live2D] Touch end — waifu moved to (' + waifu.style.left + ', ' + waifu.style.top + ')');
            else console.log('[Live2D] Touch end — tap (no drag)');
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        }

        waifu.addEventListener('touchstart', onTouchStart, { passive: true });
    },

    /**
     * 移动端始终显示工具栏（原版仅 hover 显示）
     */
    patchMobileTools: function () {
        var isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isMobile) {
            console.log('[Live2D] Desktop detected, skipping mobile tools patch');
            return;
        }
        console.log('[Live2D] Mobile detected, applying tool bar patch');

        var style = document.createElement('style');
        style.textContent =
            '#waifu-tool { opacity: 1 !important; pointer-events: auto !important; }' +
            '#waifu-tips { opacity: 1 !important; min-height: 50px; pointer-events: auto !important; }' +
            '#waifu-tips a { pointer-events: auto !important; }' +
            '#waifu { bottom: 0 !important; transform: none !important; touch-action: none; }' +
            '#waifu.waifu-dragging { bottom: auto !important; }' +
            '#live2d { touch-action: none; }';
        document.head.appendChild(style);
    },
};

/* ================================================================
 *  Live2DInit — 编排层
 *  职责：协调 Config 和 Loader，完成初始化
 * ================================================================ */
const Live2DInit = (function () {
    var _loaded = false;

    /**
     * 创建切换按钮（不加载任何资源）
     */
    function _createToggleButton() {
        document.body.insertAdjacentHTML('beforeend',
            '<div id="waifu-toggle">' +
            '  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">' +
            '    <path d="M96 64a64 64 0 1 1 128 0A64 64 0 1 1 96 64zm48 320l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-192.2L59.1 321c-9.4 15-29.2 19.4-44.1 10S-4.5 301.9 4.9 287l39.9-63.3C69.7 184 113.2 160 160 160s90.3 24 115.2 63.6L315.1 287c9.4 15 4.9 34.7-10 44.1s-34.7 4.9-44.1-10L240 287.8 240 480c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96-32 0z"/>' +
            '  </svg>' +
            '</div>');
        var btn = document.getElementById('waifu-toggle');
        btn.classList.add('waifu-toggle-active');
        btn.addEventListener('click', function () {
            if (!_loaded) {
                _loaded = true;
                loadWidget();
            } else {
                var waifu = document.getElementById('waifu');
                if (waifu && waifu.classList.contains('waifu-hidden')) {
                    waifu.classList.remove('waifu-hidden');
                    waifu.classList.add('waifu-active');
                }
            }
        });
        console.log('[Live2D] Toggle button created (widget not loaded)');
    }

    /**
     * 懒加载：首次点击时才加载资源并初始化看板娘
     */
    function loadWidget() {
        console.log('[Live2D] Loading widget...');
        var C = Live2DConfig;
        Live2DLoader.patchImageCORS();
        Live2DLoader.loadAll([
            { url: C.waifuCss,    type: 'css' },
            { url: C.waifuTipsJs, type: 'js'  },
        ]).then(function () {
            console.log('[Live2D] Resources ready, initializing widget...');
            initWidget({
                waifuPath:           C.waifuJson,
                cdnPath:             C.cdnPath,
                cubism2Path:         C.cubism2Core,
                modelId:             C.modelId,
                tools:               C.tools,
                logLevel:            C.logLevel,
                drag:                C.drag,
                showToggleAfterQuit: C.showToggleAfterQuit,
            });
            console.log('[Live2D] Widget initialized');
            Live2DLoader.patchTouchDrag();
            Live2DLoader.patchMobileTools();
            console.log('[Live2D] ✓ All patches applied, ready!');
        }).catch(function (err) {
            console.error('[Live2D] Initialization failed:', err);
            _loaded = false;
        });
    }

    function boot() {
        /* 检查配置开关 */
        var cfg = (window.SITE_CONFIG || {}).live2d || {};
        if (cfg.enabled === false) {
            console.log('[Live2D] Disabled by site config');
            return;
        }

        console.log('[Live2D] Initializing (lazy)...');
        console.log('[Live2D] Config:', JSON.stringify({
            modelId:   Live2DConfig.modelId,
            cdnPath:   Live2DConfig.cdnPath,
            localPath: Live2DConfig.localPath,
            drag:      Live2DConfig.drag,
            tools:     Live2DConfig.tools,
            logLevel:  Live2DConfig.logLevel,
        }, null, 2));

        /* 默认隐藏：仅创建切换按钮，不加载资源 */
        _createToggleButton();
    }

    return { boot: boot };
})();

/* ---- 启动 ---- */
Live2DInit.boot();
