const ServerLanguageConfig = {
    default: 'zh',
    
    supported: ['zh', 'en', 'ru'],
    
    names: {
        'zh': '🇨🇳 中文',
        'en': '🇺🇸 English', 
        'ru': '🇷🇺 Русский'
    },
    
    translations: {
        zh: {
            nav: {
                home: '首页',
                serverList: '联机服务器列表',
                apiTutorial: 'APImod制作教程'
            },
            stats: {
                title: '服务器统计',
                total: '总计',
                online: '在线',
                checking: '检查中',
                offline: '离线'
            },
            filters: {
                all: '全部',
                lobby: '大厅服',
                premium: '精品服',
                community: '社区服'
            },
            server: {
                clickToCopy: '点击复制',
                copied: '已复制!',
                joinGroup: '欢迎加入我们的交流群：',
                managementOffice: '联机服列表管理办事处：',
                noServers: '暂无服务器',
                address: '地址',
                version: '版本',
                latency: '延迟',
                players: '玩家',
                mode: '模式',
                network: '网络',
                timePeriod: '时段',
                season: '季节',
                expire: '展示到期'
            }
        },
        
        en: {
            nav: {
                home: 'Home',
                serverList: 'Server List',
                apiTutorial: 'API Mod Tutorial'
            },
            stats: {
                title: 'Server Statistics',
                total: 'Total',
                online: 'Online',
                checking: 'Checking',
                offline: 'Offline'
            },
            filters: {
                all: 'All',
                lobby: 'Lobby',
                premium: 'Premium',
                community: 'Community'
            },
            server: {
                clickToCopy: 'Click to copy',
                copied: 'Copied!',
                joinGroup: 'Welcome to join our discussion group:',
                managementOffice: 'Server List Management Office:',
                noServers: 'No servers found',
                address: 'Address',
                version: 'Version',
                latency: 'Latency',
                players: 'Players',
                mode: 'Mode',
                network: 'Network',
                timePeriod: 'Time',
                season: 'Season',
                expire: 'Expire'
            }
        },
        
        ru: {
            nav: {
                home: 'Главная',
                serverList: 'Список Серверов',
                apiTutorial: 'API Mod Урок'
            },
            stats: {
                title: 'Статистика Серверов',
                total: 'Всего',
                online: 'Онлайн',
                checking: 'Проверка',
                offline: 'Оффлайн'
            },
            filters: {
                all: 'Все',
                lobby: 'Лобби',
                premium: 'Премиум',
                community: 'Сообщество'
            },
            server: {
                clickToCopy: 'Нажмите для копирования',
                copied: 'Скопировано!',
                joinGroup: 'Добро пожаловать в нашу группу:',
                managementOffice: 'Управление Списком Серверов:',
                noServers: 'Серверы не найдены',
                address: 'Адрес',
                version: 'Версия',
                latency: 'Задержка',
                players: 'Игроки',
                mode: 'Режим',
                network: 'Сеть',
                timePeriod: 'Время',
                season: 'Сезон',
                expire: 'Истечение'
            }
        }
    },
    
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
                return key;
            }
        }
        
        return text;
    },
    
    updatePageTexts: function(lang) {
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
            } else {
                element.textContent = text;
            }
        });
    }
};

function initLanguageSelector() {
    const languageButtons = document.querySelectorAll('.language-btn');
    
    languageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedLang = this.getAttribute('data-lang');
            setLanguage(selectedLang);
        });
    });
}

function setLanguage(lang) {
    localStorage.setItem('serverLanguage', lang);
    
    const languageButtons = document.querySelectorAll('.language-btn');
    languageButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-lang') === lang) {
            button.classList.add('active');
        }
    });
    
    ServerLanguageConfig.updatePageTexts(lang);
}

function initServerLanguages() {
    const urlParams = new URLSearchParams(window.location.search);
    let lang = urlParams.get('lang');
    
    if (!lang) {
        lang = localStorage.getItem('serverLanguage') || ServerLanguageConfig.default;
    }
    
    setLanguage(lang);
    initLanguageSelector();
}

document.addEventListener('DOMContentLoaded', function() {
    initServerLanguages();
});