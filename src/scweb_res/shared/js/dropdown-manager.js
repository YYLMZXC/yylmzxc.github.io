/**
 * 生存战争网 - 下拉菜单管理器
 * 统一管理所有下拉菜单的互斥逻辑：当一个下拉菜单打开时，自动关闭其他已注册的下拉菜单
 * 消除 ThemeManager 和 LanguageManager 之间的直接耦合
 * 挂载到全局 window.DropdownManager
 */
class DropdownManager {
    constructor() {
        /** @type {Map<string, HTMLElement>} 已注册的下拉菜单容器 */
        this._dropdowns = new Map();
        /** @type {string|null} 当前打开的下拉菜单 ID */
        this._openId = null;
        this._boundHandler = this._onDocumentClick.bind(this);
        document.addEventListener('click', this._boundHandler);
    }

    /**
     * 注册一个下拉菜单
     * @param {string} id - 唯一标识（如 'themeDropdown'）
     * @param {HTMLElement} containerEl - 下拉菜单容器元素
     * @param {string} toggleSelector - 触发开关的 CSS 选择器（如 '#themeToggle'）
     */
    register(id, containerEl, toggleSelector) {
        this._dropdowns.set(id, { containerEl, toggleSelector });
    }

    /**
     * 切换指定下拉菜单的展开/收起状态
     * 打开时自动关闭其他已注册的下拉菜单
     * @param {string} id - 下拉菜单 ID
     */
    toggle(id) {
        const target = this._dropdowns.get(id);
        if (!target) return;

        const isOpen = target.containerEl.classList.contains('open');

        // 先关闭所有下拉菜单
        this.closeAll();

        // 如果之前是关闭状态，则打开它
        if (!isOpen) {
            target.containerEl.classList.add('open');
            this._openId = id;
        }
    }

    /**
     * 关闭所有已注册的下拉菜单
     */
    closeAll() {
        this._dropdowns.forEach(({ containerEl }) => {
            containerEl.classList.remove('open');
        });
        this._openId = null;
    }

    /**
     * 文档级点击处理：点击非下拉菜单区域时关闭所有下拉菜单
     * @param {Event} e
     */
    _onDocumentClick(e) {
        // 检查点击是否在某个下拉菜单的开关按钮或菜单本身内
        for (const [id, { containerEl, toggleSelector }] of this._dropdowns) {
            const toggle = document.querySelector(toggleSelector);
            if (toggle && toggle.contains(e.target)) return;
            if (containerEl.contains(e.target)) return;
        }
        // 点击在所有下拉菜单外部，关闭全部
        this.closeAll();
    }
}

window.DropdownManager = DropdownManager;
