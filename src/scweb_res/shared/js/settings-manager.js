/**
 * 生存战争网 - 设置管理器
 * 提供用户级别的功能开关（BGM / Live2D），通过 localStorage 持久化
 * 优先级：localStorage 用户偏好 > site-config.js 站点默认
 * 挂载到全局 window.SettingsManager
 */
class SettingsManager {
    constructor(dropdownManager) {
        this._dropdownManager = dropdownManager || null;

        // localStorage 键名
        this._KEYS = {
            bgmEnabled:  'settings_bgm_enabled',
            bgmAutoPlay: 'settings_bgm_autoplay',
            live2dEnabled: 'settings_live2d_enabled',
        };

        // 站点默认值（从 site-config.js 读取）
        var cfg = (window.SITE_CONFIG) || {};
        var bgmCfg = cfg.bgm || {};
        var live2dCfg = cfg.live2d || {};

        this._defaults = {
            bgmEnabled:    bgmCfg.enabled !== false,
            bgmAutoPlay:   bgmCfg.autoPlay !== false,
            live2dEnabled: live2dCfg.enabled !== false,
        };

        this.init();
    }

    /* ================================================================
     *  读取 / 写入偏好
     * ================================================================ */

    /**
     * 读取某项偏好：localStorage > 站点默认
     * @param {string} key  _KEYS 中的键名
     * @returns {boolean}
     */
    _get(key) {
        try {
            var val = localStorage.getItem(this._KEYS[key]);
            if (val === null) return this._defaults[key];
            return val === 'true';
        } catch (_) {
            return this._defaults[key];
        }
    }

    /**
     * 保存偏好并刷新页面（BGM / Live2D 在初始化时读取，需刷新生效）
     * @param {string} key   _KEYS 中的键名
     * @param {boolean} value
     */
    _set(key, value) {
        try {
            localStorage.setItem(this._KEYS[key], String(value));
        } catch (_) {}
        // 刷新页面使 BGM / Live2D 重新读取配置
        location.reload();
    }

    /** 对外 API —— 供 bgm-player.js / autoload.js 在初始化时查询 */
    getBgmEnabled()    { return this._get('bgmEnabled'); }
    getBgmAutoPlay()   { return this._get('bgmAutoPlay'); }
    getLive2dEnabled() { return this._get('live2dEnabled'); }

    /* ================================================================
     *  UI 构建
     * ================================================================ */

    init() {
        this._createDropdown();
        this._bindEvents();
        console.log('[SettingsManager] 初始化完成', {
            bgmEnabled:    this.getBgmEnabled(),
            bgmAutoPlay:   this.getBgmAutoPlay(),
            live2dEnabled: this.getLive2dEnabled(),
        });
    }

    _createDropdown() {
        var section = document.createElement('div');
        section.className = 'dropdown-section';

        section.innerHTML =
            '<div class="dropdown" id="settingsDropdown">' +
                '<button class="dropdown-toggle" id="settingsToggle">⚙️ <span class="arrow">▼</span></button>' +
                '<div class="dropdown-menu settings-dropdown-menu">' +
                    '<div class="settings-group">' +
                        '<div class="settings-label">🎵 背景音乐</div>' +
                        '<label class="settings-row">' +
                            '<span>启用 BGM</span>' +
                            '<input type="checkbox" class="settings-switch" data-setting="bgmEnabled"' +
                                (this.getBgmEnabled() ? ' checked' : '') + '>' +
                        '</label>' +
                        '<label class="settings-row settings-sub">' +
                            '<span>自动播放</span>' +
                            '<input type="checkbox" class="settings-switch" data-setting="bgmAutoPlay"' +
                                (this.getBgmAutoPlay() ? ' checked' : '') + '>' +
                        '</label>' +
                    '</div>' +
                    '<div class="settings-divider"></div>' +
                    '<div class="settings-group">' +
                        '<div class="settings-label">🎀 看板娘</div>' +
                        '<label class="settings-row">' +
                            '<span>启用 Live2D</span>' +
                            '<input type="checkbox" class="settings-switch" data-setting="live2dEnabled"' +
                                (this.getLive2dEnabled() ? ' checked' : '') + '>' +
                        '</label>' +
                    '</div>' +
                '</div>' +
            '</div>';

        // 插入到最后一个 dropdown-section（语言下拉）之后
        var langSection = document.getElementById('langDropdown');
        if (langSection) {
            langSection.parentElement.parentNode.insertBefore(
                section, langSection.parentElement.nextSibling
            );
        }
    }

    _bindEvents() {
        var self = this;

        // 开关按钮点击 → 切换下拉菜单
        document.addEventListener('click', function (e) {
            if (e.target.id === 'settingsToggle' || e.target.closest('#settingsToggle')) {
                if (self._dropdownManager) {
                    self._dropdownManager.toggle('settingsDropdown');
                }
            }
        });

        // 开关切换 → 保存并刷新
        document.addEventListener('change', function (e) {
            var sw = e.target.closest('.settings-switch');
            if (!sw) return;
            var key = sw.getAttribute('data-setting');
            if (key && self._KEYS[key] !== undefined) {
                self._set(key, sw.checked);
            }
        });
    }
}

window.SettingsManager = SettingsManager;
