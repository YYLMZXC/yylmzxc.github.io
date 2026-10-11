/**
 * 站点配置文件
 * 控制 BGM 播放器、看板娘、站点默认主题与导航数据来源
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
 *   displayMode    — 界面显示模式：'full'（完整，默认）/ 'concise'（简洁，隐藏 BGM 播放器与看板娘）
 *   conciseLock    — 简洁模式锁定：true（默认，简洁模式下 BGM / 看板娘开关不可用）/ false（不锁定）
 *   nav.mode       — 导航数据来源：'web'（静态文件，默认）/ 'db'（数据库）
 *   site.shortUrl      — 页脚「短网址」显示的地址
 *   site.copyrightYear — 页脚版权「© 年份」显示的年份
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
    displayMode: 'full',   // 界面显示模式：full（完整，含 BGM 播放器 / 看板娘）/ concise（简洁，隐藏装饰浮层）
    conciseLock: true,   // 简洁模式锁定：开启时简洁模式下「BGM / 看板娘」开关不可用，切回完整模式才能开启
    nav: {
        mode: 'web',   // 未个人选过来源的访客读它：静态文件不用后端也能显示，故为默认
    },
    site: {
        shortUrl: 'scnet.top',   // 页脚「短网址」显示的地址（可只写域名，也可写完整 URL）
        copyrightYear: '2026',   // 页脚版权「© 年份」显示的年份
    },
};
