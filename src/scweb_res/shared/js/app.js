/**
 * 生存战争网 - 应用组合根（Composition Root）
 * 统一创建并初始化共享管理器（主题 / 语言 / 站点信息），
 * 将共享实例注入给各页面管理器，页面管理器只负责页面特有逻辑。
 * 挂载到全局 window.SCApp
 */
class App {
    /**
     * @param {Object} [options] - 应用配置选项
     * @param {boolean} [options.theme] - 是否启用主题管理（默认 true）
     * @param {boolean} [options.language] - 是否启用语言管理（默认 true）
     * @param {Object} [options.languageConfig] - 合并后的语言配置对象
     * @param {boolean} [options.siteInfo] - 是否启用站点信息管理（默认 true，需语言管理器可用）
     */
    constructor(options = {}) {
        this.options = options;
        this.themeManager = null;
        this.languageManager = null;
        this.siteInfoManager = null;
        this.settingsManager = null;
        this.services = null;
    }

    /**
     * 初始化应用：按需创建主题 / 语言 / 站点信息管理器
     * @returns {Object} 共享服务集合 services
     */
    init() {
        console.log('[App] 开始初始化...');

        // 下拉菜单管理器（消除 ThemeManager 与 LanguageManager 的互斥耦合）
        this.dropdownManager = new DropdownManager();

        // 主题管理器（注入下拉菜单管理器）
        if (this.options.theme !== false) {
            this.themeManager = new ThemeManager(this.dropdownManager);
            const themeDropdown = document.getElementById('themeDropdown');
            if (themeDropdown) {
                this.dropdownManager.register('themeDropdown', themeDropdown, '#themeToggle');
            }
        }

        // 语言管理器（注入语言配置和下拉菜单管理器）
        if (this.options.language !== false && this.options.languageConfig) {
            this.languageManager = new LanguageManager(this.options.languageConfig, this.dropdownManager);
            this.languageManager.init();
            const langDropdown = document.getElementById('langDropdown');
            if (langDropdown) {
                this.dropdownManager.register('langDropdown', langDropdown, '#langToggle');
            }
        }

        // 站点信息管理器（依赖语言管理器）
        if (this.options.siteInfo !== false && this.languageManager) {
            this.siteInfoManager = new SiteInfoManager(this.languageManager);
            this.siteInfoManager.init();
        }

        // 设置管理器（BGM / Live2D 开关）
        if (this.options.settings !== false && window.SettingsManager) {
            this.settingsManager = new SettingsManager(this.dropdownManager);
            const settingsDropdown = document.getElementById('settingsDropdown');
            if (settingsDropdown) {
                this.dropdownManager.register('settingsDropdown', settingsDropdown, '#settingsToggle');
            }
        }

        // 组装共享服务集合，供页面管理器构造注入
        this.services = {
            dropdownManager: this.dropdownManager,
            themeManager: this.themeManager,
            languageManager: this.languageManager,
            siteInfoManager: this.siteInfoManager,
            settingsManager: this.settingsManager,
            utils: window.SCUtils
        };

        // 向后兼容：挂载到全局
        window.app = this.services;

        console.log('[App] 初始化完成');
        return this.services;
    }

    /**
     * 创建并初始化应用，直接返回共享服务集合
     * @param {Object} [options] - 应用配置选项
     * @returns {Object} 共享服务集合 services
     */
    static create(options) {
        const app = new App(options);
        return app.init();
    }
}

window.SCApp = App;
