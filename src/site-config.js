/**
 * 站点配置文件
 * 控制 BGM 播放器、看板娘与站点默认主题
 *
 * 这里的值是「出厂默认」：首次启动时后端据此填充数据库 site_settings 表，
 * 之后以数据库里的全局设置为准（登录后可在 ⚙️ 设置里改）。
 * 前端连不上后端时，按本机缓存的上次全局值运行；缓存也没有才回到这里。
 *
 * 修改对应的值即可关闭对应功能：
 *   bgm.enabled    — 是否显示 BGM 播放器（含 FAB 按钮和面板）
 *   bgm.autoPlay   — 是否自动播放（enabled 为 true 时生效）
 *   live2d.enabled — 是否加载看板娘（关闭后不加载任何 Live2D 资源）
 *   defaultTheme   — 站点默认主题：light / dark / wk-light / wk-dark
 */
window.SITE_CONFIG = {
    bgm: {
        enabled:  true,   // BGM 播放器总开关
        autoPlay: false,   // 是否自动播放
    },
    live2d: {
        enabled:  false,   // 看板娘总开关
    },
    defaultTheme: 'wk-light',   // 未个人选过主题的访客使用它
};
