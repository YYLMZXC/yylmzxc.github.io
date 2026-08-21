<?php
/**
 * ============================================================================
 *  SC Web API 代理脚本
 * ============================================================================
 *  功能：将前端的 API 请求转发到远程服务器 (api.sckey.net)
 *  用途：解决浏览器跨域（CORS）限制问题
 *
 *  支持的请求类型：
 *    1. serverlist - 获取服务器列表 (GET /proxy.php?action=serverlist&version=xxx)
 *    2. ping       - 检测服务器延迟 (GET /proxy.php?action=ping&host=xxx&port=xxx)
 *
 *  部署：上传到网站根目录（与 online_server.html 同层级）
 *  示例：https://scwz.top/proxy.php
 * ============================================================================
 */

// ==================== 跨域配置 ====================
header('Access-Control-Allow-Origin: *');           // 允许所有域名访问（解决CORS问题）
header('Access-Control-Allow-Methods: GET, OPTIONS'); // 允许的HTTP方法
header('Access-Control-Allow-Headers: Content-Type'); // 允许的请求头
header('Content-Type: application/json; charset=utf-8'); // 响应格式：JSON

// ==================== 处理 OPTIONS 预检请求 ====================
// 浏览器在跨域请求前会发送 OPTIONS 请求，服务器需返回 204 状态码
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ==================== 全局错误处理 ====================
// 将 PHP 错误转换为 JSON 响应，避免输出 HTML 错误信息
set_error_handler(function ($errno, $errstr) {
    echo json_encode([
        'success' => false,
        'msg' => 'PHP Error: ' . $errstr,
        'code' => 500
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// 将未捕获的异常转换为 JSON 响应
set_exception_handler(function ($exception) {
    echo json_encode([
        'success' => false,
        'msg' => 'PHP Exception: ' . $exception->getMessage(),
        'code' => 500
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// ==================== 获取请求参数 ====================
$action = isset($_GET['action']) ? $_GET['action'] : 'serverlist';  // 请求类型
$version = isset($_GET['version']) ? $_GET['version'] : 'x26.07.30'; // 服务器版本号

/**
 * 获取客户端真实 IP（综合考虑常见代理转发头）
 * @return string 客户端 IP 地址
 */
function getClientIp() {
    // 依次检查常见的代理转发头，最后回退到 REMOTE_ADDR
    foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CF_CONNECTING_IP', 'HTTP_CLIENT_IP'] as $header) {
        if (!empty($_SERVER[$header])) {
            // X-Forwarded-For 可能包含逗号分隔的 IP 链，取第一个
            $value = trim(explode(',', $_SERVER[$header])[0]);
            if (filter_var($value, FILTER_VALIDATE_IP)) {
                return $value;
            }
        }
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
}

// ==================== 根据请求类型构建目标 URL ====================
switch ($action) {
    // 客户端信息：直接返回服务端视角能获取到的访问信息，无需转发上游
    case 'clientinfo':
        echo json_encode([
            'success' => true,
            'data' => [
                // 客户端地址信息
                'ip' => getClientIp(),
                'remoteAddr' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '',
                'xForwardedFor' => isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? $_SERVER['HTTP_X_FORWARDED_FOR'] : '',
                'xRealIp' => isset($_SERVER['HTTP_X_REAL_IP']) ? $_SERVER['HTTP_X_REAL_IP'] : '',
                // 客户端请求头
                'userAgent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '',
                'acceptLanguage' => isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? $_SERVER['HTTP_ACCEPT_LANGUAGE'] : '',
                'acceptEncoding' => isset($_SERVER['HTTP_ACCEPT_ENCODING']) ? $_SERVER['HTTP_ACCEPT_ENCODING'] : '',
                'accept' => isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '',
                'referer' => isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '',
                // 请求信息
                'requestMethod' => isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '',
                'requestUri' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '',
                'requestTime' => isset($_SERVER['REQUEST_TIME']) ? $_SERVER['REQUEST_TIME'] : 0,
                // 服务端信息
                'serverAddr' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '',
                'serverName' => isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '',
                'serverSoftware' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : '',
                'serverProtocol' => isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : '',
                'https' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                // Client Hints（Chrome 等浏览器可能携带，可能为空）
                'secChUa' => isset($_SERVER['HTTP_SEC_CH_UA']) ? $_SERVER['HTTP_SEC_CH_UA'] : '',
                'secChUaPlatform' => isset($_SERVER['HTTP_SEC_CH_UA_PLATFORM']) ? $_SERVER['HTTP_SEC_CH_UA_PLATFORM'] : '',
                'secChUaMobile' => isset($_SERVER['HTTP_SEC_CH_UA_MOBILE']) ? $_SERVER['HTTP_SEC_CH_UA_MOBILE'] : ''
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;

    // Ping 检测：检测指定服务器的延迟
    case 'ping':
        $host = isset($_GET['host']) ? $_GET['host'] : '';
        $port = isset($_GET['port']) ? $_GET['port'] : '';
        if (empty($host) || empty($port)) {
            echo json_encode([
                'success' => false,
                'msg' => '缺少 host 或 port 参数',
                'code' => 400
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $targetUrl = 'https://api.sckey.net/server/ping?host=' . urlencode($host) . '&port=' . urlencode($port);
        break;

    // 默认：获取服务器列表
    case 'serverlist':
    default:
        $targetUrl = 'https://api.sckey.net/server/serverlist?version=' . urlencode($version);
        break;
}

/**
 * 使用 cURL 发送 HTTP GET 请求
 * 优先使用此方法，性能更好、功能更全
 * 
 * @param string $url 目标 URL
 * @return array 响应结果 ['success', 'data', 'code', 'msg']
 */
function httpGet($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,    // 自动跟随 301/302 重定向
        CURLOPT_RETURNTRANSFER => true,    // 返回响应内容而非直接输出
        CURLOPT_SSL_VERIFYPEER => false,   // 跳过 SSL 证书验证（兼容部分服务器）
        CURLOPT_SSL_VERIFYHOST => 0,       // 跳过 SSL 主机名验证
        CURLOPT_TIMEOUT => 15,             // 总超时时间 15 秒
        CURLOPT_CONNECTTIMEOUT => 10,      // 连接超时时间 10 秒
        CURLOPT_HTTPHEADER => [
            'User-Agent: Mozilla/5.0 (compatible; SCWebProxy/1.0)',
            'Accept: application/json',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return [
            'success' => false,
            'msg' => 'cURL Error: ' . $error,
            'code' => 0
        ];
    }

    return [
        'success' => $httpCode === 200,
        'data' => $response,
        'code' => $httpCode
    ];
}

/**
 * 使用 file_get_contents 发送 HTTP GET 请求（降级方案）
 * 当服务器未启用 cURL 扩展时使用此方法
 * 
 * @param string $url 目标 URL
 * @return array 响应结果 ['success', 'data', 'code', 'msg']
 */
function httpGetFallback($url) {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0 (compatible; SCWebProxy/1.0)\r\n" .
                        "Accept: application/json\r\n" .
                        "Accept-Language: zh-CN,zh;q=0.9,en;q=0.8\r\n",
            'timeout' => 15,
            'follow_location' => 1
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);

    $response = @file_get_contents($url, false, $context);

    if ($response === false) {
        return [
            'success' => false,
            'msg' => 'file_get_contents 请求失败',
            'code' => 0
        ];
    }

    return [
        'success' => true,
        'data' => $response,
        'code' => 200
    ];
}

// ==================== 执行请求 ====================
$result = null;

// 优先使用 cURL，未启用则降级为 file_get_contents
if (function_exists('curl_init')) {
    $result = httpGet($targetUrl);
} else {
    $result = httpGetFallback($targetUrl);
}

// ==================== 返回结果 ====================
if ($result['success'] && !empty($result['data'])) {
    // 尝试解析为 JSON，若成功则输出格式化的 JSON
    $data = json_decode($result['data'], true);
    if ($data !== null) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    } else {
        // 原始数据不是 JSON（例如纯文本），直接输出
        echo $result['data'];
    }
} else {
    // 请求失败，返回错误信息
    echo json_encode([
        'success' => false,
        'msg' => isset($result['msg']) ? $result['msg'] : '上游服务器请求失败',
        'code' => $result['code']
    ], JSON_UNESCAPED_UNICODE);
}
