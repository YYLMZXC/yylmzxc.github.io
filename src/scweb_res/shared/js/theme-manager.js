class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.isTransitioning = false;
        this.init();
    }

    init() {
        this.setInitialTheme();
        this.bindEventListeners();
        console.log(`[ThemeManager] 初始化完成，当前主题：${this.currentTheme}`);
    }

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

    getSavedTheme() {
        try {
            const saved = localStorage.getItem('preferredTheme');
            return saved === 'dark' || saved === 'light' ? saved : null;
        } catch (e) {
            console.warn('[ThemeManager] localStorage 不可用:', e);
            return null;
        }
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    saveTheme(theme) {
        try {
            localStorage.setItem('preferredTheme', theme);
        } catch (e) {
            console.warn('[ThemeManager] 无法保存主题到 localStorage:', e);
        }
    }

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

    updateThemeButtons() {
        document.querySelectorAll('[data-theme]').forEach(button => {
            const theme = button.getAttribute('data-theme');
            button.classList.toggle('active', theme === this.currentTheme);
        });
    }

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

    bindEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme]')) {
                this.switchTheme(e.target.getAttribute('data-theme'));
            }
        });
    }
}

window.ThemeManager = ThemeManager;
