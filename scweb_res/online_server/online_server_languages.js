/**
 * Online Server多语言配置文件
 * Online Server Multi-language Configuration File
 * 
 * 这个文件包含联机服务器页面的所有语言支持
 * This file contains all language support for the server list page
 */

// 语言配置
const ServerLanguageConfig = {
    // 默认语言
    default: 'zh',
    
    // 支持的语言
    supported: ['zh', 'en', 'ru'],
    
    // 语言显示名称
    names: {
        'zh': '🇨🇳 中文',
        'en': '🇺🇸 English', 
        'ru': '🇷🇺 Русский'
    },
    
    // 页面翻译内容
    translations: {
        zh: {
            // 页面元信息
            page: {
                title: '生存战争联机服务器列表 | SC中文社区',
                description: '生存战争联机服务器列表，包括原版生存服、MOD服、商店服等多种类型服务器，加入我们的QQ群获取更多信息。',
                keywords: '生存战争联机服务器,生存战争服务器地址,SC联机服,生存战争MOD服,生存战争原版服'
            },
            
            // 导航菜单
            nav: {
                home: '首页',
                serverList: '联机服务器列表',
                apiTutorial: 'APImod制作教程'
            },
            
            // 服务器统计
            stats: {
                title: '服务器统计',
                total: '总计：',
                servers: '个服务器',
                original: '原版：',
                mod: '模组：',
                store: '商店：'
            },
            
            // 服务器筛选
            filters: {
                title: '筛选服务器：',
                allServers: '全部服务器',
                originalSurvival: '原版生存',
                modServer: '模组服务器',
                storeServer: '商店服务器'
            },
            
            // 服务器信息
            server: {
                clickToCopy: '点击复制',
                copied: '已复制!',
                copyFailed: '复制失败',
                groupNumber: '群号：',
                joinGroup: '欢迎加入我们的交流群：',
                managementOffice: '联机服列表管理办事处：',
                noServers: '暂无符合条件的服务器',
                ping: '检测延迟...',
                pingTimeout: '超时',
                pingUnreachable: '无法连接',
                pingUnit: 'ms',
                
                // 服务器类型
                types: {
                    original: '原版',
                    mod: '模组',
                    store: '商店',
                    unknown: '未知'
                },
                
                // 群聊信息
                groups: {
                    main: '生存战争34服务器联机交流群',
                    mainNumber: '826823481',
                    management: '开服申请点击加入',
                    managementNumber: '893387376'
                },
                
                // 服务器备注信息
                notes: {
                    modServer: '加群获取MOD',
                    comingSoon: '即将开服',
                    testServer: '测试服务器',
                    maintenance: '维护中'
                }
            },
            
            // 页脚
            footer: '© 2025 生存战争网'
        },
        
        en: {
            // 页面元信息
            page: {
                title: 'SurvivalCraft Server List | SC English Community',
                description: 'SurvivalCraft server list, including original survival servers, MOD servers, store servers and other types. Join our QQ group for more information.',
                keywords: 'SurvivalCraft Server,SurvivalCraft Server Address,SC Multiplayer Server,SurvivalCraft MOD Server,SurvivalCraft Original Server'
            },
            
            // 导航菜单
            nav: {
                home: 'Home',
                serverList: 'Server List',
                apiTutorial: 'API Mod Tutorial'
            },
            
            // 服务器统计
            stats: {
                title: 'Server Statistics',
                total: 'Total: ',
                servers: ' servers',
                original: 'Original: ',
                mod: 'MOD: ',
                store: 'Store: '
            },
            
            // 服务器筛选
            filters: {
                title: 'Filter Servers:',
                allServers: 'All Servers',
                originalSurvival: 'Original Survival',
                modServer: 'MOD Server',
                storeServer: 'Store Server'
            },
            
            // 服务器信息
            server: {
                clickToCopy: 'Click to copy',
                copied: 'Copied!',
                copyFailed: 'Copy failed',
                groupNumber: 'Group: ',
                joinGroup: 'Welcome to join our discussion group: ',
                managementOffice: 'Server List Management Office: ',
                noServers: 'No servers found',
                ping: 'Testing latency...',
                pingTimeout: 'Timeout',
                pingUnreachable: 'Unreachable',
                pingUnit: 'ms',
                
                // 服务器类型
                types: {
                    original: 'Original',
                    mod: 'MOD',
                    store: 'Store',
                    unknown: 'Unknown'
                },
                
                // 群聊信息
                groups: {
                    main: 'SurvivalCraft Server Multiplayer Discussion Group',
                    mainNumber: '826823481',
                    management: 'Apply to Join Server Management',
                    managementNumber: '893387376'
                },
                
                // 服务器备注信息
                notes: {
                    modServer: 'Join group to get MOD',
                    comingSoon: 'Coming soon',
                    testServer: 'Test server',
                    maintenance: 'Under maintenance'
                }
            },
        
        // 服务器名称翻译
        serverNames: {
            '土豆测试服1': 'Potato Test Server 1',
            '土豆测试服2': 'Potato Test Server 2',
            '土豆测试服3': 'Potato Test Server 3',
            '土豆测试服4': 'Potato Test Server 4',
            '大厅测试服5': 'Lobby Test Server 5'
        },
        
        // 页脚
        footer: '© 2025 SurvivalCraft Web'
    },
    
    ru: {
        // 页面元信息
            page: {
                title: 'Список Серверов SurvivalCraft | SC Русское Сообщество',
                description: 'Список серверов SurvivalCraft, включая оригинальные выживание серверы, MOD серверы, магазин серверы и другие типы. Присоединяйтесь к нашей QQ группе для получения дополнительной информации.',
                keywords: 'Сервер SurvivalCraft,Адрес Сервера SurvivalCraft,Мультиплеер Сервер SurvivalCraft,MOD Сервер SurvivalCraft,Оригинальный Сервер SurvivalCraft'
            },
            
            // 导航菜单
            nav: {
                home: 'Главная',
                serverList: 'Список Серверов',
                apiTutorial: 'API Mod Урок'
            },
            
            // 服务器统计
            stats: {
                title: 'Статистика Серверов',
                total: 'Всего: ',
                servers: ' серверов',
                original: 'Оригинальных: ',
                mod: 'MOD: ',
                store: 'Магазин: '
            },
            
            // 服务器筛选
            filters: {
                title: 'Фильтр Серверов:',
                allServers: 'Все Серверы',
                originalSurvival: 'Оригинальное Выживание',
                modServer: 'MOD Сервер',
                storeServer: 'Магазин Сервер'
            },
            
            // 服务器信息
            server: {
                clickToCopy: 'Нажмите для копирования',
                copied: 'Скопировано!',
                copyFailed: 'Ошибка копирования',
                groupNumber: 'Группа: ',
                joinGroup: 'Добро пожаловать в нашу группу обсуждения: ',
                managementOffice: 'Управление Списком Серверов: ',
                noServers: 'Серверы не найдены',
                ping: 'Проверка задержки...',
                pingTimeout: 'Тайм-аут',
                pingUnreachable: 'Недоступно',
                pingUnit: 'мс',
                
                // 服务器类型
                types: {
                    original: 'Оригинал',
                    mod: 'MOD',
                    store: 'Магазин',
                    unknown: 'Неизвестно'
                },
                
                // 群聊信息
                groups: {
                    main: 'Группа Обсуждения Мультиплеер Серверов SurvivalCraft',
                    mainNumber: '826823481',
                    management: 'Подать Заявку на Управление Сервером',
                    managementNumber: '893387376'
                },
                
                // 服务器备注信息
                notes: {
                    modServer: 'Вступите в группу для получения MOD',
                    comingSoon: 'Скоро откроется',
                    testServer: 'Тестовый сервер',
                    maintenance: 'На техническом обслуживании'
                }
            },
        // 服务器名称翻译
        serverNames: {
            '土豆测试服1': 'Картофельный Тестовый Сервер 1',
            '土豆测试服2': 'Картофельный Тестовый Сервер 2',
            '土豆测试服3': 'Картофельный Тестовый Сервер 3',
            '土豆测试服4': 'Картофельный Тестовый Сервер 4',
            '大厅测试服5': 'Лобби Тестовый Сервер 5'
        },
        
            
            // 页脚
            footer: '© 2025 SurvivalCraft Web'
        },
        
       
    },
    
    // 获取翻译文本
    getText: function(key, lang) {
        lang = lang || this.default;
        const keys = key.split('.');
        let text = this.translations[lang];
        
        if (!text) {
            text = this.translations[this.default];
        }
        
        for (let k of keys) {
            if (text && typeof text === 'object' && k in text) {
                text = text[k];
            } else {
                return key; // 返回键名如果翻译不存在
            }
        }
        
        return text;
    },
    
    // 获取服务器名称翻译
    getServerName: function(serverName, lang) {
        lang = lang || this.default;
        const serverNames = this.translations[lang]?.serverNames || this.translations[this.default].serverNames;
        
        if (serverNames && serverNames[serverName]) {
            return serverNames[serverName];
        }
        
        return serverName; // 如果没有翻译，返回原名称
    },
    
    // 更新页面文本
updatePageTexts: function(lang) {
    // 1. 处理普通带data-i18n的元素（保留原有逻辑）
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const text = this.getText(key, lang);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', text);
            } else {
                element.value = text;
            }
        } else if (element.hasAttribute('title')) {
            element.setAttribute('title', text);
        } else if (element.hasAttribute('alt')) {
            element.setAttribute('alt', text);
        } else {
            element.textContent = text;
        }
    });

    // 2. 单独强化处理导航菜单的<a>标签（关键新增逻辑）
    const navLinks = document.querySelectorAll('.i18n-link');
    navLinks.forEach(link => {
        const key = link.getAttribute('data-i18n');
        const text = this.getText(key, lang);
        // 强制替换文本，同时兼容部分浏览器的渲染延迟
        link.textContent = ''; // 清空原有内容
        link.appendChild(document.createTextNode(text)); // 重新添加文本节点
    });
        
        // 更新服务器名称翻译
        const serverNameElements = document.querySelectorAll('.server-name-text');
        serverNameElements.forEach(element => {
            const originalName = element.getAttribute('data-server-name');
            const translatedName = this.getServerName(originalName, lang);
            element.textContent = translatedName;
        });
        
        // 更新服务器备注翻译
        const serverNoteElements = document.querySelectorAll('.server-note[data-i18n^="server.notes."]');
        serverNoteElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const text = this.getText(key, lang);
                element.textContent = text;
            }
        });
        
        // 更新页面标题
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            document.title = this.getText('page.title', lang);
        }
        
        // 更新meta标签
        const descriptionMeta = document.querySelector('meta[name="description"]');
        if (descriptionMeta) {
            descriptionMeta.setAttribute('content', this.getText('page.description', lang));
        }
        
        const keywordsMeta = document.querySelector('meta[name="keywords"]');
        if (keywordsMeta) {
            keywordsMeta.setAttribute('content', this.getText('page.keywords', lang));
        }
        
        // 更新HTML lang属性
        const htmlElement = document.documentElement;
        switch(lang) {
            case 'en':
                htmlElement.setAttribute('lang', 'en');
                break;
            case 'ru':
                htmlElement.setAttribute('lang', 'ru');
                break;
            default:
                htmlElement.setAttribute('lang', 'zh-CN');
                break;
        }
    }
};

// 语言选择功能
function initLanguageSelector() {
    const languageButtons = document.querySelectorAll('.language-btn');
    
    languageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedLang = this.getAttribute('data-lang');
            setLanguage(selectedLang);
        });
    });
}

// 设置语言
function setLanguage(lang) {
    // 保存语言选择到本地存储
    localStorage.setItem('serverLanguage', lang);
    
    // 更新语言选择器状态
    const languageButtons = document.querySelectorAll('.language-btn');
    languageButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-lang') === lang) {
            button.classList.add('active');
        }
    });
    
    // 更新页面文本
    ServerLanguageConfig.updatePageTexts(lang);
}

// 初始化语言
function initServerLanguages() {
    // 优先级：URL参数 > 本地存储 > 默认语言
    const urlParams = new URLSearchParams(window.location.search);
    let lang = urlParams.get('lang');
    
    if (!lang) {
        // 获取保存的语言设置，如果没有则使用默认语言
        lang = localStorage.getItem('serverLanguage') || ServerLanguageConfig.default;
    }
    
    // 设置初始语言
    setLanguage(lang);
    
    // 初始化语言选择器
    initLanguageSelector();
}

// 确保在DOM完全加载后再初始化
document.addEventListener('DOMContentLoaded', function() {
    initServerLanguages();
});