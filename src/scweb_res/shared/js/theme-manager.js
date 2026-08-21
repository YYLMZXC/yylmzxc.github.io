/**
 * 生存战争网 - 主题管理器
 * 支持 4 种主题切换，支持 localStorage 持久化和系统主题检测
 * 主题列表：
 *   - light:     现代风格亮色（默认）
 *   - dark:      现代风格暗色
 *   - wk-light:  工坊像素风格亮色（参考 scwk 复古游戏风）
 *   - wk-dark:   工坊像素风格暗色
 * 挂载到全局 window.ThemeManager
 */
class ThemeManager {
    /**
     * 合法主题列表，用于校验
     */
    static VALID_THEMES = ['light', 'dark', 'wk-light', 'wk-dark'];

    constructor() {
        this.currentTheme = 'wk-light';
        this.isTransitioning = false;
        this.init();
    }

    /**
     * 初始化主题管理器：设置初始主题并绑定事件
     */
    init() {
        this.setInitialTheme();
        this.bindEventListeners();
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
     * 优先级：localStorage 保存 > 系统偏好深色自动切到对应暗色 > 默认亮色(light)
     */
    setInitialTheme() {
        const savedTheme = this.getSavedTheme();
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else if (this.getSystemTheme() === 'dark') {
            // 系统暗色时默认用现代暗色主题
            this.currentTheme = 'dark';
        } else {
            // 新用户默认工坊亮色
            this.currentTheme = 'wk-light';
        }
        this.applyTheme(this.currentTheme);
        this.updateThemeButtons();
    }

    /**
     * 从 localStorage 获取用户保存的主题偏好
     * @returns {string|null} 合法主题字符串或 null
     */
    getSavedTheme() {
        try {
            const saved = localStorage.getItem('preferredTheme');
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
            localStorage.setItem('preferredTheme', theme);
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

        // 清除所有主题类
        body.classList.remove('light', 'dark', 'wk-light', 'wk-dark');

        // 添加当前主题类
        body.classList.add(theme);

        // 同步添加基础语义类，兼容只针对 light/dark 的旧样式
        if (theme === 'light' || theme === 'wk-light') {
            body.classList.add('light');
        } else {
            body.classList.add('dark');
        }
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
     * 获取主题的人类可读名字和图标，用于 Toast
     * @param {string} theme
     * @returns {{icon: string, name: string}}
     */
    getThemeMeta(theme) {
        const meta = {
            'light':    { icon: '☀️', name: '白天模式' },
            'dark':     { icon: '🌙', name: '黑夜模式' },
            'wk-light': { icon: '🌿', name: '工坊模式（亮色）' },
            'wk-dark':  { icon: '🪵', name: '工坊模式（暗色）' },
        };
        return meta[theme] || meta['light'];
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
     */
    bindEventListeners() {
        document.addEventListener('click', (e) => {
            // 下拉菜单切换
            if (e.target.id === 'themeToggle' || e.target.closest('#themeToggle')) {
                const dropdown = document.getElementById('themeDropdown');
                if (dropdown) dropdown.classList.toggle('open');
                // 关闭语言下拉
                const langDropdown = document.getElementById('langDropdown');
                if (langDropdown) langDropdown.classList.remove('open');
                return;
            }
            // 选择主题
            if (e.target.matches('[data-theme]')) {
                this.switchTheme(e.target.getAttribute('data-theme'));
                // 关闭下拉
                const dropdown = document.getElementById('themeDropdown');
                if (dropdown) dropdown.classList.remove('open');
                return;
            }
            // 点击其他区域关闭下拉
            const dropdown = document.getElementById('themeDropdown');
            if (dropdown) dropdown.classList.remove('open');
        });
    }
}

window.ThemeManager = ThemeManager;
