# 生存战争社区网站

一个多语言的生存战争（SurvivalCraft）社区网站，提供游戏资源下载、联机服务器信息、社区交流等功能。

- 线上地址：<https://scwz.top/>
- 仓库镜像：[GitHub](https://github.com/YYLMZXC/yylmzxc.github.io) | [Gitee](https://gitee.com/yylmzxc/scweb) | [CNB](https://cnb.cool/SurvivalcraftTool/scweb)

## 🌟 项目特性

- **多语言支持**: 中文、英文、俄语三种语言界面
- **响应式设计**: 适配桌面和移动设备（3 个断点）
- **主题切换**: 亮色/深色/跟随系统，localStorage 持久化
- **联机服务器**: 在线服务器列表、延迟检测、多维度筛选
- **社区导航**: 国内外 SC 社区链接导航
- **API 代理**: PHP 代理解决跨域问题，支持 CORS 回退
- **错误页面**: 完整的 HTTP 错误页面（400-510）
- **百度统计**: 网站访问统计和分析

## 🚀 快速开始

### 环境要求

- 现代浏览器（支持 ES6+）
- 可选：Python 3（开发服务器）或 Apache/Nginx + PHP（生产环境）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://cnb.cool/SurvivalcraftTool/scweb.git
   cd scweb
   ```

2. **启动开发服务器**

   使用 Python 内置 HTTP 服务器：
   ```bash
   cd src
   python -m http.server 8000
   ```

   Windows 下也可双击 `src/run.bat` 一键启动。

   或直接使用浏览器打开：
   ```bash
   start src/index.html
   ```

3. **访问网站**

   打开浏览器访问：
   - 首页：`http://localhost:8000`
   - 服务器列表：`http://localhost:8000/online_server.html`
   - 关于页面：`http://localhost:8000/about.html`

## 📁 项目结构

```
scweb/
├── src/                              # 源代码目录
│   ├── index.html                    # 首页（中文/海外导航区块）
│   ├── online_server.html            # 联机服务器列表页面
│   ├── about.html                    # 关于我们页面
│   ├── proxy.php                     # API 代理脚本（CORS 解决方案）
│   ├── run.bat                       # Windows 一键启动脚本
│   ├── downloads/                    # 下载说明文件
│   │   └── downloads.txt             # 资源下载分类说明
│   ├── error/                        # HTTP 错误页面（15 个）
│   │   ├── index.html                # 错误页索引
│   │   └── 400.html ~ 510.html       # 各状态码错误页面
│   ├── sczz/                         # SCZZ 社区模块
│   │   └── README.md                 # SCZZ 模块说明
│   ├── scweb_res/                    # 静态资源根目录
│   │   ├── favicon.ico               # 网站图标
│   │   ├── logo.png                  # 网站 Logo
│   │   ├── getCaptcha.jpg            # 验证码图片
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
│   │   │       └── app.js            # 组合根（统一创建共享管理器并注入页面）
│   │   ├── index/                    # 【首页】页面专用资源
│   │   │   ├── index_main.css        # 首页主样式
│   │   │   ├── index_languages.js    # 首页多语言配置
│   │   │   └── index_script.js       # 首页脚本（IndexPageManager）
│   │   ├── online_server/            # 【联机服务器】页面专用资源
│   │   │   ├── online_server_main.css # 服务器页面主样式
│   │   │   ├── online_server_languages.js # 服务器页面多语言配置
│   │   │   ├── server-api-client.js   # 网络层（代理回退/超时重试/数据提取）
│   │   │   ├── server-cache.js        # 数据层（localStorage 缓存）
│   │   │   ├── server-latency-checker.js # 延迟检测（状态指示灯）
│   │   │   ├── server-list-view.js    # 视图层（列表渲染与交互）
│   │   │   └── online_server_script.js # 门面/协调者（OnlineServerManager）
│   │   └── about/                    # 【关于页面】页面专用资源
├── old/                              # 旧版本文件备份（PHP 版项目）
├── push.py                           # 一键推送脚本（Gitee + GitHub + CNB）
├── git_push_run.bat                  # Windows 推送批处理
├── kill_port_8000.bat                # 结束 8000 端口进程脚本
├── address.md                        # 仓库地址列表
└── README.md                         # 项目说明
```

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)，零框架依赖
- **架构**: 面向对象模块化，共享资源 + 页面资源分离
- **样式**: CSS 变量 + 响应式网格系统（12 列 / 3 断点）
- **国际化**: 自研 i18n 方案，支持路径翻译和 `data-i18n` 属性
- **主题**: CSS 变量 + `prefers-color-scheme` 媒体查询
- **后端代理**: PHP（proxy.php，解决跨域问题，支持 cURL / file_get_contents 双方案）
- **开发服务器**: Python http.server / 任何静态文件服务器
- **生产部署**: Apache / Nginx + PHP

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
- 页面加载时通过 `SCUtils.mergeConfigs` 深度合并两层配置

## 📱 响应式设计

| 断点 | 屏幕宽度 | 设备类型 |
|------|---------|---------|
| 桌面端 | ≥1024px | PC / 笔记本 |
| 平板端 | 768px - 1023px | iPad / 平板 |
| 移动端 | ≤767px | 手机 |

## 🔌 API 代理 (proxy.php)

`proxy.php` 作为 CORS 代理，将前端请求转发到远程 API 服务器，解决浏览器跨域限制。

**支持的接口：**

| Action | 端点 | 说明 |
|--------|------|------|
| `serverlist` | `api.sckey.net/server/serverlist` | 获取联机服务器列表 |
| `ping` | `api.sckey.net/server/ping` | 检测服务器延迟 |

**部署要求：** 需放置在支持 PHP 的 Web 服务器上（与 `online_server.html` 同级目录）。

## 📄 页面说明

| 页面 | 文件 | 功能 |
|------|------|------|
| 首页 | `index.html` | 中文/海外社区导航、主题切换、多语言 |
| 联机服务器 | `online_server.html` | 服务器列表、筛选、延迟检测、收藏 |
| 关于我们 | `about.html` | 网站和社区介绍 |
| 错误页 | `error/*.html` | 15 个 HTTP 状态码错误页（400-510） |

## 🔧 开发指南

### 添加新语言

1. 在站点级配置文件 `src/scweb_res/shared/js/site-language-config.js` 添加通用翻译
2. 在相应页面的语言配置文件中添加页面特定翻译
3. 更新 `supported` 数组添加语言代码
4. 在 `names` 对象中添加语言显示名称
5. 在 `translations` 中添加对应语言的完整翻译内容

### 添加新页面

1. 创建 HTML 文件（参考 `index.html` 的结构）
2. 在 `src/scweb_res/` 下创建页面专用资源目录
3. 添加页面专用 CSS 和 JS 文件
4. 在 HTML 中引入 `shared/` 下的共享资源
5. 创建页面专用语言配置文件并与 `SiteLanguageConfig` 合并

### JavaScript 功能模块

项目采用面向对象的模块化架构，遵循**高内聚、低耦合**原则：
共享管理器由组合根 `App` 统一创建，页面管理器通过**构造注入**获取依赖，
联机服务器页按职责拆分为网络层 / 数据层 / 视图层 / 延迟检测四个子系统。

| 模块 | 文件路径 | 说明 |
|------|---------|------|
| `ThemeManager` | `shared/js/theme-manager.js` | 主题切换（亮色/深色/跟随系统），localStorage 持久化 |
| `LanguageManager` | `shared/js/language-manager.js` | 多语言管理，支持 URL 路径翻译、`data-i18n` 属性 |
| `SiteInfoManager` | `shared/js/site-info.js` | 站点地址和短网址显示，响应语言切换 |
| `SCUtils` | `shared/js/utils.js` | 工具函数（复制、防抖、节流、网络类型、IP 解析、配置合并等） |
| `SCApp` | `shared/js/app.js` | 组合根，统一创建共享管理器并通过 `create()` 注入页面 |
| `IndexPageManager` | `index/index_script.js` | 首页逻辑，导航区块渲染、语言切换响应 |
| `AboutPageManager` | `about/about_script.js` | 关于页逻辑，导航渲染、事件绑定 |
| `OnlineServerManager` | `online_server/online_server_script.js` | 服务器页门面，编排各子系统 |
| `ServerApiClient` | `online_server/server-api-client.js` | 网络层：代理回退、超时重试、响应数据提取 |
| `ServerCache` | `online_server/server-cache.js` | 数据层：localStorage 缓存读写与过期管理 |
| `ServerListView` | `online_server/server-list-view.js` | 视图层：列表渲染、统计展示、复制/筛选/IP 切换交互 |
| `ServerLatencyChecker` | `online_server/server-latency-checker.js` | 延迟检测：批量检测、状态指示灯更新 |

### 部署与推送

项目根目录提供了便捷的工具脚本：

- `push.py` — 一键提交并推送到 Gitee、GitHub、CNB 三个远程仓库
- `git_push_run.bat` — Windows 下推送批处理
- `kill_port_8000.bat` — 结束 8000 端口进程（开发服务器）
- `src/run.bat` — 启动 Python 开发服务器

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 📞 联系方式

- 项目仓库：[CNB](https://cnb.cool/SurvivalcraftTool/scweb) | [GitHub](https://github.com/YYLMZXC/yylmzxc.github.io) | [Gitee](https://gitee.com/yylmzxc/scweb)
- 社区论坛：[生存战争论坛](http://schub.icu/sczz/)
- 线上地址：<https://scwz.top/>

## 🙏 致谢

感谢所有为生存战争社区做出贡献的开发者和玩家们！

---

*最后更新：2026年8月*