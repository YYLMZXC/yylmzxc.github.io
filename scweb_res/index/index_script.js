/**
 * 多语言网站交互脚本
 * Multi-language Website Interaction Script
 * 
 * 处理语言切换、搜索表单、导航等交互功能
 * Handles language switching, search forms, navigation, etc.
 */

class LanguageManager {
    constructor() {
        this.currentLang = 'zh';
        this.config = null;
        this.init();
    }

    // 初始化
    async init() {
        try {
            // 等待语言配置加载
            await this.waitForLanguageConfig();
            
            // 获取用户语言偏好
            this.currentLang = this.getSavedLanguage() || this.getBrowserLanguage() || 'zh';
            
            // 初始化界面
            this.initializeInterface();
            
            // 绑定事件
            this.bindEvents();
            
            console.log(`LanguageManager initialized with language: ${this.currentLang}`);
        } catch (error) {
            console.error('LanguageManager initialization failed:', error);
        }
    }

    // 等待语言配置加载
    waitForLanguageConfig() {
        return new Promise((resolve) => {
            if (window.LanguageConfig) {
                this.config = window.LanguageConfig;
                resolve();
            } else {
                const checkConfig = () => {
                    if (window.LanguageConfig) {
                        this.config = window.LanguageConfig;
                        resolve();
                    } else {
                        setTimeout(checkConfig, 50);
                    }
                };
                checkConfig();
            }
        });
    }

    // 获取保存的语言设置
    getSavedLanguage() {
        return localStorage.getItem('preferredLanguage');
    }

    // 获取浏览器语言
    getBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('zh')) return 'zh';
        if (browserLang.startsWith('en')) return 'en';
        if (browserLang.startsWith('ru')) return 'ru';
        return null;
    }

    // 保存语言设置
    saveLanguage(lang) {
        localStorage.setItem('preferredLanguage', lang);
    }

    // 初始化界面
    initializeInterface() {
        this.updatePageContent();
        this.updateLanguageButtons();
    }

    // 绑定事件
    bindEvents() {
        // 语言切换按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-lang]')) {
                const lang = e.target.getAttribute('data-lang');
                if (this.config.supported.includes(lang)) {
                    this.switchLanguage(lang);
                }
            }
        });

        // 搜索表单
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleSearch.bind(this));
        }

        // 百度统计 (如果存在)
        if (typeof _hmt !== 'undefined') {
            this.setupBaiduAnalytics();
        }

        // 页面可见性变化
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // 切换语言
    switchLanguage(newLang) {
        if (!this.config.supported.includes(newLang) || newLang === this.currentLang) {
            return;
        }

        const oldLang = this.currentLang;
        this.currentLang = newLang;
        this.saveLanguage(newLang);

        // 添加切换动画效果
        document.body.classList.add('lang-switching');
        
        setTimeout(() => {
            this.updatePageContent();
            this.updateLanguageButtons();
            document.body.classList.remove('lang-switching');
        }, 150);

        console.log(`Language switched from ${oldLang} to ${newLang}`);
    }

    // 更新页面内容
    updatePageContent() {
        if (!this.config) return;

        const translations = this.config.translations[this.currentLang];
        
        // 更新页面标题和元信息
        this.updatePageMetadata(translations.page);
        
        // 更新导航菜单
        this.updateNavigation(translations.nav);
        
        // 更新搜索表单
        this.updateSearchForm(translations.search);
        
        // 更新站点信息
        this.updateSiteInfo(translations.site);
        
        // 更新导航区块
        this.updateNavigationSections(translations.sections);
        
        // 更新导航链接
        this.updateNavigationLinks();
        
        // 更新页脚
        this.updateFooter(translations.footer);
    }

    // 更新页面元信息
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

    // 更新meta标签
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

    // 更新导航菜单
    updateNavigation(navData) {
        const elements = {
            homeLink: document.getElementById('homeLink'),
            serverListLink: document.getElementById('serverListLink'),
            apiTutorialLink: document.getElementById('apiTutorialLink')
        };

        Object.keys(elements).forEach(key => {
            const element = elements[key];
            const dataKey = key.replace(/Link$/, '');
            if (element && navData[dataKey]) {
                element.textContent = navData[dataKey];
            }
        });
    }

    // 更新搜索表单
    updateSearchForm(searchData) {
        // 更新搜索选项
        const selectElement = document.getElementById('searchSelect');
        if (selectElement) {
            Array.from(selectElement.options).forEach(option => {
                const value = option.value;
                if (searchData[value]) {
                    option.textContent = searchData[value];
                }
            });
        }

        // 更新搜索占位符
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchData.placeholder) {
            searchInput.placeholder = searchData.placeholder;
        }
    }

    // 更新站点信息
    updateSiteInfo(siteData) {
        const elements = {
            currentAddress: document.getElementById('currentAddress'),
            shortUrl: document.getElementById('shortUrl')
        };

        // 获取干净的URL地址（不包含查询参数）
        const cleanUrl = window.location.origin + window.location.pathname;

        Object.keys(elements).forEach(key => {
            const element = elements[key];
            if (element && siteData[key]) {
                if (key === 'currentAddress') {
                    element.textContent = siteData[key] + cleanUrl;
                } else if (key === 'shortUrl') {
                    element.textContent = siteData[key] + 'https://scnet.top/';
                }
            }
        });
    }

    // 更新导航区块
    updateNavigationSections(sectionsData) {
        const cnSection = document.getElementById('cnNavigationTitle');
        const osSection = document.getElementById('osNavigationTitle');
        
        if (cnSection && sectionsData.cnNavigation) {
            cnSection.textContent = sectionsData.cnNavigation;
        }
        if (osSection && sectionsData.osNavigation) {
            osSection.textContent = sectionsData.osNavigation;
        }
    }

    // 更新导航链接
    updateNavigationLinks() {
        if (!this.config) return;

        // 更新CN导航
        const cnLinks = this.config.navigation.cn;
        const cnContainer = document.getElementById('cnNavigationLinks');
        if (cnContainer && cnLinks) {
            this.renderNavigationLinks(cnContainer, cnLinks);
        }

        // 更新OS导航
        const osLinks = this.config.navigation.os;
        const osContainer = document.getElementById('osNavigationLinks');
        if (osContainer && osLinks) {
            this.renderNavigationLinks(osContainer, osLinks);
        }
    }

    // 渲染导航链接
    renderNavigationLinks(container, links) {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        links.forEach(link => {
            const translations = this.config.translations[this.currentLang];
            const linkKey = link.title.replace('links.', '');
            const linkTitle = translations.links[linkKey] || link.title;
            
            const a = document.createElement('a');
            a.href = link.url;
            a.textContent = linkTitle;
            a.className = 'nav-link';
            if (link.external) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            
            fragment.appendChild(a);
        });

        container.appendChild(fragment);
    }

    // 更新页脚
    updateFooter(footerText) {
        const footer = document.querySelector('footer .copyright');
        if (footer) {
            footer.textContent = footerText;
        }
    }

    // 更新语言按钮
    updateLanguageButtons() {
        const buttons = document.querySelectorAll('[data-lang]');
        buttons.forEach(button => {
            const lang = button.getAttribute('data-lang');
            button.classList.toggle('active', lang === this.currentLang);
        });
    }

    // 处理搜索
    handleSearch(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const category = formData.get('category');
        const keyword = formData.get('keyword');
        
        console.log('Search submitted:', { category, keyword });
        
        // 这里可以添加实际的搜索逻辑
        // 例如跳转到搜索页面或执行AJAX搜索
        if (keyword.trim()) {
            alert(`搜索: ${keyword} (分类: ${category})`);
        }
    }

    // 设置百度统计
    setupBaiduAnalytics() {
        // 百度统计代码已经通过<script>标签引入，这里可以添加额外的统计逻辑
        console.log('Baidu Analytics initialized');
    }

    // 页面可见性变化处理
    handleVisibilityChange() {
        if (!document.hidden && this.config) {
            // 页面变为可见时，可以更新一些动态内容
            console.log('Page became visible, language:', this.currentLang);
        }
    }
}

// 搜索功能类
class SearchManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindSearchEvents();
    }

    bindSearchEvents() {
        // 搜索建议功能（如果有输入框）
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }
    }

    handleSearchInput(e) {
        const value = e.target.value;
        // 这里可以添加搜索建议逻辑
        console.log('Search input:', value);
    }
}

// 工具函数
const Utils = {
    // 平滑滚动到元素
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    // 复制文本到剪贴板
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('Text copied to clipboard');
            });
        } else {
            // 降级处理
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化语言管理器
    const languageManager = new LanguageManager();
    
    // 初始化搜索管理器
    const searchManager = new SearchManager();
    
    // 将管理器设置为全局变量（可选）
    window.languageManager = languageManager;
    window.searchManager = searchManager;
    window.Utils = Utils;
    
    console.log('SCWeb application initialized');
});

// 页面卸载时的清理工作
window.addEventListener('beforeunload', function() {
    console.log('Page unloading...');
});