class LanguageManager {
    constructor(config) {
        this.currentLang = config.default || 'zh';
        this.config = config;
        this.storageKey = config.storageKey || 'preferredLanguage';
    }

    init() {
        this.setInitialLanguage();
        this.applyTranslations();
        this.bindEventListeners();
        this.updateLanguageButtons();
        
        console.log(`[LanguageManager] 初始化完成，当前语言：${this.currentLang}`);
    }

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

    getUrlLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        return lang && this.config.supported.includes(lang) ? lang : null;
    }

    getSavedLanguage() {
        const savedLang = localStorage.getItem(this.storageKey);
        return savedLang && this.config.supported.includes(savedLang) ? savedLang : null;
    }

    getBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || '';
        if (browserLang.startsWith('zh')) return 'zh';
        if (browserLang.startsWith('en')) return 'en';
        if (browserLang.startsWith('ru')) return 'ru';
        return null;
    }

    saveLanguage(lang) {
        localStorage.setItem(this.storageKey, lang);
    }

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

    applyTranslations() {
        const translations = this.config.translations[this.currentLang];
        if (!translations) return;

        this.updatePageMetadata(translations.page);
        this.updateNavigationMenu(translations.nav);
        this.updateDynamicContent(translations);
    }

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

    updateNavigationMenu(navData) {
        if (!navData) return;
        
        Object.entries(navData).forEach(([key, value]) => {
            const element = document.querySelector(`[data-nav="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }

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

    updateLanguageButtons() {
        document.querySelectorAll('[data-lang]').forEach(button => {
            const lang = button.getAttribute('data-lang');
            button.classList.toggle('active', lang === this.currentLang);
        });
    }

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

            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { lang: newLang, oldLang: oldLang }
            }));

            console.log(`[LanguageManager] 语言切换：${oldLang} → ${newLang}`);
        }, 150);
    }

    bindEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-lang]')) {
                this.switchLanguage(e.target.getAttribute('data-lang'));
            }
        });
    }
}

window.LanguageManager = LanguageManager;
