/**
 * 多语言网站交互脚本
 * Multi-language Website Interaction Script
 * 功能：语言切换、搜索处理、导航渲染、响应式适配
 */

class LanguageManager {
    constructor() {
        this.currentLang = 'zh';
        this.config = null;
        this.init();
    }

    /** 初始化入口 */
    async init() {
        try {
            await this.loadLanguageConfig();
            this.setInitialLanguage();
            this.renderPageContent();
            this.bindEventListeners();
            
            console.log(`[LanguageManager] 初始化完成，当前语言：${this.currentLang}`);
        } catch (error) {
            console.error('[LanguageManager] 初始化失败：', error);
        }
    }

    /** 加载语言配置 */
    async loadLanguageConfig() {
        if (window.LanguageConfig) {
            this.config = window.LanguageConfig;
            return;
        }

        // 轮询等待配置加载（最多10秒）
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('语言配置加载超时'));
            }, 10000);

            const checkConfig = () => {
                if (window.LanguageConfig) {
                    clearTimeout(timeout);
                    this.config = window.LanguageConfig;
                    resolve();
                } else {
                    setTimeout(checkConfig, 50);
                }
            };

            checkConfig();
        });
    }

    /** 设置初始语言（优先级：URL参数 > 本地存储 > 浏览器语言 > 默认语言） */
    setInitialLanguage() {
        const urlLang = this.getUrlLanguage();
        const savedLang = this.getSavedLanguage();
        const browserLang = this.getBrowserLanguage();
        
        if (urlLang) {
            this.currentLang = urlLang;
            this.saveLanguage(urlLang);
        } else if (savedLang) {
            this.currentLang = savedLang;
        } else if (browserLang) {
            this.currentLang = browserLang;
        } else {
            this.currentLang = this.config.default || 'zh';
        }
    }

    /** 从URL获取语言参数 */
    getUrlLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const lang = urlParams.get('lang');
        return lang && this.config.supported.includes(lang) ? lang : null;
    }

    /** 从本地存储获取语言 */
    getSavedLanguage() {
        const savedLang = localStorage.getItem('preferredLanguage');
        return savedLang && this.config.supported.includes(savedLang) ? savedLang : null;
    }

    /** 获取浏览器语言 */
    getBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || '';
        if (browserLang.startsWith('zh')) return 'zh';
        if (browserLang.startsWith('en')) return 'en';
        if (browserLang.startsWith('ru')) return 'ru';
        return null;
    }

    /** 保存语言到本地存储 */
    saveLanguage(lang) {
        localStorage.setItem('preferredLanguage', lang);
    }

    /** 渲染页面所有内容 */
    renderPageContent() {
        const translations = this.config.translations[this.currentLang];
        if (!translations) return;

        this.updatePageMetadata(translations.page);
        this.updateNavigationMenu(translations.nav);
        this.updateSearchForm(translations.search);
        this.updateSiteInfo(translations.site);
        this.updateSectionTitles(translations.sections);
        this.renderNavigationLinks();
        this.updateFooter(translations.footer);
        this.updateLanguageButtons();
    }

    /** 更新页面元信息（标题、描述、关键词） */
    updatePageMetadata(pageData) {
        if (pageData.title) {
            document.title = pageData.title;
            this.updateMetaTag('title', pageData.title);
        }
        if (pageData.description) {
            this.updateMetaTag('description', pageData.description, 'name');
        }
        if (pageData.keywords) {
            this.updateMetaTag('keywords', pageData.keywords, 'name');
        }
    }

    /** 更新单个meta标签 */
    updateMetaTag(name, content, attribute = 'name') {
        let meta = document.querySelector(`meta[${attribute}="${name}"]`);
        if (meta) {
            meta.setAttribute('content', content);
        } else {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, name);
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
        }
    }

    /** 更新导航菜单文本 */
    updateNavigationMenu(navData) {
        const navElements = {
            homeLink: 'home',
            serverListLink: 'serverList',
            apiTutorialLink: 'apiTutorial'
        };

        Object.entries(navElements).forEach(([elementId, dataKey]) => {
            const element = document.getElementById(elementId);
            if (element && navData[dataKey]) {
                element.textContent = navData[dataKey];
            }
        });
    }

    /** 更新搜索表单 */
    updateSearchForm(searchData) {
        // 更新下拉选项
        const selectElement = document.getElementById('searchSelect');
        if (selectElement) {
            Array.from(selectElement.options).forEach(option => {
                const value = option.value || option.dataset.i18n?.replace('search.', '');
                if (value && searchData[value]) {
                    option.textContent = searchData[value];
                }
            });
        }

        // 更新输入框占位符
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchData.placeholder) {
            searchInput.placeholder = searchData.placeholder;
        }

        // 更新搜索按钮文本
        const searchButton = document.querySelector('.search-button');
        if (searchButton && searchData.submit) {
            searchButton.textContent = searchData.submit;
        }
    }

    /** 更新站点信息 */
    updateSiteInfo(siteData) {
        const currentUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        
        // 更新当前地址
        const currentAddressEl = document.getElementById('currentAddress');
        if (currentAddressEl && siteData.currentAddress) {
            currentAddressEl.innerHTML = `${siteData.currentAddress + currentUrl}<br>`;
        }

        // 更新短网址
        const shortUrlEl = document.getElementById('shortUrl');
        if (shortUrlEl && siteData.shortUrl && siteData.shortUrl2) {
            shortUrlEl.innerHTML = `
                ${siteData.shortUrl}
                <a href="https://scnet.top/" target="_blank" rel="noopener">
                    scnet.top <span style="font-size: 0.8em; color: #666;">https://scnet.top/</span>
                </a>
                <br>
                ${siteData.shortUrl2}
                <a href="https://schub.icu/" target="_blank" rel="noopener">
                    schub.icu <span style="font-size: 0.8em; color: #666;">https://schub.icu/</span>
                </a>
            `;
        }
    }

    /** 更新区块标题 */
    updateSectionTitles(sectionsData) {
        const cnTitleEl = document.getElementById('cnNavigationTitle');
        const osTitleEl = document.getElementById('osNavigationTitle');
        
        if (cnTitleEl && sectionsData.cnNavigation) {
            cnTitleEl.textContent = sectionsData.cnNavigation;
        }
        if (osTitleEl && sectionsData.osNavigation) {
            osTitleEl.textContent = sectionsData.osNavigation;
        }
    }

    /** 渲染导航链接 */
    renderNavigationLinks() {
        const translations = this.config.translations[this.currentLang];
        
        // 渲染中文导航
        this.renderLinkGroup('cnNavigationLinks', this.config.navigation.cn, translations.links);
        
        // 渲染海外导航
        this.renderLinkGroup('osNavigationLinks', this.config.navigation.os, translations.links);
    }

    /** 渲染单个链接组 */
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

    /** 更新页脚 */
    updateFooter(footerText) {
        const footerEl = document.querySelector('footer .copyright');
        if (footerEl) {
            footerEl.textContent = footerText;
        }
    }

    /** 更新语言按钮状态 */
    updateLanguageButtons() {
        document.querySelectorAll('[data-lang]').forEach(button => {
            const lang = button.getAttribute('data-lang');
            button.classList.toggle('active', lang === this.currentLang);
        });
        
        this.initRippleEffect();
    }

    /** 初始化波纹效果 */
    initRippleEffect() {
        document.querySelectorAll('.language-btn').forEach(button => {
            button.removeEventListener('click', this.createRipple.bind(this));
            button.addEventListener('click', this.createRipple.bind(this));
        });
    }

    /** 创建波纹效果 */
    createRipple(e) {
        const button = e.currentTarget;
        
        // 清除现有波纹
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) existingRipple.remove();
        
        // 创建新波纹
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${e.clientY - button.offsetTop - radius}px`;
        circle.classList.add('ripple');
        
        button.appendChild(circle);
    }

    /** 切换语言 */
    switchLanguage(newLang) {
        if (!this.config.supported.includes(newLang) || newLang === this.currentLang) return;

        const oldLang = this.currentLang;
        this.currentLang = newLang;
        this.saveLanguage(newLang);

        // 添加切换动画
        document.body.classList.add('lang-switching');
        
        setTimeout(() => {
            this.renderPageContent();
            document.body.classList.remove('lang-switching');
            console.log(`[LanguageManager] 语言切换：${oldLang} → ${newLang}`);
        }, 150);
    }

    /** 处理搜索提交 */
    handleSearchSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const category = formData.get('category');
        const keyword = formData.get('keyword').trim();
        
        if (!keyword) {
            alert(this.config.translations[this.currentLang].search.placeholder || '请输入搜索关键词');
            return;
        }
        
        console.log('[Search] 搜索提交：', { category, keyword });
        // 实际项目中可替换为：window.location.href = `search.php?category=${category}&keyword=${encodeURIComponent(keyword)}`;
        alert(`搜索关键词：${keyword}\n分类：${category || '任意分类'}`);
    }

    /** 绑定所有事件监听器 */
    bindEventListeners() {
        // 语言切换按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-lang]')) {
                this.switchLanguage(e.target.getAttribute('data-lang'));
            }
        });

        // 搜索表单提交
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleSearchSubmit.bind(this));
        }

        // 百度统计初始化
        if (typeof _hmt !== 'undefined') {
            console.log('[Analytics] 百度统计已初始化');
        }

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[Page] 页面激活，当前语言：', this.currentLang);
            }
        });
    }
}

/** 搜索管理器（扩展搜索功能） */
class SearchManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindSearchInputEvents();
    }

    /** 绑定搜索输入事件 */
    bindSearchInputEvents() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // 防抖处理输入事件
        const debouncedInput = Utils.debounce((value) => {
            console.log('[Search] 输入内容：', value);
            // 可添加搜索建议逻辑
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedInput(e.target.value.trim());
        });
    }
}

/** 工具函数集合 */
const Utils = {
    /** 平滑滚动到元素 */
    scrollToElement(elementId, behavior = 'smooth') {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior, block: 'start' });
        }
    },

    /** 复制文本到剪贴板 */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text)
                .then(() => console.log('[Utils] 文本已复制到剪贴板'))
                .catch(err => console.error('[Utils] 复制失败：', err));
        }

        // 降级处理（兼容旧浏览器）
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('[Utils] 文本已复制到剪贴板（降级模式）');
    },

    /** 防抖函数 */
    debounce(func, wait = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /** 节流函数 */
    throttle(func, limit = 300) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= limit) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }
};

/** 页面加载完成后初始化应用 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化核心模块
    const languageManager = new LanguageManager();
    const searchManager = new SearchManager();
    
    // 暴露到全局（方便调试和外部调用）
    window.app = {
        languageManager,
        searchManager,
        Utils
    };
    
    console.log('[App] 生存战争网应用初始化完成');
});

/** 页面卸载清理 */
window.addEventListener('beforeunload', () => {
    console.log('[App] 页面即将卸载');
});