<?php
/**
 * UDP延迟检测工具
 * 核心功能：
 * 1. 使用PHP socket实现UDP延迟检测
 * 2. 默认端口28887，可自定义
 * 3. 返回JSON格式结果
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$target = isset($_GET['ip']) ? trim($_GET['ip']) : '';
if (empty($target)) {
    echo json_encode(['success' => false, 'error' => 'IP/主机名不能为空']);
    exit;
}

$defaultPort = 28887;
$timeout = 10;

function parseTargetPort($target, $defaultPort) {
    if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::([0-9]+))?$/', $target, $matches)) {
        $host = str_replace(['[', ']'], '', $matches[1]);
        $port = isset($matches[2]) ? (int)$matches[2] : $defaultPort;
        return ['host' => $host, 'port' => $port];
    } elseif (preg_match('/^([a-zA-Z0-9-_.]+)(?::([0-9]+))?$/', $target, $matches)) {
        $host = $matches[1];
        $port = isset($matches[2]) ? (int)$matches[2] : $defaultPort;
        return ['host' => $host, 'port' => $port];
    }
    return ['host' => $target, 'port' => $defaultPort];
}

$info = parseTargetPort($target, $defaultPort);
$host = $info['host'];
$port = $info['port'];

function udpLatency($host, $port, $timeout) {
    if (!function_exists('socket_create')) return false;
    $socket = @socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
    if ($socket === false) return false;

    socket_set_option($socket, SOL_SOCKET, SO_RCVTIMEO, ['sec'=>$timeout,'usec'=>0]);
    socket_set_option($socket, SOL_SOCKET, SO_SNDTIMEO, ['sec'=>$timeout,'usec'=>0]);

    $data = "UDP_PING_TEST_".time();
    $start = microtime(true);
    $bytesSent = @socket_sendto($socket, $data, strlen($data), 0, $host, $port);
    if ($bytesSent === false) { socket_close($socket); return false; }

    $response = ''; $from=''; $fromPort=0;
    @socket_recvfrom($socket, $response, 1024, 0, $from, $fromPort);

    $latency = round((microtime(true)-$start)*1000, 2);
    socket_close($socket);
    return $latency;
}

$latency = udpLatency($host, $port, $timeout);

if ($latency !== false) {
    echo json_encode([
        'success' => true,
        'host' => $host,
        'port' => $port,
        'latency' => $latency,
        'method' => 'udp',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'success' => false,
        'host' => $host,
        'port' => $port,
        'error' => 'UDP检测失败',
        'method' => 'udp',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

exit;
?>
