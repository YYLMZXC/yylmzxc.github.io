<?php
/**
 * TCP延迟检测工具
 * 核心功能：
 * 1. 使用fsockopen和stream_socket_client检测TCP端口连通性
 * 2. 支持分阶段检测（延迟、端口状态）
 * 3. 返回JSON格式结果
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 获取目标IP/域名
$target = isset($_GET['ip']) ? trim($_GET['ip']) : '';
if (empty($target)) {
    echo json_encode(['success' => false, 'error' => 'IP/主机名不能为空']);
    exit;
}

// 解析目标和端口
function parseTargetPort($target) {
    if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::([0-9]+))?$/', $target, $matches)) {
        $host = str_replace(['[', ']'], '', $matches[1]);
        $port = isset($matches[2]) ? (int)$matches[2] : null;
        return ['host' => $host, 'port' => $port];
    } elseif (preg_match('/^([a-zA-Z0-9-_.]+)(?::([0-9]+))?$/', $target, $matches)) {
        $host = $matches[1];
        $port = isset($matches[2]) ? (int)$matches[2] : null;
        return ['host' => $host, 'port' => $port];
    }
    return ['host' => $target, 'port' => null];
}

$info = parseTargetPort($target);
$host = $info['host'];
$port = $info['port'];

// 检测TCP延迟
function tcpLatency($host, $port, $timeout = 2) {
    if (!$port) return false;
    $start = microtime(true);
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    if ($socket) {
        fclose($socket);
        return round((microtime(true) - $start) * 1000, 2);
    }
    return false;
}

// 执行检测
$latency = tcpLatency($host, $port);

if ($latency !== false) {
    echo json_encode([
        'success' => true,
        'host' => $host,
        'port' => $port,
        'latency' => $latency,
        'method' => 'tcp',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'success' => false,
        'host' => $host,
        'port' => $port,
        'error' => 'TCP检测失败',
        'method' => 'tcp',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

exit;
?>
