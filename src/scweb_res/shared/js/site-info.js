/* ========================================
   生存战争网 站点信息管理器
   处理站点地址、短网址等通用信息
======================================== */

class SiteInfoManager {
    constructor(languageManager) {
        this.languageManager = languageManager;
        this.shortUrls = [
            { url: 'https://scnet.top/', name: 'scnet.top' },
            { url: 'https://schub.icu/', name: 'schub.icu' },
            { url: 'https://scwz.top/', name: 'scwz.top' }
        ];
    }

    init() {
        this.updateSiteInfo();
        document.addEventListener('languageChanged', (e) => {
            this.updateSiteInfo();
        });
    }

    updateSiteInfo() {
        const currentUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        const lang = this.languageManager.currentLang;
        const translations = this.languageManager.config.translations[lang];

        this.updateCurrentAddress(currentUrl, translations);
        this.updateShortUrls(translations);
    }

    updateCurrentAddress(currentUrl, translations) {
        const currentAddressEl = document.getElementById('currentAddress');
        if (!currentAddressEl) return;

        const prefix = translations && translations.siteInfo && translations.siteInfo.currentAddress
            ? translations.siteInfo.currentAddress
            : (translations && translations.site ? translations.site.currentAddress : '本站地址：');

        currentAddressEl.textContent = prefix + currentUrl;
    }

    updateShortUrls(translations) {
        const shortUrlEl = document.getElementById('shortUrl');
        if (!shortUrlEl) return;

        const prefix = translations && translations.siteInfo && translations.siteInfo.shortUrl
            ? translations.siteInfo.shortUrl
            : (translations && translations.site ? translations.site.shortUrl : '短网址：');

        let html = prefix;
        this.shortUrls.forEach((site) => {
            html += `<br><a href="${site.url}" target="_blank" rel="noopener">
                ${site.name} <span class="site-info-short-url">${site.url}</span>
            </a>`;
        });

        shortUrlEl.innerHTML = html;
    }
}

window.SiteInfoManager = SiteInfoManager;