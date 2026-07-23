/**
 * 生存战争网 - 站点级语言配置
 * 包含通用的页面元信息、导航菜单、站点信息的多语言翻译
 * 页面特定的翻译（如搜索、服务器等）在各自页面的语言配置文件中定义
 * 挂载到全局 window.SiteLanguageConfig
 */
const SiteLanguageConfig = {
    default: 'zh',
    supported: ['zh', 'en', 'ru'],
    
    names: {
        'zh': '🇨🇳 中文',
        'en': '🇺🇸 English',
        'ru': '🇷🇺 Русский'
    },
    
    storageKey: 'preferredLanguage',
    
    /**
     * 翻译文本对象
     * 每个语言包含: page (页面元信息), nav (导航菜单), site (站点信息), sections (区块标题), footer (页脚)
     */
    translations: {
        // 中文翻译
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
            footer: '© 2026 生存战争网'
        },
        
        // 英文翻译
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
            footer: '© 2026 SurvivalCraft Web'
        },
        
        // 俄语翻译
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
            footer: '© 2026 SurvivalCraft Web'
        }
    }
};

window.SiteLanguageConfig = SiteLanguageConfig;
