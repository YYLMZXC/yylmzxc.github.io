# 认知指南（COGNITION.md）

> 与 `PROJECT-MEMO.md` 的分工：**备忘录是事实速查表**（密码、端口、命令）；**本文是理解模型**——帮你在大脑里建立这个项目的「地图」，知道每块东西为什么存在、彼此怎么咬合。忘记「为什么这样设计」时看这里。

---

## 一句话心智模型

**一个纯静态网站 + 一个可选的后端进程 + 一堆可插拔的 mod，三者共用同一个静态根目录 `src/`。**

把这个模型记牢，项目里 90% 的设计决定都能推导出来。

## 三个认知锚点

### 锚点一：`src/` 既是源码又是 URL

`src/` 下面的目录结构 = 浏览器里的 URL 结构。`src/yylmzxcweb/yylmzxc.html` 的访问地址就是 `/yylmzxcweb/yylmzxc.html`。

由此推导：
- 「加一个 mod」= 在 `src/` 下建个带 `mod.json` 的目录，静态托管自动生效，不需要注册
- 「有些目录绝不能被下载」（`server/`、`key/`）→ 后端在静态托管**之前**有一道拦截中间件
- 前后端能共享常量（`site-constants.js`）→ 因为它俩本来就在同一棵目录树里

### 锚点二：web / db 双模式，一切数据都有两条来路

站点的每一份数据（导航、设置）都同时存在两个地方：

```
静态文件（出厂值，永远可用）  <->  MySQL（编辑后的值，需要后端）
   scweb_res/nav/nav-default.js        site_nav 表
   site-config.js                      site_settings 表
```

由此推导：
- 前端 `NavStore` / `SettingsStore` 都是「先问后端，问不到退回静态文件 / 本地缓存」——所以 GitHub Pages 上没后端也能跑
- 「同步到静态文件」按钮 = 把 MySQL 的值写回静态文件，让两种模式看到同一份数据
- 后端空库播种 = 静态文件是数据库的种子；删库自愈 = 重新播一次种

### 锚点三：组装根模式——所有依赖在根部汇合

三个「组装根」，同一个思路：

| 组装根 | 干什么 | 注入了什么 |
|---|---|---|
| 前端 `app.js` 的 `SCApp.create()` | 创建各管理器 | 管理器之间的相互引用 |
| 后端 `server.js` | 启动一切 | 把播种器递给 `db.init()`、把路由挂上 app |
| mod 的 `ctx` | mod 后端启动 | 宿主的 `express`、`mysql2`、`log` |

由此推导：
- 业务模块之间**不互相 require**（前端管理器不互相 `new`，后端 `db.js` 不认识业务模块）→ 改一个模块不用怕牵连别人
- 想知道「谁依赖谁」，只看组装根一处就够了

## 一次请求的一生（走读两条主线）

### 主线 A：访客打开首页

```
浏览器 GET /
  -> 后端：拦截中间件（查敏感路径）-> 静态托管返回 index.html
  -> 浏览器按顺序加载脚本 -> site-constants.js（常量）-> app.js 组合根
  -> SCApp.create() 创建 ThemeManager / SettingsStore / NavStore …
  -> NavStore 问 /api/site-nav：通？用库里的；不通？读 nav-default.js
  -> NavRender 渲染分组 -> 页面出现
```

### 主线 B：管理员保存导航

```
浏览器 PUT /api/site-nav（带会话 Cookie）
  -> routes/index.js 请求日志
  -> routes/site-nav.js：sitenav.normalize() 规整脏数据
  -> helpers.requireLogin()：会话无效？401，前端弹「请先登录」
  -> db.saveSiteNav() -> loadJsonRow 家族 -> MySQL site_nav 单行 JSON
  -> 响应 {ok:true}，日志记下操作者
```

## 「我想改 X，去哪个文件」定位表

| 想改什么 | 去哪 |
|---|---|
| 某个 API 的行为 | `src/server/routes/` 对应领域文件 |
| 登录 / 会话 / 密码策略 | `src/server/account.js` |
| 导航数据的合法格式 | `src/server/sitenav.js` + 前端 `nav-store.js` |
| 站点设置的项（加一个开关） | `src/server/settings.js` + 前端 `settings-store.js` / `settings-manager.js` |
| 主题 / 语言 / 页面身份常量 | `src/site-constants.js`（改完 bump HTML 里的 `?v=`） |
| 数据库连接 / 建表 | `src/server/config.json` + `db.js` 的 DDL |
| 报错提示文案 | `src/server/db-diagnosis.js` |
| 首页 / 关于页布局 | `index.html` + `scweb_res/index/`、`about/` |
| BGM 行为 | `scweb_res/shared/js/bgm-player.js` |
| 看板娘 | `src/live2d/autoload.js` |
| mod 的加载开关 | `src/server/config.json` 的 mods 段 |
| 某个 mod 本身 | `src/<mod名>/` 目录，自成一体 |

## 概念词典

| 词 | 意思 |
|---|---|
| **组装根**（composition root） | 程序里唯一一处「把零件拼起来」的地方，依赖都从这注入 |
| **双端契约** | 前后端共用的常量表（`site-constants.js`），`window` 和 `module.exports` 双导出 |
| **单行 JSON 表** | 整份数据序列化成 JSON 存在 id=1 的一行里（`site_nav` / `site_settings`），不拆列 |
| **播种**（seed） | 空库首次启动时用静态文件 / 默认值填初始数据，机制在 `db`，内容在 `bootstrap.js` |
| **自愈** | 运行中库 / 表被删，下次请求自动重建 + 重播，不用重启进程 |
| **mod** | `src/` 下带 `mod.json` 的一级子目录，自带前端（+可选后端）的可插拔扩展 |
| **apiPath** | mod 接口的挂载前缀，默认 `/<mod名>/api` |
| **web 模式 / db 模式** | 数据只读来自静态文件 / 可编辑来自 MySQL |
| **requireLogin / failDb** | 路由两道统一关卡：未登录回 401；数据库报错回结构化诊断 |

## 30 分钟上手导览（新协作者照此走一遍）

1. **跑静态版**（5 分钟）：`cd src && python tools/serve.py 8000`，点开几个页面感受 web 模式
2. **看前端骨架**（10 分钟）：`index.html` 的脚本加载顺序 → `app.js` 组合根 → 随便挑一个管理器读完
3. **跑数据库版**（5 分钟）：启动 MySQL，双击 `src/启动主页(带数据库).bat`，登录后编辑一次导航并「同步到静态文件」
4. **看后端分层**（10 分钟）：`server.js` 只做组装 → 挑 `routes/site-nav.js` 读完整链路 → 扫一眼 `db.js` 的注释
5. 遇到具体问题 → 查 `PROJECT-MEMO.md`；想理解设计原因 → 回本文

---

*维护约定：项目发生结构性改动（新增模块 / 移动文件 / 改约定）时同步更新本文的地图部分；只改实现细节不用动。*
