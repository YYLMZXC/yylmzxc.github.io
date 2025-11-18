<!DOCTYPE html>
<html lang="zh-CN" id="mainHtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="renderer" content="webkit">
    <meta name="applicable-device" content="pc,mobile">
    
    <!-- 页面标题和描述将通过JavaScript动态更新 -->
    <title data-i18n="page.title">生存战争网 - 首页 | SC中文社区官方网站</title>
    <meta name="description" data-i18n="page.description" content="生存战争网是中国最大的SC中文社区，提供游戏攻略、Mod模组、地图存档、材质包、皮肤和家具等资源下载，以及活跃的联机服务器。">
    <meta name="keywords" data-i18n="page.keywords" content="生存战争,SC中文社区,生存战争MOD,生存战争联机版,生存战争服务器,生存战争攻略">
    
    <!-- 资源文件 -->
    <link rel="stylesheet" href="./scweb_res/main.css">
    <link rel="stylesheet" href="./scweb_res/index/styles.css">
    <link rel="icon" type="image/x-icon" href="./scweb_res/favicon.ico">
</head>
<body>
    <!-- 头部导航区域 -->
    <header id="header" class="clearfix">
        <div class="container">
            <div class="row">
                <!-- 站点名称和Logo -->
                <div class="site-name col-mb-12 col-6">
                    <h1 class="site-title">
                        <a id="logo" href="/" title="SurvivalCraft Web">
                            <img src="./scweb_res/logo.png" alt="生存战争网" width="220px" height="64px">
                        </a>
                    </h1>
                </div>
                
                <!-- 工具栏 -->
                <div class="site-tools col-mb-12 col-6">
                    <div class="toolbar">
                        <!-- 搜索功能 -->
                        <form id="searchForm" class="search-form" role="search">
                            <select id="searchSelect" name="category" class="search-select">
                                <option value="" data-i18n="search.anyCategory">任意分类</option>
                                <option value="1" data-i18n="search.pluginMod">插件版Mod模组下载</option>
                                <option value="2" data-i18n="search.onlineMod">联机版Mod模组下载</option>
                                <option value="4" data-i18n="search.gameHistory">游戏历史全版本下载</option>
                                <option value="10" data-i18n="search.texturePack">材质包下载</option>
                                <option value="11" data-i18n="search.furniturePack">家具包下载</option>
                                <option value="9" data-i18n="search.skinPack">皮肤大全下载</option>
                                <option value="8" data-i18n="search.mapPack">地图存档下载</option>
                                <option value="6" data-i18n="search.guides">攻略教程</option>
                            </select>
                            <input id="searchInput" type="text" name="keyword" class="search-input" 
                                   placeholder="输入关键字搜索" data-i18n-placeholder="search.placeholder">
                            <button type="submit" class="search-button" data-i18n="search.submit">搜索</button>
                        </form>
                        
                        <!-- 语言选择器 -->
                        <div class="language-section">
                            <button class="language-btn" data-lang="zh" title="切换到中文">🇨🇳</button>
                            <button class="language-btn" data-lang="en" title="Switch to English">🇺🇸</button>
                            <button class="language-btn" data-lang="ru" title="Переключиться на русский">🇷🇺</button>
                        </div>
                    </div>
                </div>
                
                <!-- 导航菜单 -->
                <div class="col-mb-12">
                    <nav id="nav-menu" class="clearfix" role="navigation">
                        <a href="/" class="active" id="homeLink" data-i18n="nav.home">首页</a>
                        <a href="/online_server.php" id="serverListLink" data-i18n="nav.serverList">联机服务器列表</a>
                        <a href="https://www.yuque.com/u589148/wf2knt" target="_blank" rel="nofollow" 
                           id="apiTutorialLink" data-i18n="nav.apiTutorial">APImod制作教程</a>
                    </nav>
                </div>
            </div>
        </div>
    </header>

    <!-- 主要内容区域 -->
    <div id="body">
        <div class="container">
            <div class="row">
                <div class="col-mb-12 col-12" id="main" role="main">
                    <div class="post-content">
                        <!-- 站点信息 -->
                        <div class="site-info">
                            <p class="site-address">
                                <span id="currentAddress" data-i18n="site.currentAddress">本站地址：</span><b>schub.icu</b>
                                <span id="shortUrl" data-i18n="site.shortUrl">短网址：</span><b>scnet.top</b>
                            </p>
                        </div>
                        
                        <!-- CN中文导航 -->
                        <section class="nav-section">
                            <h3 id="cnNavigationTitle" data-i18n="sections.cnNavigation">🌏 CN中文导航</h3>
                            <div class="banner-grid" id="cnNavigationLinks">
                                <!-- 导航链接将通过JavaScript动态生成 -->
                            </div>
                        </section>

                        <!-- OS海外导航 -->
                        <section class="nav-section">
                            <h3 id="osNavigationTitle" data-i18n="sections.osNavigation">🌍 OS海外导航</h3>
                            <div class="banner-grid" id="osNavigationLinks">
                                <!-- 导航链接将通过JavaScript动态生成 -->
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 页脚 -->
    <footer id="footer">
        <p class="copyright"><br>© 2025 生存战争网</p>
    </footer>

    <!-- 外部脚本 -->
    <script src="https://hm.baidu.com/hm.js?49508fcc51529f79d0f7e42bd08ed491"></script>
    
    <!-- 本地脚本 -->
    <script src="./scweb_res/languages.js"></script>
    <script src="./scweb_res/script.js"></script>
</body>
</html>