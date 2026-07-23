/**
 * 生存战争网 - 应用入口类
 * 统一管理主题管理器、语言管理器等全局组件的初始化
 * 将各管理器挂载到 window.app 供全局访问
 * 挂载到全局 window.SCApp
 */
class App {
    /**
     * @param {Object} [options] - 应用配置选项
     * @param {boolean} [options.theme] - 是否启用主题管理（默认 true）
     * @param {boolean} [options.language] - 是否启用语言管理（默认 true）
     * @param {Object} [options.languageConfig] - 语言配置对象
     */
    constructor(options = {}) {
        this.options = options;
        this.themeManager = null;
        this.languageManager = null;
    }

    /**
     * 初始化应用：按需创建主题管理器和语言管理器
     * 将所有管理器实例挂载到 window.app
     */
    init() {
        console.log('[App] 开始初始化...');
        
        // 初始化主题管理器
        if (this.options.theme !== false) {
            this.themeManager = new ThemeManager();
        }
        
        // 初始化语言管理器
        if (this.options.language && this.options.languageConfig) {
            this.languageManager = new LanguageManager(this.options.languageConfig);
            this.languageManager.init();
        }
        
        // 将组件挂载到全局
        window.app = {
            themeManager: this.themeManager,
            languageManager: this.languageManager,
            utils: window.SCUtils
        };
        
        console.log('[App] 初始化完成');
    }
}

window.SCApp = App;
