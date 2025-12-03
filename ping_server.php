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

// 验证IP格式
if (empty($ip)) {
    echo json_encode(array(
        'success' => false,
        'error' => 'IP地址不能为空'
    ));
    exit;
}

// 解析IP（移除端口部分）
if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::[0-9]+)?$/', $ip, $matches)) {
    // 提取纯IP地址部分（支持IPv4和IPv6）
    $host = $matches[1];
    // 移除IPv6地址的方括号
    $host = str_replace(array('[', ']'), '', $host);
} else {
    // 只有IP或格式不正确，直接使用
    $host = $ip;
}

// 移除可能的空格
$host = trim($host);

// 移除可能的空格
$host = trim($host);

/**
 * 测试DNS解析（增强版）
 * @param string $host 主机名
 * @param int $timeout 超时时间（秒）
 * @param int $retries 重试次数
 * @return array 包含解析结果的数组
 */
function testDnsResolution($host, $timeout = 5, $retries = 2) {
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
        '223.5.5.5',   // 阿里云DNS - 国内访问速度快，稳定性强
        '223.6.6.6',   // 阿里云DNS - 支持DNS防劫持
        '119.29.29.29', // 腾讯云DNS - 依托腾讯骨干网络，解析延迟低
        '182.254.116.116', // 腾讯云DNS - 具备恶意网站拦截等安全防护功能   
        '180.76.76.76', // 百度公共DNS - 针对国内网站优化解析
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
        'gethostbyname' => function($h) use ($timeout) {
            // 保存原始超时设置
            $originalTimeout = ini_get('default_socket_timeout');
            // 设置更长的超时时间
            ini_set('default_socket_timeout', $timeout);
            
            $ip = @gethostbyname($h);
            
            // 恢复原始超时设置
            ini_set('default_socket_timeout', $originalTimeout);
            
            return $ip !== $h ? $ip : false;
        },
        'gethostbynamel' => function($h) use ($timeout) {
            if (!function_exists('gethostbynamel')) return false;
            
            // 保存原始超时设置
            $originalTimeout = ini_get('default_socket_timeout');
            // 设置更长的超时时间
            ini_set('default_socket_timeout', $timeout);
            
            $ips = @gethostbynamel($h);
            
            // 恢复原始超时设置
            ini_set('default_socket_timeout', $originalTimeout);
            
            return is_array($ips) && count($ips) > 0 ? $ips[0] : false;
        },
        'dns_get_record' => function($h) use ($timeout) {
            if (!function_exists('dns_get_record')) return false;
            
            // 保存原始超时设置
            $originalTimeout = ini_get('default_socket_timeout');
            // 设置更长的超时时间
            ini_set('default_socket_timeout', $timeout);
            
            $records = @dns_get_record($h, DNS_A);
            
            // 恢复原始超时设置
            ini_set('default_socket_timeout', $originalTimeout);
            
            return is_array($records) && count($records) > 0 ? $records[0]['ip'] : false;
        }
    );
    
    // 多次尝试解析，增加成功率
    for ($retry = 0; $retry <= $retries; $retry++) {
        if ($retry > 0) {
            $result['debug'][] = "DNS解析重试 #$retry";
        }
        
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
        
        if ($resolvedIp) break;
        
        // 如果当前重试失败，并且还有重试次数，等待一段时间后再试
        if ($retry < $retries) {
            $waitTime = 1; // 等待1秒后重试
            $result['debug'][] = "DNS解析失败，$waitTime 秒后重试...";
            sleep($waitTime);
        }
    }
    
    // 如果所有方法都失败，尝试直接使用fsockopen（某些环境下可以绕过系统DNS）
    if (!$result['success']) {
        $result['debug'][] = "所有DNS解析方法失败，尝试直接使用fsockopen连接（可能绕过系统DNS）";
        
        // 多次尝试fsockopen连接
        for ($retry = 0; $retry <= $retries; $retry++) {
            $startTime = microtime(true);
            $socket = @fsockopen($host, 80, $errno, $errstr, $timeout);
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
                break;
            } else {
                $result['debug'][] = "fsockopen连接失败，错误: $errno - $errstr";
                
                // 如果当前重试失败，并且还有重试次数，等待一段时间后再试
                if ($retry < $retries) {
                    $waitTime = 1;
                    $result['debug'][] = "fsockopen连接失败，$waitTime 秒后重试...";
                    sleep($waitTime);
                }
            }
        }
    }
    
    // 如果还是失败，设置错误信息
    if (!$result['success']) {
        $result['error'] = "无法解析主机名 '$host'，已尝试所有可用DNS解析方法和直接连接";
        $result['debug'][] = "所有DNS解析和直接连接尝试都失败了";
    }
    
    return $result;
}

/**
 * 获取socket错误号的含义
 * @param int $errno socket错误号
 * @return string 错误号的含义
 */
function getSocketErrorMeaning($errno) {
    $errorMessages = array(
        // 通用错误
        1 => '操作不允许',
        2 => '没有这样的文件或目录',
        3 => '没有这样的进程',
        4 => '中断的系统调用',
        5 => '输入/输出错误',
        6 => '没有这样的设备或地址',
        7 => '参数列表太长',
        8 => '执行格式错误',
        9 => '错误的文件描述符',
        10 => '没有子进程',
        
        // Socket相关错误
        97 => '地址族不支持协议',
        98 => '地址已在使用',
        99 => '无法分配请求的地址',
        100 => '网络已关闭',
        101 => '网络不可达',
        102 => '网络重置',
        103 => '连接中止',
        104 => '连接重置',
        105 => '网络已关闭',
        106 => '传输端点已连接',
        107 => '传输端点未连接',
        108 => '关闭的文件描述符',
        109 => '信息已不存在',
        110 => '连接超时',
        111 => '连接被拒绝',
        112 => '主机不可达',
        113 => '无路由到主机',
        
        // Windows系统特定错误
        10004 => '操作被中断',
        10009 => '错误的文件描述符',
        10013 => '权限被拒绝',
        10014 => '指针地址无效',
        10022 => '无效的参数',
        10024 => '打开的文件过多',
        10035 => '操作将被阻塞',
        10036 => '操作正在进行中',
        10037 => '操作已完成',
        10038 => '在非套接字上的操作',
        10039 => '地址无效',
        10040 => '消息太长',
        10041 => '协议类型错误',
        10042 => '协议不支持的操作',
        10043 => '协议不可用',
        10044 => '协议错误',
        10045 => '套接字类型错误',
        10046 => '不支持的操作',
        10047 => '地址族与协议不匹配',
        10048 => '地址已在使用',
        10049 => '无法分配请求的地址',
        10050 => '网络不可达',
        10051 => '网络已关闭',
        10052 => '连接被中止',
        10053 => '连接中止',
        10054 => '连接重置',
        10055 => '没有可用的缓冲区空间',
        10056 => '套接字已连接',
        10057 => '套接字未连接',
        10058 => '套接字已关闭',
        10059 => '无法发送更多数据',
        10060 => '连接超时',
        10061 => '连接被拒绝',
        10062 => '地址已使用',
        10063 => '名称太长',
        10064 => '主机不可达',
        10065 => '无路由到主机',
        10066 => '目录不为空',
        10067 => '进程数太多',
        10068 => '用户数太多',
        10069 => '磁盘空间不足',
        10070 => '文件太大',
        10071 => '虚拟内存不足',
        10091 => '网络子系统不可用',
        10092 => '协议族不可用',
        10093 => '进程尚未准备好',
        10101 => '软件导致连接中止'
    );
    
    return isset($errorMessages[$errno]) ? $errorMessages[$errno] : '未知错误';
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
 * 测试服务器在线状态（不依赖特定端口）
 * @param string $host 主机名或IP地址
 * @param int $timeout 超时时间（秒）
 * @param int $count 测试次数
 * @return array 包含测试结果的数组
 */
function testConnectionLatency($host, $timeout = 10, $count = 2) {
    $latencies = array();
    $successCount = 0;
    $totalTime = 0;
    $errors = array();
    $debugInfo = array();
    
    // 使用专门的DNS解析测试函数
    $dnsResult = testDnsResolution($host);
    $ipAddress = $dnsResult['ip'];
    // 如果DNS解析失败，使用主机名作为备选
    if (empty($ipAddress)) {
        $ipAddress = $host;
    }
    
    // 添加DNS解析结果到调试信息
    $debugInfo[] = "DNS解析结果: " . ($dnsResult['success'] ? "成功" : "失败");
    foreach ($dnsResult['debug'] as $debugLine) {
        $debugInfo[] = "DNS调试: " . $debugLine;
    }
    
    // DNS解析失败时的处理（不再直接判定为失败）
    if (!$dnsResult['success']) {
        $debugInfo[] = "DNS解析失败，但将继续尝试直接连接到主机";
        // 不再记录DNS解析错误，因为即使DNS解析失败，fsockopen可能仍然能够连接
        // $errors[] = "无法解析主机名: $host";
        // if (isset($dnsResult['error'])) {
        //     $errors[] = "DNS解析错误: " . $dnsResult['error'];
        // }
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
        $debugInfo[] = "第 " . ($i + 1) . " 次连接尝试: $host";
        
        // 如果已经有多次失败，考虑提前终止
        if ($i > 1 && $successCount === 0) {
            $debugInfo[] = "已连续 " . ($i + 1) . " 次连接失败，提前终止测试";
            $errors[] = "连续连接失败，提前终止测试";
            break;
        }
        
        // 记录开始时间
        $startTime = microtime(true);
        
        // 尝试连接（使用80端口进行基本连接测试，这是常用的HTTP端口）
        $testPort = 80;
        $debugInfo[] = "尝试连接到 $host:$testPort (解析后的IP: $ipAddress)，超时时间: $timeout 秒";
        
        // 记录连接前的时间
        $connectionStartTime = microtime(true);
        
        // 尝试连接到常用端口（80）来检测服务器是否在线
        $socket = @fsockopen($host, $testPort, $errno, $errstr, $timeout);
        
        // 计算连接耗时
        $connectionDuration = (microtime(true) - $connectionStartTime) * 1000;
        
        if ($socket) {
            // 连接成功，计算延迟
            $endTime = microtime(true);
            $latency = ($endTime - $startTime) * 1000; // 转换为毫秒
            $latencies[] = $latency;
            $successCount++;
            $totalTime += $latency;
            
            // 获取实际连接的IP地址
            $peerName = @stream_socket_get_name($socket, true);
            if ($peerName) {
                // 提取IP地址部分
                $actualIp = explode(':', $peerName)[0];
                if (empty($ipAddress) || $ipAddress !== $actualIp) {
                    $ipAddress = $actualIp;
                    $debugInfo[] = "获取到实际连接的IP地址: $ipAddress";
                }
            }
            
            $debugInfo[] = "连接成功，延迟: " . round($latency) . "ms，连接耗时: " . round($connectionDuration) . "ms";
            
            // 关闭连接
            fclose($socket);
            
            // 如果已经有2次成功连接，考虑减少后续测试次数
            if ($successCount >= 2) {
                $debugInfo[] = "已成功连接 " . $successCount . " 次，满足基本测试需求";
                // 可以选择继续测试或提前结束
                // break; // 取消注释以提前结束
            }
        } else {
            // 连接失败，记录详细错误信息
            $errors[] = "尝试 $i: 失败 ($errno: $errstr)，耗时: " . round($connectionDuration) . "ms";
            $debugInfo[] = "连接失败，错误号: $errno, 错误信息: $errstr, 耗时: " . round($connectionDuration) . "ms";
            
            // 记录错误号的具体含义
            $errorMeaning = getSocketErrorMeaning($errno);
            $debugInfo[] = "错误号 $errno 含义: $errorMeaning";
            
            // 如果是连接被拒绝错误，可能是服务器未开启对应端口，提前终止
            if ($errno == 111 || $errno == 61 || $errno == 10061) { // Connection refused (Windows: 10061)
                $debugInfo[] = "连接被拒绝，可能是服务器未开启该端口或防火墙阻止了连接";
                $errors[] = "端口连接被拒绝，可能服务器未开启该端口或防火墙设置问题";
            } elseif ($errno == 10060) { // Connection timed out
                $debugInfo[] = "连接超时，可能是网络延迟过高、路由问题或服务器防火墙阻止了连接";
                $errors[] = "连接超时，可能是网络延迟过高、路由问题或防火墙设置问题";
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
$testResults = testConnectionLatency($host);

// 准备响应数据
$response = array(
    'success' => $testResults['successCount'] > 0,
    'ip' => $ip,
    'host' => $host,
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
    'remoteIp' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '',
    'diagnostics' => array(
        'server' => $host,
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => phpversion(),
        'execution_time_limit' => ini_get('max_execution_time'),
        'socket_timeout' => ini_get('default_socket_timeout'),
        'resolved_ip' => $testResults['resolvedIp']
    )
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
    
    // 添加网络环境诊断信息
    $response['networkDiagnostics'] = array(
        'phpVersion' => phpversion(),
        'serverIp' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '未知',
        'serverHostname' => gethostname(),
        'targetHost' => $host,
        'targetPort' => $port,
        'resolvedIp' => $testResults['resolvedIp'],
        'testTimestamp' => date('Y-m-d H:i:s'),
        'errorCode' => isset($testResults['errors'][0]) ? preg_match('/\((\d+):/', $testResults['errors'][0], $matches) ? $matches[1] : 'unknown' : 'unknown'
    );
}

// 返回JSON响应
echo json_encode($response);
?>