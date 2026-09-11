/**
 * 生存战争网 - 主题管理器
 * 支持主题切换、localStorage 持久化和系统主题检测
 * 主题清单（id / 图标 / 文案 / 亮暗语义）的唯一来源是 site-constants.js，
 * 切换菜单、设置面板下拉、Toast 文案与前后端校验都读它；增设主题请在那边加一行。
 * 挂载到全局 window.ThemeManager
 */
class ThemeManager {
    /**
     * 主题表（含 icon / name / scheme）/ 合法 id 列表 / 默认主题：
     * 唯一来源是 src/site-constants.js（与后端同源，切换菜单与 Toast 文案也读它）。
     * 该文件在本脚本之前加载；万一缺席则退化为空表，页面仍可用。
     */
    static get THEMES() {
        return (window.SITE_CONSTANTS && window.SITE_CONSTANTS.themes) || [];
    }

    static get VALID_THEMES() {
        return (window.SITE_CONSTANTS && window.SITE_CONSTANTS.themeIds) || [];
    }

    static get FALLBACK_THEME() {
        return (window.SITE_CONSTANTS && window.SITE_CONSTANTS.fallbackTheme) || 'wk-light';
    }

    constructor(dropdownManager) {
        this.currentTheme = ThemeManager.FALLBACK_THEME;
        this.isTransitioning = false;
        this._dropdownManager = dropdownManager || null;
        this.init();
    }

    /**
     * 初始化主题管理器：设置初始主题并绑定事件
     */
    init() {
        this.renderThemeButtons();
        this.setInitialTheme();
        this.bindEventListeners(this._dropdownManager);
        console.log(`[ThemeManager] 初始化完成，当前主题：${this.currentTheme}`);
    }

    /**
     * 判断主题是否合法
     * @param {string} theme
     * @returns {boolean}
     */
    isValidTheme(theme) {
        return ThemeManager.VALID_THEMES.includes(theme);
    }

    /**
     * 设置初始主题
     * 优先级：个人保存 > 站点默认主题（数据库全局设置）> 系统偏好深色 > 工坊亮色(light)
     */
    setInitialTheme() {
        const savedTheme = this.getSavedTheme();        // 个人在本机选过的
        const siteTheme = this.getSiteDefaultTheme();   // 站点默认（管理员在设置里配的）

        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else if (siteTheme) {
            this.currentTheme = siteTheme;
        } else if (this.getSystemTheme() === 'dark') {
            this.currentTheme = 'dark';
        } else {
            this.currentTheme = ThemeManager.FALLBACK_THEME;
        }
        this.applyTheme(this.currentTheme);
        this.updateThemeButtons();
    }

    /**
     * 站点默认主题：优先取全局设置（数据库 / 离线缓存），取不到再回退 site-config.js。
     * 未个人选过主题的访客用它，所以个人保存永远优先。
     * @returns {string} 合法主题，取不到时返回空串
     */
    getSiteDefaultTheme() {
        const S = window.SettingsStore;
        if (S && S.getDefaultTheme) {
            const t = S.getDefaultTheme();
            if (this.isValidTheme(t)) return t;
        }
        const cfg = (window.SITE_CONFIG) || {};
        return this.isValidTheme(cfg.defaultTheme) ? cfg.defaultTheme : '';
    }

    /**
     * 个人主题的存储键：唯一来源是 SettingsStore.THEME_KEY，避免两处各自持有同一个键。
     * ThemeManager 先于 SettingsStore 加载，故运行时取；未加载时降级为同名键。
     * @returns {string}
     */
    getStorageKey() {
        const S = window.SettingsStore;
        return (S && S.THEME_KEY) || 'preferredTheme';
    }

    /**
     * 从 localStorage 获取用户保存的主题偏好
     * @returns {string|null} 合法主题字符串或 null
     */
    getSavedTheme() {
        try {
            const saved = localStorage.getItem(this.getStorageKey());
            return this.isValidTheme(saved) ? saved : null;
        } catch (e) {
            console.warn('[ThemeManager] localStorage 不可用:', e);
            return null;
        }
    }

    /**
     * 检测系统深色模式偏好
     * @returns {string} 'dark' | 'light'
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * 保存主题偏好到 localStorage
     * @param {string} theme - 合法主题字符串
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.getStorageKey(), theme);
        } catch (e) {
            console.warn('[ThemeManager] 无法保存主题到 localStorage:', e);
        }
    }

    /**
     * 将主题应用到 body 元素
     * 通过在 body 上切换对应主题类来切换样式，保留 "light"/"dark" 基础语义类以便兼容旧代码
     * @param {string} theme - 合法主题字符串
     */
    applyTheme(theme) {
        const body = document.body;

        // 清除所有主题类（列表来自 site-constants.js，增设主题时这里不用改）
        body.classList.remove(...ThemeManager.VALID_THEMES);

        // 添加当前主题类
        body.classList.add(theme);

        // 同步添加基础语义类，兼容只针对 light/dark 的旧样式；
        // 亮 / 暗由主题表里的 scheme 决定，增设主题时这里不用改
        const meta = ThemeManager.THEMES.find(t => t.id === theme);
        body.classList.add(meta && meta.scheme === 'light' ? 'light' : 'dark');
    }

    /**
     * 切换主题（带动画过渡效果）
     * @param {string} newTheme - 目标主题
     */
    switchTheme(newTheme) {
        if (!this.isValidTheme(newTheme)) return;
        if (newTheme === this.currentTheme) return;
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        const oldTheme = this.currentTheme;
        this.currentTheme = newTheme;

        this.saveTheme(newTheme);

        const body = document.body;
        body.classList.add('theme-transitioning');

        // 使用微任务确保过渡动画生效
        setTimeout(() => {
            this.applyTheme(newTheme);
            this.updateThemeButtons();

            setTimeout(() => {
                body.classList.remove('theme-transitioning');
                this.isTransitioning = false;
                this.showThemeToast(newTheme);
            }, 300);
        }, 50);

        console.log(`[ThemeManager] 主题切换：${oldTheme} → ${newTheme}`);
    }

    /**
     * 渲染顶部切换菜单的条目：内容来自 site-constants.js，
     * 增设主题时这里不用改（各页 HTML 里只留一个空的 .dropdown-menu 容器）
     */
    renderThemeButtons() {
        const menu = document.querySelector('#themeDropdown .dropdown-menu');
        if (!menu) return;
        menu.innerHTML = ThemeManager.THEMES.map(theme =>
            `<button class="dropdown-item" data-theme="${theme.id}">${theme.icon} ${theme.name}</button>`
        ).join('');
    }

    /**
     * 更新所有主题按钮的 active 状态和下拉菜单切换按钮
     */
    updateThemeButtons() {
        document.querySelectorAll('[data-theme]').forEach(button => {
            const theme = button.getAttribute('data-theme');
            button.classList.toggle('active', theme === this.currentTheme);
        });
        // 更新下拉菜单切换按钮
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            const meta = this.getThemeMeta(this.currentTheme);
            toggle.innerHTML = `${meta.icon} <span class="arrow">▼</span>`;
        }
    }

    /**
     * 获取主题的人类可读名字和图标（切换按钮、Toast 用），文案来自 site-constants.js
     * @param {string} theme
     * @returns {{icon: string, name: string}}
     */
    getThemeMeta(theme) {
        return ThemeManager.THEMES.find(t => t.id === theme) || { icon: '', name: theme };
    }

    /**
     * 显示主题切换提示气泡
     * @param {string} theme - 当前主题
     */
    showThemeToast(theme) {
        const { icon, name } = this.getThemeMeta(theme);
        const toast = document.createElement('div');
        toast.className = 'theme-toast';
        toast.textContent = `${icon} 已切换到${name}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * 绑定主题按钮的点击事件（事件委托）
     * @param {DropdownManager} [dropdownManager] - 下拉菜单管理器（可选，提供互斥逻辑）
     */
    bindEventListeners(dropdownManager) {
        document.addEventListener('click', (e) => {
            // 下拉菜单切换
            if (e.target.id === 'themeToggle' || e.target.closest('#themeToggle')) {
                if (dropdownManager) {
                    dropdownManager.toggle('themeDropdown');
                }
                return;
            }
            // 选择主题
            if (e.target.matches('[data-theme]')) {
                this.switchTheme(e.target.getAttribute('data-theme'));
                if (dropdownManager) {
                    dropdownManager.closeAll();
                }
                return;
            }
        });
    }
}

window.ThemeManager = ThemeManager;
