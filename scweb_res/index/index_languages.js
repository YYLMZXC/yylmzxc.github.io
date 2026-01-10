/**
 * 多语言配置文件
 * Multi-language Configuration File
 * 
 * 维护说明：
 * 1. 新增语言时需在 supported 数组中添加语言代码
 * 2. 每个语言包需保持 translations 结构一致
 * 3. navigation 中的链接需与 translations.links 对应
 */
const LanguageConfig = {
    // 基础配置
    default: 'zh',
    supported: ['zh', 'en', 'ru'],
    
    // 语言显示名称（带国旗图标）
    names: {
        'zh': '🇨🇳 中文',
        'en': '🇺🇸 English',
        'ru': '🇷🇺 Русский'
    },
    
    // 翻译主数据（按语言分组）
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
                shortUrl2: '短网址2：'
            },
            sections: {
                cnNavigation: '🌏 CN中文导航',
                osNavigation: '🌍 OS海外导航'
            },
            links: {
                // 中文导航
                scForum: '生存战争论坛',
                scCommunity: 'SC中文社区',
                scKey: '生存战争登录钥匙',
                scBox: '生存战争盒子网',
                scWiki: '生存战争百科',
                pluginMod: '插件版Mod(模组)',
                onlineMod: '联机版Mod(模组)',
                texturePack: '材质包',
                skinPack: '皮肤包',
                mapPack: '地图包',
                furniturePack: '家具包',
                serverPlugin: '服务端插件',
                modWebsite: '模组网',
                backupCommunity: '备用测试SC中文社区',
                jiilForum: 'JIIL论坛',
                // 海外导航
                russianScCommunity: '俄语SC社区',
                originalScCommunity: '原版SC社区',
                internationalModSite: '海外Mod网站',
                officialBlog: '正版官网'
            },
            footer: '© 2025 生存战争网'
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
                shortUrl2: 'Short URL 2: '
            },
            sections: {
                cnNavigation: '🌏 CN Chinese Navigation',
                osNavigation: '🌍 OS Overseas Navigation'
            },
            links: {
                // 中文导航
                scForum: 'SC Forum',
                scCommunity: 'SC English Community',
                scBox: 'SurvivalCraft Box',
                scWiki: 'SurvivalCraft Wiki',
                pluginMod: 'Plugin Mod',
                onlineMod: 'Online Mod',
                texturePack: 'Texture Pack',
                skinPack: 'Skin Pack',
                mapPack: 'Map Pack',
                furniturePack: 'Furniture Pack',
                serverPlugin: 'Server Plugin',
                modWebsite: 'Mod Website',
                backupCommunity: 'Backup Test Community',
                jiilForum: 'JIIL Forum',
                // 海外导航
                russianScCommunity: 'Russian SC Community',
                originalScCommunity: 'Original SC Community',
                internationalModSite: 'International Mod Site',
                officialBlog: 'Official Blog'
            },
            footer: '© 2025 SurvivalCraft Web'
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
                shortUrl2: 'Короткий URL 2: '
            },
            sections: {
                cnNavigation: '🌏 CN Китайская Навигация',
                osNavigation: '🌍 OS Зарубежная Навигация'
            },
            links: {
                // 中文导航
                scForum: 'SC Форум',
                scCommunity: 'SC Русское Сообщество',
                scBox: 'SurvivalCraft Box',
                scWiki: 'SurvivalCraft Вики',
                pluginMod: 'Плагин Мод',
                onlineMod: 'Онлайн Мод',
                texturePack: 'Текстура Пак',
                skinPack: 'Скин Пак',
                mapPack: 'Карта Пак',
                furniturePack: 'Мебель Пак',
                serverPlugin: 'Сервер Плагин',
                modWebsite: 'Мод Сайт',
                backupCommunity: 'Резервное Тест Сообщество',
                jiilForum: 'JIIL Форум',
                // 海外导航
                russianScCommunity: 'Русское SC Сообщество',
                originalScCommunity: 'Оригинальное SC Сообщество',
                internationalModSite: 'Международный Мод Сайт',
                officialBlog: 'Официальный Блог'
            },
            footer: '© 2025 SurvivalCraft Web'
        }
    },
    
    // 导航链接配置（与translations.links对应）
    navigation: {
        cn: [
            { title: 'links.scForum', url: 'http://schub.icu/sczz/', external: true },
            { title: 'links.scCommunity', url: 'https://www.schub.top/', external: true },
            { title: 'links.backupCommunity', url: 'https://test.suancaixianyu.cn/', external: true },
            { title: 'links.scKey', url: 'https://sckey.net', external: true },
            { title: 'links.scBox', url: 'https://web.schz.top', external: true },
            { title: 'links.scWiki', url: 'https://www.yuque.com/u589148/sc', external: true },
            { title: 'links.serverPlugin', url: 'https://spd.jiil.top/index.html', external: true },
            { title: 'links.modWebsite', url: 'https://www.scmod.cn/', external: true },
            { title: 'links.jiilForum', url: 'https://bbs.jiil.top/', external: true },
            { title: 'links.pluginMod', url: 'http://schub.icu/sczz/?forum-3.htm', external: true },
            { title: 'links.onlineMod', url: 'http://schub.icu/sczz/?forum-4.htm', external: true },
            { title: 'links.texturePack', url: 'http://schub.icu/sczz/?forum-5.htm', external: true },
            { title: 'links.skinPack', url: 'http://schub.icu/sczz/?forum-6.htm', external: true },
            { title: 'links.mapPack', url: 'http://schub.icu/sczz/?forum-2.htm', external: true },
            { title: 'links.furniturePack', url: 'http://schub.icu/sczz/?forum-7.htm', external: true }
        ],
        os: [
            { title: 'links.russianScCommunity', url: 'https://vk.com/fans_club_survivalcraft', external: true },
            { title: 'links.originalScCommunity', url: 'https://www.tapatalk.com/groups/survivalcraft/discussion/all', external: true },
            { title: 'links.internationalModSite', url: 'https://survivalcraft2mods.blogspot.com/', external: true },
            { title: 'links.officialBlog', url: 'https://kaalus.wordpress.com/', external: true }
        ]
    }
};

// 跨环境导出
if (typeof window !== 'undefined') {
    window.LanguageConfig = LanguageConfig;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageConfig;
}