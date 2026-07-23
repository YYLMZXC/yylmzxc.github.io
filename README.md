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

- 现代浏览器（支持ES6+）
- 可选：Apache或Nginx Web服务器（用于生产环境）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd scweb
   ```

2. **启动开发服务器**
   
   使用Python内置HTTP服务器：
   ```bash
   cd src
   python -m http.server 8000
   ```
   
   或直接使用浏览器打开：
   ```bash
   # 直接在浏览器中打开 src/index.html
   start src/index.html
   ```

3. **访问网站**
   
   打开浏览器访问：
   - 开发服务器：`http://localhost:8000`
   - 首页：`index.html`
   - 服务器页面：`online_server.html`

## 📁 项目结构

```
scweb/
├── src/                              # 源代码目录
│   ├── index.html                    # 首页（中文/海外导航区块）
│   ├── online_server.html            # 联机服务器列表页面
│   ├── scweb_res/                    # 静态资源根目录
│   │   ├── favicon.ico               # 网站图标
│   │   ├── logo.png                  # 网站 Logo
│   │   ├── shared/                   # 【共享资源】所有页面共用
│   │   │   ├── css/
│   │   │   │   ├── base.css          # 基础样式（CSS 变量、重置、排版）
│   │   │   │   ├── grid.css          # 响应式网格系统（12 列，3 个断点）
│   │   │   │   ├── components.css    # UI 组件（按钮、选择器、Toast 等）
│   │   │   │   ├── theme.css         # 深色主题样式覆盖
│   │   │   │   └── layout.css        # 共享布局（Header/Nav/Footer）
│   │   │   └── js/
│   │   │       ├── utils.js          # 工具函数（复制、防抖、网络类型等）
│   │   │       ├── theme-manager.js  # 主题管理器（亮色/深色/跟随系统）
│   │   │       ├── language-manager.js # 语言管理器（i18n、URL 路径翻译）
│   │   │       ├── site-info.js      # 站点信息管理器（地址、短网址）
│   │   │       ├── site-language-config.js # 站点级通用翻译
│   │   │       └── app.js            # 应用入口类（统一初始化）
│   │   ├── index/                    # 【首页】页面专用资源
│   │   │   ├── index_main.css        # 首页主样式
│   │   │   ├── index_languages.js    # 首页多语言配置
│   │   │   └── index_script.js       # 首页脚本（IndexPageManager）
│   │   └── online_server/            # 【联机服务器】页面专用资源
│   │       ├── online_server_main.css # 服务器页面主样式
│   │       ├── online_server_languages.js # 服务器页面多语言配置
│   │       └── online_server_script.js # 服务器列表脚本（OnlineServerManager）
│   └── error/                        # HTTP 错误页面（400-510）
├── old/                              # 旧版本文件备份（PHP 版等）
├── README.md                         # 项目说明
└── ...                               # 其他配置文件
```

## 🌌 主题管理

网站支持三种主题模式：

- **亮色主题**：默认浅色界面
- **深色主题**：适合夜间使用
- **跟随系统**：自动检测系统 `prefers-color-scheme` 偏好

主题状态通过 `localStorage` 持久化（键名 `preferredTheme`），所有组件均通过 CSS 变量和 `body.dark` 类切换实现无闪烁过渡。

## 🌐 多语言支持

### 支持语言

- **🇨🇳 中文 (zh)**: 默认语言
- **🇺🇸 English (en)**: 英文版本
- **🇷🇺 Русский (ru)**: 俄语版本

### 语言切换逻辑

优先级顺序：**URL 参数 → localStorage 偏好 → 浏览器语言检测 → 默认语言**

翻译配置采用两层结构：
- **站点级** (`site-language-config.js`)：通用元信息、导航、站点信息
- **页面级** (`index_languages.js` / `online_server_languages.js`)：页面特定内容
- 页面加载时通过 `deepMerge` 合并两层配置

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **架构**: 面向对象模块化，共享资源 + 页面资源分离
- **样式**: CSS 变量 + 响应式网格系统 (12 列 / 3 断点)
- **国际化**: 自研 i18n 方案，支持路径翻译和 `data-i18n` 属性
- **主题**: CSS 变量 + `prefers-color-scheme` 媒体查询
- **服务器**: Python 内置 HTTP 服务器（开发）、Apache/Nginx（生产）

## 📱 响应式设计

网站支持多种屏幕尺寸：
- 桌面端：≥1024px
- 平板端：768px - 1023px
- 移动端：≤767px

## 🔧 开发指南

### 添加新语言

1. 在站点级配置文件 `src/scweb_res/shared/js/site-language-config.js` 添加通用翻译
2. 在相应页面的语言配置文件中添加页面特定翻译：
   - 首页：`src/scweb_res/index/index_languages.js`
   - 服务器页面：`src/scweb_res/online_server/online_server_languages.js`
3. 更新 `supported` 数组添加语言代码
4. 在 `names` 对象中添加语言显示名称
5. 在 `translations` 中添加对应语言的完整翻译内容

### 添加新页面

1. 创建 HTML 文件（如 `new_page.html`），参考 `index.html` 的结构
2. 创建页面专用目录 `src/scweb_res/new_page/`
3. 添加页面专用 CSS 和 JS 文件
4. 在 HTML 中引入 `shared/` 下的共享资源
5. 创建页面专用语言配置文件并与 `SiteLanguageConfig` 合并

### 修改样式

- 共享样式：`src/scweb_res/shared/css/` 下的各 CSS 文件
- 页面样式：`src/scweb_res/index/index_main.css` 或 `online_server_main.css`

### JavaScript 功能模块

项目采用面向对象的模块化架构，主要类/对象：

| 模块 | 文件路径 | 说明 |
|------|---------|------|
| `ThemeManager` | `shared/js/theme-manager.js` | 主题切换（亮色/深色/跟随系统），localStorage 持久化 |
| `LanguageManager` | `shared/js/language-manager.js` | 多语言管理，支持 URL 路径翻译、`data-i18n` 属性 |
| `SiteInfoManager` | `shared/js/site-info.js` | 站点地址和短网址显示，响应语言切换 |
| `SCUtils` | `shared/js/utils.js` | 工具函数（复制、防抖、节流、网络类型、IP 解析等） |
| `SCApp` | `shared/js/app.js` | 应用入口，统一初始化各管理器 |
| `IndexPageManager` | `index/index_script.js` | 首页逻辑，导航区块渲染、语言配置合并 |
| `OnlineServerManager` | `online_server/online_server_script.js` | 服务器列表，API 获取、缓存、筛选、延迟检测 |

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

*最后更新：2026年7月*