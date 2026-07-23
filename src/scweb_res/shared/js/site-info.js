/**
 * 生存战争网 - 站点信息管理器
 * 处理站点地址、短网址等通用信息的动态显示
 * 监听语言切换事件自动更新多语言站点信息
 * 挂载到全局 window.SiteInfoManager
 */

class SiteInfoManager {
    /**
     * @param {LanguageManager} languageManager - 语言管理器实例
     */
    constructor(languageManager) {
        this.languageManager = languageManager;
        this.shortUrls = [
            { url: 'https://scnet.top/', name: 'scnet.top' },
            { url: 'https://schub.icu/', name: 'schub.icu' },
            { url: 'https://scwz.top/', name: 'scwz.top' }
        ];
    }

    /**
     * 初始化站点信息管理器
     * 更新初始站点信息并监听语言切换事件
     */
    init() {
        this.updateSiteInfo();
        document.addEventListener('languageChanged', (e) => {
            this.updateSiteInfo();
        });
    }

    /**
     * 根据当前语言和页面更新站点信息（地址和短网址）
     */
    updateSiteInfo() {
        const currentUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        const lang = this.languageManager.currentLang;
        const translations = this.languageManager.config.translations[lang];

        this.updateCurrentAddress(currentUrl, translations);
        this.updateShortUrls(translations);
    }

    /**
     * 更新当前站点地址显示
     * @param {string} currentUrl - 当前页面的主机名和端口
     * @param {Object} translations - 当前语言的翻译对象
     */
    updateCurrentAddress(currentUrl, translations) {
        const currentAddressEl = document.getElementById('currentAddress');
        if (!currentAddressEl) return;

        const prefix = translations && translations.siteInfo && translations.siteInfo.currentAddress
            ? translations.siteInfo.currentAddress
            : (translations && translations.site ? translations.site.currentAddress : '本站地址：');

        currentAddressEl.textContent = prefix + currentUrl;
    }

    /**
     * 更新短网址链接列表
     * @param {Object} translations - 当前语言的翻译对象
     */
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