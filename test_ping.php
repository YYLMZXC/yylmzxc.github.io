<?php
// 测试ping命令执行
$host = 'yylmzxc.icu';
$command = "ping -n 1 -w 2000 " . escapeshellarg($host);

$output = array();
$return_var = 0;
exec($command . ' 2>&1', $output, $return_var);

echo "Command: $command<br>";
echo "Return Var: $return_var<br>";
echo "Output:<br><pre>";
print_r($output);
echo "</pre>";

// 测试字符串匹配
echo "<br>Testing string matching:<br>";
$output_str = implode('\n', $output);
echo "Output string: $output_str<br>";
echo "Contains '时间<': " . (strpos($output_str, '时间<') !== false ? 'Yes' : 'No') . "<br>";
echo "Contains '时间=': " . (strpos($output_str, '时间=') !== false ? 'Yes' : 'No') . "<br>";
echo "Contains '最短': " . (strpos($output_str, '最短') !== false ? 'Yes' : 'No') . "<br>";

// 测试正则表达式匹配
echo "<br>Testing regex matching:<br>";
if (preg_match('/时间<1ms/', $output_str, $matches)) {
    echo "Matched '时间<1ms': Yes<br>";
    print_r($matches);
} else {
    echo "Matched '时间<1ms': No<br>";
}

if (preg_match('/时间=(\d+)/', $output_str, $matches)) {
    echo "Matched '时间=xxx': Yes<br>";
    print_r($matches);
} else {
    echo "Matched '时间=xxx': No<br>";
}

if (preg_match('/最短\s*=\s*(\d+)/', $output_str, $matches)) {
    echo "Matched '最短=xxx': Yes<br>";
    print_r($matches);
} else {
    echo "Matched '最短=xxx': No<br>";
}
?>