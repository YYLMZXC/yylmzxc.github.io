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
                project: '项目地址',
                projectDesc: '点击访问本项目源代码仓库',
                thanks: '致谢',
                thanksDesc: '感谢所有为社区做出贡献的开发者和玩家！'
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
                project: 'Project URL',
                projectDesc: 'Click to visit the source code repository',
                thanks: 'Thanks',
                thanksDesc: 'Thanks to all developers and players who contribute to the community!'
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
                project: 'Адрес Проекта',
                projectDesc: 'Нажмите, чтобы посетить репозиторий исходного кода',
                thanks: 'Благодарности',
                thanksDesc: 'Благодарим всех разработчиков и игроков, которые вносят вклад в сообщество!'
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
                project: 'URL del Proyecto',
                projectDesc: 'Haz clic para visitar el repositorio de código fuente',
                thanks: 'Agradecimientos',
                thanksDesc: '¡Gracias a todos los desarrolladores y jugadores que contribuyen a la comunidad!'
            }
        }
    }
};

window.AboutLanguageConfig = AboutLanguageConfig;
