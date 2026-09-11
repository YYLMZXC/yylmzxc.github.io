/**
 * 生存战争网 - 首页脚本
 * 负责把「社区导航」数据画成 DOM，并响应语言切换。
 * 数据来源交给数据层（NavStore）：web 模式读静态文件，数据库模式读 MySQL，
 * 因此这里不再依赖写死的 navigation 配置，区块数量、标题、链接都随数据变化。
 * 通过构造注入（依赖注入）获取共享管理器，页面只处理页面特有逻辑
 */

/**
 * 首页管理器类
 * 依赖的 ThemeManager / LanguageManager / SiteInfoManager / NavStore 由组合根 App 统一创建并注入
 */
class IndexPageManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;
        this.settingsManager = app.settingsManager || null;
        this.navStore = app.navStore || null;
        this.navPanel = null;
        this.navEditor = null;
        this.init();
    }

    /**
     * 初始化首页：绑定事件 → 渲染导航 → 载入数据
     */
    init() {
        this.bindEvents();
        this.initNavigation();
        console.log('[IndexPageManager] 初始化完成');
    }

    /**
     * 绑定事件监听
     * 语言切换后标题与链接都要按新语言重画
     */
    bindEvents() {
        document.addEventListener('languageChanged', () => {
            this.renderNavigation();
        });
    }

    /* ================================================================
     *  导航区块
     * ================================================================ */

    initNavigation() {
        if (!this.navStore) {
            console.warn('[IndexPageManager] 未找到导航数据层，首页导航保持为空');
            return;
        }

        // 先把内存里的静态数据画出来，避免等接口时页面空白
        this.renderNavigation();

        // 逐条增删改的编辑器，入口在设置下拉的「导航数据」里（可在首页 / 关于页之间切换）
        if (window.NavEditor) {
            this.navEditor = new NavEditor(this.navStore, this.app);
            this.navEditor.init();
        }

        // 编辑 / 模式切换 / 导入 / 导出 / 转换的入口挂在设置下拉里
        if (this.settingsManager && window.NavPanel) {
            this.navPanel = new NavPanel(this.navStore, this.settingsManager, this.navEditor, this.app);
            this.navPanel.init();
        }

        this.navStore.subscribe(() => this.renderNavigation());
        this.navStore.load().then(() => {
            const mode = NavStore.modeText(this.navStore.state.mode);
            console.log('[IndexPageManager] 导航数据已载入（' + mode + '）', this.navStore.stats());
        });
    }

    /**
     * 按当前数据与当前语言重画所有导航区块（区块结构见 NavRender）
     */
    renderNavigation() {
        const container = document.getElementById('siteNavigationSections');
        if (!container || !this.navStore || !window.NavRender) return;

        // 首页的区块标题在 translations.sections 里（关于页在 translations.about）
        const translations = NavStore.translationsFor(this.navStore.page, this.languageManager.getTranslations());
        NavRender.sections(container, this.navStore, translations);
    }
}

// DOM加载完成后初始化首页管理器
document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.IndexLanguageConfig)
    });
    new IndexPageManager(app);
});
