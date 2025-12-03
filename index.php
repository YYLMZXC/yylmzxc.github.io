<!DOCTYPE html>
<html lang="zh-CN" id="mainHtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <meta name="renderer" content="webkit">
    <meta name="applicable-device" content="pc,mobile">
    
    <!-- 动态元信息（将由JavaScript更新） -->
    <title>生存战争网 - 首页 | SC中文社区官方网站</title>
    <meta name="description" content="生存战争网是中国最大的SC中文社区，提供游戏攻略、Mod模组、地图存档、材质包、皮肤和家具等资源下载，以及活跃的联机服务器。">
    <meta name="keywords" content="生存战争,SC中文社区,生存战争MOD,生存战争联机版,生存战争服务器,生存战争攻略">
    
    <!-- 资源引用 -->
    <link rel="stylesheet" href="./scweb_res/index/index_main.css">
    <link rel="icon" type="image/x-icon" href="./scweb_res/favicon.ico">
    <link rel="canonical" href="<?php echo 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']; ?>">
</head>
<body>
    <!-- 页面头部 -->
    <header id="header" class="clearfix">
        <div class="container">
            <div class="row align-items-center">
                <div class="site-name">
                    <h1 class="site-title">
                        <a id="logo" href="/" title="SurvivalCraft Web">
                            <img src="./scweb_res/logo.png" alt="生存战争网" width="220" height="64" loading="lazy">
                        </a>
                    </h1>
                </div>
                
                <!-- 搜索区域 -->
                <div class="search-container header-search">
                    <form id="searchForm" class="search-form" role="search">
                        <select id="searchSelect" name="category" class="search-select">
                            <option value="" data-i18n="search.anyCategory">任意分类</option>
                            <option value="1" data-i18n="search.scapi">生存战争api插件版本下载</option>
                            <option value="2" data-i18n="search.scnet">生存战争net联机版下载</option>
                            <option value="3" data-i18n="search.furniturePack">家具包下载</option>
                            <option value="4" data-i18n="search.skinPack">皮肤大全下载</option>
                            <option value="5" data-i18n="search.mapPack">地图存档下载</option>
                        </select>
                        <input id="searchInput" type="text" name="keyword" class="search-input" 
                               placeholder="输入关键字搜索" autocomplete="off">
                        <button type="submit" class="search-button" data-i18n="search.submit">搜索</button>
                    </form>
                </div>
            </div>
        </div>
    </header>

    <!-- 主导航栏 -->
    <nav id="top-nav-bar" class="clearfix" role="navigation">
        <div class="container">
            <div class="row align-items-center">
                <!-- 导航菜单 -->
                <div class="nav-menu">
                    <a href="index.php" class="active" id="homeLink" title="生存战争网_SC中文社区">首页</a>
                    <a href="online_server.php" id="serverListLink" title="生存战争联机服务器地址列表">联机服务器列表</a>
                    <a rel="nofollow" target="_blank" href="https://www.yuque.com/u589148/wf2knt" id="apiTutorialLink" title="生存战争-APImod制作教程">APImod制作教程</a>
                </div>
                
                <!-- 语言选择器 -->
                <div class="language-section-top-right">
                    <div class="language-selector">
                        <button class="language-btn active" data-lang="zh" title="切换到中文">🇨🇳 中文</button>
                        <button class="language-btn" data-lang="en" title="Switch to English">🇺🇸 English</button>
                        <button class="language-btn" data-lang="ru" title="Переключиться на Русский">🇷🇺 Русский</button>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- 主要内容区域 -->
    <main id="body">
        <div class="container">
            <div class="row">
                <div class="col-mb-12 col-12" id="main" role="main">
                    <div class="post-content">
                        <!-- 站点信息 -->
                        <div class="site-info">
                            <p class="site-address">
                                <span id="currentAddress">本站地址：</span>
                                <span id="shortUrl">短网址：</span>
                            </p>
                        </div>
                        
                        <!-- 中文导航区块 -->
                        <section class="nav-section">
                            <h3 id="cnNavigationTitle">🌏 CN中文导航</h3>
                            <div class="banner-grid" id="cnNavigationLinks">
                                <!-- 导航链接将由JavaScript动态生成 -->
                            </div>
                        </section>

                        <!-- 海外导航区块 -->
                        <section class="nav-section">
                            <h3 id="osNavigationTitle">🌍 OS海外导航</h3>
                            <div class="banner-grid" id="osNavigationLinks">
                                <!-- 导航链接将由JavaScript动态生成 -->
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- 页脚 -->
    <footer id="footer">
        <p class="copyright">© 2025 生存战争网</p>
    </footer>

    <!-- 脚本引用（确保加载顺序） -->
    <script src="./scweb_res/index/index_languages.js"></script>
    <script src="./scweb_res/index/index_script.js"></script>
</body>
</html>