<?php
/**
 * 服务器Ping工具
 * 用于测试服务器延迟并返回结果
 */

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 启用详细错误报告（仅用于调试）
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 确保在HTTPS环境下也能正常工作
if (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// 获取请求参数
$ip = isset($_GET['ip']) ? $_GET['ip'] : '';
$port = isset($_GET['port']) ? intval($_GET['port']) : null;

// 验证IP格式
if (empty($ip)) {
    echo json_encode(array(
        'success' => false,
        'error' => 'IP地址不能为空'
    ));
    exit;
}

// 解析IP和端口（如果有）
if (strpos($ip, ':') !== false && substr_count($ip, ':') === 1 && $port === null) {
    // 格式：ip:port
    list($host, $port) = explode(':', $ip);
    $port = intval($port);
} else {
    // 只有IP，没有端口
    $host = $ip;
    if ($port === null) {
        $port = 28887; // 默认端口
    }
}

// 移除可能的空格
$host = trim($host);

/**
 * 测试DNS解析（支持多DNS服务器和重试机制）
 * @param string $host 主机名
 * @return array 包含解析结果的数组
 */
function testDnsResolution($host) {
    $result = array(
        'success' => false,
        'ip' => null,
        'error' => null,
        'debug' => array(),
        'dnsServers' => array()
    );
    
    // 检查输入是否是IP地址（直接跳过DNS解析）
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $result['success'] = true;
        $result['ip'] = $host;
        $result['debug'][] = "输入是有效的IP地址，无需DNS解析";
        return $result;
    }
    
    // 获取当前系统DNS服务器
    $systemDns = getSystemDnsServers();
    $result['dnsServers'] = $systemDns;
    $result['debug'][] = "系统DNS服务器: " . implode(', ', $systemDns);
    
    // 常用公共DNS服务器列表
    $publicDnsServers = array(
        '8.8.8.8',     // Google DNS
        '8.8.4.4',     // Google DNS
        '114.114.114.114', // 114 DNS
        '114.114.115.115', // 114 DNS
        '202.96.128.86',   // 联通DNS
        '202.96.134.133'    // 联通DNS
    );
    
    // 合并系统DNS和公共DNS，去重
    $allDnsServers = array_unique(array_merge($systemDns, $publicDnsServers));
    $result['debug'][] = "可用DNS服务器列表: " . implode(', ', $allDnsServers);
    
    // 尝试多种解析方法
    $resolveMethods = array(
        'gethostbyname' => function($h) {
            $ip = @gethostbyname($h);
            return $ip !== $h ? $ip : false;
        },
        'gethostbynamel' => function($h) {
            if (!function_exists('gethostbynamel')) return false;
            $ips = @gethostbynamel($h);
            return is_array($ips) && count($ips) > 0 ? $ips[0] : false;
        },
        'dns_get_record' => function($h) {
            if (!function_exists('dns_get_record')) return false;
            $records = @dns_get_record($h, DNS_A);
            return is_array($records) && count($records) > 0 ? $records[0]['ip'] : false;
        }
    );
    
    // 尝试所有解析方法
    $resolvedIp = false;
    foreach ($resolveMethods as $methodName => $methodFunc) {
        if ($resolvedIp) break;
        
       $result['debug'][] = "使用{$methodName}方法解析主机名: {$host}";

        $startTime = microtime(true);
        $ip = $methodFunc($host);
        $resolveTime = microtime(true) - $startTime;
        
        if ($ip) {
            $resolvedIp = $ip;
            $result['success'] = true;
            $result['ip'] = $ip;
            $result['debug'][] = "{$methodName}解析成功，IP地址: {$ip}，耗时: " . round($resolveTime * 1000) . "ms";

            break;
        } else {
           $result['debug'][] = "{$methodName}解析失败，耗时: " . round($resolveTime * 1000) . "ms";

        }
    }
    
    // 如果所有方法都失败，尝试直接使用fsockopen（某些环境下可以绕过系统DNS）
    if (!$resolvedIp) {
        $result['debug'][] = "所有DNS解析方法失败，尝试直接使用fsockopen连接（可能绕过系统DNS）";
        $startTime = microtime(true);
        $socket = @fsockopen($host, 80, $errno, $errstr, 10);
        $connectTime = microtime(true) - $startTime;
        
        if ($socket) {
            // 获取连接的对等方IP
            $peerName = @stream_socket_get_name($socket, true);
            if ($peerName) {
                // 提取IP地址部分
                $ip = explode(':', $peerName)[0];
                $result['success'] = true;
                $result['ip'] = $ip;
              $result['debug'][] = "fsockopen连接成功，获取到IP: {$ip}，耗时: " . round($connectTime * 1000) . "ms";

            }
            fclose($socket);
        } else {
            $result['debug'][] = "fsockopen连接失败，错误: $errno - $errstr";
        }
    }
    
    // 如果还是失败，设置错误信息
    if (!$result['success']) {
        $result['error'] = "无法解析主机名 '$host'，已尝试所有可用DNS解析方法";
    }
    
    return $result;
}

/**
 * 获取系统DNS服务器列表
 * @return array DNS服务器列表
 */
function getSystemDnsServers() {
    $dnsServers = array();
    
    // 根据操作系统获取DNS服务器
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Windows系统
        $output = @shell_exec('ipconfig /all 2>&1');
        if (preg_match_all('/DNS Servers\s+:\s+([\d\.]+)/i', $output, $matches)) {
            $dnsServers = $matches[1];
        }
    } else {
        // Linux/Unix系统
        $resolvConf = @file_get_contents('/etc/resolv.conf');
        if ($resolvConf) {
            if (preg_match_all('/nameserver\s+([\d\.]+)/i', $resolvConf, $matches)) {
                $dnsServers = $matches[1];
            }
        }
    }
    
    // 如果没有获取到DNS服务器，返回默认值
    if (empty($dnsServers)) {
        $dnsServers = array('8.8.8.8', '114.114.114.114');
    }
    
    return array_unique($dnsServers);
}

/**
 * 使用fsockopen测试服务器连接延迟
 * @param string $host 主机名或IP地址
 * @param int $port 端口号
 * @param int $timeout 超时时间（秒）
 * @param int $count 测试次数
 * @return array 包含延迟信息的数组
 */
function testConnectionLatency($host, $port, $timeout = 10, $count = 2) {
    $latencies = array();
    $successCount = 0;
    $totalTime = 0;
    $errors = array();
    $debugInfo = array();
    
    // 使用专门的DNS解析测试函数
    $dnsResult = testDnsResolution($host);
    $ipAddress = $dnsResult['ip'];
    
    // 添加DNS解析结果到调试信息
    $debugInfo[] = "DNS解析结果: " . ($dnsResult['success'] ? "成功" : "失败");
    foreach ($dnsResult['debug'] as $debugLine) {
        $debugInfo[] = "DNS调试: " . $debugLine;
    }
    
    if (!$dnsResult['success']) {
        $errors[] = "无法解析主机名: $host";
        if (isset($dnsResult['error'])) {
            $errors[] = "DNS解析错误: " . $dnsResult['error'];
        }
    } else {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $debugInfo[] = "输入的是IP地址，无需解析";
        } else {
            $debugInfo[] = "主机名解析成功，IP地址: $ipAddress";
        }
    }
    
    // 检查fsockopen是否可用
    if (!function_exists('fsockopen')) {
        $errors[] = "服务器不支持fsockopen函数";
        $debugInfo[] = "fsockopen函数不可用";
        return array(
            'successCount' => 0,
            'totalCount' => $count,
            'latencies' => array(),
            'avgLatency' => -1,
            'minLatency' => -1,
            'errors' => $errors,
            'resolvedIp' => $ipAddress,
            'debugInfo' => $debugInfo
        );
    }
    
    $debugInfo[] = "fsockopen函数可用，开始连接测试";
    
    for ($i = 0; $i < $count; $i++) {
        $debugInfo[] = "第 " . ($i + 1) . " 次连接尝试: $host:$port";
        
        // 如果已经有多次失败，考虑提前终止
        if ($i > 1 && $successCount === 0) {
            $debugInfo[] = "已连续 " . ($i + 1) . " 次连接失败，提前终止测试";
            $errors[] = "连续连接失败，提前终止测试";
            break;
        }
        
        // 记录开始时间
        $startTime = microtime(true);
        
        // 尝试连接
        $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
        
        if ($socket) {
            // 连接成功，计算延迟
            $endTime = microtime(true);
            $latency = ($endTime - $startTime) * 1000; // 转换为毫秒
            $latencies[] = $latency;
            $successCount++;
            $totalTime += $latency;
            $debugInfo[] = "连接成功，延迟: " . round($latency) . "ms";
            
            // 关闭连接
            fclose($socket);
            
            // 如果已经有2次成功连接，考虑减少后续测试次数
            if ($successCount >= 2) {
                $debugInfo[] = "已成功连接 " . $successCount . " 次，满足基本测试需求";
                // 可以选择继续测试或提前结束
                // break; // 取消注释以提前结束
            }
        } else {
            // 连接失败，记录错误
            $errors[] = "尝试 $i: 失败 ($errno: $errstr)";
            $debugInfo[] = "连接失败，错误号: $errno, 错误信息: $errstr";
            
            // 如果是连接被拒绝错误，可能是服务器未开启对应端口，提前终止
            if ($errno == 111 || $errno == 61) { // Connection refused
                $debugInfo[] = "连接被拒绝，端口可能未开放，提前终止测试";
                $errors[] = "端口连接被拒绝，可能服务器未开启该端口";
                break;
            }
        }
        
        // 每次测试之间动态延迟
        if ($i < $count - 1) {
            // 随着失败次数增加，逐渐增加延迟
            $delay = 100000 * ($i + 1); // 100ms, 200ms, 300ms...
            $debugInfo[] = "等待 " . round($delay / 1000) . " 毫秒后进行下一次尝试";
            usleep($delay);
        }
    }
    
    // 计算平均延迟 - 使用number_format保留2位小数，避免将极小延迟四舍五入为0
    $avgLatency = $successCount > 0 ? round($totalTime / $successCount, 2) : -1;
    
    // 计算最小延迟 - 使用number_format保留2位小数，避免将极小延迟四舍五入为0
    $minLatency = $successCount > 0 ? round(min($latencies), 2) : -1;
    
    $debugInfo[] = "测试完成，成功次数: $successCount/$count";
    
    return array(
        'successCount' => $successCount,
        'totalCount' => $count,
        'latencies' => $latencies,
        'avgLatency' => $avgLatency,
        'minLatency' => $minLatency,
        'errors' => $errors,
        'resolvedIp' => $ipAddress,
        'debugInfo' => $debugInfo
    );
}

// 执行连接测试
$testResults = testConnectionLatency($host, $port);

// 准备响应数据
$response = array(
    'success' => $testResults['successCount'] > 0,
    'ip' => $ip,
    'host' => $host,
    'port' => $port,
    'latency' => $testResults['avgLatency'],
    'minLatency' => $testResults['minLatency'],
    'successCount' => $testResults['successCount'],
    'totalCount' => $testResults['totalCount'],
    'resolvedIp' => $testResults['resolvedIp'],
    'errors' => $testResults['errors'],
    'phpVersion' => phpversion(),
    'https' => isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : 'off',
    'serverProtocol' => isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : '',
    'serverSoftware' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : '',
    'serverIp' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '',
    'remoteIp' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : ''
);

// 添加调试信息（仅在测试环境中启用）
if (isset($testResults['debugInfo'])) {
    $response['debugInfo'] = $testResults['debugInfo'];
}

// 如果没有成功连接，添加错误信息
if ($testResults['successCount'] === 0) {
    if (!empty($testResults['errors'])) {
        $response['error'] = implode('; ', $testResults['errors']);
    } else {
        $response['error'] = '无法连接到服务器';
    }
    // 检查PHP网络配置
    $response['phpNetworkConfig'] = array(
        'allow_url_fopen' => ini_get('allow_url_fopen'),
        'default_socket_timeout' => ini_get('default_socket_timeout'),
        'open_basedir' => ini_get('open_basedir'),
        'disable_functions' => ini_get('disable_functions'),
        'dns_get_record_available' => function_exists('dns_get_record') ? 'yes' : 'no',
        'gethostbynamel_available' => function_exists('gethostbynamel') ? 'yes' : 'no'
    );
}

// 返回JSON响应
echo json_encode($response);
?>