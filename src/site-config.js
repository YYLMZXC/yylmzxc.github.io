/**
 * 站点配置文件
 * 控制 BGM 播放器和看板娘的启用/禁用
 *
 * 修改对应的值为 false 即可关闭对应功能：
 *   bgm.enabled    — 是否显示 BGM 播放器（含 FAB 按钮和面板）
 *   bgm.autoPlay   — 是否自动播放（enabled 为 true 时生效）
 *   live2d.enabled — 是否加载看板娘（关闭后不加载任何 Live2D 资源）
 */
window.SITE_CONFIG = {
    bgm: {
        enabled:  true,   // BGM 播放器总开关
        autoPlay: false,   // 是否自动播放
    },
    live2d: {
        enabled:  false,   // 看板娘总开关
    },
};
