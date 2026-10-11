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
    }

    /** 短网址的出厂兜底（页面没加载设置数据层时也照常显示） */
    static DEFAULT_SHORT_URL = 'scnet.top';
    static DEFAULT_YEAR = '2026';

    /** 当前生效的短网址设置（加载了设置数据层时读数据库全局值，否则用出厂默认） */
    getShortUrlSetting() {
        if (window.SettingsStore) return SettingsStore.getShortUrl();
        return SiteInfoManager.DEFAULT_SHORT_URL;
    }

    /** 当前生效的版权年份设置 */
    getCopyrightYear() {
        if (window.SettingsStore) return SettingsStore.getCopyrightYear();
        return SiteInfoManager.DEFAULT_YEAR;
    }

    /**
     * 把短网址设置整理成 { url, name }：
     * 只写域名时自动补 https://，写完整 URL 时照原样用
     * @param {string} raw - 短网址设置值
     * @returns {{url: string, name: string}}
     */
    static formatShortUrl(raw) {
        const s = String(raw || '').trim() || SiteInfoManager.DEFAULT_SHORT_URL;
        const hasScheme = /^https?:\/\//i.test(s);
        return {
            url: hasScheme ? s : ('https://' + s + '/'),
            name: s.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
        };
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
        // 只走 LanguageManager 公开接口，不直接读其内部 currentLang / config
        const translations = this.languageManager.getTranslations();

        this.updateCurrentAddress(currentUrl, translations);
        this.updateShortUrls(translations);
        this.updateCopyright(translations);
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
            : (translations && translations.site ? translations.site.currentAddress : '当前访问地址：');

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

        const site = SiteInfoManager.formatShortUrl(this.getShortUrlSetting());
        shortUrlEl.innerHTML = prefix +
            ` <a href="${site.url}" target="_blank" rel="noopener">${site.name}</a>`;
    }

    /**
     * 更新页脚版权「© 年份 站名」：文案取当前语言的 footer 翻译，
     * 其中的年份替换为全局设置里的版权年份（可在 ⚙️ 设置里改）
     * @param {Object} translations - 当前语言的翻译对象
     */
    updateCopyright(translations) {
        const el = document.querySelector('.copyright a') || document.querySelector('.copyright');
        if (!el) return;

        const base = translations && typeof translations.footer === 'string'
            ? translations.footer
            : el.textContent;
        const year = this.getCopyrightYear();
        el.textContent = /(19|20)\d{2}/.test(base)
            ? base.replace(/(19|20)\d{2}/, year)
            : base;
    }
}

window.SiteInfoManager = SiteInfoManager;