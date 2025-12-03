<?php
/**
 * PHP网络配置检查工具
 * 用于检查可能影响网络连接的PHP配置设置
 */

// 设置响应头
header('Content-Type: text/html; charset=utf-8');

echo '<h1>PHP网络配置检查</h1>';
echo '<pre>';

// 基本PHP信息
echo '<h2>基本PHP信息</h2>';
echo 'PHP版本: ' . phpversion() . PHP_EOL;
echo '服务器软件: ' . (isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : '未知') . PHP_EOL;
echo '服务器IP: ' . (isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '未知') . PHP_EOL;
echo '当前时间: ' . date('Y-m-d H:i:s') . PHP_EOL;
echo PHP_EOL;

// 网络相关配置
echo '<h2>网络相关配置</h2>';
echo 'allow_url_fopen: ' . ini_get('allow_url_fopen') . PHP_EOL;
echo 'allow_url_include: ' . ini_get('allow_url_include') . PHP_EOL;
echo 'default_socket_timeout: ' . ini_get('default_socket_timeout') . '秒' . PHP_EOL;
echo 'open_basedir: ' . (ini_get('open_basedir') ?: '未设置') . PHP_EOL;
echo PHP_EOL;

// 禁用的函数
echo '<h2>禁用的函数</h2>';
$disabledFunctions = ini_get('disable_functions');
if ($disabledFunctions) {
    $disabledArray = explode(',', $disabledFunctions);
    $networkFunctions = array('fsockopen', 'pfsockopen', 'socket_create', 'socket_connect', 
                             'gethostbyname', 'gethostbyaddr', 'dns_get_record', 'gethostbynamel');
    
    echo '所有禁用的函数: ' . $disabledFunctions . PHP_EOL . PHP_EOL;
    echo '网络相关的禁用函数:' . PHP_EOL;
    foreach ($networkFunctions as $func) {
        if (in_array($func, $disabledArray)) {
            echo '✗ ' . $func . PHP_EOL;
        } else {
            echo '✓ ' . $func . ' (可用)' . PHP_EOL;
        }
    }
} else {
    echo '没有禁用任何函数' . PHP_EOL;
}
echo PHP_EOL;

// 测试基本网络功能
echo '<h2>网络功能测试</h2>';

// 测试DNS解析
echo 'DNS解析测试:' . PHP_EOL;
$testDomains = array('api.yylmzxc.icu', 'yylmzxc.icu', 'baidu.com', 'google.com');
foreach ($testDomains as $domain) {
    $startTime = microtime(true);
    $ip = @gethostbyname($domain);
    $resolveTime = microtime(true) - $startTime;
    
    if ($ip !== $domain) {
        echo '✓ ' . $domain . ' -> ' . $ip . ' (耗时: ' . round($resolveTime * 1000) . 'ms)' . PHP_EOL;
    } else {
        echo '✗ ' . $domain . ' 解析失败 (耗时: ' . round($resolveTime * 1000) . 'ms)' . PHP_EOL;
    }
}
echo PHP_EOL;

// 测试fsockopen
echo 'fsockopen测试:' . PHP_EOL;
if (function_exists('fsockopen')) {
    $testServers = array(
        array('host' => '8.8.8.8', 'port' => 53, 'name' => 'Google DNS'),
        array('host' => '114.114.114.114', 'port' => 53, 'name' => '114 DNS'),
        array('host' => 'baidu.com', 'port' => 80, 'name' => 'Baidu HTTP')
    );
    
    foreach ($testServers as $server) {
        $startTime = microtime(true);
        $socket = @fsockopen($server['host'], $server['port'], $errno, $errstr, 2);
        $connectTime = microtime(true) - $startTime;
        
        if ($socket) {
            echo '✓ ' . $server['name'] . ' (' . $server['host'] . ':' . $server['port'] . ') 连接成功 (耗时: ' . round($connectTime * 1000) . 'ms)' . PHP_EOL;
            fclose($socket);
        } else {
            echo '✗ ' . $server['name'] . ' (' . $server['host'] . ':' . $server['port'] . ') 连接失败: ' . $errstr . ' (错误号: ' . $errno . ', 耗时: ' . round($connectTime * 1000) . 'ms)' . PHP_EOL;
        }
    }
} else {
    echo '✗ fsockopen函数不可用' . PHP_EOL;
}
echo PHP_EOL;

// 测试curl（如果可用）
echo 'cURL测试:' . PHP_EOL;
if (function_exists('curl_init')) {
    $ch = curl_init('http://www.baidu.com');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $startTime = microtime(true);
    $result = curl_exec($ch);
    $curlTime = microtime(true) - $startTime;
    
    if ($result) {
        echo '✓ cURL请求成功 (耗时: ' . round($curlTime * 1000) . 'ms)' . PHP_EOL;
    } else {
        echo '✗ cURL请求失败: ' . curl_error($ch) . ' (错误号: ' . curl_errno($ch) . ', 耗时: ' . round($curlTime * 1000) . 'ms)' . PHP_EOL;
    }
    
    curl_close($ch);
} else {
    echo '✗ cURL扩展不可用' . PHP_EOL;
}
echo PHP_EOL;

// DNS服务器配置
echo '<h2>DNS服务器配置</h2>';
if (function_exists('shell_exec')) {
    // 尝试获取DNS服务器配置
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Windows系统
        $dnsConfig = shell_exec('ipconfig /all | findstr /i DNS');
    } else {
        // Linux/Unix系统
        $dnsConfig = shell_exec('cat /etc/resolv.conf');
    }
    
    if ($dnsConfig) {
        echo 'DNS配置: ' . PHP_EOL . $dnsConfig . PHP_EOL;
    } else {
        echo '无法获取DNS配置' . PHP_EOL;
    }
} else {
    echo 'shell_exec函数不可用，无法获取DNS配置' . PHP_EOL;
}
echo PHP_EOL;

echo '</pre>';
echo '<h2>总结</h2>';
echo '<p>请将以上信息提供给技术支持，以便进一步分析网络连接问题。</p>';
?>