<?php
/**
 * 服务器Ping检测工具
 * 核心功能：
 * 1. 使用系统Ping命令检测网络延迟
 * 2. 支持中英文Ping命令输出解析
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

/**
 * 系统Ping命令检测
 * @param string $host 目标IP/主机名
 * @return float|false 延迟（毫秒）或false
 */
function systemPingDetection($host) {
    // 区分Windows和Linux系统的Ping命令
    $os = strtoupper(substr(PHP_OS, 0, 3));
    $pingCmd = $os === 'WIN' 
        ? "ping -n 1 -w 1000 {$host}"  // Windows：1个包，超时1秒
        : "ping -c 1 -W 1 {$host}";   // Linux：1个包，超时1秒

    // 执行Ping命令
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
 * 解析目标（移除端口和IPv6方括号）
 * @param string $target 目标地址
 * @return string 解析后的主机名/IP
 */
function parseTarget($target) {
    if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::[0-9]+)?$/', $target, $matches)) {
        return str_replace(['[', ']'], '', $matches[1]);
    } else {
        return $target;
    }
}

// 解析目标地址
$host = parseTarget($target);

// 执行Ping检测
$latency = systemPingDetection($host);

// 返回结果
if ($latency !== false) {
    echo json_encode([
        'success' => true,
        'target' => $target,
        'host' => $host,
        'latency' => $latency,
        'method' => 'ping',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'success' => false,
        'target' => $target,
        'host' => $host,
        'error' => 'Ping检测失败',
        'method' => 'ping',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

exit;