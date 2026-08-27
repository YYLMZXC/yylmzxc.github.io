/**
 * 生存战争网 - 关于页面脚本
 * 管理关于页面的导航渲染与事件绑定
 * 通过构造注入（依赖注入）获取共享管理器，页面只处理页面特有逻辑
 */

/**
 * 关于页面管理器类
 * 负责渲染导航链接、绑定主题/语言切换事件
 * 依赖的 ThemeManager / LanguageManager / SiteInfoManager 由组合根 App 统一创建并注入
 */
class AboutPageManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;
        this.init();
    }

    /**
     * 初始化关于页面
     */
    init() {
        this.renderNavigationLinks(this.languageManager.currentLang);
        this.bindEvents();
        console.log('[AboutPageManager] 初始化完成');
    }

    /**
     * 绑定事件
     * 主题/语言按钮由 ThemeManager / LanguageManager 的全局事件委托统一处理，
     * 页面这里只监听语言切换事件，用于重渲染导航链接
     */
    bindEvents() {
        // 监听语言切换事件，重新渲染导航
        document.addEventListener('languageChanged', (e) => {
            const lang = e.detail ? e.detail.lang : this.languageManager.currentLang;
            this.renderNavigationLinks(lang);
        });
    }

    /**
     * 渲染导航链接区块
     * @param {string} lang - 当前语言代码
     */
    renderNavigationLinks(lang) {
        const config = this.languageManager.config;
        const translations = config.translations[lang] || config.translations[config.default];

        if (config.navigation) {
            this.renderLinkGroup('bookmarksNavigationLinks', config.navigation.bookmarks, translations.links);
            this.renderLinkGroup('toolsNavigationLinks', config.navigation.tools, translations.links);
            this.renderLinkGroup('aiNavigationLinks', config.navigation.ai, translations.links);
            this.renderLinkGroup('otherNavigationLinks', config.navigation.other, translations.links);
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

document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.AboutLanguageConfig)
    });
    window.aboutPageManager = new AboutPageManager(app);
});
