<?php
/**
 * 本地翻译服务模拟 - 用于测试Cloudflare Worker翻译功能
 * 暂时替换Cloudflare Workers AI进行本地测试
 */

// 设置CORS头部
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 获取翻译参数
$text = $_GET['text'] ?? $_POST['text'] ?? '';
$to = $_GET['to'] ?? $_POST['to'] ?? 'en';
$from = $_GET['from'] ?? $_POST['from'] ?? 'zh';

if (empty($text)) {
    echo json_encode([
        'error' => 'Text is required',
        'message' => '请提供要翻译的文本内容'
    ]);
    exit;
}

// 语言映射
$languageMap = [
    'zh' => '中文',
    'zh-TW' => '繁体中文',
    'en' => '英语',
    'ja' => '日语',
    'ko' => '韩语',
    'fr' => '法语',
    'de' => '德语',
    'es' => '西班牙语',
    'it' => '意大利语',
    'pt' => '葡萄牙语',
    'ru' => '俄语',
    'ar' => '阿拉伯语',
    'hi' => '印地语',
    'th' => '泰语',
    'vi' => '越南语',
    'tr' => '土耳其语',
    'nl' => '荷兰语',
    'sv' => '瑞典语',
    'no' => '挪威语',
    'da' => '丹麦语',
    'fi' => '芬兰语',
    'pl' => '波兰语',
    'cs' => '捷克语',
    'hu' => '匈牙利语',
    'ro' => '罗马尼亚语',
    'bg' => '保加利亚语',
    'hr' => '克罗地亚语',
    'sk' => '斯洛伐克语',
    'sl' => '斯洛文尼亚语',
    'et' => '爱沙尼亚语',
    'lv' => '拉脱维亚语',
    'lt' => '立陶宛语',
    'el' => '希腊语'
];

// 模拟翻译（实际项目中这里会调用真实的翻译API）
function mockTranslate($text, $from, $to) {
    global $languageMap;
    
    if ($from === $to) {
        return $text; // 相同语言无需翻译
    }
    
    // 简单的模拟翻译 - 在文本前后加上语言标记
    $fromLang = $languageMap[$from] ?? $from;
    $toLang = $languageMap[$to] ?? $to;
    
    return "🔄 [翻译完成: {$fromLang} → {$toLang}] " . $text . " [翻译结束]";
}

// 执行翻译
try {
    $translatedText = mockTranslate($text, $from, $to);
    
    $result = [
        'translated_text' => $translatedText,
        'original_text' => $text,
        'from' => $from,
        'to' => $to,
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'service' => 'local_test_service'
    ];
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Translation failed',
        'message' => $e->getMessage(),
        'success' => false
    ], JSON_UNESCAPED_UNICODE);
}
?>