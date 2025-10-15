<?php
// 服务器数据文件
// 定义服务器数据数组 - 包含类型信息
global $servers;
$servers = array(
    array(
        'name' => '土豆服主1服分支',
        'ip' => 'api.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆服2服',
        'ip' => 'yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆服3服',
        'ip' => 'y.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆服4服',
        'ip' => 't.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '空岛刷怪9服',
        'ip' => 'v.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '测试服',
        'ip' => 'b.yylmzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => 'mod模组测试服',
        'ip' => 'b.yylmzxc.icu:38887',
        'group' => '826823481',
        'note' => '加群获取MOD',
        'type' => 'mod'
    )
);

// 获取服务器列表的函数
function get_servers($type = '') {
    global $servers;
    
    // 如果没有指定类型，返回所有服务器
    if (empty($type)) {
        return $servers;
    }
    
    // 根据类型筛选服务器
    $filtered_servers = array();
    foreach ($servers as $server) {
        if (isset($server['type']) && $server['type'] == $type) {
            $filtered_servers[] = $server;
        }
    }
    
    return $filtered_servers;
}

// 获取服务器类型名称的函数
function get_server_type_name($type) {
    switch ($type) {
        case 'original':
            return '原版';
        case 'mod':
            return '模组';
        case 'store':
            return '商店';
        default:
            return '未知';
    }
}

// 添加服务器的函数（用于后续扩展）
function add_server($name, $ip, $group, $note = '', $type = 'original') {
    global $servers;
    
    $servers[] = array(
        'name' => $name,
        'ip' => $ip,
        'group' => $group,
        'note' => $note,
        'type' => $type
    );
    
    return true;
}