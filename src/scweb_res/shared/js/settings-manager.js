/**
 * 生存战争网 - 设置管理器（⚙️ 设置下拉）
 *
 * 五项站点设置：启用 BGM / 自动播放 / 看板娘 / 默认主题 / 导航数据来源，外加一个「个人 / 全局」模式开关。
 *   个人模式 —— 改动只写本机 localStorage，不写数据库；
 *   全局模式 —— 改动写入数据库（需登录），对所有访客生效。
 * 离线（连不上后端）时按上次缓存的全局值运行，见 settings-store.js。
 *
 * 本模块只负责「把入口摆出来 + 把改动转给数据层」，取值与保存全在 SettingsStore。
 * 挂载到全局 window.SettingsManager
 */
class SettingsManager {
    /**
     * @param {Object} [dropdownManager] - 下拉菜单管理器
     * @param {Object} [app] - 共享服务集合，用于读取登录态与主题管理器
     */
    constructor(dropdownManager, app) {
        this._dropdownManager = dropdownManager || null;
        this.app = app || null;

        // 站点设置数据层（个人 / 全局 / 离线缓存都收在它那里）
        this.store = window.SettingsStore ? new SettingsStore() : null;

        // 由其它模块追加进来的分区（导航数据 / 账号 等），按 id 去重
        this._groups = {};

        this.group = null;
        this.statusEl = null;
        this.hintEl = null;

        this.init();
    }

    /* ================================================================
     *  UI 构建
     *
     *  取值与保存都在 SettingsStore：bgm-player / 看板娘 / 主题在初始化时
     *  直接调它的静态方法，面板这里的开关只是把人指的改动转交过去。
     * ================================================================ */

    init() {
        this._createDropdown();
        this._bindEvents();

        if (this.store) {
            this.store.subscribe(() => this.sync());
            // 登录状态决定「能不能改全局」，跟着刷新一次按钮状态
            document.addEventListener('navAccountChanged', () => this.sync());
            this.store.load();
        }
        this.sync();

        if (window.SettingsStore) {
            console.log('[SettingsManager] 初始化完成', {
                mode: this.store ? this.store.state.mode : 'personal',
                bgmEnabled: SettingsStore.getBgmEnabled(),
                bgmAutoPlay: SettingsStore.getBgmAutoPlay(),
                live2dEnabled: SettingsStore.getLive2dEnabled(),
                defaultTheme: SettingsStore.getDefaultTheme(),
                navMode: SettingsStore.getNavMode()
            });
        }
    }

    _createDropdown() {
        var section = document.createElement('div');
        section.className = 'dropdown-section';

        section.innerHTML =
            '<div class="dropdown" id="settingsDropdown">' +
                '<button class="dropdown-toggle" id="settingsToggle">⚙️ <span class="arrow">▼</span></button>' +
                '<div class="dropdown-menu settings-dropdown-menu">' +
                    '<div class="settings-group">' +
                        '<div class="settings-status" data-settings-status>—</div>' +
                        '<button type="button" class="settings-btn" data-settings-act="mode"></button>' +
                    '</div>' +
                    '<div class="settings-divider"></div>' +
                    '<div class="settings-group">' +
                        '<div class="settings-label">🎵 背景音乐</div>' +
                        '<label class="settings-row">' +
                            '<span>启用 BGM</span>' +
                            '<input type="checkbox" class="settings-switch" data-setting="bgmEnabled">' +
                        '</label>' +
                        '<label class="settings-row settings-sub">' +
                            '<span>自动播放</span>' +
                            '<input type="checkbox" class="settings-switch" data-setting="bgmAutoPlay">' +
                        '</label>' +
                    '</div>' +
                    '<div class="settings-divider"></div>' +
                    '<div class="settings-group">' +
                        '<div class="settings-label">🎀 看板娘</div>' +
                        '<label class="settings-row">' +
                            '<span>启用 Live2D</span>' +
                            '<input type="checkbox" class="settings-switch" data-setting="live2dEnabled">' +
                        '</label>' +
                    '</div>' +
                    '<div class="settings-divider"></div>' +
                    '<div class="settings-group">' +
                        '<div class="settings-label">🎨 默认主题</div>' +
                        '<label class="settings-row">' +
                            '<span>站点默认</span>' +
                            '<select class="settings-select" data-setting="defaultTheme">' +
                                '<option value="light">☀️ 白天模式</option>' +
                                '<option value="dark">🌙 黑夜模式</option>' +
                                '<option value="wk-light">🌿 工坊亮色</option>' +
                                '<option value="wk-dark">🪵 工坊暗色</option>' +
                            '</select>' +
                        '</label>' +
                    '</div>' +
                    '<div class="settings-divider"></div>' +
                    '<div class="settings-group">' +
                        '<div class="settings-label">🧭 导航数据来源</div>' +
                        '<label class="settings-row">' +
                            '<span>站点默认</span>' +
                            '<select class="settings-select" data-setting="navMode">' +
                                '<option value="web">📄 静态文件</option>' +
                                '<option value="db">🗄️ 数据库</option>' +
                            '</select>' +
                        '</label>' +
                        '<div class="settings-hint">决定访客首次打开时从哪里读导航；若在本机「导航数据」里切换过模式，仍以本机选择的为准。</div>' +
                    '</div>' +
                    '<div class="settings-hint" data-settings-hint></div>' +
                '</div>' +
            '</div>';

        // 插入到最后一个 dropdown-section（语言下拉）之后
        var langSection = document.getElementById('langDropdown');
        if (langSection) {
            langSection.parentElement.parentNode.insertBefore(
                section, langSection.parentElement.nextSibling
            );
        }

        this.group = document.querySelector('#settingsDropdown .settings-dropdown-menu');
        this.statusEl = this.group ? this.group.querySelector('[data-settings-status]') : null;
        this.hintEl = this.group ? this.group.querySelector('[data-settings-hint]') : null;
    }

    _bindEvents() {
        var self = this;

        // 开关按钮点击 → 切换下拉菜单
        document.addEventListener('click', function (e) {
            var hitToggle = e.target.closest && e.target.closest('#settingsToggle');
            if (e.target.id === 'settingsToggle' || hitToggle) {
                if (self._dropdownManager) {
                    self._dropdownManager.toggle('settingsDropdown');
                }
                return;
            }
            var btn = e.target.closest ? e.target.closest('[data-settings-act]') : null;
            if (btn && self.group && self.group.contains(btn)) {
                if (btn.getAttribute('data-settings-act') === 'mode') self._toggleMode();
            }
        });

        // 设置项改动 → 个人模式写本机 / 全局模式写数据库
        document.addEventListener('change', function (e) {
            var el = e.target.closest ? e.target.closest('[data-setting]') : null;
            if (!el || !self.group || !self.group.contains(el)) return;
            var key = el.getAttribute('data-setting');
            if (!key) return;
            self._apply(key, el.type === 'checkbox' ? el.checked : el.value, el);
        });
    }

    /* ================================================================
     *  界面状态
     * ================================================================ */

    /** 是否已登录：页面没装账号模块时不在本地拦，交给后端去拒绝（与导航面板一致） */
    _loggedIn() {
        const acc = this.app && this.app.accountManager;
        if (!acc || typeof acc.isLoggedIn !== 'function') return true;
        return acc.isLoggedIn();
    }

    sync() {
        if (!this.group) return;

        const store = this.store;
        const mode = store ? store.state.mode : 'personal';
        const online = store ? store.state.online : true;
        const editable = mode === 'personal' || (online && this._loggedIn());

        if (this.statusEl) {
            this.statusEl.textContent = (mode === 'global'
                ? '全局模式：写入数据库，对所有访客生效'
                : '个人模式：只保存在本机，不写数据库') + (online ? '' : '（未连接后端）');
        }

        const modeBtn = this._btn('mode');
        if (modeBtn) {
            modeBtn.textContent = mode === 'global' ? '切换回个人模式' : '切换到全局模式';
            // 全局模式是「改站点默认值」，所以进去要登录；回个人模式不需要
            modeBtn.disabled = (mode === 'personal') && (!online || !this._loggedIn());
        }

        ['bgmEnabled', 'bgmAutoPlay', 'live2dEnabled'].forEach(key => {
            const el = this._control(key);
            if (!el) return;
            el.checked = !!(store ? store.display(key) : SettingsStore.effective(key));
            el.disabled = !editable;
        });

        const sel = this._control('defaultTheme');
        if (sel) {
            sel.value = (store ? store.display('defaultTheme') : SettingsStore.getDefaultTheme()) || SettingsStore.FALLBACK_THEME;
            sel.disabled = !editable;
        }

        const navSel = this._control('navMode');
        if (navSel) {
            navSel.value = (store ? store.display('navMode') : SettingsStore.getNavMode()) || SettingsStore.FALLBACK_NAV_MODE;
            navSel.disabled = !editable;
        }

        if (this.hintEl) this.hintEl.textContent = this._hintText(mode, online);
    }

    _hintText(mode, online) {
        const store = this.store;
        if (store && store.state.lastError) {
            const e = store.state.lastError;
            return e.label + '：' + e.reason + (e.hint ? '（' + e.hint + '）' : '');
        }
        if (mode === 'global') {
            if (!online) return '当前未连上后端，暂时只能看上次缓存的全局设置。';
            if (!this._loggedIn()) return '全局设置写入数据库，需要登录后才能修改：请在「账号」里登录。';
            return '这里的值会写入数据库，作为所有访客的默认（访客在本机改过的仍以本机为准）。';
        }
        return '个人模式下只改本机；切到全局模式并登录后可修改站点默认值。BGM 与看板娘改动需要刷新页面生效。';
    }

    _btn(act) {
        return this.group.querySelector('[data-settings-act="' + act + '"]');
    }

    _control(key) {
        return this.group.querySelector('[data-setting="' + key + '"]');
    }

    /* ================================================================
     *  交互
     * ================================================================ */

    _toggleMode() {
        if (!this.store) return;

        const goingGlobal = this.store.state.mode !== 'global';
        if (goingGlobal && !this._loggedIn()) {
            this._toast('error', '全局模式需要登录后才能使用');
            return;
        }

        this.store.switchMode(goingGlobal ? 'global' : 'personal');
        this._toast('info', goingGlobal
            ? '已切到全局模式：改动会写入数据库'
            : '已切回个人模式：改动只保存在本机');
        this.sync();
    }

    _apply(key, value, el) {
        const store = this.store;
        if (!store) return;

        if (store.state.mode === 'global') {
            if (!this._loggedIn()) {
                this._toast('error', '全局设置需要登录后才能修改');
                this.sync();
                return;
            }

            el.disabled = true;
            store.saveGlobal(this._patch(key, value)).then(() => {
                this._toast('ok', '已写入数据库的全局设置');
                this._afterApply(key);
            }).catch(() => {
                const err = store.state.lastError;
                this._toast('error', '保存失败：' + (err ? err.reason : '未知错误'));
            }).then(() => {
                el.disabled = false;
                this.sync();
            });
            return;
        }

        store.setPersonal(this._patch(key, value));
        this._toast('ok', '已保存到本机（个人模式）');
        this._afterApply(key);
    }

    _patch(key, value) {
        const patch = {};
        patch[key] = value;
        return patch;
    }

    /** 改完之后的收尾：主题可以直接应用，BGM / 看板娘 / 导航来源都在初始化时读一次，只能刷新页面生效 */
    _afterApply(key) {
        if (key === 'defaultTheme') {
            const theme = this.store ? this.store.display('defaultTheme') : SettingsStore.getDefaultTheme();
            const tm = this.app && this.app.themeManager;
            if (tm && theme) {
                tm.applyTheme(theme);
                tm.updateThemeButtons();
            }
            this.sync();
            return;
        }

        // 导航来源只影响「有导航数据的页面」，本页没有导航数据层时不必白刷一次
        if (key === 'navMode' && !window.NavStore) {
            this.sync();
            return;
        }

        location.reload();
    }

    _toast(kind, message) {
        SCUtils.toast(kind, message);
    }

    /* ================================================================
     *  扩展分区
     *  设置下拉是页面上唯一的「偏好收口」，导航数据、账号这类入口都挂进来，
     *  避免页面上再散落一批按钮。内容由各模块自己提供，这里只负责摆放。
     * ================================================================ */

    /**
     * 往设置下拉末尾追加一个分区，重复调用返回已建好的分区
     * @param {string} id    - 分区标识
     * @param {string} label - 分区标题（可为空）
     * @param {string} html  - 分区内容，由调用方负责转义
     * @returns {HTMLElement|null} 分区容器
     */
    addGroup(id, label, html) {
        var menu = document.querySelector('#settingsDropdown .settings-dropdown-menu');
        if (!menu) return null;
        if (this._groups[id]) return this._groups[id];

        var divider = document.createElement('div');
        divider.className = 'settings-divider';

        var group = document.createElement('div');
        group.className = 'settings-group';
        group.setAttribute('data-settings-group', id);
        group.innerHTML = (label ? '<div class="settings-label">' + label + '</div>' : '') + (html || '');

        menu.appendChild(divider);
        menu.appendChild(group);
        this._groups[id] = group;
        return group;
    }

    /** 取已追加的分区容器，未追加时返回 null */
    getGroup(id) {
        return this._groups[id] || null;
    }
}

window.SettingsManager = SettingsManager;
