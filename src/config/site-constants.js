/**
 * 站点常量表（前端与后端共用的一份）
 *
 * 主题、导航数据来源、页面身份这几组「合法取值 + 展示文案」两边都要用：
 *   · 前端据此校验，并渲染切换菜单 / 设置面板下拉 / Toast 文案；
 *   · 后端据此规整——库里存了表外的值一律归到默认（见 server/settings.js、server/sitenav.js）。
 * 两边各存一份很容易改漏一处，出现「面板不认这个值」「菜单文案和提示对不上」这类毛病，
 * 所以统一放这里：前端当普通脚本加载（window.SITE_CONSTANTS），后端 require 同一个文件。
 *
 * 改这里会同时改到前后端；改完请把各页面对本文件的引用版本号（?v=）往前挪一位，
 * 免得浏览器拿旧副本。
 */
(function () {
    'use strict';

    // 主题表：id 用于校验与数据归属，icon + name 用于界面展示，
    // scheme 决定挂在 body 上的基础语义类（兼容只认 light/dark 的旧样式）。
    // 增设主题：本表加一行 + 补 CSS 即可，菜单、下拉、Toast 与前后端校验同时生效。
    var THEMES = [
        { id: 'light',    icon: '☀️', name: '白天模式', scheme: 'light' },
        { id: 'dark',     icon: '🌙', name: '黑夜模式', scheme: 'dark' },
        { id: 'wk-light', icon: '🌿', name: '工坊亮色', scheme: 'light' },
        { id: 'wk-dark',  icon: '🪵', name: '工坊暗色', scheme: 'dark' }
    ];

    // 导航数据来源表，同上
    var NAV_MODES = [
        { id: 'web', icon: '📄', name: '静态文件' },
        { id: 'db',  icon: '🗄️', name: '数据库' }
    ];

    var CONSTANTS = {
        // 主题：themes 供界面渲染，themeIds 供校验（前后端同用）
        themes: THEMES,
        themeIds: THEMES.map(function (t) { return t.id; }),
        fallbackTheme: 'wk-light',

        // 导航数据来源：navModes 供界面渲染，navModeIds 供校验
        navModes: NAV_MODES,
        navModeIds: NAV_MODES.map(function (m) { return m.id; }),
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
