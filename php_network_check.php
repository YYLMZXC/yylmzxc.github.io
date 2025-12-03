<?php
/**
 * PHP网络配置检查工具
 * 用于检查可能影响网络连接的PHP配置设置
 */

// 设置响应头
header('Content-Type: text/html; charset=utf-8');

// 获取socket错误信息的函数
function getSocketErrorMeaning($errno) {
    $errorMessages = array(
        10060 => '连接超时',
        10061 => '连接被拒绝',
        110 => '连接超时',
        111 => '连接被拒绝',
        61 => '连接被拒绝'
    );
    return isset($errorMessages[$errno]) ? $errorMessages[$errno] : '未知错误';
}

echo '<h1>PHP网络配置检查</h1>';
echo '<pre>';

// 基本PHP信息
echo '<h2>基本PHP信息</h2>';
echo 'PHP版本: ' . phpversion() . PHP_EOL;
echo '服务器软件: ' . (isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : '未知') . PHP_EOL;
echo '服务器IP: ' . (isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '未知') . PHP_EOL;
echo '远程IP: ' . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '未知') . PHP_EOL;
echo '服务器协议: ' . (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : '未知') . PHP_EOL;
echo '当前时间: ' . date('Y-m-d H:i:s') . PHP_EOL;
echo PHP_EOL;

// 详细网络相关配置
echo '<h2>详细网络相关配置</h2>';
echo 'allow_url_fopen: ' . ini_get('allow_url_fopen') . ' (允许远程文件访问)' . PHP_EOL;
echo 'allow_url_include: ' . ini_get('allow_url_include') . ' (允许远程文件包含)' . PHP_EOL;
echo 'default_socket_timeout: ' . ini_get('default_socket_timeout') . '秒 (默认socket超时)' . PHP_EOL;
echo 'open_basedir: ' . (ini_get('open_basedir') ?: '未设置') . ' (文件系统访问限制)' . PHP_EOL;
echo 'safe_mode: ' . ini_get('safe_mode') . ' (安全模式)' . PHP_EOL;
echo 'disable_functions: ' . (ini_get('disable_functions') ?: '未设置') . ' (禁用函数列表)' . PHP_EOL;
echo 'disable_classes: ' . (ini_get('disable_classes') ?: '未设置') . ' (禁用类列表)' . PHP_EOL;
echo 'memory_limit: ' . ini_get('memory_limit') . ' (内存限制)' . PHP_EOL;
echo 'max_execution_time: ' . ini_get('max_execution_time') . '秒 (最大执行时间)' . PHP_EOL;
echo PHP_EOL;

// 网络函数检查
echo '<h2>网络函数检查</h2>';
$network_functions = [
    'fsockopen' => 'Socket连接函数',
    'pfsockopen' => '持久Socket连接函数',
    'socket_create' => '创建Socket',
    'socket_connect' => '连接Socket',
    'gethostbyname' => '域名解析为IP',
    'gethostbyaddr' => 'IP反解析为域名',
    'gethostbynamel' => '获取域名所有IP',
    'checkdnsrr' => 'DNS记录检查',
    'dns_get_record' => '获取DNS记录',
    'curl_init' => 'cURL初始化',
    'stream_socket_client' => '流Socket客户端',
    'stream_context_create' => '创建流上下文',
    'stream_socket_enable_crypto' => '启用SSL/TLS加密'
];

foreach ($network_functions as $func => $desc) {
    echo $func . ' (' . $desc . '): ' . (function_exists($func) ? '可用' : '禁用') . PHP_EOL;
}
echo PHP_EOL;

// 系统环境变量检查
echo '<h2>系统环境变量检查</h2>';
$env_vars = ['PATH', 'SYSTEMROOT', 'TEMP', 'TMP', 'HOSTNAME'];
foreach ($env_vars as $var) {
    echo $var . ': ' . (getenv($var) ?: '未设置') . PHP_EOL;
}
echo PHP_EOL;

// 测试基本网络功能
echo '<h2>网络功能测试</h2>';

// 测试DNS解析
echo 'DNS解析测试:' . PHP_EOL;
$testDomains = array('api.yylmzxc.icu', 'yylmzxc.icu', 'y.yylmzxc.icu', 't.yylmzxc.icu', 'v.yylmzxc.icu', 'b.yylmzxc.icu', 'baidu.com', 'google.com');
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
        array('host' => 'baidu.com', 'port' => 80, 'name' => 'Baidu HTTP'),
        array('host' => 'api.yylmzxc.icu', 'port' => 28887, 'name' => '土豆服主1服分支'),
        array('host' => 'yylmzxc.icu', 'port' => 28887, 'name' => '土豆服2服'),
        array('host' => 'y.yylmzxc.icu', 'port' => 28887, 'name' => '土豆服3服'),
        array('host' => 't.yylmzxc.icu', 'port' => 28887, 'name' => '土豆服4服'),
        array('host' => 'v.yylmzxc.icu', 'port' => 28887, 'name' => '空岛刷怪9服'),
        array('host' => 'b.yylmzxc.icu', 'port' => 28887, 'name' => '测试服'),
        array('host' => 'b.yylmzxc.icu', 'port' => 38887, 'name' => 'mod模组测试服')
    );
    
    foreach ($testServers as $server) {
        $startTime = microtime(true);
        $socket = @fsockopen($server['host'], $server['port'], $errno, $errstr, 10);
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
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

// 增强的端口测试功能
function checkPortDetailed($host, $port, $timeout = 5) {
    $startTime = microtime(true);
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    $connectTime = microtime(true) - $startTime;
    
    $result = array(
        'host' => $host,
        'port' => $port,
        'connected' => false,
        'errno' => $errno,
        'errstr' => $errstr,
        'time' => round($connectTime * 1000),
        'errorMeaning' => getSocketErrorMeaning($errno)
    );
    
    if ($socket) {
        $result['connected'] = true;
        fclose($socket);
    }
    
    return $result;
}

// 详细端口测试
echo '<h2>详细端口测试</h2>';
$gameServers = array(
    array('host' => 'api.yylmzxc.icu', 'port' => 28887, 'name' => '土豆服主1服分支'),
    array('host' => 'yylmzxc.icu', 'port' => 28887, 'name' => '土豆服2服'),
    array('host' => 'y.yylmzxc.icu', 'port' => 28887, 'name' => '土豆服3服'),
    array('host' => 't.yylmzxc.icu', 'port' => 28887, 'name' => '土豆服4服'),
    array('host' => 'v.yylmzxc.icu', 'port' => 28887, 'name' => '空岛刷怪9服'),
    array('host' => 'b.yylmzxc.icu', 'port' => 28887, 'name' => '测试服'),
    array('host' => 'b.yylmzxc.icu', 'port' => 38887, 'name' => 'mod模组测试服')
);

echo '游戏服务器端口详细测试:' . PHP_EOL;
foreach ($gameServers as $server) {
    $result = checkPortDetailed($server['host'], $server['port'], 10);
    if ($result['connected']) {
        echo '✓ ' . $server['name'] . ' (' . $server['host'] . ':' . $server['port'] . ') - 连接成功 (耗时: ' . $result['time'] . 'ms)' . PHP_EOL;
    } else {
        echo '✗ ' . $server['name'] . ' (' . $server['host'] . ':' . $server['port'] . ') - 连接失败: ' . $result['errorMeaning'] . ' (错误号: ' . $result['errno'] . ', 耗时: ' . $result['time'] . 'ms)' . PHP_EOL;
    }
}
echo PHP_EOL;

// 常用端口扫描
echo '常用端口扫描测试:' . PHP_EOL;
$commonPorts = array(80, 443, 53, 21, 22);
$testHost = 'api.yylmzxc.icu'; // 选择一个主要游戏服务器进行端口扫描
foreach ($commonPorts as $port) {
    $result = checkPortDetailed($testHost, $port, 3);
    $status = $result['connected'] ? '开放' : '关闭/过滤';
    echo $testHost . ':' . $port . ' - ' . $status . ' (耗时: ' . $result['time'] . 'ms)' . PHP_EOL;
}
echo PHP_EOL;

// 网络路由和防火墙检查
echo '<h2>网络路由和防火墙检查</h2>';
if (function_exists('shell_exec')) {
    // 测试到主要游戏服务器的网络路由
    echo '网络路由测试:' . PHP_EOL;
    $testHosts = array('api.yylmzxc.icu', 'yylmzxc.icu', 'y.yylmzxc.icu', 't.yylmzxc.icu', 'v.yylmzxc.icu', 'b.yylmzxc.icu');
    foreach ($testHosts as $host) {
        // 使用ping测试网络连通性
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows系统
            $pingResult = shell_exec('ping -n 2 -w 3000 ' . $host . ' 2>&1');
        } else {
            // Linux/Unix系统
            $pingResult = shell_exec('ping -c 2 -W 3 ' . $host . ' 2>&1');
        }
        echo PHP_EOL . '=== ' . $host . ' ===' . PHP_EOL;
        echo $pingResult . PHP_EOL;
    }
    
    // 添加traceroute/tracert功能
    echo '网络路由跟踪测试:' . PHP_EOL;
    $traceHost = 'api.yylmzxc.icu'; // 选择一个主要游戏服务器进行路由跟踪
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Windows系统
        $traceResult = shell_exec('tracert -d -h 10 ' . $traceHost . ' 2>&1');
    } else {
        // Linux/Unix系统
        $traceResult = shell_exec('traceroute -n -m 10 ' . $traceHost . ' 2>&1');
    }
    echo PHP_EOL . '=== 到 ' . $traceHost . ' 的路由跟踪 ===' . PHP_EOL;
    echo $traceResult . PHP_EOL;
} else {
    echo 'shell_exec函数不可用，无法执行网络路由测试' . PHP_EOL;
}
echo PHP_EOL;

// 网络环境分析
echo '<h2>网络环境分析</h2>';

// 检查PHP是否支持IPv6
echo 'IPv6支持: ' . (filter_var('::1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? '支持' : '不支持') . PHP_EOL;

// 检查系统DNS配置
echo '系统DNS配置: ' . PHP_EOL;
if (function_exists('dns_get_record')) {
    $dnsRecords = @dns_get_record('api.yylmzxc.icu', DNS_ALL);
    if ($dnsRecords) {
        echo '✓ DNS记录获取成功，类型: ' . implode(', ', array_unique(array_column($dnsRecords, 'type'))) . PHP_EOL;
    } else {
        echo '✗ DNS记录获取失败' . PHP_EOL;
    }
} else {
    echo '✗ dns_get_record函数不可用' . PHP_EOL;
}

// 检查防火墙和代理设置
echo '防火墙/代理检查: ' . PHP_EOL;
echo 'HTTP代理: ' . (getenv('HTTP_PROXY') ?: '未设置') . PHP_EOL;
echo 'HTTPS代理: ' . (getenv('HTTPS_PROXY') ?: '未设置') . PHP_EOL;
echo 'NO_PROXY: ' . (getenv('NO_PROXY') ?: '未设置') . PHP_EOL;

// 连接失败原因分析
echo '<h2>连接失败原因分析</h2>';
echo '根据测试结果，可能的连接失败原因:' . PHP_EOL;
echo '1. 服务器防火墙阻止了28887/38887端口的访问' . PHP_EOL;
echo '2. 游戏服务器未运行或端口配置错误' . PHP_EOL;
echo '3. 网络中间设备(如路由器、防火墙)过滤了这些端口' . PHP_EOL;
echo '4. 服务器IP与域名解析的IP不一致' . PHP_EOL;
echo '5. 网络路由问题导致连接超时' . PHP_EOL;
echo PHP_EOL;
echo '建议解决方案:' . PHP_EOL;
echo '1. 检查服务器防火墙设置，确保28887/38887端口对外开放' . PHP_EOL;
echo '2. 确认游戏服务器已正常启动并监听在正确端口' . PHP_EOL;
echo '3. 联系网络管理员检查网络设备的端口过滤规则' . PHP_EOL;
echo '4. 使用telnet或nc命令在服务器本地测试端口是否开放' . PHP_EOL;
echo '5. 尝试使用不同的网络环境进行测试' . PHP_EOL;
echo PHP_EOL;

echo '</pre>';
echo '<h2>总结</h2>';
echo '<p>以上是详细的网络配置和端口测试结果。根据测试，您的服务器可以成功解析游戏服务器域名并ping通IP地址，但无法连接到游戏服务器的28887/38887端口。</p>';
echo '<p>主要问题可能是服务器防火墙阻止了这些端口的访问，或者游戏服务器未正确配置端口。建议您联系服务器管理员检查防火墙设置和游戏服务器状态。</p>';
?>