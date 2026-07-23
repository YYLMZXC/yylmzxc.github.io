/**
 * 生存战争网 - 首页语言配置
 * 包含首页特定的多语言翻译（搜索分类、导航链接文本等）
 * 与 SiteLanguageConfig 合并使用，站点级配置在 SiteLanguageConfig 中定义
 * 
 * 翻译结构:
 * - page: 页面元信息（title/description/keywords）
 * - nav: 导航菜单文本
 * - search: 搜索框分类和占位符
 * - site: 站点地址相关文本
 * - sections: 区块标题
 * - links: 导航链接的显示文本
 * 
 * navigation 字段定义导航链接结构（URL 和外部链接标记），
 * 实际显示文本由 translations.links 中的对应键提供
 * 
 * 挂载到全局 window.IndexLanguageConfig
 */
const IndexLanguageConfig = {
    default: 'zh',
    supported: ['zh', 'en', 'ru'],
    storageKey: 'preferredLanguage',
    
    names: {
        'zh': '🇨🇳 中文',
        'en': '🇺🇸 English',
        'ru': '🇷🇺 Русский'
    },
    
    translations: {
        zh: {
            page: {
                title: '生存战争网 - 首页 | SC中文社区官方网站',
                description: '生存战争网是中国最大的SC中文社区，提供游戏攻略、Mod模组、地图存档、材质包、皮肤和家具等资源下载，以及活跃的联机服务器。',
                keywords: '生存战争,SC中文社区,生存战争MOD,生存战争联机版,生存战争服务器,生存战争攻略'
            },
            nav: {
                home: '首页',
                serverList: '联机服务器列表',
                apiTutorial: 'APImod制作教程'
            },
            search: {
                anyCategory: '任意分类',
                scapi: '生存战争api插件版本下载',
                scnet: '生存战争net联机版下载',
                pluginMod: '插件版Mod模组下载',
                onlineMod: '联机版Mod模组下载',
                gameHistory: '游戏历史全版本下载',
                texturePack: '材质包下载',
                furniturePack: '家具包下载',
                skinPack: '皮肤大全下载',
                mapPack: '地图存档下载',
                guides: '攻略教程',
                placeholder: '输入关键字搜索',
                submit: '搜索'
            },
            site: {
                currentAddress: '本站地址：',
                shortUrl: '短网址：',
                shortUrl2: '短网址2：',
                shortUrl3: '短网址3：'
            },
            sections: {
                cnNavigation: '🌏 CN中文导航',
                osNavigation: '🌍 OS海外导航'
            },
            links: {
                scCommunity: 'SC中文社区cn路线',
                scKey: '生存战争登录钥匙',
                scWiki: '生存战争Wiki',
                scYuqueWiki: '生存战争语雀百科',
                serverPlugin: '服务端插件',
                modWebsite: '模组网',
                scLauncher: 'SC启动器',
                backupCommunity: 'SC中文社区os路线',
                jiilForum: 'JIIL论坛',
                russianScCommunity: '俄语SC社区',
                originalScCommunity: '原版SC社区',
                internationalModSite: '海外Mod网站',
                officialBlog: '正版官网'
            },
            footer: '© 2026 生存战争网'
        },
        
        en: {
            page: {
                title: 'SurvivalCraft Web - Home | SC English Community Official Website',
                description: 'SurvivalCraft Web is the largest SC English community, providing game guides, Mods, map archives, texture packs, skins and furniture downloads, as well as active multiplayer servers.',
                keywords: 'SurvivalCraft,SC English Community,SurvivalCraft MOD,SurvivalCraft Online Version,SurvivalCraft Server,SurvivalCraft Guide'
            },
            nav: {
                home: 'Home',
                serverList: 'Server List',
                apiTutorial: 'API Mod Tutorial'
            },
            search: {
                anyCategory: 'All Categories',
                scapi: 'SurvivalCraft API Plugin Downloads',
                scnet: 'SurvivalCraft Net Online Version Downloads',
                pluginMod: 'Plugin Mod Downloads',
                onlineMod: 'Online Mod Downloads',
                gameHistory: 'Game History Downloads',
                texturePack: 'Texture Pack Downloads',
                furniturePack: 'Furniture Pack Downloads',
                skinPack: 'Skin Collection Downloads',
                mapPack: 'Map Archive Downloads',
                guides: 'Game Guides',
                placeholder: 'Enter keywords to search',
                submit: 'Search'
            },
            site: {
                currentAddress: 'Site Address: ',
                shortUrl: 'Short URL: ',
                shortUrl2: 'Short URL 2: ',
                shortUrl3: 'Short URL 3: '
            },
            sections: {
                cnNavigation: '🌏 CN Chinese Navigation',
                osNavigation: '🌍 OS Overseas Navigation'
            },
            links: {
                scCommunity: 'SC Chinese Community cn Route',
                scKey: 'SurvivalCraft Key',
                scWiki: 'SurvivalCraft Wiki',
                scYuqueWiki: 'SurvivalCraft Yuque Wiki',
                serverPlugin: 'Server Plugin',
                modWebsite: 'Mod Website',
                scLauncher: 'SC Launcher',
                backupCommunity: 'SC Chinese Community os Route',
                jiilForum: 'JIIL Forum',
                russianScCommunity: 'Russian SC Community',
                originalScCommunity: 'Original SC Community',
                internationalModSite: 'International Mod Site',
                officialBlog: 'Official Blog'
            },
            footer: '© 2026 SurvivalCraft Web'
        },
        
        ru: {
            page: {
                title: 'SurvivalCraft Web - Главная | SC Русское Сообщество Официальный Сайт',
                description: 'SurvivalCraft Web - крупнейшее SC русское сообщество, предоставляющее игровые руководства, моды, карты, текстуры, скины и мебель, а также активные многопользовательские серверы.',
                keywords: 'SurvivalCraft,SC Русское Сообщество,SurvivalCraft MOD,SurvivalCraft Онлайн Версия,SurvivalCraft Сервер,SurvivalCraft Руководство'
            },
            nav: {
                home: 'Главная',
                serverList: 'Список Серверов',
                apiTutorial: 'API Mod Урок'
            },
            search: {
                anyCategory: 'Все Категории',
                scapi: 'Скачать SurvivalCraft API Плагин',
                scnet: 'Скачать SurvivalCraft Net Онлайн Версию',
                pluginMod: 'Плагин Мод Скачать',
                onlineMod: 'Онлайн Мод Скачать',
                gameHistory: 'История Игры Скачать',
                texturePack: 'Текстура Пак Скачать',
                furniturePack: 'Мебель Пак Скачать',
                skinPack: 'Скин Коллекция Скачать',
                mapPack: 'Карта Архив Скачать',
                guides: 'Игровые Руководства',
                placeholder: 'Введите ключевые слова для поиска',
                submit: 'Поиск'
            },
            site: {
                currentAddress: 'Адрес Сайта: ',
                shortUrl: 'Короткий URL: ',
                shortUrl2: 'Короткий URL 2: ',
                shortUrl3: 'Короткий URL 3: '
            },
            sections: {
                cnNavigation: '🌏 CN Китайская Навигация',
                osNavigation: '🌍 OS Зарубежная Навигация'
            },
            links: {
                scCommunity: 'SC Китайское Сообщество cn Маршрут',
                scKey: 'SurvivalCraft Ключ',
                scWiki: 'SurvivalCraft Вики',
                scYuqueWiki: 'SurvivalCraft Yuque Вики',
                serverPlugin: 'Сервер Плагин',
                modWebsite: 'Мод Сайт',
                scLauncher: 'SC Лаунчер',
                backupCommunity: 'SC Китайское Сообщество os Маршрут',
                jiilForum: 'JIIL Форум',
                russianScCommunity: 'Русское SC Сообщество',
                originalScCommunity: 'Оригинальное SC Сообщество',
                internationalModSite: 'Международный Мод Сайт',
                officialBlog: 'Официальный Блог'
            },
            footer: '© 2026 SurvivalCraft Web'
        }
    },
    
    /**
     * 导航链接配置
     * 每个链接对象包含 title（翻译键路径）、url（链接地址）、external（是否外部链接）
     * - cn: 中文路线导航（主要面向中国用户）
     * - os: 海外路线导航（面向国际用户）
     */
    navigation: {
        cn: [
            { title: 'links.scCommunity', url: 'https://test.suancaixianyu.cn/', external: true },
            { title: 'links.backupCommunity', url: 'https://www.scbbs.top/', external: true },
            { title: 'links.scKey', url: 'https://sckey.net', external: true },
            { title: 'links.scWiki', url: 'https://docs.scwk.net/', external: true },
            { title: 'links.scYuqueWiki', url: 'https://www.yuque.com/u589148/sc', external: true },
            { title: 'links.serverPlugin', url: 'https://spd.jiil.top/index.html', external: true },
            { title: 'links.modWebsite', url: 'https://www.scmod.cn/', external: true },
            { title: 'links.scLauncher', url: 'https://sc.btos.top/', external: true },
            { title: 'links.jiilForum', url: 'https://bbs.jiil.top/', external: true }
        ],
        os: [
            { title: 'links.russianScCommunity', url: 'https://vk.com/fans_club_survivalcraft', external: true },
            { title: 'links.originalScCommunity', url: 'https://www.tapatalk.com/groups/survivalcraft/discussion/all', external: true },
            { title: 'links.internationalModSite', url: 'https://survivalcraft2mods.blogspot.com/', external: true },
            { title: 'links.officialBlog', url: 'https://kaalus.wordpress.com/', external: true }
        ]
    }
};

window.IndexLanguageConfig = IndexLanguageConfig;
