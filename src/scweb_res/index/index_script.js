/**
 * 生存战争网 - 首页脚本
 * 负责首页导航区块渲染、语言切换响应
 * 通过构造注入（依赖注入）获取共享管理器，页面只处理页面特有逻辑
 */

/**
 * 首页管理器类
 * 负责渲染导航链接、响应语言切换事件
 * 依赖的 ThemeManager / LanguageManager / SiteInfoManager 由组合根 App 统一创建并注入
 */
class IndexPageManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;
        this.init();
    }

    /**
     * 初始化首页：渲染导航链接、更新页面特有内容并绑定事件
     */
    init() {
        const lang = this.languageManager.currentLang;
        this.renderNavigationLinks(lang);
        this.updatePageSpecificContent(lang);
        this.bindEvents();
        console.log('[IndexPageManager] 初始化完成');
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
            const otherTitle = document.getElementById('otherNavigationTitle');
            const outdatedTitle = document.getElementById('outdatedNavigationTitle');
            if (cnTitle && translations.sections.cnNavigation) {
                cnTitle.textContent = translations.sections.cnNavigation;
            }
            if (osTitle && translations.sections.osNavigation) {
                osTitle.textContent = translations.sections.osNavigation;
            }
            if (otherTitle && translations.sections.otherNavigation) {
                otherTitle.textContent = translations.sections.otherNavigation;
            }
            if (outdatedTitle && translations.sections.outdatedNavigation) {
                outdatedTitle.textContent = translations.sections.outdatedNavigation;
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
            this.renderLinkGroup('otherNavigationLinks', config.navigation.other, translations.links);
            this.renderLinkGroup('outdatedNavigationLinks', config.navigation.outdated, translations.links);
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
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.IndexLanguageConfig)
    });
    new IndexPageManager(app);
});
