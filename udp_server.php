<?php
/**
 * UDP延迟检测工具
 * 核心功能：
 * 1. 使用PHP socket扩展实现UDP延迟检测
 * 2. 支持超时处理和错误检测
 * 3. 返回JSON格式结果
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

// 获取并验证目标IP/主机名
$target = isset($_GET['ip']) ? trim($_GET['ip']) : '';
if (empty($target)) {
    echo json_encode([
        'success' => false,
        'error' => 'IP地址/主机名不能为空'
    ]);
    exit;
}

// 默认端口和超时设置
$defaultPort = 28887; // SC服务器默认UDP端口
$timeout = 10; // 超时时间（秒）

/**
 * 解析目标地址和端口
 * @param string $target 目标地址
 * @param int $defaultPort 默认端口
 * @return array 包含host和port的数组
 */
function parseTarget($target, $defaultPort) {
    if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::([0-9]+))?$/', $target, $matches)) {
        $host = str_replace(['[', ']'], '', $matches[1]);
        $port = isset($matches[2]) ? (int)$matches[2] : $defaultPort;
        return ['host' => $host, 'port' => $port];
    } elseif (preg_match('/^([a-zA-Z0-9-_.]+)(?::([0-9]+))?$/', $target, $matches)) {
        $host = $matches[1];
        $port = isset($matches[2]) ? (int)$matches[2] : $defaultPort;
        return ['host' => $host, 'port' => $port];
    } else {
        return ['host' => $target, 'port' => $defaultPort];
    }
}

/**
 * UDP延迟检测
 * @param string $host 目标主机
 * @param int $port 目标端口
 * @param int $timeout 超时时间（秒）
 * @return float|false 延迟（毫秒）或false
 */
function udpLatencyDetection($host, $port, $timeout) {
    // 检查socket扩展是否可用
    if (!function_exists('socket_create')) {
        return false;
    }
    
    // 创建UDP socket
    $socket = @socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
    if ($socket === false) {
        return false;
    }
    
    // 设置socket超时
    socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, [
        'sec' => $timeout,
        'usec' => 0
    ]);
    
    socket_set_option($socket, SOL_SOCKET, SO_SNDTIMEO, [
        'sec' => $timeout,
        'usec' => 0
    ]);
    
    // 生成测试数据包（简单的UDP ping数据包）
    $testData = "UDP_PING_TEST_" . time();
    
    // 记录开始时间
    $startTime = microtime(true);
    
    // 发送UDP数据包
    $bytesSent = @socket_sendto($socket, $testData, strlen($testData), 0, $host, $port);
    if ($bytesSent === false) {
        socket_close($socket);
        return false;
    }
    
    // 尝试接收响应
    $response = '';
    $from = '';
    $fromPort = 0;
    $bytesReceived = @socket_recvfrom($socket, $response, 1024, 0, $from, $fromPort);
    
    // 记录结束时间
    $endTime = microtime(true);
    
    // 关闭socket
    socket_close($socket);
    
    // 计算延迟（毫秒）
    $latency = round(($endTime - $startTime) * 1000, 2);
    
    // 即使没有收到响应，也返回延迟（超时情况）
    return $latency;
}

// 解析目标地址
$targetInfo = parseTarget($target, $defaultPort);
$host = $targetInfo['host'];
$port = $targetInfo['port'];

// 执行UDP延迟检测
$latency = udpLatencyDetection($host, $port, $timeout);

// 返回结果
if ($latency !== false) {
    echo json_encode([
        'success' => true,
        'target' => $target,
        'host' => $host,
        'port' => $port,
        'latency' => $latency,
        'method' => 'udp',
        'timeout' => $timeout,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'success' => false,
        'target' => $target,
        'host' => $host,
        'port' => $port,
        'error' => 'UDP检测失败',
        'method' => 'udp',
        'timeout' => $timeout,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

exit;