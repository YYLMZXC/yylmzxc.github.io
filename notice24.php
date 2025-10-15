<?php
$notice = <<<NOTICE
<Motd UpdatePeriodHours="12">
	<Line Time="1">
		<CanvasWidget xmlns="runtime-namespace:Game" />
	</Line>
	<!-- <Line Time="10"> -->
	<!-- <StackPanelWidget xmlns="runtime-namespace:Game" Direction="Vertical" HorizontalAlignment="Center" VerticalAlignment="Center"> -->
	<!-- <LabelWidget Text="Want to play Survivalcraft on your PC?" HorizontalAlignment="Center" VerticalAlignment="Center" Font="{Fonts/Pericles18}"/> -->
	<!-- <StackPanelWidget xmlns="runtime-namespace:Game" HorizontalAlignment="Center" VerticalAlignment="Center" > -->
	<!-- <LabelWidget Text="Download it from " HorizontalAlignment="Center" VerticalAlignment="Center" Font="{Fonts/Pericles18}"/> -->
	<!-- <LinkWidget Text="Windows Store" Color="64, 192, 64" Font="{Fonts/Pericles18u}" VerticalAlignment="Center" Url="https://www.microsoft.com/store/apps/9wzdncrfhvnl" /> -->
	<!-- <LabelWidget Text="!" HorizontalAlignment="Center" VerticalAlignment="Center" Font="{Fonts/Pericles18}"/> -->
	<!-- </StackPanelWidget> -->
	<!-- </StackPanelWidget> -->
	<!-- </Line> -->
	<Line Time="5">
		<StackPanelWidget xmlns="runtime-namespace:Game" HorizontalAlignment="Center" VerticalAlignment="Center">
			<LabelWidget Text="中文社区已上线" VerticalAlignment="Center" />
			<LinkWidget Text="https://www.schub.top" Color="64, 192, 64" VerticalAlignment="Center" Url="https://www.schub.top" />
			<LabelWidget Text=" 可以在这里下载Mods" VerticalAlignment="Center" />
		</StackPanelWidget>
	</Line>
	<Line Time="5">
		<StackPanelWidget xmlns="runtime-namespace:Game" HorizontalAlignment="Center" VerticalAlignment="Center">
			<LabelWidget Text="目前插件版已更新到V1.50正式版，如有Bug请前往社区反馈" VerticalAlignment="Center" />
		</StackPanelWidget>
	</Line>
	<Line Time="8">
		地形高度增加到256格
		可建造巨大的摩天大楼，攀登高山
	</Line>
	<Line Time="8">
		放置过多家具时出现的故障已得到修复
		有一个新的，更好的地形生成器
	</Line>
	<Line Time="8">
		干旱地区现在种植合金欢树
		山上覆盖着诡异的冰
	</Line>
	<Line Time="8">
		食物腐烂减少，腐烂的食物
		将最终变成堆肥，帮助耕种
	</Line>
	<Line Time="8">
		看看新的平岛模式
		平坦地形的海岸不再需要笔直
	</Line>
	<Line Time="8">
		小心大白鲨在深海游荡
		作为补偿，船已经变得更坚固
	</Line>
	<Line Time="8">
		照明模型已经改进，
		一切都应该更明亮，看起来更好
	</Line>
	<Line Time="8">
		对于超过70个新增项目的完整列表，请查看
		更新博客中的历史记录。祝你玩得开心！
	</Line>
	<Line Time="20">
		<CanvasWidget xmlns="runtime-namespace:Game" />
	</Line>
</Motd>
<Motd2>
	<Bulletin Title="关于版本" EnTitle="About account registration" Time="2024-01-20 19:15">
		<Content>
生存战争（简称SC）版权归属Kaalus，联机版为 小小怪（社区创始人）基于原版制作，本文件为群英璀璨服优化版，仅做部分优化，社区功能不受影响。

更新内容（Q群826823481）
2024-02-16
1.土豆：安卓群英璀璨服优化版（手机）

2024-02-14
1.星空跑路，由土豆，陨石，创世纪接手
2.改名群英璀璨服


2024-01-20(手机版)
1、修复低分辨率无法修改存档的BUG

2024-01-19(手机版)
1、新增保存密码功能，无需多次输入密码
2、修复无法上传存档到本地的BUG
3、优化部分渲染场景异常问题
4、使用原版目录，方便兼容旧存档
5、服务器列表不会再乱动了

2024-01-05
1、修复上次社区导致的大面积清号问题
2、使用密码后角色可永久保留
3、优化长时间游玩后卡顿发热
4、连接后无需再次输入密码
5、优化部分体验细节
6、加强部分外挂处理
		</Content>
		<EnContent>
https://kaalus.wordpress.com
		</EnContent>
	</Bulletin>
</Motd2>
<!-- 过滤模组 -->
<Motd3>
	<FilterMod Name="RYSH 有点真实の生存" PackageName="rysh" Version="all" FilterAPIVersion="1.50">
		不太兼容当前插件版本(1.50)，游玩过程可能出现问题:无法吃东西或穿衣服。
		解决方案：可以先使用插件版1.44游玩此mod。
	</FilterMod>
</Motd3>
<Motd4>
	<Guns>
	</Guns>
</Motd4>
NOTICE;
echo $notice;