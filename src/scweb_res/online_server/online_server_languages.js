const ServerLanguageConfig = {
    default: 'zh',
    storageKey: 'serverLanguage',
    
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
                loading: '加载中...',
                connecting: '正在连接服务器...',
                loadFailed: '加载失败',
                address: '地址',
                version: '版本',
                level: '等级',
                joinMode: '加入模式',
                latency: '延迟',
                players: '玩家',
                mode: '模式',
                network: '网络',
                directMode: '直连模式',
                proxyMode: '代理模式',
                refresh: '刷新',
                recommended: '推荐',
                lobby: '大厅服',
                premium: '精品服',
                community: '社区服',
                groupServer: '群组服',
                childServer: '子服务器'
            },
            groups: {
                group1: '生存战争34服务器联机交流群',
                group1Id: '826823481',
                group2: '开服申请点击加入',
                group2Id: '893387376',
                group3: '点击加入反馈群',
                group3Id: '1092640742'
            },
            footer: '© 2026 生存战争网'
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
                loading: 'Loading...',
                connecting: 'Connecting to server...',
                loadFailed: 'Load failed',
                address: 'Address',
                version: 'Version',
                level: 'Level',
                joinMode: 'Join Mode',
                latency: 'Latency',
                players: 'Players',
                mode: 'Mode',
                network: 'Network',
                directMode: 'Direct Mode',
                proxyMode: 'Proxy Mode',
                refresh: 'Refresh',
                recommended: 'Recommended',
                lobby: 'Lobby',
                premium: 'Premium',
                community: 'Community',
                groupServer: 'Group Server',
                childServer: 'Child Server'
            },
            groups: {
                group1: 'SurvivalCraft 34 Server Group',
                group1Id: '826823481',
                group2: 'Apply to Open a Server',
                group2Id: '893387376',
                group3: 'Bug Feedback Group',
                group3Id: '1092640742'
            },
            footer: '© 2026 SurvivalCraft Web'
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
                loading: 'Загрузка...',
                connecting: 'Подключение к серверу...',
                loadFailed: 'Ошибка загрузки',
                address: 'Адрес',
                version: 'Версия',
                level: 'Уровень',
                joinMode: 'Режим входа',
                latency: 'Задержка',
                players: 'Игроки',
                mode: 'Режим',
                network: 'Сеть',
                directMode: 'Прямое Подключение',
                proxyMode: 'Прокси Режим',
                refresh: 'Обновить',
                recommended: 'Рекомендуется',
                lobby: 'Лобби',
                premium: 'Премиум',
                community: 'Сообщество',
                groupServer: 'Групповой Сервер',
                childServer: 'Дочерний Сервер'
            },
            groups: {
                group1: 'Группа Серверов SurvivalCraft 34',
                group1Id: '826823481',
                group2: 'Заявка на Открытие Сервера',
                group2Id: '893387376',
                group3: 'Группа Обратной Связи',
                group3Id: '1092640742'
            },
            footer: '© 2026 SurvivalCraft Web'
        }
    }
};

window.ServerLanguageConfig = ServerLanguageConfig;
