# 生存战争社区网站

一个多语言的生存战争（SurvivalCraft）社区网站，提供游戏资源下载、联机服务器信息、社区交流等功能。

## 🌟 项目特性

- **多语言支持**: 中文、英文、俄语三种语言界面
- **响应式设计**: 适配桌面和移动设备
- **资源分类**: 插件版Mod、联机版Mod、材质包、皮肤包、地图包等
- **搜索功能**: 快速查找游戏资源
- **社区导航**: 国内外SC社区链接导航
- **联机服务器**: 在线服务器列表和状态
- **百度统计**: 网站访问统计和分析

## 🚀 快速开始

### 环境要求

- PHP 7.4 或更高版本
- Apache Web服务器（推荐）
- 现代浏览器（支持ES6+）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd scweb
   ```

2. **启动开发服务器**
   
   使用PHP内置服务器：
   ```bash
   php -S localhost:8000
   ```
   
   或使用提供的批处理文件：
   - 80端口：`RUN80.BAT`
   - 443端口：`RUN443.BAT`
   - 8080端口：`run8080.bat`

3. **访问网站**
   
   打开浏览器访问：
   - PHP内置服务器：`http://localhost:8000`
   - 80端口：`http://localhost`
   - 443端口：`https://localhost`
   - 8080端口：`http://localhost:8080`

## 📁 项目结构

```
scweb/
├── .github/              # GitHub配置
│   └── workflows/        # CI/CD配置
├── BETA_TEST/            # 测试相关文件
│   ├── README.md
│   ├── online_server.php
│   ├── php_network_check.php
│   └── ping_server.php
├── DeployServerConfiguration/  # 部署服务器配置
│   ├── README.md
│   ├── RUN443.BAT
│   ├── httpd-scweb.conf
│   └── httpd.conf
├── error/                # 错误页面
│   ├── 400.html          # 400错误页
│   ├── 403.html          # 403错误页
│   ├── 404.html          # 404错误页
│   └── ...               # 其他HTTP错误页
├── mod_server/           # 游戏mod服务器下载模块
│   ├── 156server/        # 156服务器配置
│   ├── 232server/        # 232服务器配置
│   └── 67server/         # 67服务器配置
├── scweb_res/            # 静态资源目录
│   ├── favicon.ico       # 网站图标
│   ├── getCaptcha.jpg    # 验证码图片
│   ├── logo.png          # 网站Logo
│   ├── index/            # index.php专用资源
│   │   ├── index_languages.js  # 首页多语言配置
│   │   ├── index_main.css      # 首页主样式
│   │   └── index_script.js     # 首页JavaScript
│   └── online_server/    # online_server.php专用资源
│       ├── online_server_languages.js  # 服务器页面多语言配置
│       └── online_server_main.css      # 服务器页面主样式
├── .gitmodules           # Git子模块配置
├── README.md             # 项目说明
├── RUN443.BAT            # HTTPS服务器启动脚本
├── RUN80.BAT             # HTTP服务器启动脚本
├── git_push_run.bat      # Git推送运行脚本
├── httpd-scweb.conf      # Apache配置文件（443端口）
├── httpd-scweb80.conf    # Apache配置文件（80端口）
├── index.php             # PHP版首页
├── online_server.php     # PHP版服务器页面
├── ping_server.php       # 服务器状态检查
├── push.py               # 推送相关脚本
├── run8080.bat           # 8080端口服务器启动脚本
├── tcp_server.php        # TCP服务器
└── udp_server.php        # UDP服务器
```

## 🌍 多语言支持

### 支持语言

- **🇨🇳 中文 (zh)**: 默认语言
- **🇺🇸 English (en)**: 英文版本
- **🇷🇺 Русский (ru)**: 俄语版本

### 语言配置

语言配置文件分别位于：
- 首页：`scweb_res/index/index_languages.js`
- 服务器页面：`scweb_res/online_server/online_server_languages.js`

包含以下翻译内容：
- 页面元信息翻译
- 导航菜单翻译
- 搜索功能翻译
- 导航链接翻译
- 站点信息翻译

### 切换语言

- 点击页面右上角的语言按钮
- 自动检测浏览器语言偏好
- 支持保存语言偏好到本地存储

## 📝 主要功能

### 1. 首页 (index.php)
- 网站介绍和最新动态
- 搜索功能（支持多种分类）
- CN中文导航区块
- OS海外导航区块
- 站点信息显示

### 2. 联机服务器 (online_server.php)
- 服务器列表
- 服务器状态显示（在线/离线）
- 服务器信息详情（IP、端口、版本等）

### 3. 搜索功能
支持以下分类的搜索：
- 插件版Mod模组下载
- 联机版Mod模组下载
- 游戏历史全版本下载
- 材质包下载
- 家具包下载
- 皮肤大全下载
- 地图存档下载
- 攻略教程

### 4. 服务器管理模块 (mod_server/)
- 多服务器配置支持（156server、232server、67server）
- 不同端口配置（28880、28881、28882）
- 服务器状态监测和管理

### 5. 网络服务模块
- TCP服务器 (tcp_server.php)
- UDP服务器 (udp_server.php)
- 服务器状态检查 (ping_server.php)

## 🛠️ 技术栈

- **后端**: PHP 7.4+
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **样式**: 自定义CSS + 响应式设计
- **国际化**: 自定义多语言解决方案
- **服务器**: Apache, PHP内置服务器
- **网络协议**: TCP, UDP
- **统计分析**: 百度统计

## 📱 响应式设计

网站支持多种屏幕尺寸：
- 桌面端：≥1024px
- 平板端：768px - 1023px
- 移动端：≤767px

## 🔧 开发指南

### 添加新语言

1. 在相应页面的语言配置文件中添加新的语言配置：
   - 首页：`scweb_res/index/index_languages.js`
   - 服务器页面：`scweb_res/online_server/online_server_languages.js`
2. 更新 `supported` 数组
3. 添加语言显示名称到 `names` 对象
4. 添加相应的翻译内容

### 修改样式

- 首页样式：`scweb_res/index/index_main.css`
- 服务器页面样式：`scweb_res/online_server/online_server_main.css`

### JavaScript功能

- 首页脚本：`scweb_res/index/index_script.js`
- 语言管理器：`LanguageManager` 类
- 搜索管理器：`SearchManager` 类
- 工具函数：`Utils` 对象

## 📊 性能优化

- CSS和JS文件压缩
- 图片优化
- 缓存策略
- 懒加载实现

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情（如果存在）

## 📞 联系方式

- 项目主页：[GitHub Repository]
- 问题反馈：[GitHub Issues]
- 社区交流：[生存战争论坛](http://schub.icu/sczz/)

## 🙏 致谢

感谢所有为生存战争社区做出贡献的开发者和玩家们！

---

*最后更新：2025年12月*