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
- 支持URL重写的Web服务器（Apache/Nginx）
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
   php -S localhost:8080
   ```
   
   或使用批处理文件：
   ```bash
   run.bat
   ```

3. **访问网站**
   
   打开浏览器访问：`http://localhost:8080/index.php`

## 📁 项目结构

```
scweb/
├── .github/              # GitHub配置
│   └── workflows/        # CI/CD配置
├── error/                # 错误页面
│   ├── 400.html          # 400错误页
│   ├── 403.html          # 403错误页
│   ├── 404.html          # 404错误页
│   └── ...               # 其他错误页
├── scweb_res/            # 静态资源目录
│   ├── languages.js      # 多语言配置文件
│   ├── script.js         # 前端JavaScript
│   ├── styles.css        # 样式文件
│   ├── main.css          # 主样式文件
│   ├── logo.png          # 网站Logo
│   ├── favicon.ico       # 网站图标
│   └── getCaptcha.jpg    # 验证码图片
├── .gitmodules           # Git子模块配置
├── .htaccess             # Apache重写规则
├── index.html            # HTML版首页
├── index.php             # PHP版首页
├── online_server.html    # 服务器列表页面
├── online_server.php     # PHP版服务器页面
├── servers_data.php      # 服务器数据处理
├── nginx.htaccess        # Nginx重写规则
├── run.bat              # Windows启动脚本
└── README.md            # 项目说明
```

## 🌍 多语言支持

### 支持语言

- **🇨🇳 中文 (zh)**: 默认语言
- **🇺🇸 English (en)**: 英文版本
- **🇷🇺 Русский (ru)**: 俄语版本

### 语言配置

语言配置文件位于 `scweb_res/languages.js`，包含：

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
- 服务器状态显示
- 服务器信息详情

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

## 🛠️ 技术栈

- **后端**: PHP 7.4+
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **样式**: 自定义CSS + 响应式设计
- **国际化**: 自定义多语言解决方案
- **统计分析**: 百度统计

## 📱 响应式设计

网站支持多种屏幕尺寸：
- 桌面端：≥1024px
- 平板端：768px - 1023px
- 移动端：≤767px

## 🔧 开发指南

### 添加新语言

1. 在 `languages.js` 中添加新的语言配置
2. 更新 `supported` 数组
3. 添加语言显示名称到 `names` 对象
4. 添加相应的翻译内容

### 修改样式

- 主样式文件：`scweb_res/styles.css`
- 辅助样式：`scweb_res/main.css`

### JavaScript功能

- 主脚本文件：`scweb_res/script.js`
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

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目主页：[GitHub Repository]
- 问题反馈：[GitHub Issues]
- 社区交流：[生存战争论坛](http://schub.icu/sczz/)

## 🙏 致谢

感谢所有为生存战争社区做出贡献的开发者和玩家们！

---

*最后更新：2025年1月*