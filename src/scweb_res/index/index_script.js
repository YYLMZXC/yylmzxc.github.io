class IndexPageManager {
    constructor() {
        this.init();
    }

    init() {
        this.languageConfig = window.IndexLanguageConfig;
        this.initTheme();
        this.initLanguageSelector();
        this.renderNavigationLinks();
        console.log('[IndexPageManager] 初始化完成');
    }

    initTheme() {
        if (window.ThemeManager) {
            this.themeManager = new window.ThemeManager();
        } else {
            console.warn('[IndexPageManager] ThemeManager 未加载');
        }
    }

    initLanguageSelector() {
        const buttons = document.querySelectorAll('.language-btn');
        const savedLang = localStorage.getItem('preferredLanguage') || this.languageConfig.default;
        
        this.setLanguage(savedLang);
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const lang = button.getAttribute('data-lang');
                this.setLanguage(lang);
            });
        });
    }

    setLanguage(lang) {
        if (!this.languageConfig.supported.includes(lang)) return;
        
        localStorage.setItem('preferredLanguage', lang);
        this.applyTranslations(lang);
        this.updateLanguageButtons(lang);
    }

    applyTranslations(lang) {
        const translations = this.languageConfig.translations[lang];
        if (!translations) return;

        if (translations.page) {
            document.title = translations.page.title || document.title;
        }

        if (translations.nav) {
            Object.entries(translations.nav).forEach(([key, value]) => {
                const element = document.querySelector(`[data-nav="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        }

        if (translations.sections) {
            const cnTitle = document.getElementById('cnNavigationTitle');
            const osTitle = document.getElementById('osNavigationTitle');
            if (cnTitle && translations.sections.cnNavigation) {
                cnTitle.textContent = translations.sections.cnNavigation;
            }
            if (osTitle && translations.sections.osNavigation) {
                osTitle.textContent = translations.sections.osNavigation;
            }
        }

        this.renderNavigationLinks(lang);

        if (translations.site) {
            this.updateSiteInfo(translations.site);
        }

        if (translations.footer) {
            const footerEl = document.querySelector('.copyright');
            if (footerEl) {
                footerEl.textContent = translations.footer;
            }
        }

        this.updateDynamicContent(lang);
    }

    updateDynamicContent(lang) {
        const translations = this.languageConfig.translations[lang];
        if (!translations) return;

        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.getText(key, lang);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.setAttribute('placeholder', text);
                }
            } else {
                element.textContent = text;
            }
        });
    }

    getText(key, lang) {
        const keys = key.split('.');
        let text = this.languageConfig.translations[lang];
        
        if (!text) {
            text = this.languageConfig.translations[this.languageConfig.default];
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

    updateSiteInfo(siteData) {
        const currentUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        
        const currentAddressEl = document.getElementById('currentAddress');
        if (currentAddressEl && siteData.currentAddress) {
            currentAddressEl.innerHTML = `${siteData.currentAddress + currentUrl}<br>`;
        }

        const shortUrlEl = document.getElementById('shortUrl');
        if (shortUrlEl && siteData.shortUrl) {
            shortUrlEl.innerHTML = `
                ${siteData.shortUrl}
                <a href="https://scnet.top/" target="_blank" rel="noopener">
                    scnet.top <span style="font-size: 0.8em; color: #666;">https://scnet.top/</span>
                </a>
                <br>
                ${siteData.shortUrl2 || '短网址2：'}
                <a href="https://schub.icu/" target="_blank" rel="noopener">
                    schub.icu <span style="font-size: 0.8em; color: #666;">https://schub.icu/</span>
                </a>
                <br>
                ${siteData.shortUrl3 || '短网址3：'}
                <a href="https://scwz.top/" target="_blank" rel="noopener">
                    scwz.top <span style="font-size: 0.8em; color: #666;">https://scwz.top/</span>
                </a>
            `;
        }
    }

    updateLanguageButtons(lang) {
        document.querySelectorAll('.language-btn').forEach(button => {
            const btnLang = button.getAttribute('data-lang');
            button.classList.toggle('active', btnLang === lang);
        });
    }

    renderNavigationLinks(lang) {
        const config = this.languageConfig;
        const currentLang = lang || localStorage.getItem('preferredLanguage') || config.default;
        const translations = config.translations[currentLang] || config.translations[config.default];

        if (config.navigation) {
            this.renderLinkGroup('cnNavigationLinks', config.navigation.cn, translations.links);
            this.renderLinkGroup('osNavigationLinks', config.navigation.os, translations.links);
        }
    }

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
    new IndexPageManager();
});
