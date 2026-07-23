class IndexPageManager {
    constructor() {
        this.init();
    }

    init() {
        this.initTheme();
        this.initLanguage();
        this.initSiteInfo();
        this.bindEvents();
        console.log('[IndexPageManager] 初始化完成');
    }

    initTheme() {
        if (window.ThemeManager) {
            this.themeManager = new window.ThemeManager();
        } else {
            console.warn('[IndexPageManager] ThemeManager 未加载');
        }
    }

    initLanguage() {
        const mergedConfig = this.mergeConfigs(window.SiteLanguageConfig, window.IndexLanguageConfig);

        if (window.LanguageManager) {
            this.languageManager = new window.LanguageManager(mergedConfig);
            this.languageManager.init();
        } else {
            console.warn('[IndexPageManager] LanguageManager 未加载');
        }

        this.renderNavigationLinks(this.languageManager.currentLang);
    }

    mergeConfigs(baseConfig, pageConfig) {
        const merged = {
            default: pageConfig.default || baseConfig.default,
            supported: pageConfig.supported || baseConfig.supported,
            storageKey: pageConfig.storageKey || baseConfig.storageKey,
            names: pageConfig.names || baseConfig.names,
            translations: {},
            navigation: pageConfig.navigation
        };

        const languages = [...new Set([
            ...Object.keys(baseConfig.translations || {}),
            ...Object.keys(pageConfig.translations || {})
        ])];

        languages.forEach(lang => {
            const base = (baseConfig.translations && baseConfig.translations[lang]) || {};
            const page = (pageConfig.translations && pageConfig.translations[lang]) || {};
            merged.translations[lang] = this.deepMerge(base, page);
        });

        return merged;
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    initSiteInfo() {
        if (window.SiteInfoManager && this.languageManager) {
            this.siteInfoManager = new window.SiteInfoManager(this.languageManager);
            this.siteInfoManager.init();
        }
    }

    bindEvents() {
        document.addEventListener('languageChanged', (e) => {
            const lang = e.detail ? e.detail.lang : this.languageManager.currentLang;
            this.renderNavigationLinks(lang);
            this.updatePageSpecificContent(lang);
        });

        const lang = this.languageManager.currentLang;
        this.updatePageSpecificContent(lang);
    }

    updatePageSpecificContent(lang) {
        const translations = this.languageManager.config.translations[lang];
        if (!translations) return;

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
    }

    renderNavigationLinks(lang) {
        const config = this.languageManager.config;
        const translations = config.translations[lang] || config.translations[config.default];

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
