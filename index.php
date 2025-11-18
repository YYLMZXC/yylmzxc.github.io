<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    
    <meta name="renderer" content="webkit">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="applicable-device" content="pc,mobile">
    <title>生存战争网 - 首页 | SC中文社区官方网站</title>
    <!-- 使用url函数转换相关路径 -->
    <link rel="stylesheet" href="./scweb_res/main.css">
    <link rel="icon" type="image/x-icon" href="./scweb_res/favicon.ico">
    <link rel="canonical" href="http://schub.icu/index.php">
    <!-- 通过自有函数输出HTML头部信息 -->
    <meta name="description" content="生存战争网是中国最大的SC中文社区，提供游戏攻略、Mod模组、地图存档、材质包、皮肤和家具等资源下载，以及活跃的联机服务器。">
    <meta name="keywords" content="生存战争,SC中文社区,生存战争MOD,生存战争联机版,生存战争服务器,生存战争攻略">
    <!-- 基于Cloudflare Workers AI翻译 -->
    <style>
        .translate-section {
            margin-top: 10px;
            text-align: center;
        }
        .translate-select {
            width: 100%;
            max-width: 280px;
            padding: 8px 12px;
            border: 2px solid #e0e6ed;
            border-radius: 8px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
            color: #333;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .translate-select:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        .translate-select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .translate-select option {
            padding: 8px;
            background: #ffffff;
            color: #333;
        }
        #google_translate_element {
            position: absolute;
            left: -9999px;
            visibility: hidden;
        }
    </style>
</head>
<body>

<header id="header" class="clearfix">
    <div class="container">
        <div class="row">
            <div class="site-name col-mb-12 col-9">
                                    <h1 style="font-size:0">生存战争网_SC中文社区<a id="logo" title="生存战争网_SC中文社区" href="http://schub.icu/index.php">
                        <img width="220px" height="64px" src="./scweb_res/logo.png" alt="生存战争网">
                    </a></h1>
                             </div>
            <div class="site-search col-3 kit-hidden-tb">
                <form id="search" method="post" action="http://schub.icu/sczz/?search--1.htm" role="search">
<select class="search-select" name="cat" style="border: 1px solid #ccc;"><option>任意分类</option><option value="1">插件版Mod模组下载</option><option value="2">联机版Mod模组下载</option><option value="4">游戏历史全版本下载</option><option value="10">材质包下载</option><option value="11">家具包下载</option><option value="9">皮肤大全下载</option><option value="8">地图存档下载</option><option value="6">攻略教程</option></select>

                    <label for="s" class="sr-only">搜索关键字</label>
                    <input type="text" id="s" name="ss" class="text" placeholder="输入关键字搜索">
                    <button type="submit" class="submit">搜索</button>
                </form>
                <div class="translate-section">
                    <select class="translate-select" onchange="translatePage(this.value)">
                        <option value="">🌐 选择语言</option>
                        <option value="zh-CN">🇨🇳 中文（简体）</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="zh-TW">🇹🇼 中文（繁体）</option>
                        <option value="ja">🇯🇵 日本語</option>
                        <option value="ko">🇰🇷 한국어</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                        <option value="es">🇪🇸 Español</option>
                        <option value="it">🇮🇹 Italiano</option>
                        <option value="pt">🇵🇹 Português</option>
                        <option value="ru">🇷🇺 Русский</option>
                        <option value="ar">🇸🇦 العربية</option>
                        <option value="hi">🇮🇳 हिन्दी</option>
                        <option value="th">🇹🇭 ไทย</option>
                        <option value="vi">🇻🇳 Tiếng Việt</option>
                        <option value="tr">🇹🇷 Türkçe</option>
                        <option value="nl">🇳🇱 Nederlands</option>
                        <option value="sv">🇸🇪 Svenska</option>
                        <option value="no">🇳🇴 Norsk</option>
                        <option value="da">🇩🇰 Dansk</option>
                        <option value="fi">🇫🇮 Suomi</option>
                        <option value="pl">🇵🇱 Polski</option>
                        <option value="cs">🇨🇿 Čeština</option>
                        <option value="hu">🇭🇺 Magyar</option>
                        <option value="ro">🇷🇴 Română</option>
                        <option value="bg">🇧🇬 Български</option>
                        <option value="hr">🇭🇷 Hrvatski</option>
                        <option value="sk">🇸🇰 Slovenčina</option>
                        <option value="sl">🇸🇮 Slovenščina</option>
                        <option value="et">🇪🇪 Eesti</option>
                        <option value="lv">🇱🇻 Latviešu</option>
                        <option value="lt">🇱🇹 Lietuvių</option>
                        <option value="el">🇬🇷 Ελληνικά</option>
                    </select>
                    <div id="translation-status" style="font-size: 12px; margin-top: 5px; color: #999;">
                        🔍 正在检查翻译服务...
                    </div>
                </div>
            </div>
            <div class="col-mb-12">
                <nav id="nav-menu" class="clearfix" role="navigation">
                    <a title="生存战争网_SC中文社区" href="http://schub.icu/index.php" class="active">首页</a><a title="生存战争联机服务器地址列表" href="http://schub.icu/online_server.php">联机服务器列表</a><a rel="nofollow" target="_blank" title="生存战争-APImod制作教程" href="https://www.yuque.com/u589148/wf2knt">APImod制作教程</a></nav>
            </div>
        </div><!-- end .row -->
    </div>
</header><!-- end #header -->
<div id="body">
    <div class="container">
        <div class="row">
            <div class="col-mb-12 col-8" id="main" role="main">
                <div class="post-content">
                    <p class="site-address">
                        <span>本站地址：<b>schub.icu</b></span>
                        <span>短网址：<b>scnet.top</b></span>
                    </p>
                    
                    <h3 style="color: #333; margin: 20px 0 10px 0; border-bottom: 2px solid #007cba; padding-bottom: 5px;">🌏 CN中文导航</h3>
                    <div class="banner-grid">
                        <a rel="nofollow" target="_blank" title="生存战争MOD下载" href="http://schub.icu/sczz/"><span>生存战争论坛</span></a>
                        <a rel="nofollow" target="_blank" title="SC中文社区" href="https://www.schub.top/"><span>SC中文社区</span></a>
                        <a target="_blank" title="生存战争盒子网" href="https://web.schz.top"><span>生存战争盒子网</span></a>
                        <a target="_blank" title="生存战争百科" href="https://www.yuque.com/u589148/sc"><span>生存战争百科</span></a>
                        <a target="_blank" title="生存战争插件版Mod模组下载" href="http://schub.icu/sczz/?forum-3.htm"><span>插件版Mod(模组)</span></a>
                        <a target="_blank" title="生存战争联机版Mod模组下载" href="http://schub.icu/sczz/?forum-4.htm"><span>联机版Mod(模组)</span></a>
                        <a target="_blank" title="生存战争材质包下载" href="http://schub.icu/sczz/?forum-5.htm"><span>材质包</span></a>
                        <a target="_blank" title="生存战争皮肤大全下载" href="http://schub.icu/sczz/?forum-6.htm"><span>皮肤包</span></a>
                        <a target="_blank" title="生存战争地图存档下载" href="http://schub.icu/sczz/?forum-2.htm"><span>地图包</span></a>
                        <a target="_blank" title="生存战争家具包下载" href="http://schub.icu/sczz/?forum-7.htm"><span>家具包</span></a>
                        <a target="_blank" title="JIILSCplugins - 服务端插件" href="https://spd.jiil.top/index.html"><span>服务端插件</span></a>
                        <a target="_blank" title="生存战争模组网" href="https://www.scmod.cn/"><span>模组网</span></a>
                        <a target="_blank" title="备用测试SC中文社区" href="https://test.suancaixianyu.cn/"><span>备用测试SC中文社区</span></a>
                        <a target="_blank" title="JIIL论坛 - 服务端插件社区" href="https://bbs.jiil.top/"><span>JIIL论坛</span></a>
                    </div>

                    <h3 style="color: #333; margin: 30px 0 10px 0; border-bottom: 2px solid #ff6b35; padding-bottom: 5px;">🌍 OS海外导航</h3>
                    <div class="banner-grid">
                        <a rel="nofollow" target="_blank" title="SurvivalCraft Fans Club - 俄语SC社区" href="https://vk.com/fans_club_survivalcraft"><span>俄语SC社区</span></a>
                        <a rel="nofollow" target="_blank" title="SurvivalCraft Discussion - 原版SC社区" href="https://www.tapatalk.com/groups/survivalcraft/discussion/all"><span>原版SC社区</span></a>
                        <a rel="nofollow" target="_blank" title="Survivalcraft 2 MODS - 海外Mod网站" href="https://survivalcraft2mods.blogspot.com/"><span>海外Mod网站</span></a>
                        <a rel="nofollow" target="_blank" title="Survivalcraft Official Blog - 正版官网" href="https://kaalus.wordpress.com/"><span>正版官网</span></a>
                    </div>
                </div>
            </div>
        </div><!-- end .row -->
    </div>
</div><!-- end #body -->

<footer id="footer">
    <p><br>© 2025 生存战争网</p>
</footer><!-- end #footer -->

<!-- Cloudflare Workers AI翻译容器 -->
<script>
  // 百度统计代码
  var _hmt = _hmt || [];
  (function() {
    var hm = document.createElement("script");
    hm.src = "https://hm.baidu.com/hm.js?49508fcc51529f79d0f7e42bd08ed491";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(hm, s);
  })();
</script>

<!-- Cloudflare Workers AI翻译服务 -->

<!-- Cloudflare Workers AI翻译服务 -->
<script type="text/javascript">
    // Cloudflare Workers翻译配置
    var translatorConfig = {
        from: "zh",      // 源语言：中文
        workerUrl: "https://translation.yylmzxc.workers.dev/", // Cloudflare Workers翻译服务
        supportedLanguages: {
            "": "🌐 选择语言",
            "zh": "🇨🇳 中文（简体）",
            "zh-TW": "🇹🇼 中文（繁体）", 
            "en": "🇺🇸 English",
            "ja": "🇯🇵 日本語",
            "ko": "🇰🇷 한국어",
            "fr": "🇫🇷 Français",
            "de": "🇩🇪 Deutsch",
            "es": "🇪🇸 Español",
            "it": "🇮🇹 Italiano",
            "pt": "🇵🇹 Português",
            "ru": "🇷🇺 Русский",
            "ar": "🇸🇦 العربية",
            "hi": "🇮🇳 हिन्दी",
            "th": "🇹🇭 ไทย",
            "vi": "🇻🇳 Tiếng Việt",
            "tr": "🇹🇷 Türkçe",
            "nl": "🇳🇱 Nederlands",
            "sv": "🇸🇪 Svenska",
            "no": "🇳🇴 Norsk",
            "da": "🇩🇰 Dansk",
            "fi": "🇫🇮 Suomi",
            "pl": "🇵🇱 Polski",
            "cs": "🇨🇿 Čeština",
            "hu": "🇭🇺 Magyar",
            "ro": "🇷🇴 Română",
            "bg": "🇧🇬 Български",
            "hr": "🇭🇷 Hrvatski",
            "sk": "🇸🇰 Slovenčina",
            "sl": "🇸🇮 Slovenščina",
            "et": "🇪🇪 Eesti",
            "lv": "🇱🇻 Latviešu",
            "lt": "🇱🇹 Lietuvių",
            "el": "🇬🇷 Ελληνικά"
        }
    };

    // 翻译页面到指定语言
    async function translatePage(lang) {
        if (!lang || lang === "") return; // 如果选择的是"选择语言"，不执行翻译
        
        console.log('准备使用Cloudflare Worker翻译到:', lang);
        
        // 获取页面内容进行翻译（排除script和style标签）
        const excludeTags = ['script', 'style', 'meta', 'link'];
        let pageContent = '';
        
        // 使用DOMParser来安全地提取文本内容
        const parser = new DOMParser();
        const doc = parser.parseFromString(document.documentElement.outerHTML, 'text/html');
        
        // 移除不需要翻译的元素
        excludeTags.forEach(tag => {
            const elements = doc.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });
        
        // 获取主要内容文本
        const translatableElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, div, li, td, th, option');
        translatableElements.forEach(el => {
            if (el.textContent.trim()) {
                pageContent += el.textContent.trim() + '\n';
            }
        });
        
        if (!pageContent.trim()) {
            alert('没有找到可翻译的内容');
            return;
        }
        
        try {
            // 显示翻译进度提示
            showTranslationProgress();
            
            console.log('翻译内容长度:', pageContent.length);
            
            // 调用Cloudflare Worker翻译API
            const response = await fetch(`${translatorConfig.workerUrl}?q=${encodeURIComponent(pageContent)}&from=${translatorConfig.from}&to=${lang}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error('HTTP错误:', response.status, response.statusText);
                throw new Error(`翻译服务错误: ${response.status} ${response.statusText}`);
            }
            
            const responseText = await response.text();
            console.log('原始响应:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON解析错误:', parseError);
                // 如果直接返回的是翻译文本而不是JSON
                if (responseText && responseText.trim()) {
                    result = { translatedText: responseText.trim() };
                } else {
                    throw new Error('翻译服务返回了无效的响应格式');
                }
            }
            
            console.log('解析后的结果:', result);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            if (!result.translatedText) {
                throw new Error('翻译服务没有返回翻译结果');
            }
            
            // 使用翻译结果替换页面内容（更安全的方式）
            translatePageContent(result.translatedText, lang);
            
            // 隐藏翻译进度提示
            hideTranslationProgress();
            
            console.log('Cloudflare Worker翻译成功到:', lang);
            
        } catch (error) {
            console.error('翻译失败:', error);
            hideTranslationProgress();
            
            // 提供更详细的错误信息
            let errorMessage = '翻译功能暂时不可用。\n\n';
            errorMessage += '错误信息: ' + error.message + '\n';
            errorMessage += '\n可能的解决方案:\n';
            errorMessage += '1. 检查网络连接\n';
            errorMessage += '2. 稍后重试\n';
            errorMessage += '3. 联系网站管理员检查翻译服务状态';
            
            alert(errorMessage);
        }
    }

    // 显示翻译进度
    function showTranslationProgress() {
        var progressDiv = document.createElement('div');
        progressDiv.id = 'translation-progress';
        progressDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
                        justify-content: center; align-items: center;">
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                                border-top: 4px solid #667eea; border-radius: 50%; 
                                animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    <p>正在翻译页面内容，请稍候...</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(progressDiv);
    }

    // 隐藏翻译进度
    function hideTranslationProgress() {
        var progressDiv = document.getElementById('translation-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }

    // 安全地替换页面内容
    function translatePageContent(translatedText, targetLang) {
        // 保存重要的页面元素
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
        const scriptElements = document.querySelectorAll('script');
        
        // 翻译文本按行分割
        const translatedLines = translatedText.split('\n').filter(line => line.trim());
        
        // 获取所有可翻译的元素
        const translatableElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, div, li, td, th, option');
        
        let lineIndex = 0;
        translatableElements.forEach((el, index) => {
            if (lineIndex < translatedLines.length && el.textContent.trim()) {
                const originalText = el.textContent.trim();
                // 替换文本内容，但保留HTML结构
                el.innerHTML = el.innerHTML.replace(originalText, translatedLines[lineIndex]);
                lineIndex++;
            }
        });
        
        // 设置语言属性
        document.documentElement.lang = targetLang;
        document.documentElement.setAttribute('xml:lang', targetLang);
        
        console.log('页面内容翻译完成，目标语言:', targetLang);
    }

    // 测试翻译服务是否可用
    async function testTranslationService() {
        try {
            console.log('测试翻译服务...');
            const response = await fetch(`${translatorConfig.workerUrl}?q=你好&from=zh&to=en`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.text();
                console.log('翻译服务测试成功:', result);
                return true;
            } else {
                console.error('翻译服务测试失败:', response.status);
                return false;
            }
        } catch (error) {
            console.error('翻译服务连接失败:', error);
            return false;
        }
    }

    // 页面加载完成后初始化翻译服务
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟测试翻译服务，避免阻塞页面加载
        setTimeout(async () => {
            const isServiceAvailable = await testTranslationService();
            const statusElement = document.getElementById('translation-status');
            
            if (isServiceAvailable) {
                statusElement.innerHTML = '✅ 翻译服务正常';
                statusElement.style.color = '#28a745';
            } else {
                statusElement.innerHTML = '❌ 翻译服务不可用';
                statusElement.style.color = '#dc3545';
            }
        }, 2000); // 2秒后测试
    });
</script>
</body>
</html>