<?php
/**
 * 服务器Ping工具
 * 用于测试服务器延迟并返回结果
 */

// 设置响应头
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

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

// 解析IP和端口（如果有）
if (strpos($ip, ':') !== false && substr_count($ip, ':') === 1) {
    // 格式：ip:port
    list($host, $port) = explode(':', $ip);
    $port = intval($port);
} else {
    // 只有IP，没有端口
    $host = $ip;
    $port = 28887; // 默认端口
}

// 移除可能的空格
$host = trim($host);

// 执行ping命令
function ping($host, $timeout = 2) {
    // 根据操作系统选择ping命令格式
    $os = strtolower(PHP_OS);
    $command = '';
    
    if (strpos($os, 'win') !== false) {
        // Windows系统 - 增加超时时间
        $command = "ping -n 1 -w " . ($timeout * 1000) . " " . escapeshellarg($host);
    } else {
        // Linux/Unix系统
        $command = "ping -c 1 -W " . $timeout . " " . escapeshellarg($host);
    }
    
    // 执行ping命令并获取输出
    $output = array();
    $return_var = 0;
    $full_output = '';
    // 使用2>&1捕获stderr
    exec($command . ' 2>&1', $output, $return_var);
    
    // 解析输出获取延迟
    $latency = -1;
    $output_str = implode("\n", $output);
    
    // 详细调试信息
    error_log("=== Ping Debug Info ===");
    error_log("Command: $command");
    error_log("Return Var: $return_var");
    error_log("Output Lines: " . count($output));
    error_log("Full Output: $output_str");
    error_log("Output Contains '时间<': " . (strpos($output_str, '时间<') !== false ? 'Yes' : 'No'));
    error_log("Output Contains '时间=': " . (strpos($output_str, '时间=') !== false ? 'Yes' : 'No'));
    
    // 删除重复的解析逻辑，只保留下面的简化版
    
    // 改进的英文格式延迟解析逻辑
    if ($return_var === 0) {
        // 遍历每一行输出
        foreach ($output as $line) {
            // 检查是否包含time信息
            if (stripos($line, 'time<1ms') !== false) {
                $latency = 0;
                break;
            } elseif (preg_match('/time=(\d+)/i', $line, $matches)) {
                $latency = intval($matches[1]);
                break;
            }
        }
        
        // 如果没有找到，尝试从统计信息中获取
        if ($latency === -1) {
            foreach ($output as $line) {
                if (preg_match('/Minimum\s*=\s*(\d+)/i', $line, $matches)) {
                    $latency = intval($matches[1]);
                    break;
                }
            }
        }
    }
    
    // 添加调试信息
    error_log("Latency parsed: $latency");
    
    return $latency;
}

// 执行ping并获取延迟
$latency = ping($host);

// 准备响应数据
$response = array(
    'success' => true,
    'ip' => $ip,
    'host' => $host,
    'port' => $port,
    'latency' => $latency
);

// 返回JSON响应
echo json_encode($response);
?>