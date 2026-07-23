/**
 * 生存战争网 - 主题管理器
 * 负责切换亮色/暗色主题，支持 localStorage 持久化和系统主题检测
 * 挂载到全局 window.ThemeManager
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
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
     * 设置初始主题
     * 优先级：localStorage 保存 > 系统偏好 > 默认亮色
     */
    setInitialTheme() {
        const savedTheme = this.getSavedTheme();
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else if (this.getSystemTheme() === 'dark') {
            this.currentTheme = 'dark';
        }
        this.applyTheme(this.currentTheme);
        this.updateThemeButtons();
    }

    /**
     * 从 localStorage 获取用户保存的主题偏好
     * @returns {string|null} 'light' | 'dark' | null
     */
    getSavedTheme() {
        try {
            const saved = localStorage.getItem('preferredTheme');
            return saved === 'dark' || saved === 'light' ? saved : null;
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
     * @param {string} theme - 'light' | 'dark'
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
     * 通过添加/移除 light/dark CSS 类来切换样式
     * @param {string} theme - 'light' | 'dark'
     */
    applyTheme(theme) {
        const body = document.body;
        
        if (theme === 'dark') {
            body.classList.add('dark');
            body.classList.remove('light');
        } else {
            body.classList.add('light');
            body.classList.remove('dark');
        }
    }

    /**
     * 切换主题（带动画过渡效果）
     * @param {string} newTheme - 目标主题 'light' | 'dark'
     */
    switchTheme(newTheme) {
        if (newTheme !== 'dark' && newTheme !== 'light') return;
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
     * 更新所有主题按钮的 active 状态
     */
    updateThemeButtons() {
        document.querySelectorAll('[data-theme]').forEach(button => {
            const theme = button.getAttribute('data-theme');
            button.classList.toggle('active', theme === this.currentTheme);
        });
    }

    /**
     * 显示主题切换提示气泡
     * @param {string} theme - 当前主题
     */
    showThemeToast(theme) {
        const toast = document.createElement('div');
        toast.className = 'theme-toast';
        toast.textContent = theme === 'dark' ? '🌙 已切换到黑夜模式' : '☀️ 已切换到白天模式';
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
            if (e.target.matches('[data-theme]')) {
                this.switchTheme(e.target.getAttribute('data-theme'));
            }
        });
    }
}

window.ThemeManager = ThemeManager;
