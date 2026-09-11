/**
 * 站点常量表（前端与后端共用的一份）
 *
 * 主题、导航数据来源、页面身份这几组「合法取值」，两边都要用：
 *   · 前端据此校验——设置面板只认表里的主题 / 来源；
 *   · 后端据此规整——库里存了表外的值一律归到默认（见 server/settings.js、server/sitenav.js）。
 * 两边各存一份很容易改漏一处，出现「面板不认这个值」这类对不上的毛病，
 * 所以统一放这里：前端当普通脚本加载（window.SITE_CONSTANTS），后端 require 同一个文件。
 *
 * 改这里会同时改到前后端；改完请把各页面对本文件的引用版本号（?v=）往前挪一位，
 * 免得浏览器拿旧副本。
 */
(function () {
    'use strict';

    var CONSTANTS = {
        // 合法主题；fallbackTheme 是脏值 / 缺省时的兜底
        themes: ['light', 'dark', 'wk-light', 'wk-dark'],
        fallbackTheme: 'wk-light',

        // 导航数据来源：'web' 静态文件（不依赖后端）/ 'db' 数据库
        navModes: ['web', 'db'],
        fallbackNavMode: 'web',

        // 页面身份：id 用于数据归属与校验，name 用于界面标签（导航编辑器的页签）
        pages: [
            { id: 'index', name: '首页' },
            { id: 'about', name: '关于页' }
        ]
    };

    // 浏览器：挂到 window，供 <script> 直接取用
    if (typeof window !== 'undefined') window.SITE_CONSTANTS = CONSTANTS;
    // Node：供 require 取用
    if (typeof module !== 'undefined' && module.exports) module.exports = CONSTANTS;
})();
