/**
 * 生存战争网 - 语言管理器
 * 负责多语言切换、翻译应用和动态内容更新
 * 支持 URL参数、localStorage、浏览器语言偏好三种方式获取初始语言
 * 挂载到全局 window.LanguageManager
 */
class LanguageManager {
    /**
     * @param {Object} config - 语言配置对象
     * @param {string} config.default - 默认语言代码 (如 'zh')
     * @param {string[]} config.supported - 支持的语言代码数组
     * @param {string} config.storageKey - localStorage 存储键名
     * @param {Object} config.translations - 翻译文本对象
     */
    constructor(config) {
        this.currentLang = config.default || 'zh';
        this.config = config;
        this.storageKey = config.storageKey || 'preferredLanguage';
    }

    /**
     * 初始化语言管理器：设置初始语言、应用翻译、绑定事件
     */
    init() {
        this.setInitialLanguage();
        this.applyTranslations();
        this.bindEventListeners();
        this.updateLanguageButtons();
        
        console.log(`[LanguageManager] 初始化完成，当前语言：${this.currentLang}`);
    }

    /**
     * 设置初始语言
     * 优先级：URL ?lang= 参数 > localStorage 保存 > 浏览器语言偏好 > 默认
     */
    setInitialLanguage() {
        const urlLang = this.getUrlLanguage();
        const savedLang = this.getSavedLanguage();
        const browserLang = this.getBrowserLanguage();
        
        if (urlLang) {
            this.currentLang = urlLang;
            this.saveLanguage(urlLang);
        } else if (savedLang) {
            this.currentLang = savedLang;
        } else if (browserLang && this.config.supported.includes(browserLang)) {
            this.currentLang = browserLang;
        }
    }

    /**
     * 从 URL 获取语言参数
     * @returns {string|null}
     */
    getUrlLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        return lang && this.config.supported.includes(lang) ? lang : null;
    }

    /**
     * 从 localStorage 获取保存的语言
     * @returns {string|null}
     */
    getSavedLanguage() {
        const savedLang = localStorage.getItem(this.storageKey);
        return savedLang && this.config.supported.includes(savedLang) ? savedLang : null;
    }

    /**
     * 检测浏览器语言偏好，映射到支持的语言代码
     * @returns {string|null} 'zh' | 'en' | 'ru' | null
     */
    getBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || '';
        if (browserLang.startsWith('zh')) return 'zh';
        if (browserLang.startsWith('en')) return 'en';
        if (browserLang.startsWith('ru')) return 'ru';
        return null;
    }

    /**
     * 保存语言偏好到 localStorage
     * @param {string} lang
     */
    saveLanguage(lang) {
        localStorage.setItem(this.storageKey, lang);
    }

    /**
     * 获取指定语言的翻译文本（支持点号分隔的路径式访问）
     * @param {string} key - 翻译键路径，如 'page.title' 或 'server.joinGroup'
     * @param {string} [lang] - 语言代码，默认使用当前语言
     * @returns {string} 翻译文本或原始键名（未找到时）
     */
    getText(key, lang) {
        lang = lang || this.currentLang;
        const keys = key.split('.');
        let text = this.config.translations[lang];
        
        if (!text) {
            text = this.config.translations[this.config.default];
        }
        
        for (let k of keys) {
            if (text && typeof text === 'object' && k in text) {
                text = text[k];
            } else {
                return key;
            }
        }
        
        return text;
    }

    /**
     * 应用翻译到页面
     * 依次更新页面元信息、导航菜单和带 data-i18n 属性的动态内容
     */
    applyTranslations() {
        const translations = this.config.translations[this.currentLang];
        if (!translations) return;

        this.updatePageMetadata(translations.page);
        this.updateNavigationMenu(translations.nav);
        this.updateDynamicContent(translations);
    }

    /**
     * 更新页面元信息（标题、描述、关键词）
     * @param {Object} pageData - 页面元信息翻译
     */
    updatePageMetadata(pageData) {
        if (!pageData) return;
        
        if (pageData.title) {
            document.title = pageData.title;
        }
        if (pageData.description) {
            this.updateMetaTag('description', pageData.description);
        }
        if (pageData.keywords) {
            this.updateMetaTag('keywords', pageData.keywords);
        }
    }

    /**
     * 更新或创建 meta 标签
     * @param {string} name - meta 标签的 name 属性
     * @param {string} content - meta 标签的 content 值
     */
    updateMetaTag(name, content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (meta) {
            meta.setAttribute('content', content);
        } else {
            meta = document.createElement('meta');
            meta.setAttribute('name', name);
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
        }
    }

    /**
     * 更新导航菜单文本
     * 通过 data-nav 属性匹配导航元素
     * @param {Object} navData - 导航菜单翻译
     */
    updateNavigationMenu(navData) {
        if (!navData) return;
        
        Object.entries(navData).forEach(([key, value]) => {
            const element = document.querySelector(`[data-nav="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * 更新所有带 data-i18n 属性的元素
     * 根据元素类型智能设置文本、placeholder 或 title
     * @param {Object} translations - 当前语言的完整翻译对象
     */
    updateDynamicContent(translations) {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.getText(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.setAttribute('placeholder', text);
                } else {
                    element.value = text;
                }
            } else if (element.hasAttribute('title')) {
                element.setAttribute('title', text);
            } else {
                element.textContent = text;
            }
        });
    }

    /**
     * 更新所有语言按钮的 active 状态
     */
    updateLanguageButtons() {
        document.querySelectorAll('[data-lang]').forEach(button => {
            const lang = button.getAttribute('data-lang');
            button.classList.toggle('active', lang === this.currentLang);
        });
    }

    /**
     * 切换语言（带过渡动画）
     * @param {string} newLang - 目标语言代码
     */
    switchLanguage(newLang) {
        if (!this.config.supported.includes(newLang) || newLang === this.currentLang) return;

        const oldLang = this.currentLang;
        this.currentLang = newLang;
        this.saveLanguage(newLang);

        document.body.classList.add('lang-switching');
        
        setTimeout(() => {
            this.applyTranslations();
            this.updateLanguageButtons();
            document.body.classList.remove('lang-switching');

            // 触发自定义事件，供其他组件监听语言切换
            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { lang: newLang, oldLang: oldLang }
            }));

            console.log(`[LanguageManager] 语言切换：${oldLang} → ${newLang}`);
        }, 150);
    }

    /**
     * 绑定语言按钮的点击事件（事件委托）
     */
    bindEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-lang]')) {
                this.switchLanguage(e.target.getAttribute('data-lang'));
            }
        });
    }
}

window.LanguageManager = LanguageManager;
