<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_error_handler(function ($errno, $errstr) {
    echo json_encode([
        'success' => false,
        'msg' => 'PHP Error: ' . $errstr,
        'code' => 500
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

set_exception_handler(function ($exception) {
    echo json_encode([
        'success' => false,
        'msg' => 'PHP Exception: ' . $exception->getMessage(),
        'code' => 500
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

$action = isset($_GET['action']) ? $_GET['action'] : 'serverlist';
$version = isset($_GET['version']) ? $_GET['version'] : 'x26.07.20';

switch ($action) {
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

    case 'serverlist':
    default:
        $targetUrl = 'https://api.sckey.net/server/serverlist?version=' . urlencode($version);
        break;
}

function httpGet($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
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

$result = null;

if (function_exists('curl_init')) {
    $result = httpGet($targetUrl);
} else {
    $result = httpGetFallback($targetUrl);
}

if ($result['success'] && !empty($result['data'])) {
    $data = json_decode($result['data'], true);
    if ($data !== null) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    } else {
        echo $result['data'];
    }
} else {
    echo json_encode([
        'success' => false,
        'msg' => isset($result['msg']) ? $result['msg'] : '上游服务器请求失败',
        'code' => $result['code']
    ], JSON_UNESCAPED_UNICODE);
}
