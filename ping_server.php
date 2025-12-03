<?php
/**
 * 系统Ping检测工具
 * 核心功能：
 * 1. 使用系统Ping命令检测延迟
 * 2. 支持中英文输出解析
 * 3. 返回JSON格式结果
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$target = isset($_GET['ip']) ? trim($_GET['ip']) : '';
if (empty($target)) {
    echo json_encode(['success'=>false, 'error'=>'IP/主机名不能为空']);
    exit;
}

function parseTarget($target) {
    if (preg_match('/^(\[[0-9a-fA-F:.]+\]|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::[0-9]+)?$/', $target, $matches)) {
        return str_replace(['[', ']'], '', $matches[1]);
    }
    return $target;
}

$host = parseTarget($target);

function systemPing($host) {
    $os = strtoupper(substr(PHP_OS,0,3));
    $cmd = $os==='WIN' ? "ping -n 1 -w 1000 $host" : "ping -c 1 -W 1 $host";
    $output = @shell_exec($cmd . ' 2>&1');
    if (empty($output)) return false;

    if (preg_match('/time[=<](\d+(\.\d+)?)ms/i', $output, $m)) return round((float)$m[1],2);
    if (preg_match('/时间[=<](\d+(\.\d+)?)ms/i', $output, $m)) return round((float)$m[1],2);
    return false;
}

$latency = systemPing($host);

if ($latency !== false) {
    echo json_encode([
        'success'=>true,
        'host'=>$host,
        'latency'=>$latency,
        'method'=>'ping',
        'timestamp'=>date('Y-m-d H:i:s')
    ]);
} else {
    echo json_encode([
        'success'=>false,
        'host'=>$host,
        'error'=>'Ping检测失败',
        'method'=>'ping',
        'timestamp'=>date('Y-m-d H:i:s')
    ]);
}

exit;
?>
