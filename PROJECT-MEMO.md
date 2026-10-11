# 项目备忘录（记忆辅助用）

> 用途：忘记项目细节时打开这份文件快速回忆。按「我想干什么」找对应小节即可。
> 最后更新：2026-10-11（后端「高内聚低耦合」重构完成后）

---

## 这是什么项目

**生存战争社区网站**（SurvivalCraft 社区）：多语言社区站，纯静态前端 + 可选 Node 后端。

- 线上地址：<https://scnet.top/>
- 镜像：GitHub（YYLMZXC/yylmzxc.github.io）/ Gitee / CNB / SC-GPS，见 `README.md` 顶部
- 无构建、无框架：前端是 `<script>` 顺序加载的原生 JS，各模块挂 `window`

## 怎么跑起来

### 纯静态（web 模式，只读，无数据库）

```bash
cd src
python tools/serve.py 8000     # 推荐（支持 Range / 禁缓存）
# 或 npx live-server --port=8000
```

Windows 双击：`src/scripts/用Python启动开发服务器.bat` / `src/scripts/用Npm启动开发服务器.bat`

### 带数据库（db 模式，导航/设置可编辑，加载 mod）

```bash
cd src/server
npm install
npm start        # 监听 127.0.0.1:8000
```

Windows 双击：`src/scripts/启动主页(带数据库).bat`；主页+导航站一起：`src/scripts/启动双数据库.bat`

### 关键配置（src/server/config.json）

| 项 | 值 |
|---|---|
| HTTP | `127.0.0.1:8000` |
| MySQL | `127.0.0.1:3306`，默认 `root / root`，库名 `scweb` |
| 默认账号 | `admin / admin`（会话 8 小时；改过密码后 config 不再生效） |
| mod 开关 | `mods.enabled` 总开关，`mods.overrides.<名称>` 逐个指定 |- 健康检查：`http://127.0.0.1:8000/api/health`
- mod 状态：`http://127.0.0.1:8000/api/mods`
- 端口被占用：双击仓库根目录 `kill_port_8000.bat`
- **连不上数据库的报错是故意的**：后端会给出完整诊断（哪类毛病 / 哪个环节 / 建议），MySQL 没启动时提示「小皮面板里启动 MySQL」

## 两种数据模式（重要概念）

| | web 模式 | db 模式 |
|---|---|---|
| 触发条件 | 纯静态服务器 / GitHub Pages | `src/server` 后端启动 |
| 导航数据 | `src/scweb_res/nav/nav-default.js`（只读） | MySQL `site_nav` 表（可编辑） |
| 站点设置 | `src/config/site-config.js` 默认值 | MySQL `site_settings` 表 |
| 编辑能力 | 无 | 登录后可视化编辑，可「同步到静态文件」 |

前端逻辑：连不上后端自动退回 web 模式；设置按 localStorage 缓存兜底。

## 后端架构（src/server/，2026-10-11 重构后）

依赖只朝一个方向流动，无循环依赖：

```
server.js（组装根）── 挂路由 / 托管静态 / 加载 mod / 监听
   ├── routes/       接口层：一域一文件
   │     index.js    总装（请求日志 + 子路由挂载）
   │     helpers.js  failDb（数据库报错统一回应）+ requireLogin（写操作 401 门槛）
   │     site-nav.js / site-settings.js / account.js / health.js
   │     / clientinfo.js / mods.js / client-log.js
   ├── bootstrap.js  空库播种：业务默认值递给 db 的「查空 + 写入」机制
   ├── account.js    账号服务：scrypt 哈希 / 会话 / HttpOnly Cookie
   ├── db.js         数据层：连接池 / 建库建表 / 删库自愈 / 单行 JSON 表读写
   │     └─ db-diagnosis.js   错误码翻译与诊断（纯函数）
   ├── sitenav.js    导航数据格式：normalize / upgrade(v1→v2) / 静态文件读写
   ├── settings.js   设置数据格式：normalize / defaults
   ├── logger.js     统一时间戳日志
   ├── http-util.js  clientIp（转发头优先级与 proxy.php 一致）/ normIp
   ├── mods.js       mod 加载器
   └── config.js     config.json 唯一读入口
```

记住三条设计规则：

1. **db.js 不认识任何业务数据格式**。`site_nav` / `site_settings` 是同形单行 JSON 表，db 只提供通用读写（`loadJsonRow` / `saveJsonRow` + 领域薄封装）；规整/升级/默认值全在业务模块。
2. **播种是注入的**：`server.js` 启动时 `db.init(bootstrap.seed)`；删库自愈重建后自动重播，数据回到静态文件那一份。
3. **写操作都要 `requireLogin`**：未登录 401，前端据此弹「请先登录」。

## 前端架构（src/scweb_res/shared/js/）

组合根 `SCApp.create()`（`app.js`）创建并注入各管理器：

- `ThemeManager` 四主题（light / dark / wk-light / wk-dark），localStorage 持久化
- `LanguageManager` 四语言（中/英/俄/西）
- `SettingsStore` 设置数据层：个人覆盖 > 全局值 > site-config.js 默认
- `SettingsManager` ⚙️ 设置下拉界面
- `AccountManager` 账号面板
- `NavStore` / `NavApi` / `NavRender` / `NavPanel` / `NavEditor` 导航全家桶
- `BgmPlayer`（BgmStore/BgmAudio/BgmUI）、Live2D 看板娘（`src/live2d/autoload.js`）

页面脚本（`index_script.js` 等）只管自己页面的渲染。

## 双端契约：site-constants.js（容易忘的坑）

`src/config/site-constants.js` 同时给前端（`window.SITE_CONSTANTS`）和后端（`require`）用：
主题表、导航来源表、页面身份表都在这里。**改了它要同时把各 HTML 里引用它的 `?v=版本号` 往前挪一位**，否则浏览器拿旧副本。

## Mod 机制

- `src/` 下**一级子目录带 `mod.json` 就是一个 mod**（例：`src/yylmzxcweb/` 导航站）
- mod 后端放 `<mod>/server/index.js`，导出 `init(ctx)` / `router(ctx)` / `close(ctx)`
- 宿主把 `express`、`mysql2`、`ctx.log` 递给它 → mod **不需要自带 node_modules**
- 接口挂 `mod.json` 的 `apiPath`（默认 `/<名称>/api`）；导航站的库是 `yylmzxc_nav`
- 单个 mod 失败不拖垮主站

## 常见坑 / 备忘

- **站点信息设置**：页脚「短网址」（如 scnet.top）与「© 年份」在 ⚙️ 设置的「🌐 站点信息」区编辑 —— 只有全局一份（个人模式不可改，需登录），存 `site_settings` 表，改完页脚实时刷新不用重载；出厂默认在 `src/config/site-config.js` 的 `site` 段（前 `site-info.js` 里写死，现已改为按设置渲染）

- **静态托管屏蔽清单**：`server/`（主站与各 mod 的）、`key/`、`*.key`、`*.pem` —— 里面有数据库密码和证书，绝不能被下载
- **域名直连**：默认关。要 Node 自己监听 80/443 时用环境变量 `SCWEB_DOMAIN_HTTP_PORT` / `SCWEB_DOMAIN_HTTPS_PORT` / `SCWEB_TLS_KEY` / `SCWEB_TLS_CERT` / `SCWEB_TLS_CHAIN`，或写 config.json 的 `server.domain` 段
- **删库自愈**：运行中 DROP DATABASE 不用重启后端，下次请求自动重建 + 重播（代价：数据回静态文件那份）
- **前端日志上报**：浏览器 console 可 POST 到 `/api/client-log` 转手打进后端控制台，排查用户问题不用截图
- **后端接口清单**：见 `README.md` 的「🔌 后端接口」表（/api/health、/api/mods、/api/site-nav(±to-static)、/api/site-settings、/api/login、/api/session、/api/logout、/api/account、/api/clientinfo、/api/client-log）
- **BGM**：新专辑放 `src/bgm/专辑名/`，跑 `node src/tools/bgm-scan.mjs` 重新生成清单
- **部署**：GitHub Actions 发 GitHub Pages 时会剔除 `server/`、`key/`（见 `.github/workflows/static.yml`）
