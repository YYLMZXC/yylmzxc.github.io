<?php
/**
 * 服务器Ping工具（静默持续检测版）
 * 核心规则：
 * 1. 30秒内每秒检测1次延迟
 * 2. 成功获取延迟后立即返回结果
 * 3. 检测期间不输出任何错误、解析失败或异常信息
 * 4. 30秒超时后仅返回最终失败结果
 */

// 基础响应头配置
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// HTTPS环境增强（可选）
if (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// 1. 获取并验证目标IP/主机名（仅此处允许即时错误反馈，因参数为空是致命错误）
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

/**
 * 静默DNS解析（无任何错误输出，失败仅返回false）
 * @param string $host 主机名/IP
 * @return string|false 解析后的IP或false
 */
function silentDnsResolve($host) {
    // 已是IP地址，直接返回
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        return $host;
    }

    // 多种解析方法静默尝试（失败不反馈）
    $resolveMethods = [
        // 方法1：gethostbyname
        function($h) {
            $origTimeout = ini_get('default_socket_timeout');
            ini_set('default_socket_timeout', 1); // 短超时，不阻塞
            $ip = @gethostbyname($h);
            ini_set('default_socket_timeout', $origTimeout);
            return $ip !== $h ? $ip : false;
        },
        // 方法2：dns_get_record
        function($h) {
            if (!function_exists('dns_get_record')) return false;
            $origTimeout = ini_get('default_socket_timeout');
            ini_set('default_socket_timeout', 1);
            $records = @dns_get_record($h, DNS_A);
            ini_set('default_socket_timeout', $origTimeout);
            return !empty($records) ? $records[0]['ip'] : false;
        }
    ];

    foreach ($resolveMethods as $method) {
        $ip = $method($host);
        if ($ip) return $ip;
    }
    return false;
}

/**
 * 核心：静默持续延迟检测
 * @param string $host 目标主机
 * @param int $maxTotalTime 最大检测时间（30秒）
 * @return array 最终结果
 */
function continuousLatencyTest($host, $maxTotalTime = 30) {
    $startTimestamp = microtime(true);
    $resolvedIp = null;
    $testPorts = [80, 443, 8080, 8888]; // 常用端口轮询（增加成功率）
    $successResult = null;

    // 2. 30秒内持续检测（每秒1次）
    while (microtime(true) - $startTimestamp < $maxTotalTime) {
        // 静默解析IP（未解析成功则每次循环都尝试）
        if (!$resolvedIp) {
            $resolvedIp = silentDnsResolve($host);
        }

        // 轮询端口检测延迟（每个端口尝试1次/秒）
        foreach ($testPorts as $port) {
            // 计算剩余时间，动态调整单次连接超时（不超过剩余时间）
            $elapsedTime = microtime(true) - $startTimestamp;
            $remainingTime = $maxTotalTime - $elapsedTime;
            $connTimeout = min(1.5, $remainingTime); // 单次连接最长1.5秒

            // 尝试建立连接并计算延迟（完全静默，忽略所有错误）
            $connStart = microtime(true);
            $socket = @fsockopen(
                $resolvedIp ?: $host, // 优先使用解析后的IP，未解析则用原主机名
                $port,
                $errno, // 忽略错误码
                $errstr, // 忽略错误信息
                $connTimeout
            );
            $connEnd = microtime(true);

            // 3. 连接成功：计算延迟并立即返回结果
            if ($socket) {
                $latency = round(($connEnd - $connStart) * 1000, 2); // 毫秒，保留2位小数
                fclose($socket); // 关闭连接

                // 构建成功结果（无任何错误信息）
                $successResult = [
                    'success' => true,
                    'target' => $host,
                    'resolvedIp' => $resolvedIp ?: '未解析（直接连接成功）',
                    'port' => $port,
                    'latency' => $latency, // 延迟（毫秒）
                    'timestamp' => date('Y-m-d H:i:s'),
                    'elapsedTime' => round($elapsedTime, 2) // 实际检测耗时（秒）
                ];
                break 2; // 跳出端口循环和主循环，立即返回
            }

            // 连接失败：不输出任何信息，继续下一次尝试
        }

        // 4. 每秒检测1次，避免高频占用资源
        if (!$successResult) {
            sleep(1); // 暂停1秒后继续下一轮检测
        }
    }

    // 5. 30秒超时：返回失败结果（仅最终反馈）
    if (!$successResult) {
        return [
            'success' => false,
            'target' => $host,
            'resolvedIp' => $resolvedIp ?: '未解析',
            'error' => '30秒内未成功检测到延迟',
            'timestamp' => date('Y-m-d H:i:s'),
            'totalTime' => $maxTotalTime // 总检测时间（秒）
        ];
    }

    return $successResult;
}

// 执行检测并返回结果（全程仅输出最终JSON）
$result = continuousLatencyTest($host);
echo json_encode($result, JSON_UNESCAPED_UNICODE);
exit;
?>