/**
 * 生存战争网 - 轻提示
 * 页面底部浮出一句话，几秒后自动淡出；同一时刻只保留最后一条，避免堆叠。
 * 用于导入 / 导出 / 转换 / 登录这类「操作完给个回执」的场景，不做交互。
 * 挂载到全局 window.SCToast
 */
class SCToast {
    /**
     * 显示一条提示
     * @param {string} message - 提示内容
     * @param {string} [type] - info | ok | error，决定配色
     * @param {number} [duration] - 停留毫秒数
     */
    static show(message, type = 'info', duration = 2600) {
        const host = SCToast._host();
        host.textContent = message;
        host.className = 'sc-toast sc-toast-' + type;
        // 强制重排，保证连续调用时淡入动画能重新播放
        void host.offsetWidth;
        host.classList.add('show');

        clearTimeout(SCToast._timer);
        SCToast._timer = setTimeout(() => host.classList.remove('show'), duration);
    }

    static info(message) { SCToast.show(message, 'info'); }
    static ok(message) { SCToast.show(message, 'ok'); }
    static error(message) { SCToast.show(message, 'error', 4200); }

    /** 取（或创建）唯一的提示容器 */
    static _host() {
        if (SCToast._el && document.body.contains(SCToast._el)) return SCToast._el;
        const el = document.createElement('div');
        el.id = 'scToast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
        SCToast._el = el;
        return el;
    }
}

SCToast._el = null;
SCToast._timer = null;

window.SCToast = SCToast;
