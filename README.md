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
- **API 代理**: PHP 代理解决跨域问题，支持 CORS 回退
- **错误页面**: 完整的 HTTP 错误页面（400-510）
- **百度统计**: 网站访问统计和分析

## 🚀 快速开始

### 环境要求

- 现代浏览器（支持 ES6+）
- Node.js（可选，用于扫描 BGM 目录）
- 可选：Python 3（开发服务器）或 Apache/Nginx + PHP（生产环境）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://cnb.cool/SurvivalcraftTool/scweb.git
   cd scweb
   ```

2. **启动开发服务器**
   ```bash
   cd src
   python -m http.server 8000
   ```
   也可使用内置开发服务器：
   ```bash
   cd src
   python tools/serve.py        # Python（支持热重载 + 端口冲突自动释放）
   npm run dev                  # Node.js（需 package.json）
   ```
   Windows 下可双击以下脚本一键启动：
   - `src/用Npm启动开发服务器.bat` — NPM 启动
   - `src/用Python启动开发服务器.bat` — Python 启动
   - `src/扫描BGM目录.bat` — 扫描 BGM 目录生成音乐清单

3. **访问网站**
   - 首页：`http://localhost:8000`
   - 服务器列表：`http://localhost:8000/online_server.html`
   - 信息仪表板：`http://localhost:8000/dashboard.html`
   - 关于页面：`http://localhost:8000/about.html`
   - Mod 开发工具：`http://localhost:8000/tools/mod-dev-kit.html`
   - 模型 Mesh 读取器：`http://localhost:8000/tools/mesh-reader.html`

## 📁 项目结构

```
scweb/
├── src/
│   ├── index.html                        # 首页
│   ├── online_server.html                # 联机服务器列表
│   ├── dashboard.html                    # 信息仪表板
│   ├── about.html                        # 关于我们
│   ├── proxy.php                         # API 代理
│   ├── site-config.js                    # 站点功能配置（BGM/看板娘开关）
│   ├── bgm/                              # 背景音乐（多文件夹）
│   │   ├── bgm-manifest.json             # 自动生成的音乐清单
│   │   └── AlbumName/                    # 每个子目录 = 一张专辑
│   │       ├── cover.jpg                 # 专辑封面
│   │       └── *.mp3                     # 音乐文件
│   ├── live2d/                           # Live2D 看板娘（本地部署）
│   │   ├── autoload.js                   # 入口（配置 + 编排）
│   │   ├── waifu.css / waifu-tips.js     # 核心资源
│   │   └── chunk/                        # 渲染器模块
│   ├── tools/                            # 页面与工具
│   │   ├── mod-dev-kit.html              # Mod 开发工具包
│   │   ├── mesh-reader.html              # 模型 Mesh 读取器
│   │   ├── bgm-scan.mjs                  # BGM 目录扫描器（Node.js）
│   │   └── serve.py                      # 开发服务器（Python）
│   ├── downloads/                        # 下载资源
│   ├── error/                            # HTTP 错误页面（400-510）
│   ├── sczz/                             # 生存战争相关资料
│   ├── scweb_res/                        # 静态资源
│   │   ├── shared/
│   │   │   ├── css/
│   │   │   │   ├── base.css              # 基础样式
│   │   │   │   ├── grid.css              # 网格系统
│   │   │   │   ├── components.css        # 组件样式
│   │   │   │   ├── theme.css             # 四主题变量
│   │   │   │   ├── layout.css            # 布局样式
│   │   │   │   └── bgm-player.css        # BGM 播放器样式（四主题）
│   │   │   └── js/
│   │   │       ├── app.js                # 应用入口
│   │   │       ├── utils.js              # 工具函数
│   │   │       ├── dropdown-manager.js   # 下拉菜单管理器
│   │   │       ├── theme-manager.js      # 主题管理器
│   │   │       ├── language-manager.js   # 语言管理器
│   │   │       ├── site-language-config.js # 语言配置
│   │   │       ├── site-info.js          # 站点信息模块
│   │   │       ├── analytics.js          # 百度统计
│   │   │       └── bgm-player.js         # BGM 播放器（Store/Audio/UI/Player）
│   │   ├── index/                        # 首页专用资源
│   │   ├── online_server/                # 联机服务器专用资源
│   │   │   ├── server-api-client.js      # 服务器 API 客户端
│   │   │   ├── server-cache.js           # 服务器缓存
│   │   │   ├── server-latency-checker.js # 延迟检测
│   │   │   ├── server-list-view.js       # 服务器列表视图
│   │   │   └── server-utils.js           # 服务器工具函数
│   │   ├── dashboard/                    # 信息仪表板专用资源
│   │   ├── about/                        # 关于页面专用资源
│   │   └── tools/                        # 工具页面资源
│   │       ├── mesh-reader/              # Mesh 读取器样式/脚本
│   │       └── mod-dev-kit/              # Mod 工具包样式/脚本
│   └── 用Npm启动开发服务器.bat             # Windows 一键启动脚本
│   ├── 用Python启动开发服务器.bat          # Windows 一键启动脚本
│   └── 扫描BGM目录.bat                    # BGM 目录扫描脚本
└── README.md
```

## ⚙️ 站点配置

编辑 `src/site-config.js` 控制功能开关，修改后刷新页面即可生效：

```js
window.SITE_CONFIG = {
    bgm: {
        enabled:  true,   // BGM 播放器总开关（false 隐藏播放器）
        autoPlay: true,   // 是否自动播放（false 需手动点击播放）
    },
    live2d: {
        enabled:  true,   // 看板娘总开关（false 不加载任何 Live2D 资源）
    },
};
```

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
node tools/bgm-scan.mjs
```

## 🤖 Live2D 看板娘

```
Live2DInit（编排层）
├── Live2DConfig — 配置中心（路径/模型/功能开关）
└── Live2DLoader — 资源加载器（CSS/JS/Image CORS）
```

修改 `src/live2d/autoload.js` 中的 `Live2DConfig` 即可定制。

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)，零框架依赖
- **架构**: 面向对象模块化，高内聚低耦合
- **样式**: CSS 变量 + 响应式网格系统（3 断点）
- **国际化**: 自研 i18n 方案，四语言切换
- **主题**: 四种主题（亮色/深色/工坊亮色/工坊暗色）
- **音频**: Web Audio API 自动播放解锁
- **3D**: Live2D Cubism SDK（Cubism 2 + 5）
- **代码编辑**: CodeMirror 5（Mod 开发工具）
- **配置**: 集中配置文件（`site-config.js`），一键开关功能模块
- **部署**: GitHub Pages 自动部署（GitHub Actions）

## 📄 页面说明

| 页面 | 文件 | 功能 |
|------|------|------|
| 首页 | `index.html` | 社区导航、BGM、Live2D |
| 联机服务器 | `online_server.html` | 服务器列表、筛选、延迟检测 |
| 信息仪表板 | `dashboard.html` | IP、浏览器、系统信息 |
| 关于我们 | `about.html` | 社区介绍、收藏导航 |
| Mod 开发工具 | `tools/mod-dev-kit.html` | Emmet/XML 互转、BlocksData 编辑、Guid 去重 |
| 模型 Mesh 读取器 | `tools/mesh-reader.html` | 上传 DAE 文件读取模型 Mesh 名称 |
| 错误页 | `error/*.html` | HTTP 错误页（400-510） |

## 🙏 致谢

- [Live2D Widget](https://github.com/stevenjoezhang/live2d-widget) — 看板娘组件
- [live2d_api](https://github.com/fghrsh/live2d_api) — 模型资源
- [CodeMirror](https://codemirror.net/) — 代码编辑器（Mod 开发工具）
- 感谢所有为生存战争社区做出贡献的开发者和玩家们！

---

*最后更新：2026年8月27日*
