# mod 目录

这里集中存放站点的可插拔模块（mod）。**本目录下的每个一级子目录只要带一份 `mod.json`，就是一个 mod**。

## mod.json 字段

| 字段 | 说明 | 默认值 |
| --- | --- | --- |
| `name` | mod 名，以目录名为准（同时是 URL 的一部分） | 目录名 |
| `title` / `description` / `version` | 展示信息 | 目录名 / 空 / 空 |
| `entry` | 前端入口页面 | `index.html` |
| `apiPath` | 后端接口挂载前缀 | `/mod/<目录名>/api` |
| `server` | 后端入口；写 `false` 表示纯前端 mod | `server/index.js` |
| `enabled` | 该 mod 自己的默认开关 | `true` |

## URL 约定

- 页面：`/mod/<目录名>/<entry>`（由主站静态托管自动生效）
- 接口：`/mod/<目录名>/api/*`（由主站进程挂载）
- `server/` 子目录会被静态托管整目录屏蔽（内含数据库账号密码），绝不对外下载

## 是否加载

由三处决定，就近覆盖（见 `src/server/mods.js`）：

1. 主站 `config.json` 的 `mods.enabled`（总开关）
2. 主站 `config.json` 的 `mods.overrides.<名称>`
3. mod 自己的 `mod.json` 的 `enabled`

## 目录结构示例

```
mod/
  yylmzxcweb/          一个 mod
    mod.json           清单（必需）
    yylmzxc.html       前端入口
    res/               前端资源
    server/            后端（index.js 为 mod 入口；server.js 可独立运行）
```
