/**
 * 关于页面 - 多语言翻译配置
 * 挂载到全局 window.AboutLanguageConfig
 */
const AboutLanguageConfig = {
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
                title: '关于我们 | 生存战争网'
            },
            about: {
                title: '关于生存战争网',
                whatIs: '什么是生存战争网？',
                whatIsDesc: '生存战争网是SC中文社区的官方网站，致力于为广大生存战争玩家提供最新的游戏资讯、攻略教程、Mod模组下载和联机服务器服务。',
                features: '我们提供什么？',
                feature1: '最新的Mod模组资源下载',
                feature2: '活跃的联机服务器列表',
                feature3: '完善的APImod开发教程',
                feature4: '多语言支持（中文/English/Русский/Español）',
                contact: '联系我们',
                contactDesc: '如有任何问题或建议，欢迎通过QQ群联系我们的管理员。',
                workshop: '生存战争工坊',
                workshopDesc: '点击访问生存战争工坊官网',
                bookmarks: '收藏导航',
                cloudflareDesc: '点击访问Cloudflare官网（域名解析）',
                projectBookmarkDesc: '点击访问项目源代码仓库',
                thanks: '致谢',
                thanksDesc: '感谢所有为社区做出贡献的开发者和玩家！'
            },
            links: {
                cloudflare: 'Cloudflare（域名解析）',
                projectRepo: '项目源代码仓库'
            }
        },
        
        en: {
            page: {
                title: 'About Us | SurvivalCraft Web'
            },
            about: {
                title: 'About SurvivalCraft Web',
                whatIs: 'What is SurvivalCraft Web?',
                whatIsDesc: 'SurvivalCraft Web is the official website of the SC English community, dedicated to providing the latest game news, guides, Mod downloads and multiplayer server services for SurvivalCraft players.',
                features: 'What do we offer?',
                feature1: 'Latest Mod resource downloads',
                feature2: 'Active multiplayer server list',
                feature3: 'Comprehensive API Mod development tutorials',
                feature4: 'Multi-language support (中文/English/Русский/Español)',
                contact: 'Contact Us',
                contactDesc: 'If you have any questions or suggestions, please contact our administrators through QQ groups.',
                workshop: 'SurvivalCraft Workshop',
                workshopDesc: 'Click to visit the SurvivalCraft Workshop official website',
                bookmarks: 'Bookmarks',
                cloudflareDesc: 'Click to visit the Cloudflare official website (DNS)',
                projectBookmarkDesc: 'Click to visit the project source code repository',
                thanks: 'Thanks',
                thanksDesc: 'Thanks to all developers and players who contribute to the community!'
            },
            links: {
                cloudflare: 'Cloudflare (DNS)',
                projectRepo: 'Project Source Code Repository'
            }
        },
        
        ru: {
            page: {
                title: 'О Нас | SurvivalCraft Web'
            },
            about: {
                title: 'О SurvivalCraft Web',
                whatIs: 'Что такое SurvivalCraft Web?',
                whatIsDesc: 'SurvivalCraft Web - официальный сайт SC русского сообщества, посвященный предоставлению новостей игры, руководств, скачиванию модов и услуг многопользовательских серверов для игроков SurvivalCraft.',
                features: 'Что мы предлагаем?',
                feature1: 'Последние загрузки ресурсов модов',
                feature2: 'Активный список многопользовательских серверов',
                feature3: 'Полные руководства по разработке API модов',
                feature4: 'Мультиязычная поддержка (中文/English/Русский/Español)',
                contact: 'Контакты',
                contactDesc: 'Если у вас есть вопросы или предложения, свяжитесь с нашими администраторами через группы QQ.',
                workshop: 'Мастерская SurvivalCraft',
                workshopDesc: 'Нажмите, чтобы посетить официальный сайт Мастерской SurvivalCraft',
                bookmarks: 'Закладки',
                cloudflareDesc: 'Нажмите, чтобы посетить официальный сайт Cloudflare (DNS)',
                projectBookmarkDesc: 'Нажмите, чтобы посетить репозиторий исходного кода проекта',
                thanks: 'Благодарности',
                thanksDesc: 'Благодарим всех разработчиков и игроков, которые вносят вклад в сообщество!'
            },
            links: {
                cloudflare: 'Cloudflare (DNS)',
                projectRepo: 'Репозиторий Исходного Кода Проекта'
            }
        },

        es: {
            page: {
                title: 'Sobre Nosotros | SurvivalCraft Web'
            },
            about: {
                title: 'Sobre SurvivalCraft Web',
                whatIs: '¿Qué es SurvivalCraft Web?',
                whatIsDesc: 'SurvivalCraft Web es el sitio oficial de la comunidad SC en español, dedicado a proporcionar las últimas noticias del juego, guías, descargas de Mods y servicios de servidores multijugador para los jugadores de SurvivalCraft.',
                features: '¿Qué ofrecemos?',
                feature1: 'Últimas descargas de recursos de Mods',
                feature2: 'Lista activa de servidores multijugador',
                feature3: 'Tutoriales completos de desarrollo de Mods API',
                feature4: 'Soporte multilingüe (中文/English/Русский/Español)',
                contact: 'Contáctanos',
                contactDesc: 'Si tienes preguntas o sugerencias, contáctanos a través de grupos de QQ.',
                workshop: 'Taller de SurvivalCraft',
                workshopDesc: 'Haz clic para visitar el sitio web oficial del Taller de SurvivalCraft',
                bookmarks: 'Marcadores',
                cloudflareDesc: 'Haz clic para visitar el sitio web oficial de Cloudflare (DNS)',
                projectBookmarkDesc: 'Haz clic para visitar el repositorio de código fuente del proyecto',
                thanks: 'Agradecimientos',
                thanksDesc: '¡Gracias a todos los desarrolladores y jugadores que contribuyen a la comunidad!'
            },
            links: {
                cloudflare: 'Cloudflare (DNS)',
                projectRepo: 'Repositorio de Código Fuente del Proyecto'
            }
        }
    },

    /**
     * 导航链接配置
     * - bookmarks: 收藏导航
     */
    navigation: {
        bookmarks: [
            { title: 'links.cloudflare', url: 'https://www.cloudflare.com/', external: true },
            { title: 'links.projectRepo', url: 'https://cnb.cool/SurvivalcraftTool/scweb', external: true }
        ]
    }
};

window.AboutLanguageConfig = AboutLanguageConfig;
