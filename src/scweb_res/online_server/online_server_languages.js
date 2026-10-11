/**
 * 生存战争网 - 联机服务器列表页面语言配置
 * 包含服务器列表页面特定的多语言翻译
 * 与 SiteLanguageConfig 合并使用
 * 
 * 翻译结构:
 * - page: 页面元信息
 * - nav: 导航菜单
 * - stats: 服务器统计信息文本
 * - filters: 筛选按钮文本（全部/大厅服/精品服/社区服）
 * - server: 服务器相关文本（地址、版本、模式、延迟等）
 * - groups: 群组信息
 * - siteInfo: 站点信息文本
 * 
 * 挂载到全局 window.ServerLanguageConfig
 */
const ServerLanguageConfig = {
    default: 'zh',
    storageKey: 'preferredLanguage',
    
    supported: ['zh', 'en', 'ru', 'es'],
    
    names: {
        'zh': '🇨🇳 中文',
        'en': '🇺🇸 English',
        'ru': '🇷🇺 Русский',
        'es': '🇪🇸 Español'
    },
    
    translations: {
        zh: {
            page: {
                title: '生存战争联机服务器列表 | SC中文社区'
            },
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
                bugFeedbackGroup: '联机号/公测联机版bug反馈群：',
                discordGroup: '生存战争社区交流discord：',
                noServers: '暂无服务器',
                loading: '加载中...',
                connecting: '正在连接服务器...',
                loadFailed: '加载失败',
                loadFailedCannotConnect: '无法连接到服务器',
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
                childServer: '子服务器',
                groupNumber: '（群号：',
                groupNumberEnd: '）',
                unreachable: '不可达',
                offline: '离线',
                checking: '检测中',
                undetectable: '无法检测',
                pingFailed: 'Ping失败',
                versionManage: '管理版本',
                versionAdd: '添加版本',
                versionPlaceholder: '新版本号，如 x26.10.01',
                versionRename: '重命名版本',
                versionDelete: '删除版本',
                versionDeleteConfirm: '确定删除这个版本吗？',
                versionInvalid: '版本号不能为空',
                versionExists: '该版本已存在',
                versionLast: '至少保留一个版本',
                versionSaved: '版本列表已保存（数据库）',
                versionNotConnected: '后端未连接：连上数据库后才能修改版本列表',
                versionNeedLogin: '修改版本列表需要登录：请在「账号」里登录后再试',
                versionSaveFailed: '版本列表保存失败'
            },
            groups: {
                group1: '生存战争34服务器联机交流群',
                group1Id: '826823481',
                group2: '开服申请点击加入',
                group2Id: '893387376',
                group3: '点击加入反馈群',
                group3Id: '1092640742',
                group4: '点击加入discord频道'
            },
            siteInfo: {
                currentAddress: '当前访问地址：',
                shortUrl: '短网址：'
            },
            footer: '© 2026 生存战争网'
        },
        
        en: {
            page: {
                title: 'SurvivalCraft Online Server List | SC English Community'
            },
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
                bugFeedbackGroup: 'Bug Feedback Group (Public Beta):',
                discordGroup: 'Join the SurvivalCraft Community Discord:',
                noServers: 'No servers found',
                loading: 'Loading...',
                connecting: 'Connecting to server...',
                loadFailed: 'Load failed',
                loadFailedCannotConnect: 'Cannot connect to server',
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
                childServer: 'Child Server',
                groupNumber: ' (Group No.: ',
                groupNumberEnd: ')',
                unreachable: 'Unreachable',
                offline: 'Offline',
                checking: 'Checking',
                undetectable: 'Undetectable',
                pingFailed: 'Ping failed',
                versionManage: 'Manage versions',
                versionAdd: 'Add version',
                versionPlaceholder: 'New version, e.g. x26.10.01',
                versionRename: 'Rename version',
                versionDelete: 'Delete version',
                versionDeleteConfirm: 'Delete this version?',
                versionInvalid: 'Version cannot be empty',
                versionExists: 'This version already exists',
                versionLast: 'Keep at least one version',
                versionSaved: 'Version list saved (database)',
                versionNotConnected: 'Backend not connected: connect the database to edit versions',
                versionNeedLogin: 'Sign in (Account) before editing the version list',
                versionSaveFailed: 'Failed to save version list'
            },
            groups: {
                group1: 'SurvivalCraft 34 Server Group',
                group1Id: '826823481',
                group2: 'Apply to Open a Server',
                group2Id: '893387376',
                group3: 'Bug Feedback Group',
                group3Id: '1092640742',
                group4: 'Click to join the discord channel'
            },
            siteInfo: {
                currentAddress: 'Current Address: ',
                shortUrl: 'Short URL: '
            },
            footer: '© 2026 SurvivalCraft Web'
        },
        
        ru: {
            page: {
                title: 'Список Онлайн Серверов SurvivalCraft | SC Русское Сообщество'
            },
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
                bugFeedbackGroup: 'Группа Обратной Связи (бета-тест):',
                discordGroup: 'Присоединяйтесь к Discord сообщества SurvivalCraft:',
                noServers: 'Серверы не найдены',
                loading: 'Загрузка...',
                connecting: 'Подключение к серверу...',
                loadFailed: 'Ошибка загрузки',
                loadFailedCannotConnect: 'Невозможно подключиться к серверу',
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
                childServer: 'Дочерний Сервер',
                groupNumber: ' (Группа №: ',
                groupNumberEnd: ')',
                unreachable: 'Недоступен',
                offline: 'Оффлайн',
                checking: 'Проверка',
                undetectable: 'Неопределимо',
                pingFailed: 'Ping не удался',
                versionManage: 'Управление версиями',
                versionAdd: 'Добавить версию',
                versionPlaceholder: 'Новая версия, напр. x26.10.01',
                versionRename: 'Переименовать версию',
                versionDelete: 'Удалить версию',
                versionDeleteConfirm: 'Удалить эту версию?',
                versionInvalid: 'Версия не может быть пустой',
                versionExists: 'Эта версия уже существует',
                versionLast: 'Оставьте хотя бы одну версию',
                versionSaved: 'Список версий сохранён (база данных)',
                versionNotConnected: 'Бэкенд не подключён: для изменения версий нужна база данных',
                versionNeedLogin: 'Войдите в аккаунт, чтобы изменять список версий',
                versionSaveFailed: 'Не удалось сохранить список версий'
            },
            groups: {
                group1: 'Группа Серверов SurvivalCraft 34',
                group1Id: '826823481',
                group2: 'Заявка на Открытие Сервера',
                group2Id: '893387376',
                group3: 'Группа Обратной Связи',
                group3Id: '1092640742',
                group4: 'Присоединиться к каналу discord'
            },
            siteInfo: {
                currentAddress: 'Текущий адрес: ',
                shortUrl: 'Короткий URL: '
            },
            footer: '© 2026 SurvivalCraft Web'
        },
        
        es: {
            page: {
                title: 'Lista de Servidores Online de SurvivalCraft | Comunidad SC en Español'
            },
            nav: {
                home: 'Inicio',
                serverList: 'Lista de Servidores',
                apiTutorial: 'Tutorial de API Mod'
            },
            stats: {
                title: 'Estadísticas de Servidores',
                total: 'Total',
                online: 'En Línea',
                checking: 'Verificando',
                offline: 'Desconectado'
            },
            filters: {
                all: 'Todos',
                lobby: 'Lobby',
                premium: 'Premium',
                community: 'Comunidad'
            },
            server: {
                clickToCopy: 'Clic para copiar',
                copied: '¡Copiado!',
                joinGroup: 'Bienvenido a nuestro grupo de discusión:',
                managementOffice: 'Oficina de Gestión de la Lista de Servidores:',
                bugFeedbackGroup: 'Grupo de Retroalimentación de Bugs (Beta Pública):',
                discordGroup: 'Únete al Discord de la comunidad SurvivalCraft:',
                noServers: 'No se encontraron servidores',
                loading: 'Cargando...',
                connecting: 'Conectando al servidor...',
                loadFailed: 'Error de carga',
                loadFailedCannotConnect: 'No se puede conectar al servidor',
                address: 'Dirección',
                version: 'Versión',
                level: 'Nivel',
                joinMode: 'Modo de Unión',
                latency: 'Latencia',
                players: 'Jugadores',
                mode: 'Modo',
                network: 'Red',
                directMode: 'Modo Directo',
                proxyMode: 'Modo Proxy',
                refresh: 'Actualizar',
                recommended: 'Recomendado',
                lobby: 'Lobby',
                premium: 'Premium',
                community: 'Comunidad',
                groupServer: 'Servidor de Grupo',
                childServer: 'Servidor Hijo',
                groupNumber: ' (Núm. de Grupo: ',
                groupNumberEnd: ')',
                unreachable: 'Inaccesible',
                offline: 'Desconectado',
                checking: 'Verificando',
                undetectable: 'Indetectable',
                pingFailed: 'Ping fallido',
                versionManage: 'Gestionar versiones',
                versionAdd: 'Añadir versión',
                versionPlaceholder: 'Nueva versión, p. ej. x26.10.01',
                versionRename: 'Renombrar versión',
                versionDelete: 'Eliminar versión',
                versionDeleteConfirm: '¿Eliminar esta versión?',
                versionInvalid: 'La versión no puede estar vacía',
                versionExists: 'Esta versión ya existe',
                versionLast: 'Conserva al menos una versión',
                versionSaved: 'Lista de versiones guardada (base de datos)',
                versionNotConnected: 'Backend no conectado: conecta la base de datos para editar versiones',
                versionNeedLogin: 'Inicia sesión (Cuenta) antes de editar la lista de versiones',
                versionSaveFailed: 'Error al guardar la lista de versiones'
            },
            groups: {
                group1: 'Grupo de Servidores SurvivalCraft 34',
                group1Id: '826823481',
                group2: 'Solicitar Abrir un Servidor',
                group2Id: '893387376',
                group3: 'Grupo de Retroalimentación de Bugs',
                group3Id: '1092640742',
                group4: 'Haz clic para unirte al canal de discord'
            },
            siteInfo: {
                currentAddress: 'Dirección actual: ',
                shortUrl: 'URL Corta: '
            },
            footer: '© 2026 SurvivalCraft Web'
        }
    }
};

window.ServerLanguageConfig = ServerLanguageConfig;
