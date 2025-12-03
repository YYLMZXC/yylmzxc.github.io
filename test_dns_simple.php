<?php
/**
 * DNS解析测试脚本
 * 用于诊断DNS解析功能问题
 */

// 包含主要文件
require_once 'ping_server.php';

// 测试域名列表
$testDomains = array(
    'baidu.com',
    'google.com',
    'github.com',
    '127.0.0.1',
    'localhost'
);

// 输出测试结果
echo "DNS解析测试结果\n";
echo "==================\n\n";

foreach ($testDomains as $domain) {
    echo "测试域名: $domain\n";
    echo "------------------\n";
    
    // 直接调用DNS解析函数
    $result = testDnsResolution($domain);
    
    echo "解析结果: " . ($result['success'] ? "成功" : "失败") . "\n";
    
    if ($result['success']) {
        echo "解析IP: " . $result['ip'] . "\n";
    } else {
        echo "错误信息: " . $result['error'] . "\n";
    }
    
    echo "DNS服务器: " . implode(', ', $result['dnsServers']) . "\n";
    
    echo "调试信息:\n";
    foreach ($result['debug'] as $debugLine) {
        echo "  - $debugLine\n";
    }
    
    echo "\n";
}

// 测试系统DNS获取
$systemDns = getSystemDnsServers();
echo "系统DNS服务器: " . implode(', ', $systemDns) . "\n";