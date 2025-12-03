<?php
// 服务器数据文件
// 定义服务器数据数组 - 包含类型信息
global $servers;
$servers = array(
    array(
        'name' => '土豆服主1服分支',
        'ip' => 'api.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆服2服',
        'ip' => 'yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆服3服',
        'ip' => 'y.yylmzxc.icu:28887',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆服4服',
        'ip' => 't.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '空岛刷怪9服',
        'ip' => 'v.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '测试服',
        'ip' => 'b.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => 'mod模组测试服',
        'ip' => 'b.yylmzxc.icu:38887',
        'group' => '826823481',
        'note' => '加群获取MOD',
        'type' => 'mod'
    )
);

// 备注内容到键名的映射
$note_key_mapping = array(
    '加群获取MOD' => 'modServer',
    '即将开服' => 'comingSoon', 
    '测试服务器' => 'testServer',
    '维护中' => 'maintenance'
);

// 获取备注键名的函数
function get_note_key($note) {
    global $note_key_mapping;
    return isset($note_key_mapping[$note]) ? $note_key_mapping[$note] : '';
}

// 获取服务器列表的函数
function get_servers($type = '') {
    global $servers;
    
    // 如果没有指定类型，返回所有服务器
    if (empty($type)) {
        return $servers;
    }
    
    // 根据类型筛选服务器
    $filtered_servers = array();
    foreach ($servers as $server) {
        if (isset($server['type']) && $server['type'] == $type) {
            $filtered_servers[] = $server;
        }
    }
    
    return $filtered_servers;
}

// 获取服务器类型名称的函数
function get_server_type_name($type) {
    switch ($type) {
        case 'original':
            return '原版';
        case 'mod':
            return '模组';
        case 'store':
            return '商店';
        default:
            return '未知';
    }
}

// 添加服务器的函数（用于后续扩展）
function add_server($name, $ip, $group, $note = '', $type = 'original') {
    global $servers;
    
    $servers[] = array(
        'name' => $name,
        'ip' => $ip,
        'group' => $group,
        'note' => $note,
        'type' => $type
    );
    
    return true;
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="renderer" content="webkit">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="applicable-device" content="pc,mobile">
    <title data-i18n="page.title">生存战争联机服务器列表 | SC中文社区</title>
    <link rel="stylesheet" href="./scweb_res/online_server/online_server_main.css">
    <link rel="icon" type="image/x-icon" href="./scweb_res/favicon.ico">
    <link rel="canonical" href="online_server.php">
    <meta name="description" content="生存战争联机服务器列表，包括原版生存服、MOD服、商店服等多种类型服务器，加入我们的QQ群获取更多信息。">
    <meta name="keywords" content="生存战争联机服务器,生存战争服务器地址,SC联机服,生存战争MOD服,生存战争原版服">
    
    <!-- 多语言支持 -->
    <script type="module" src="./scweb_res/online_server/online_server_languages.js"></script>
</head>
<body>
<header id="header" class="clearfix">
    <div class="container">
        <div class="row">
            <div class="site-name col-mb-12 col-12">
                <h1 style="font-size:0">生存战争网_SC中文社区<a id="logo" title="生存战争网_SC中文社区" href="index.php">
                    <img width="220px" height="64px" src="./scweb_res/logo.png" alt="生存战争网">
                </a></h1>
            </div>
        </div><!-- end .row -->
    </div>
</header><!-- end #header -->

<!-- 导航栏 -->
<nav id="top-nav-bar" class="clearfix" role="navigation">
    <div class="container">
        <div class="row">
            <!-- 导航菜单 -->
            <div id="nav-menu" class="nav-menu">
                <a title="生存战争网_SC中文社区" href="index.php" class="i18n-link" data-i18n="nav.home">首页</a>
                <a title="生存战争联机服务器地址列表" href="online_server.php" class="active i18n-link" data-i18n="nav.serverList">联机服务器列表</a>
                <a rel="nofollow" target="_blank" title="生存战争-APImod制作教程" href="https://www.yuque.com/u589148/wf2knt" class="i18n-link" data-i18n="nav.apiTutorial">APImod制作教程</a>
            </div>
            
            <!-- 语言选择器放在右上角 -->
            <div class="language-section-top-right">
                <div class="language-selector">
                    <button class="language-btn active" data-lang="zh" title="切换到中文">🇨🇳 中文</button>
                    <button class="language-btn" data-lang="en" title="Switch to English">🇺🇸 English</button>
                    <button class="language-btn" data-lang="ru" title="Переключиться на Русский">🇷🇺 Русский</button>
                </div>
            </div>
        </div><!-- end .row -->
    </div>
</nav><!-- end #top-nav-bar -->

<div id="body">
    <div class="container">
        <div class="row">
            <div class="col-mb-12 col-8" id="main" role="main">
                <div class="post-content">
                    <?php
                    // 获取当前选择的服务器类型
                    $selected_type = isset($_GET['type']) ? $_GET['type'] : '';
                    $filtered_servers = get_servers($selected_type);
                    
                    // 获取服务器统计信息
                    $total_servers = count(get_servers());
                    $original_count = count(get_servers('original'));
                    $mod_count = count(get_servers('mod'));
                    $store_count = count(get_servers('store'));
                    ?>
                    
                    <div class="server-stats">
                        <h3 data-i18n="stats.title">服务器统计</h3>
                        <p><span data-i18n="stats.total">总计：</span><?php echo $total_servers; ?> <span data-i18n="stats.servers">个服务器</span> | 
                           <span data-i18n="stats.original">原版：</span><?php echo $original_count; ?> <span data-i18n="stats.servers">个服务器</span> | 
                           <span data-i18n="stats.mod">模组：</span><?php echo $mod_count; ?> <span data-i18n="stats.servers">个服务器</span> | 
                           <span data-i18n="stats.store">商店：</span><?php echo $store_count; ?> <span data-i18n="stats.servers">个服务器</span></p>
                    </div>
                    
                    <div class="server-filters">
                        <h4 data-i18n="filters.title">筛选服务器：</h4>
                        <a href="online_server.php" class="filter-link <?php echo empty($selected_type) ? 'active' : ''; ?>" data-i18n="filters.allServers">全部服务器</a>
                        <a href="online_server.php?type=original" class="filter-link <?php echo $selected_type == 'original' ? 'active' : ''; ?>" data-i18n="filters.originalSurvival">原版生存</a>
                        <a href="online_server.php?type=mod" class="filter-link <?php echo $selected_type == 'mod' ? 'active' : ''; ?>" data-i18n="filters.modServer">模组服务器</a>
                        <a href="online_server.php?type=store" class="filter-link <?php echo $selected_type == 'store' ? 'active' : ''; ?>" data-i18n="filters.storeServer">商店服务器</a>
                    </div>
                    
                    <div class="server-list">
                        <?php if (count($filtered_servers) > 0): ?>
                            <?php foreach ($filtered_servers as $server): ?>
                            <div class="server-item">
                                <span class="server-name">
                                    <span class="server-type-badge" data-type="<?php echo $server['type']; ?>" data-i18n="server.types.<?php echo $server['type']; ?>">
                                        <?php echo get_server_type_name($server['type']); ?>
                                    </span>
                                    <span class="server-name-text" data-server-name="<?php echo htmlspecialchars($server['name'], ENT_QUOTES); ?>">
                                        <?php echo $server['name']; ?>
                                    </span>
                                </span>
                                <span class="server-ip" data-ip="<?php echo $server['ip']; ?>" title="点击复制IP" data-i18n="server.clickToCopy" data-i18n-attr="title">
                                    <b><?php echo $server['ip']; ?></b> <span class="copy-hint" data-i18n="server.clickToCopy">点击复制</span>
                                </span>
                                <span class="server-ping" data-ip="<?php echo $server['ip']; ?>">
                                    <span class="ping-icon">🔄</span>
                                    <span class="ping-text" data-i18n="server.ping">检测延迟...</span>
                                </span>
                                <span class="server-group" data-group="<?php echo $server['group']; ?>" title="点击复制群号" data-i18n="server.clickToCopy" data-i18n-attr="title">
                                    <span data-i18n="server.groupNumber">群号：</span><b><?php echo $server['group']; ?></b> <span class="copy-hint" data-i18n="server.clickToCopy">点击复制</span>
                                </span>
                                <?php if (!empty($server['note'])): ?>
                                <?php $noteKey = get_note_key($server['note']); ?>
                                <?php if (!empty($noteKey)): ?>
                                <span class="server-note" data-i18n="server.notes.<?php echo $noteKey; ?>" data-original-note="<?php echo htmlspecialchars($server['note'], ENT_QUOTES); ?>"><?php echo $server['note']; ?></span>
                                <?php else: ?>
                                <span class="server-note" data-original-note="<?php echo htmlspecialchars($server['note'], ENT_QUOTES); ?>"><?php echo $server['note']; ?></span>
                                <?php endif; ?>
                                <?php endif; ?>
                            </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="no-servers">
                                <p data-i18n="server.noServers">暂无符合条件的服务器</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <div class="col-mb-12 col-4" id="sidebar" role="complementary">
                <div class="join-group">
                    <p>
                        <span data-i18n="server.joinGroup">欢迎加入我们的交流群：</span>
                        <a href="https://qm.qq.com/q/IhNyeKSe8C" target="_blank" class="group-link" data-i18n="server.groups.main">生存战争34服务器联机交流群</a>
                        （<span data-i18n="server.groupNumber">群号：</span><span data-i18n="server.groups.mainNumber">826823481</span>）
                    </p>
                </div>
                
                <div class="join-group" style="background-color: #f0f7ff; margin-top: 20px;">
                    <p>
                        <span data-i18n="server.managementOffice">联机服列表管理办事处：</span>
                        <a href="https://qm.qq.com/q/vvbsoOvoPu" target="_blank" class="group-link" data-i18n="server.groups.management">开服申请点击加入</a>
                        （<span data-i18n="server.groupNumber">群号：</span><span data-i18n="server.groups.managementNumber">893387376</span>）
                    </p>
                </div>
            </div>
        </div><!-- end .row -->
    </div>
</div><!-- end #body -->
<footer id="footer">
		<p><br>© 2025 生存战争网</p>
	</footer><!-- end #footer -->
<script>
  // 百度统计代码
  var _hmt = _hmt || [];
  (function() {
    var hm = document.createElement("script");
    hm.src = "https://hm.baidu.com/hm.js?49508fcc51529f79d0f7e42bd08ed491";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(hm, s);
  })();
  
  // 点击复制IP功能
  document.querySelectorAll('.server-ip').forEach(function(element) {
    element.style.cursor = 'pointer';
    element.addEventListener('click', function() {
      var ip = this.getAttribute('data-ip');
      navigator.clipboard.writeText(ip).then(function() {
        // 显示复制成功提示
        var hint = element.querySelector('.copy-hint');
        var originalText = hint.textContent;
        hint.textContent = '已复制!';
        hint.style.color = '#008000';
        
        // 2秒后恢复原提示
        setTimeout(function() {
          hint.textContent = originalText;
          hint.style.color = '';
        }, 2000);
      }).catch(function(err) {
        console.error('复制失败:', err);
      });
    });
  });
  
  // 点击复制群号功能
  document.querySelectorAll('.server-group').forEach(function(element) {
    element.style.cursor = 'pointer';
    element.addEventListener('click', function() {
      var group = this.getAttribute('data-group');
      navigator.clipboard.writeText(group).then(function() {
        // 显示复制成功提示
        var hint = element.querySelector('.copy-hint');
        var originalText = hint.textContent;
        hint.textContent = '已复制!';
        hint.style.color = '#008000';
        
        // 2秒后恢复原提示
        setTimeout(function() {
          hint.textContent = originalText;
          hint.style.color = '';
        }, 2000);
      }).catch(function(err) {
        console.error('复制失败:', err);
      });
    });
  });
  
  // 服务器Ping功能
  function pingServer(ip, element) {
    var xhr = new XMLHttpRequest();
    // 使用相对路径确保与当前页面协议一致
    var pingUrl = window.location.protocol + '//' + window.location.host + '/ping_server.php?ip=' + encodeURIComponent(ip);
    
    xhr.open('GET', pingUrl, true);
    
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var result = JSON.parse(xhr.responseText);
          updatePingResult(element, result);
        } catch (e) {
          console.error('解析Ping结果失败:', e);
          updatePingError(element, '解析失败');
        }
      } else {
        updatePingError(element, '连接错误 (' + xhr.status + ')');
      }
    };
    
    xhr.onerror = function(e) {
      console.error('XHR错误:', e);
      updatePingError(element, '网络错误');
    };
    
    xhr.timeout = 5000; // 增加超时时间到5秒
    xhr.ontimeout = function() {
      updatePingError(element, '请求超时');
    };
    
    xhr.send();
  }
  
  function updatePingResult(element, result) {
    var pingIcon = element.querySelector('.ping-icon');
    var pingText = element.querySelector('.ping-text');
    
    // 停止旋转动画
    pingIcon.style.animation = 'none';
    
    if (result.success) {
      // 始终显示延迟信息，即使是-1
      pingIcon.textContent = '📶';
      if (result.latency >= 0) {
        // 有有效延迟值
        if (result.latency < 1) {
          pingText.textContent = '<1 ms';
        } else {
          // 保留2位小数显示延迟
          pingText.textContent = parseFloat(result.latency).toFixed(2) + ' ms';
        }
        
        // 根据延迟设置样式
        element.classList.remove('ping-low', 'ping-medium', 'ping-high', 'ping-timeout');
        if (result.latency < 100) {
          element.classList.add('ping-low');
        } else if (result.latency < 300) {
          element.classList.add('ping-medium');
        } else {
          element.classList.add('ping-high');
        }
      } else {
        // 延迟值为-1（默认值）
        pingText.textContent = '连接中...';
        element.classList.remove('ping-low', 'ping-medium', 'ping-high', 'ping-timeout');
        element.classList.add('ping-low');
      }
    } else {
      // 显示详细错误信息
      var errorMsg = result.error || '无法连接';
      if (result.errors && result.errors.length > 0) {
        errorMsg = result.errors[0];
      }
      updatePingError(element, errorMsg);
    }
  }
  
  function updatePingError(element, error) {
    var pingIcon = element.querySelector('.ping-icon');
    var pingText = element.querySelector('.ping-text');
    
    // 停止旋转动画
    pingIcon.style.animation = 'none';
    pingIcon.textContent = '❌';
    
    // 设置错误文本
    pingText.textContent = error;
    
    // 设置错误样式
    element.classList.remove('ping-low', 'ping-medium', 'ping-high');
    element.classList.add('ping-timeout');
  }
  
  // 页面加载完成后执行Ping
  document.addEventListener('DOMContentLoaded', function() {
    // 为每个服务器执行Ping（添加延迟避免同时发送太多请求）
    var pingElements = document.querySelectorAll('.server-ping');
    pingElements.forEach(function(element, index) {
      setTimeout(function() {
        var ip = element.getAttribute('data-ip');
        pingServer(ip, element);
      }, index * 500); // 每个请求间隔500毫秒
    });
    
    // 每隔30秒自动刷新一次Ping结果
    setInterval(function() {
      pingElements.forEach(function(element, index) {
        setTimeout(function() {
          var ip = element.getAttribute('data-ip');
          pingServer(ip, element);
        }, index * 500); // 每个请求间隔500毫秒
      });
    }, 30000);
  });
</script>
</body>
</html>