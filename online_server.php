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
        'ip' => 'y.yylmzxc.icu',
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
    <title>生存战争联机服务器列表 | SC中文社区</title>
    <link rel="stylesheet" href="./scweb_res/online_server/online_server_main.css">
    <link rel="stylesheet" href="./scweb_res/online_server/online_server.css">
    <link rel="icon" type="image/x-icon" href="./scweb_res/favicon.ico">
    <link rel="canonical" href="online_server.php">
    <meta name="description" content="生存战争联机服务器列表，包括原版生存服、MOD服、商店服等多种类型服务器，加入我们的QQ群获取更多信息。">
    <meta name="keywords" content="生存战争联机服务器,生存战争服务器地址,SC联机服,生存战争MOD服,生存战争原版服">
</head>
<body>
<header id="header" class="clearfix">
    <div class="container">
        <div class="row">
            <div class="site-name col-mb-12 col-9">
                                    <h1 style="font-size:0">生存战争网_SC中文社区<a id="logo" title="生存战争网_SC中文社区" href="index.html">
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
            </div>
            <div class="col-mb-12">
                <nav id="nav-menu" class="clearfix" role="navigation">
                    <a title="生存战争网_SC中文社区" href="index.html">首页</a><a title="生存战争联机服务器地址列表" href="online_server.php" class="active">联机服务器列表</a><a rel="nofollow" target="_blank" title="生存战争-APImod制作教程" href="https://www.yuque.com/u589148/wf2knt">APImod制作教程</a></nav>
                </div>
        </div><!-- end .row -->
    </div>
</header><!-- end #header -->
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
                        <h3>服务器统计</h3>
                        <p>总计：<?php echo $total_servers; ?> 个服务器 | 原版：<?php echo $original_count; ?> 个 | 模组：<?php echo $mod_count; ?> 个 | 商店：<?php echo $store_count; ?> 个</p>
                    </div>
                    
                    <div class="server-filters">
                        <h4>筛选服务器：</h4>
                        <a href="online_server.php" class="filter-link <?php echo empty($selected_type) ? 'active' : ''; ?>">全部服务器</a>
                        <a href="online_server.php?type=original" class="filter-link <?php echo $selected_type == 'original' ? 'active' : ''; ?>">原版生存</a>
                        <a href="online_server.php?type=mod" class="filter-link <?php echo $selected_type == 'mod' ? 'active' : ''; ?>">模组服务器</a>
                        <a href="online_server.php?type=store" class="filter-link <?php echo $selected_type == 'store' ? 'active' : ''; ?>">商店服务器</a>
                    </div>
                    
                    <div class="server-list">
                        <?php if (count($filtered_servers) > 0): ?>
                            <?php foreach ($filtered_servers as $server): ?>
                            <div class="server-item">
                                <span class="server-name">
                                    <span class="server-type-badge" data-type="<?php echo $server['type']; ?>">
                                        <?php echo get_server_type_name($server['type']); ?>
                                    </span>
                                    <?php echo $server['name']; ?>
                                </span>
                                <span class="server-ip" data-ip="<?php echo $server['ip']; ?>">
                                    <b><?php echo $server['ip']; ?></b> <span class="copy-hint">点击复制</span>
                                </span>
                                <span class="server-group">群号：<?php echo $server['group']; ?></span>
                                <?php if (!empty($server['note'])): ?>
                                <span class="server-note"><?php echo $server['note']; ?></span>
                                <?php endif; ?>
                            </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="no-servers">
                                <p>暂无符合条件的服务器</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <div class="col-mb-12 col-4" id="sidebar" role="complementary">
                <div class="join-group">
                    <p>欢迎加入我们的交流群：<a href="https://qm.qq.com/q/IhNyeKSe8C" target="_blank" class="group-link">生存战争34服务器联机交流群</a>（群号：826823481）</p>
                </div>
                
                <div class="join-group" style="background-color: #f0f7ff; margin-top: 20px;">
                    <p>联机服列表管理办事处：<a href="https://qm.qq.com/q/vvbsoOvoPu" target="_blank" class="group-link">开服申请点击加入</a>（群号：893387376）</p>
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
</script>
</body>
</html>