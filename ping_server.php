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
 * 使用fsockopen测试服务器连接延迟
 * @param string $host 主机名或IP地址
 * @param int $port 端口号
 * @param int $timeout 超时时间（秒）
 * @param int $count 测试次数
 * @return array 包含延迟信息的数组
 */
function testConnectionLatency($host, $port, $timeout = 1, $count = 3) {
    $latencies = array();
    $successCount = 0;
    $totalTime = 0;
    
    for ($i = 0; $i < $count; $i++) {
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
            
            // 关闭连接
            fclose($socket);
        }
        
        // 每次测试之间短暂延迟
        if ($i < $count - 1) {
            usleep(100000); // 100毫秒
        }
    }
    
    // 计算平均延迟
    $avgLatency = $successCount > 0 ? round($totalTime / $successCount) : -1;
    
    // 计算最小延迟
    $minLatency = $successCount > 0 ? round(min($latencies)) : -1;
    
    return array(
        'successCount' => $successCount,
        'totalCount' => $count,
        'latencies' => $latencies,
        'avgLatency' => $avgLatency,
        'minLatency' => $minLatency
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
    'totalCount' => $testResults['totalCount']
);

// 如果没有成功连接，添加错误信息
if ($testResults['successCount'] === 0) {
    $response['error'] = '无法连接到服务器';
}

// 返回JSON响应
echo json_encode($response);
?>