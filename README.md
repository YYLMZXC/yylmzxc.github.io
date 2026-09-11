# 生存战争社区网站

一个多语言的生存战争（SurvivalCraft）社区网站，提供游戏资源下载、联机服务器信息、Mod 开发工具、社区交流等功能。

- 线上地址：<https://sczsw.top/>
- 仓库镜像：[GitHub](https://github.com/YYLMZXC/yylmzxc.github.io) | [Gitee](https://gitee.com/yylmzxc/scweb) | [CNB](https://cnb.cool/SurvivalcraftTool/scweb) | [SC-GPS](https://github.com/SC-Survivalcraft-GPS/SC-Survivalcraft-GPS.github.io)

## 🌟 项目特性

- **多语言支持**: 中文、英文、俄语、西班牙语四种语言界面
- **响应式设计**: 适配桌面和移动设备（3 个断点）
- **主题切换**: 亮色/深色/工坊亮色/工坊暗色，localStorage 持久化
- **BGM 背景音乐**: 多文件夹自动识别、专辑分组、封面旋转、Web Audio API 自动播放
- **Live2D 看板娘**: 本地部署、支持拖动/关闭、移动端适配
- **联机服务器**: 在线服务器列表、延迟检测、多维度筛选
- **信息仪表板**: 展示当前访问 IP、浏览器标识、系统与网络连接信息
- **Mod 开发工具**: Emmet/XML 互转、BlocksData CSV 编辑器、Guid 去重器、模型 Mesh 读取器
- **社区导航**: 国内外 SC 社区链接导航
- **站点设置面板**: ⚙️ 下拉统一管理 BGM / 看板娘 / 默认主题 / 导航来源，支持「个人 / 全局」双模式
- **可插拔 mod**: `src/` 下带 `mod.json` 的目录即为一个 mod，前端随主站静态托管、后端按配置挂进主进程，可随时加载 / 不加载
- **导航数据可编辑**: 登录后可视化增删改导航，并可一键同步到静态文件（`web` 模式数据源）
- **账号系统**: 登录、退出、修改账号密码（会话 Cookie，密码不落浏览器）
- **API 代理**: PHP 代理解决跨域问题，支持 CORS 回退
- **错误页面**: 完整的 HTTP 错误页面（400-510）
- **百度统计**: 网站访问统计和分析

## 🚀 快速开始

### 环境要求

- 现代浏览器（支持 ES6+）
- **Node.js**（可选：扫描 BGM 目录 / 启动后端 / `live-server`）
- **Python 3**（可选：本地开发服务器）
- **MySQL**（可选：仅「带数据库运行」时需要，用于持久化导航与站点设置）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://cnb.cool/SurvivalcraftTool/scweb.git
   cd scweb
   ```

2. **启动开发服务器**

   `src/` 是纯静态站点，任选一种方式即可（在 `src` 目录下执行）：
   ```bash
   cd src
   python -m http.server 8000     # 最简（无 Range 请求 / 无缓存控制）
   python tools/serve.py 8000     # 推荐：自带脚本，支持 Range(HTTP 206) + 禁用缓存 + 多线程
   npx live-server --port=8000    # 自动刷新
   ```

   Windows 下可双击以下脚本一键启动：
   - `src/用Npm启动开发服务器.bat` — `npx live-server`（自动刷新）
   - `src/用Python启动开发服务器.bat` — `python tools/serve.py 8000`
   - `src/扫描BGM目录.bat` — 扫描 BGM 目录生成音乐清单

   > 上面三个是**纯静态**服务：只托管页面，不连数据库、不加载 mod。需要后端能力时见下一节。

3. **访问网站**
   - 首页：`http://localhost:8000`
   - 服务器列表：`http://localhost:8000/online_server.html`
   - 信息仪表板：`http://localhost:8000/dashboard.html`
   - 关于页面：`http://localhost:8000/about.html`
   - Mod 开发工具：`http://localhost:8000/mod-dev-kit.html`
   - 模型 Mesh 读取器：`http://localhost:8000/mesh-reader.html`

### 带数据库运行（站点导航 / 设置可编辑，并加载 mod）

静态服务器打开时是 `web` 模式（只读，导航读 `src/scweb_res/nav/nav-default.js`）。
要让导航与站点设置能在页面上登录、编辑、导入导出，并支持「同步到静态文件」，需要启动 `src/server` 下的后端：

```bash
cd src/server
npm install
npm start        # 监听 127.0.0.1:8000，同时托管 src/ 与 /api/*，并加载已启用的 mod
```

Windows 下也可以直接双击 `src/启动主页(带数据库).bat`（自动装依赖并打开浏览器）；
要同时打开主页与导航站，双击 `src/启动双数据库.bat` 即可 —— 两者启动的是同一个后端进程。

- 服务配置：`src/server/config.json`（HTTP `127.0.0.1:8000`；MySQL `127.0.0.1:3306`，默认 `root / root`，库名 `scweb`）。
- 后端首次启动会自动建库建表，并用 `src/scweb_res/nav/nav-default.js` 填充初始导航数据。
- 默认账号：`admin / admin`（会话有效期 8 小时），登录后请在页面 ⚙️ 设置下拉的「账号」里修改。
- 健康检查：<http://127.0.0.1:8000/api/health>
- 已加载的 mod：<http://127.0.0.1:8000/api/mods>
- 部署到 GitHub Pages 时没有后端，站点会自动以只读的 `web` 模式运行。

## 📁 项目结构

```
scweb/
├── src/                                  # 纯静态站点（可直接部署）
│   ├── index.html                        # 首页
│   ├── online_server.html                # 联机服务器列表
│   ├── dashboard.html                    # 信息仪表板
│   ├── about.html                        # 关于我们
│   ├── mod-dev-kit.html                  # Mod 开发工具包
│   ├── mesh-reader.html                  # 模型 Mesh 读取器
│   ├── site-config.js                    # 站点出厂默认（BGM / 看板娘 / 主题 / 导航来源）
│   ├── proxy.php                         # API 代理（解决跨域，CORS 回退）
│   ├── bgm/                              # 背景音乐（多文件夹）
│   │   ├── bgm-manifest.json             # 自动生成的音乐清单
│   │   └── AlbumName/                    # 每个子目录 = 一张专辑
│   │       ├── cover.jpg                 # 专辑封面
│   │       └── *.mp3                     # 音乐文件
│   ├── live2d/                           # Live2D 看板娘（本地部署）
│   │   ├── autoload.js                   # 入口（配置 + 编排）
│   │   ├── waifu.css / waifu-tips.js     # 核心资源
│   │   └── chunk/                        # 渲染器模块
│   ├── tools/                            # 开发/构建脚本（非页面）
│   │   ├── bgm-scan.mjs                  # BGM 目录扫描器（Node.js）
│   │   └── serve.py                      # 开发服务器（Python，支持 Range）
│   ├── downloads/                        # 下载资源
│   ├── error/                            # HTTP 错误页面（400-510）
│   ├── sczz/                             # 生存战争相关资料
│   ├── scweb_res/                        # 静态资源（按页面 / 共享分组）
│   │   ├── shared/
│   │   │   ├── css/
│   │   │   │   ├── base.css              # 基础样式
│   │   │   │   ├── grid.css              # 网格系统
│   │   │   │   ├── components.css        # 组件样式
│   │   │   │   ├── layout.css            # 布局样式
│   │   │   │   ├── theme.css             # 四主题变量
│   │   │   │   ├── nav-editor.css        # 导航编辑器样式
│   │   │   │   └── bgm-player.css        # BGM 播放器样式（四主题）
│   │   │   └── js/
│   │   │       ├── app.js                # 组合根 SCApp（创建并注入各管理器）
│   │   │       ├── utils.js              # 通用工具 SCUtils（含统一接口基路径）
│   │   │       ├── toast.js              # 轻提示 SCToast
│   │   │       ├── dropdown-manager.js   # 下拉菜单互斥管理器
│   │   │       ├── theme-manager.js      # 主题管理器
│   │   │       ├── language-manager.js   # 语言管理器
│   │   │       ├── site-language-config.js # 站点级语言配置
│   │   │       ├── site-info.js          # 站点信息（标题/描述，依赖语言管理器）
│   │   │       ├── analytics.js          # 百度统计
│   │   │       ├── bgm-player.js         # BGM 播放器（Player/Store/Audio/UI）
│   │   │       ├── settings-store.js     # 站点设置数据层（个人 / 全局）
│   │   │       ├── settings-manager.js   # ⚙️ 设置下拉界面
│   │   │       ├── account-manager.js    # 账号面板（登录 / 退出 / 改密）
│   │   │       ├── nav-api.js            # 导航后端接口封装
│   │   │       ├── nav-store.js          # 导航数据层（web / db 双来源）
│   │   │       ├── nav-render.js         # 导航渲染
│   │   │       ├── nav-panel.js          # 导航数据面板
│   │   │       └── nav-editor.js         # 导航可视化编辑器
│   │   ├── nav/
│   │   │   └── nav-default.js            # 默认导航数据（web 模式数据源，由后端导出）
│   │   ├── index/                        # 首页专用（脚本 / 语言 / 样式）
│   │   ├── about/                        # 关于页专用
│   │   ├── online_server/                # 联机服务器专用（API/缓存/延迟/列表视图/工具）
│   │   ├── dashboard/                    # 信息仪表板专用
│   │   └── tools/
│   │       ├── mesh-reader/              # Mesh 读取器脚本 / 样式
│   │       └── mod-dev-kit/              # Mod 工具包脚本 / 样式
│   ├── yylmzxcweb/                       # mod：YYLMZXC 导航站（自带前端 + 可选后端）
│   │   ├── mod.json                      # mod 清单（名称 / 入口 / 接口前缀 / 默认开关）
│   │   ├── yylmzxc.html                  # 导航站页面
│   │   ├── res/                          # 页面资源（脚本 / 样式 / 出厂数据 / 上传图片）
│   │   └── server/                       # mod 后端（独立运行入口 + 接口 + 数据层）
│   ├── server/                           # 后端：静态托管 + /api/* + MySQL 持久化 + mod 加载
│   │   ├── server.js                     # Express 入口与 /api/* 路由
│   │   ├── mods.js                       # mod 加载器（扫描 mod.json，把 mod 后端挂进本进程）
│   │   ├── db.js                         # MySQL 连接池
│   │   ├── account.js                    # 登录 / 会话 / 改密
│   │   ├── settings.js                   # 站点设置（site_settings 表）
│   │   ├── sitenav.js                    # 站点导航（读写 + 同步到静态文件）
│   │   ├── config.js / config.json       # 服务端口、数据库、账号、mod 开关
│   │   └── package.json
│   ├── 用Npm启动开发服务器.bat             # Windows 一键启动（npx live-server）
│   ├── 用Python启动开发服务器.bat          # Windows 一键启动（serve.py）
│   ├── 启动主页(带数据库).bat               # 启动主页 + 后端（MySQL，并加载 mod）
│   ├── 启动双数据库.bat                    # 同上，并额外打开导航站（库：scweb + yylmzxc_nav）
│   └── 扫描BGM目录.bat                    # BGM 目录扫描脚本
└── README.md
```

## 🏗️ 前端架构

无构建、无框架：`<script>` 按顺序加载，各模块挂到 `window` 上，由组合根 `SCApp.create()` 统一装配并注入依赖。

```
SCApp.create()            ← 组合根：创建并注入各管理器（app.js）
├── DropdownManager       ← 下拉菜单互斥（主题 / 语言 / 设置共用一个开合逻辑）
├── ThemeManager          ← 主题切换（localStorage 持久化）
├── LanguageManager       ← 四语言切换
├── SiteInfoManager       ← 站点信息（依赖 LanguageManager）
├── SettingsStore         ← 站点设置数据层：个人覆盖 > 全局值 > site-config.js 默认
├── SettingsManager       ← ⚙️ 设置下拉（含导航数据面板、账号分区）
├── AccountManager        ← 登录 / 退出 / 改密（会话由 HttpOnly Cookie 承载）
└── NavStore              ← 导航数据：web（静态文件，只读）/ db（数据库，可编辑）
    ├── NavApi            ← 后端接口封装（含统一基路径）
    ├── NavRender         ← 渲染到页面
    ├── NavPanel          ← 面板状态与入口
    └── NavEditor         ← 可视化编辑
```

设计约定：

- **单一数据源**：站点设置只由 `SettingsStore` 负责读写，主题键也复用它定义的常量，避免多处各持一份。
- **依赖注入**：管理器之间不互相 `new`，由组合根创建后传入；跨模块状态通过公开方法（如 `AccountManager.isLoggedIn()`）而非直读内部字段。
- **页面脚本只管渲染**：`index_script.js` / `online_server_script.js` 等只负责自身页面的渲染，共享的设置与导航数据统一向上述管理器索取。
- **离线可用**：连不上后端时，设置按本机缓存的上次全局值运行，导航回退到 `nav-default.js`。

## 🔌 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查（含数据库连通状态） |
| GET | `/api/mods` | 列出 mod 及其加载状态（未启用的也在列表里） |
| GET | `/api/site-nav` | 读取导航数据 |
| PUT | `/api/site-nav` | 保存导航数据（需登录） |
| POST | `/api/site-nav/to-static` | 导出为 `src/scweb_res/nav/nav-default.js`（需登录） |
| GET | `/api/site-settings` | 读取全局站点设置 |
| PUT | `/api/site-settings` | 保存全局站点设置（需登录） |
| POST | `/api/login` | 登录 |
| GET | `/api/session` | 查询当前登录态 |
| POST | `/api/logout` | 退出登录 |
| POST | `/api/account` | 修改账号 / 密码 |

mod 自己的接口挂在 `mod.json` 的 `apiPath` 下，与主站接口共用一个进程。例：导航站（mod `yylmzxcweb`）
的接口全部位于 `/yylmzxcweb/api/*`（`nav` / `health` / `rss` / `upload` / `login` / `session` / `logout` / `account`），
另有 `/yylmzxcweb/api/nav/to-static` 用于把数据库数据导出为静态文件。

## 🧩 Mod 机制

`src/` 下的**每个一级子目录只要带一份 `mod.json`，就是一个 mod**：
它自带前端页面（由主站静态托管自动生效），可选自带后端；加载与否只是配置上的一个开关。

- **加载**：`src/server/config.json` 的 `mods.enabled` 是总开关，`mods.overrides.<名称>` 可逐个指定
  `true / false`；两者都没写时看 `mod.json` 里的 `enabled`。改完重启后端即可。
- **接口**：mod 后端放在 `<mod>/server/index.js`，导出 `init(ctx)` / `router(ctx)` / `close(ctx)`；
  宿主会把 `express`、`mysql2` 与 `ctx.log` 交给它 —— 因此 mod 目录**不需要自带 `node_modules`**，
  整个进程里也只有一个 `express` 实例。接口挂在 `mod.json` 的 `apiPath` 下（默认为 `/<名称>/api`）。
- **独立运行**：mod 自带的 `server/server.js` 仍可单独启动，把该 mod 当作一个独立站点来跑。
- **互不影响**：单个 mod 加载或连库失败只影响它自己（日志与 `/api/mods` 里会写明原因），主站照常运行。
- **安全**：静态托管统一屏蔽各 mod 的 `server/` 目录与 `key/`、`*.key`、`*.pem`，
  避免 `config.json` 里的数据库账号密码被下载。
- **查看状态**：`GET /api/mods`，或看后端启动日志里列出的已加载 mod。

以导航站（mod `yylmzxcweb`）为例：

```
src/server/mods.js 扫描 src/*/mod.json
  └── yylmzxcweb（已启用）
      ├── 前端  /yylmzxcweb/yylmzxc.html     ← src/ 本来就是静态根，目录即访问目录
      └── 后端  /yylmzxcweb/api/*            ← require 该 mod 的 server/index.js 后挂载
                数据落库 yylmzxc_nav（见 yylmzxcweb/server/config.json）
```

于是一个后端进程同时连 `scweb` 与 `yylmzxc_nav` 两个库：主页与导航站共用一个端口。

## 🎵 背景音乐系统

**Windows 用户：** 双击 `src/扫描BGM目录.bat` 一键扫描。

```
BgmPlayer（编排层）
├── BgmStore   — 持久化（localStorage）
├── BgmAudio   — 音频引擎（Web Audio API 自动播放解锁）
└── BgmUI      — 界面渲染（封面/进度/播放列表）
```

**添加新音乐：**
```bash
# 1. 把音乐文件放进 src/bgm/新专辑名/
# 2. 运行扫描脚本
node src/tools/bgm-scan.mjs
```

## 🤖 Live2D 看板娘

```
Live2DInit（编排层）
├── Live2DConfig — 配置中心（路径/模型/功能开关）
└── Live2DLoader — 资源加载器（CSS/JS/Image CORS）
```

- 开关：优先读本机个人偏好，其次读数据库全局设置，最后回退到 `src/site-config.js` 的 `live2d.enabled`。
- 定制：修改 `src/live2d/autoload.js` 中的 `Live2DConfig` 即可。

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)，零框架、零构建依赖
- **架构**: 组合根 + 依赖注入 + 面向对象模块化，高内聚低耦合
- **样式**: CSS 变量 + 响应式网格系统（3 断点）
- **国际化**: 自研 i18n 方案，四语言切换
- **主题**: 四种主题（亮色/深色/工坊亮色/工坊暗色）
- **音频**: Web Audio API 自动播放解锁
- **3D**: Live2D Cubism SDK（Cubism 2 + 5）
- **代码编辑**: CodeMirror 5（Mod 开发工具）
- **后端**: Node.js + Express + MySQL（mysql2，可选，用于导航/设置持久化）+ 可插拔 mod 加载器
- **部署**: GitHub Pages 自动部署（GitHub Actions）

## 📄 页面说明

| 页面 | 文件 | 功能 |
|------|------|------|
| 首页 | `index.html` | 社区导航、BGM、Live2D |
| 联机服务器 | `online_server.html` | 服务器列表、筛选、延迟检测 |
| 信息仪表板 | `dashboard.html` | IP、浏览器、系统与存储信息 |
| 关于我们 | `about.html` | 社区介绍、收藏导航 |
| Mod 开发工具 | `mod-dev-kit.html` | Emmet/XML 互转、BlocksData 编辑、Guid 去重 |
| 模型 Mesh 读取器 | `mesh-reader.html` | 上传 DAE 文件读取模型 Mesh 名称 |
| 导航站（mod） | `yylmzxcweb/yylmzxc.html` | 书签导航、RSS 订阅、可视化编辑与账号体系 |
| 错误页 | `error/*.html` | HTTP 错误页（400-510） |

## 🙏 致谢

- [Live2D Widget](https://github.com/stevenjoezhang/live2d-widget) — 看板娘组件
- [live2d_api](https://github.com/fghrsh/live2d_api) — 模型资源
- [CodeMirror](https://codemirror.net/) — 代码编辑器（Mod 开发工具）
- 感谢所有为生存战争社区做出贡献的开发者和玩家们！

---

*最后更新：2026年9月11日*
