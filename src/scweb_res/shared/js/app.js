class App {
    constructor(options = {}) {
        this.options = options;
        this.themeManager = null;
        this.languageManager = null;
    }

    init() {
        console.log('[App] 开始初始化...');
        
        if (this.options.theme !== false) {
            this.themeManager = new ThemeManager();
        }
        
        if (this.options.language && this.options.languageConfig) {
            this.languageManager = new LanguageManager(this.options.languageConfig);
            this.languageManager.init();
        }
        
        window.app = {
            themeManager: this.themeManager,
            languageManager: this.languageManager,
            utils: window.SCUtils
        };
        
        console.log('[App] 初始化完成');
    }
}

window.SCApp = App;
