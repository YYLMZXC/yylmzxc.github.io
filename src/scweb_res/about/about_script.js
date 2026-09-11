/**
 * 生存战争网 - 关于页面脚本
 * 管理关于页面的导航渲染与事件绑定
 * 通过构造注入（依赖注入）获取共享管理器，页面只处理页面特有逻辑
 */

/**
 * 关于页面管理器类
 * 负责渲染导航区块、绑定主题/语言切换事件
 * 依赖的 ThemeManager / LanguageManager / SiteInfoManager 由组合根 App 统一创建并注入
 *
 * 关于页的导航与首页共用一份数据（nav-default.js / MySQL），只是各取自己那一份：
 * 分组带 page='about' 的归关于页，渲染交给共享的 NavRender，
 * 编辑入口（NavPanel + NavEditor）挂在设置下拉的「导航数据」里，与首页互不影响。
 */
class AboutPageManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;
        this.settingsManager = app.settingsManager;
        this.navStore = app.navStore;      // 绑定 about 页面身份的数据层
        this.navPanel = null;
        this.navEditor = null;
        this.init();
    }

    /**
     * 初始化关于页面
     */
    init() {
        this.renderNavigationLinks();
        this.bindEvents();
        this.initNavigationEditor();
        console.log('[AboutPageManager] 初始化完成');
    }

    /**
     * 绑定事件
     * 主题/语言按钮由 ThemeManager / LanguageManager 的全局事件委托统一处理，
     * 页面这里只监听语言切换事件，用于重渲染导航链接
     */
    bindEvents() {
        // 监听语言切换事件，重新渲染导航（区块标题与链接名都跟着语言走）
        document.addEventListener('languageChanged', () => {
            this.renderNavigationLinks();
        });
    }

    /**
     * 渲染导航区块
     * 区块标题在 translations.about 里（首页那份在 translations.sections），
     * 链接词条两边都在 translations.links，选表交给 NavStore.translationsFor
     */
    renderNavigationLinks() {
        const container = document.getElementById('aboutNavigationSections');
        if (!container || !this.navStore || !window.NavRender) return;

        const translations = NavStore.translationsFor(this.navStore.page, this.languageManager.getTranslations());
        NavRender.sections(container, this.navStore, translations);
    }

    /**
     * 装上「导航数据」的编辑入口
     * 与首页是同一套面板 / 编辑器，编辑器里可以切换首页 / 关于页，
     * 只是从这里打开时默认停在「关于页」这一份
     */
    initNavigationEditor() {
        if (!this.navStore) {
            console.warn('[AboutPageManager] 未找到导航数据层，关于页导航保持为空');
            return;
        }

        if (window.NavEditor) {
            this.navEditor = new NavEditor(this.navStore, this.app);
            this.navEditor.init();
        }

        if (this.settingsManager && window.NavPanel) {
            this.navPanel = new NavPanel(this.navStore, this.settingsManager, this.navEditor, this.app);
            this.navPanel.init();
        }

        this.navStore.subscribe(() => this.renderNavigationLinks());
        this.navStore.load().then(() => {
            console.log('[AboutPageManager] 导航数据已载入（' + NavStore.modeText(this.navStore.state.mode) + '）',
                this.navStore.stats());
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.AboutLanguageConfig),
        navPage: 'about'      // 关于页渲染数据里 page='about' 的那一份分组
    });
    window.aboutPageManager = new AboutPageManager(app);
});
