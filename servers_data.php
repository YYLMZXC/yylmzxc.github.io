<?php
// 服务器数据文件
// 定义服务器数据数组 - 包含类型信息
global $servers;
$servers = array(
    array(
        'name' => '土豆原版生存服一',
        'ip' => 'schub.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆原版生存服二',
        'ip' => 'tudouzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'original'
    ),
    array(
        'name' => '土豆天空之城商店服',
        'ip' => 'schub.icu:38887',
        'group' => '826823481',
        'note' => '',
        'type' => 'store'
    ),
    array(
        'name' => '土豆-混乱生存枪械MOD服',
        'ip' => 'tudouzxc.icu:38887',
        'group' => '826823481',
        'note' => '加群获取MOD',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆-修仙界MOD服',
        'ip' => 'tudouzxc.icu:48887',
        'group' => '826823481',
        'note' => '加群获取MOD',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆mod-y1服',
        'ip' => 'tudouzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆mod-y2服',
        'ip' => 'y.tudouzxc.icu:38887',
        'group' => '826823481',
        'note' => '',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆mod-y3服',
        'ip' => 'y.tudouzxc.icu:48887',
        'group' => '826823481',
        'note' => '',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆mod-y4服',
        'ip' => 't.tudouzxc.icu',
        'group' => '826823481',
        'note' => '',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆mod-y5服',
        'ip' => 't.tudouzxc.icu:38887',
        'group' => '826823481',
        'note' => '',
        'type' => 'mod'
    ),
    array(
        'name' => '土豆mod-y6服',
        'ip' => 't.tudouzxc.icu:48887',
        'group' => '826823481',
        'note' => '',
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