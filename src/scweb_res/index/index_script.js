/**
 * 生存战争网 - 首页脚本
 * 管理首页的导航区块渲染、语言切换响应和主题/站点信息初始化
 * 通过 IndexPageManager 类统一协调各功能模块
 */

/**
 * 首页管理器类
 * 负责初始化主题、语言、站点信息，渲染导航链接，响应语言切换事件
 */
class IndexPageManager {
    constructor() {
        this.init();
    }

    /**
     * 初始化首页：按顺序初始化主题、语言、站点信息并绑定事件
     */
    init() {
        this.initTheme();
        this.initLanguage();
        this.initSiteInfo();
        this.bindEvents();
        console.log('[IndexPageManager] 初始化完成');
    }

    /**
     * 初始化主题管理器（共享组件）
     */
    initTheme() {
        if (window.ThemeManager) {
            this.themeManager = new window.ThemeManager();
        } else {
            console.warn('[IndexPageManager] ThemeManager 未加载');
        }
    }

    /**
     * 初始化语言管理器
     * 合并站点级和页面级语言配置，然后应用翻译
     */
    initLanguage() {
        const mergedConfig = this.mergeConfigs(window.SiteLanguageConfig, window.IndexLanguageConfig);

        if (window.LanguageManager) {
            this.languageManager = new window.LanguageManager(mergedConfig);
            this.languageManager.init();
        } else {
            console.warn('[IndexPageManager] LanguageManager 未加载');
        }

        // 立即使用当前语言渲染导航链接
        this.renderNavigationLinks(this.languageManager.currentLang);
    }

    /**
     * 合并两个语言配置对象（深度合并）
     * 页面级配置会覆盖站点级配置的对应字段
     * @param {Object} baseConfig - 站点级基础配置
     * @param {Object} pageConfig - 页面级配置
     * @returns {Object} 合并后的配置
     */
    mergeConfigs(baseConfig, pageConfig) {
        const merged = {
            default: pageConfig.default || baseConfig.default,
            supported: pageConfig.supported || baseConfig.supported,
            storageKey: pageConfig.storageKey || baseConfig.storageKey,
            names: pageConfig.names || baseConfig.names,
            translations: {},
            navigation: pageConfig.navigation
        };

        // 合并所有语言版本的翻译
        const languages = [...new Set([
            ...Object.keys(baseConfig.translations || {}),
            ...Object.keys(pageConfig.translations || {})
        ])];

        languages.forEach(lang => {
            const base = (baseConfig.translations && baseConfig.translations[lang]) || {};
            const page = (pageConfig.translations && pageConfig.translations[lang]) || {};
            merged.translations[lang] = this.deepMerge(base, page);
        });

        return merged;
    }

    /**
     * 深度合并两个对象
     * 递归合并嵌套对象，页面级属性优先级更高
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并结果
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    /**
     * 初始化站点信息管理器
     * 依赖语言管理器来显示多语言站点信息
     */
    initSiteInfo() {
        if (window.SiteInfoManager && this.languageManager) {
            this.siteInfoManager = new window.SiteInfoManager(this.languageManager);
            this.siteInfoManager.init();
        }
    }

    /**
     * 绑定事件监听
     * 监听语言切换事件，自动重新渲染导航链接和页面特定内容
     */
    bindEvents() {
        document.addEventListener('languageChanged', (e) => {
            const lang = e.detail ? e.detail.lang : this.languageManager.currentLang;
            this.renderNavigationLinks(lang);
            this.updatePageSpecificContent(lang);
        });

        // 初始更新页面特定内容
        const lang = this.languageManager.currentLang;
        this.updatePageSpecificContent(lang);
    }

    /**
     * 更新页面特定内容（区块标题等）
     * @param {string} lang - 当前语言代码
     */
    updatePageSpecificContent(lang) {
        const translations = this.languageManager.config.translations[lang];
        if (!translations) return;

        if (translations.sections) {
            const cnTitle = document.getElementById('cnNavigationTitle');
            const osTitle = document.getElementById('osNavigationTitle');
            if (cnTitle && translations.sections.cnNavigation) {
                cnTitle.textContent = translations.sections.cnNavigation;
            }
            if (osTitle && translations.sections.osNavigation) {
                osTitle.textContent = translations.sections.osNavigation;
            }
        }
    }

    /**
     * 渲染导航链接区块
     * 根据当前语言获取翻译文本，动态生成导航链接元素
     * @param {string} lang - 当前语言代码
     */
    renderNavigationLinks(lang) {
        const config = this.languageManager.config;
        const translations = config.translations[lang] || config.translations[config.default];

        if (config.navigation) {
            this.renderLinkGroup('cnNavigationLinks', config.navigation.cn, translations.links);
            this.renderLinkGroup('osNavigationLinks', config.navigation.os, translations.links);
        }
    }

    /**
     * 渲染一组导航链接到指定容器
     * @param {string} containerId - 容器元素ID
     * @param {Array} links - 链接配置数组 [{title, url, external}]
     * @param {Object} translations - 当前语言的链接翻译文本
     */
    renderLinkGroup(containerId, links, translations) {
        const container = document.getElementById(containerId);
        if (!container || !links || !translations) return;

        const fragment = document.createDocumentFragment();

        links.forEach(link => {
            const linkKey = link.title.replace('links.', '');
            const linkText = translations[linkKey] || linkKey;

            const a = document.createElement('a');
            a.href = link.url;
            a.textContent = linkText;
            a.className = 'nav-link';

            if (link.external) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }

            fragment.appendChild(a);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }
}

// DOM加载完成后初始化首页管理器
document.addEventListener('DOMContentLoaded', () => {
    new IndexPageManager();
});
