<?php
/**
 * 服务器Ping工具（智能分阶段检测版）
 * 核心规则：
 * 1. 150秒内每秒检测1次延迟，成功立即返回，全程无中间错误输出
 * 2. 第12秒起：同时启用系统Ping检测 + 开始更换DNS（每10秒切换1次）
 * 3. 第110秒起：自动排查网络错误（DNS、连通性、端口状态）
 * 4. 150秒超时后：返回失败结果+可能原因分析
 */

// 基础响应头配置
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// HTTPS环境增强
if (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// 1. 获取并验证目标IP/主机名（仅参数为空时即时反馈）
$target = isset($_GET['ip']) ? trim($_GET['ip']) : '';
if (empty($target)) {
    echo json_encode([
        'success' => false,
        'error' => 'IP地址/主机名不能为空'
    ]);
    exit;
}

// 解析目标（移除端口和IPv6方括号）
if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::[0-9]+)?$/', $target, $matches)) {
    $host = str_replace(['[', ']'], '', $matches[1]);
} else {
    $host = $target;
}
$host = trim($host);

// 公共DNS服务器列表（按优先级排序，循环使用）
$dnsServers = [
    '223.5.5.5',    // 阿里云DNS
    '223.6.6.6',    // 阿里云DNS
    '119.29.29.29', // 腾讯云DNS
    '182.254.116.116', // 腾讯云DNS
    '180.76.76.76', // 百度DNS
    '114.114.114.114', // 114DNS
    '8.8.8.8',      // Google DNS
    '8.8.4.4',      // Google DNS
    '1.1.1.1',      // Cloudflare DNS
    '208.67.222.222' // OpenDNS
];

// 检测端口配置（12秒后自动扩展）
$basicPorts = [80, 443, 8080, 8888]; // 基础端口（0-12秒）
$extendedPorts = [21, 22, 25, 53, 110, 143, 3306, 3389, 5432, 8000]; // 扩展端口（12秒后）
$allPorts = array_merge($basicPorts, $extendedPorts);

/**
 * 带指定DNS的静默解析（无错误输出）
 * @param string $host 主机名/IP
 * @param string|null $dnsServer 指定DNS服务器
 * @return string|false 解析后的IP或false
 */
function silentDnsResolve($host, $dnsServer = null) {
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        return $host;
    }

    // 方法1：指定DNS解析（优先）
    if ($dnsServer && function_exists('dns_get_record')) {
        $origTimeout = ini_get('default_socket_timeout');
        ini_set('default_socket_timeout', 1);
        $records = @dns_get_record($host, DNS_A, $dnsServer);
        ini_set('default_socket_timeout', $origTimeout);
        if (!empty($records)) {
            return $records[0]['ip'];
        }
    }

    // 方法2：系统默认解析
    $origTimeout = ini_get('default_socket_timeout');
    ini_set('default_socket_timeout', 1);
    $ip = @gethostbyname($host);
    ini_set('default_socket_timeout', $origTimeout);
    return $ip !== $host ? $ip : false;
}

/**
 * 系统Ping命令检测（静默模式）
 * @param string $host 目标IP/主机名
 * @return float|false 延迟（毫秒）或false
 */
function systemPingDetection($host) {
    // 区分Windows和Linux系统的Ping命令
    $os = strtoupper(substr(PHP_OS, 0, 3));
    $pingCmd = $os === 'WIN' 
        ? "ping -n 1 -w 1000 {$host}"  // Windows：1个包，超时1秒
        : "ping -c 1 -W 1 {$host}";   // Linux：1个包，超时1秒

    // 执行Ping命令（静默模式，忽略输出）
    $output = @shell_exec($pingCmd . ' 2>&1');
    if (empty($output)) {
        return false;
    }

    // 解析Ping延迟（支持中英文输出）
    $latency = false;
    if (preg_match('/time[=<](\d+(\.\d+)?)ms/i', $output, $matches)) {
        $latency = (float)$matches[1];
    } elseif (preg_match('/时间[=<](\d+(\.\d+)?)ms/i', $output, $matches)) {
        $latency = (float)$matches[1];
    }

    return $latency !== false ? round($latency, 2) : false;
}

/**
 * 备用网络检测方法（stream_socket_client）
 * @param string $host 目标主机
 * @param int $port 目标端口
 * @param float $timeout 超时时间
 * @return float|false 延迟（毫秒）或false
 */
function alternativeNetDetection($host, $port, $timeout) {
    if (!function_exists('stream_socket_client')) {
        return false;
    }

    $start = microtime(true);
    $socket = @stream_socket_client(
        "tcp://{$host}:{$port}",
        $errno,
        $errstr,
        $timeout,
        STREAM_CLIENT_CONNECT | STREAM_CLIENT_ASYNC_CONNECT
    );
    if ($socket) {
        @stream_select([$socket], [$socket], [], 0, $timeout * 1000000);
        fclose($socket);
        return round((microtime(true) - $start) * 1000, 2);
    }
    return false;
}

/**
 * 110秒后网络错误排查（仅内部使用，不输出中间结果）
 * @param string $host 目标主机
 * @param string|null $resolvedIp 已解析IP
 * @param array $dnsServers DNS列表
 * @return array 错误排查结果
 */
function networkTroubleshoot($host, $resolvedIp, $dnsServers) {
    global $allPorts;  // 这里必须加

    $troubleResult = [
        'dnsStatus' => 'unknown',
        'networkStatus' => 'unknown',
        'possibleReasons' => [],
        'details' => []
    ];

    // DNS检测
    $dnsSuccess = false;
    foreach ($dnsServers as $dns) {
        $ip = silentDnsResolve($host, $dns);
        if ($ip) {
            $dnsSuccess = true;
            break;
        }
    }
    $troubleResult['dnsStatus'] = $dnsSuccess ? 'available' : 'unavailable';

    // Ping检测
    $pingResult = systemPingDetection($host);
    $troubleResult['networkStatus'] = $pingResult !== false ? 'reachable' : 'unreachable';

    // 端口检测
    $portTestResult = [];
    foreach ($allPorts as $port) {
        $result = @fsockopen($resolvedIp ?: $host, $port, $errno, $errstr, 0.5);
        $portTestResult[$port] = $result !== false;
        if ($result) fclose($result);
    }
    $openPorts = array_filter($portTestResult);
    if (empty($openPorts)) {
        $troubleResult['possibleReasons'][] = '目标主机所有常用端口均未开放';
        $troubleResult['details'][] = '可能是目标主机防火墙拦截，或服务未启动';
    }

    $troubleResult['possibleReasons'] = array_unique($troubleResult['possibleReasons']);
    if (empty($troubleResult['possibleReasons'])) {
        $troubleResult['possibleReasons'][] = '未知网络错误（DNS和网络连通性正常，但端口连接失败）';
    }

    return $troubleResult;
}


/**
 * 核心：150秒分阶段持续检测（按需求调整时间节点）
 * @param string $host 目标主机
 * @param int $maxTotalTime 最大检测时间（150秒）
 * @return array 最终结果
 */
function continuousLatencyTest($host, $maxTotalTime = 150) {
    global $dnsServers, $basicPorts, $extendedPorts, $allPorts;
    
    $startTimestamp = microtime(true);
    $resolvedIp = null;
    $successResult = null;
    $dnsIndex = 0; // 当前DNS索引
    $lastDnsSwitchTime = $startTimestamp; // 上次DNS切换时间
    $dnsSwitchInterval = 10; // DNS切换间隔（10秒）
    $featureEnableTime = $startTimestamp + 12; // 第12秒启用Ping+DNS切换+扩展端口
    $troubleshootTime = $startTimestamp + 110; // 第110秒开始错误排查
    $currentDns = null; // 当前使用的DNS
    $advancedFeaturesEnabled = false; // 是否启用高级特性（Ping+DNS切换+扩展端口）
    $troubleshootDone = false; // 是否已完成错误排查
    $troubleshootResult = []; // 错误排查结果

    // 150秒内持续检测（每秒1次）
    while (microtime(true) - $startTimestamp < $maxTotalTime) {
        $currentTime = microtime(true);
        $elapsedTime = $currentTime - $startTimestamp;

        // 2. 第12秒启用高级特性：Ping检测 + DNS切换 + 扩展端口
        if ($elapsedTime >= 12 && !$advancedFeaturesEnabled) {
            $advancedFeaturesEnabled = true;
            // 首次切换DNS（第12秒立即执行一次）
            $currentDns = $dnsServers[$dnsIndex % count($dnsServers)];
            $dnsIndex++;
            $lastDnsSwitchTime = $currentTime;
        }

        // 3. 高级特性启用后：每10秒切换一次DNS
        if ($advancedFeaturesEnabled) {
            $timeSinceLastSwitch = $currentTime - $lastDnsSwitchTime;
            if ($timeSinceLastSwitch >= $dnsSwitchInterval) {
                $currentDns = $dnsServers[$dnsIndex % count($dnsServers)];
                $dnsIndex++;
                $lastDnsSwitchTime = $currentTime;
                $resolvedIp = null; // 切换DNS后强制重新解析
            }
        }

        // 4. 第110秒开始网络错误排查（仅执行1次）
        if ($elapsedTime >= 110 && !$troubleshootDone) {
            $troubleshootResult = networkTroubleshoot($host, $resolvedIp, $dnsServers);
            $troubleshootDone = true;
        }

        // 5. 静默解析IP（根据当前DNS）
        if (!$resolvedIp) {
            $resolvedIp = silentDnsResolve($host, $currentDns);
        }

        // 6. 选择检测端口（12秒后扩展为全端口）
        $targetPorts = $advancedFeaturesEnabled ? $allPorts : $basicPorts;

        // 7. 多方法检测延迟（按优先级执行，成功立即返回）
        $detectionMethods = [];

        // 方法1：Ping检测（12秒后启用）
        if ($advancedFeaturesEnabled) {
            $detectionMethods[] = function() use ($host) {
                $latency = systemPingDetection($host);
                return $latency !== false ? ['method' => 'ping', 'latency' => $latency] : false;
            };
        }

        // 方法2：基础fsockopen检测（全程启用）
        $detectionMethods[] = function() use ($host, $resolvedIp, $targetPorts, $elapsedTime, $maxTotalTime) {
            $remainingTime = $maxTotalTime - $elapsedTime;
            $connTimeout = min(1.5, $remainingTime);
            foreach ($targetPorts as $port) {
                $connStart = microtime(true);
                $socket = @fsockopen($resolvedIp ?: $host, $port, $errno, $errstr, $connTimeout);
                if ($socket) {
                    $latency = round((microtime(true) - $connStart) * 1000, 2);
                    fclose($socket);
                    return ['method' => 'fsockopen', 'port' => $port, 'latency' => $latency];
                }
            }
            return false;
        };

        // 方法3：备用stream_socket_client检测（12秒后启用）
        if ($advancedFeaturesEnabled) {
            $detectionMethods[] = function() use ($host, $resolvedIp, $targetPorts, $elapsedTime, $maxTotalTime) {
                $remainingTime = $maxTotalTime - $elapsedTime;
                $connTimeout = min(1.5, $remainingTime);
                foreach ($targetPorts as $port) {
                    $latency = alternativeNetDetection($resolvedIp ?: $host, $port, $connTimeout);
                    if ($latency !== false) {
                        return ['method' => 'stream_socket_client', 'port' => $port, 'latency' => $latency];
                    }
                }
                return false;
            };
        }

        // 8. 执行检测方法，成功则立即返回
        foreach ($detectionMethods as $method) {
            $result = $method();
            if ($result) {
                $successResult = [
                    'success' => true,
                    'target' => $host,
                    'resolvedIp' => $resolvedIp ?: '未解析（直接连接成功）',
                    'usedDns' => $currentDns ?: '系统默认DNS',
                    'detectionMethod' => $result['method'],
                    'port' => isset($result['port']) ? $result['port'] : 'N/A',
                    'latency' => $result['latency'],
                    'timestamp' => date('Y-m-d H:i:s'),
                    'elapsedTime' => round($elapsedTime, 2),
                    'dnsSwitchCount' => $dnsIndex,
                    'advancedFeaturesEnabled' => $advancedFeaturesEnabled
                ];
                break 2; // 跳出所有循环，立即返回
            }
        }

        // 9. 每秒检测1次，控制频率
        if (!$successResult) {
            sleep(1);
        }
    }

    // 10. 150秒超时：返回失败结果+错误排查信息
    if (!$successResult) {
        // 若未执行错误排查（如提前超时），补充执行
        if (!$troubleshootDone) {
            $troubleResult = networkTroubleshoot($host, $resolvedIp, $dnsServers);
        }

        return [
            'success' => false,
            'target' => $host,
            'resolvedIp' => $resolvedIp ?: '未解析',
            'lastUsedDns' => $currentDns ?: '系统默认DNS',
            'error' => '150秒内未成功检测到延迟',
            'possibleReasons' => $troubleResult['possibleReasons'] ?? ['未知错误'],
            'networkDiagnostics' => [
                'dnsStatus' => $troubleResult['dnsStatus'] ?? 'unknown',
                'networkStatus' => $troubleResult['networkStatus'] ?? 'unknown',
                'testedPortsCount' => count($allPorts),
                'dnsSwitchCount' => $dnsIndex,
                'pingDetectionEnabled' => $advancedFeaturesEnabled,
                'troubleshootDone' => $troubleshootDone
            ],
            'details' => $troubleResult['details'] ?? [],
            'timestamp' => date('Y-m-d H:i:s'),
            'totalTime' => $maxTotalTime
        ];
    }

    return $successResult;
}

// 执行检测并返回结果（全程仅输出最终JSON）
$result = continuousLatencyTest($host);
echo json_encode($result, JSON_UNESCAPED_UNICODE);
exit;
?>