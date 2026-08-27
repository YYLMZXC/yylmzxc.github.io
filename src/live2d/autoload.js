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
                tag.onload  = function () { resolve(url); };
                tag.onerror = function () { reject(url); };
                document.head.appendChild(tag);
            } else {
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
        return Promise.all(items.map(function (item) {
            return Live2DLoader.load(item.url, item.type);
        })).then(function () {});
    },

    /**
     * 修复跨域 Image（Live2D Cubism 需要）
     */
    patchImageCORS: function () {
        var OrigImage = window.Image;
        window.Image = function () {
            var img = new (Function.prototype.bind.apply(OrigImage, [null].concat(Array.from(arguments))));
            img.crossOrigin = 'anonymous';
            return img;
        };
        window.Image.prototype = OrigImage.prototype;
    },
};

/* ================================================================
 *  Live2DInit — 编排层
 *  职责：协调 Config 和 Loader，完成初始化
 * ================================================================ */
const Live2DInit = (function () {
    function boot() {
        var C = Live2DConfig;

        /* 1. 修复跨域 */
        Live2DLoader.patchImageCORS();

        /* 2. 加载核心资源 */
        Live2DLoader.loadAll([
            { url: C.waifuCss,    type: 'css' },
            { url: C.waifuTipsJs, type: 'js'  },
        ]).then(function () {
            /* 3. 初始化看板娘 */
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
        });
    }

    return { boot: boot };
})();

/* ---- 启动 ---- */
Live2DInit.boot();
