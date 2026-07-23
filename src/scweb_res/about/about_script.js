/**
 * 生存战争网 - 关于页面脚本
 * 管理关于页面的主题、语言初始化和事件绑定
 */

/**
 * 关于页面管理器类
 * 负责初始化主题、语言、站点信息
 */
class AboutPageManager {
    constructor() {
        this.init();
    }

    /**
     * 初始化关于页面
     */
    init() {
        this.initTheme();
        this.initLanguage();
        this.initSiteInfo();
        this.bindEvents();
        console.log('[AboutPageManager] 初始化完成');
    }

    /**
     * 初始化主题管理器
     */
    initTheme() {
        if (window.ThemeManager) {
            this.themeManager = new window.ThemeManager();
        } else {
            console.warn('[AboutPageManager] ThemeManager 未加载');
        }
    }

    /**
     * 初始化语言管理器
     */
    initLanguage() {
        const mergedConfig = this.mergeConfigs(window.SiteLanguageConfig, window.AboutLanguageConfig);

        if (window.LanguageManager) {
            this.languageManager = new window.LanguageManager(mergedConfig);
            this.languageManager.init();
        } else {
            console.warn('[AboutPageManager] LanguageManager 未加载');
        }
    }

    /**
     * 合并两个语言配置对象
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
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    /**
     * 初始化站点信息
     */
    initSiteInfo() {
        if (window.SiteInfoManager) {
            this.siteInfoManager = new window.SiteInfoManager();
            this.siteInfoManager.init();
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                if (this.themeManager) {
                    this.themeManager.setTheme(theme);
                }
            });
        });

        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                if (this.languageManager) {
                    this.languageManager.setLanguage(lang);
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.aboutPageManager = new AboutPageManager();
});
