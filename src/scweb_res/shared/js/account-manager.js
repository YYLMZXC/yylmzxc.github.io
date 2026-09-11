/**
 * 生存战争网 - 账号面板（挂在设置下拉里的「账号」分区）
 *
 * 三件事：登录、退出登录、修改账号密码，全部走现有后端接口
 *   POST /api/login、GET /api/session、POST /api/logout、POST /api/account
 * 入口统一收在 ⚙️ 设置下拉里，页面上不再单独放头像 / 账号按钮。
 *
 * 账号密码不落浏览器：只随请求发给后端，登录态由后端下发的 HttpOnly 会话 Cookie 承载。
 * 登录状态变化时派发 navAccountChanged 事件，供导航数据面板之类按需响应。
 * 挂载到全局 window.AccountManager
 */
class AccountManager {
    /**
     * @param {Object} [api] - 接口封装，默认取 window.NavApi
     * @param {Object} settingsManager - 设置下拉，用于追加「账号」分区
     */
    constructor(api, settingsManager) {
        this.api = api || window.NavApi;
        this.settings = settingsManager || null;
        this.state = { loggedIn: false, user: '', backend: true };
        this.group = null;
        this.body = null;
        this._editing = false;
    }

    /** 创建分区并拉一次登录态 */
    init() {
        if (!this.api || !this.settings || !this.settings.addGroup) return;

        this.group = this.settings.addGroup('account', '🔐 账号', '<div class="settings-account"></div>');
        if (!this.group) return;
        this.body = this.group.querySelector('.settings-account');

        this.body.addEventListener('click', e => this._onClick(e));
        this.body.addEventListener('submit', e => this._onSubmit(e));

        this.refresh();
    }

    /* ================================================================
     *  登录态
     * ================================================================ */

    /** 重新查询登录态；后端不可用时置为「不可用」而不是反复报错 */
    refresh() {
        return this.api.session().then(s => {
            this.state.backend = true;
            this.state.loggedIn = !!(s && s.loggedIn);
            this.state.user = (s && s.user) || '';
            this._editing = false;
            this.render();
            this._announce();
            return this.state;
        }).catch(e => {
            this.state.backend = false;
            this.state.loggedIn = false;
            this.state.user = '';
            this.render();
            if (e && e.code !== NavApi.NOT_API) this._flash('读取登录状态失败：' + (e.message || '未知错误'));
            return this.state;
        });
    }

    /**
     * 登录状态变化后广播，导航数据面板据此刷新（未登录时不能导入 / 转换）
     */
    _announce() {
        document.dispatchEvent(new CustomEvent('navAccountChanged', {
            detail: { loggedIn: this.state.loggedIn, user: this.state.user, backend: this.state.backend }
        }));
    }

    /* ================================================================
     *  渲染
     * ================================================================ */

    render() {
        if (!this.body) return;

        let html;
        if (!this.state.backend) html = this._offlineHtml();
        else if (!this.state.loggedIn) html = this._loginHtml();
        else if (this._editing) html = this._editHtml();
        else html = this._accountHtml();

        this.body.innerHTML = html;
    }

    _offlineHtml() {
        return '' +
            '<div class="settings-hint">未连接后端服务，账号功能不可用</div>' +
            '<button type="button" class="settings-btn" data-acc-act="retry">重试连接</button>' +
            '<div class="settings-hint" data-acc-msg></div>';
    }

    // 账号输入包在 <form> 里：浏览器与密码管理器才认得这是登录框（也顺带让回车能直接提交）
    _loginHtml() {
        return '' +
            '<form class="settings-form" data-acc-form="login">' +
                '<div class="settings-field"><input type="text" id="navAccUser" name="username" autocomplete="username" placeholder="账号"></div>' +
                '<div class="settings-field"><input type="password" id="navAccPass" name="password" autocomplete="current-password" placeholder="密码"></div>' +
                '<button type="submit" class="settings-btn primary">登录</button>' +
            '</form>' +
            '<div class="settings-hint" data-acc-msg></div>';
    }

    _accountHtml() {
        return '' +
            '<div class="settings-status">已登录：<b>' + this._esc(this.state.user) + '</b></div>' +
            '<button type="button" class="settings-btn" data-acc-act="edit">修改账号密码</button>' +
            '<button type="button" class="settings-btn" data-acc-act="logout">退出登录</button>' +
            '<div class="settings-hint" data-acc-msg></div>';
    }

    _editHtml() {
        return '' +
            '<form class="settings-form" data-acc-form="save">' +
                '<div class="settings-field"><input type="text" id="navAccNewUser" name="username" value="' + this._escAttr(this.state.user) + '" autocomplete="username" placeholder="账号"></div>' +
                '<div class="settings-field"><input type="password" id="navAccOldPass" name="oldPass" autocomplete="current-password" placeholder="当前密码"></div>' +
                '<div class="settings-field"><input type="password" id="navAccNewPass" name="newPass" autocomplete="new-password" placeholder="新密码（留空表示不修改）"></div>' +
                '<button type="submit" class="settings-btn primary">保存</button>' +
            '</form>' +
            '<button type="button" class="settings-btn" data-acc-act="cancel">取消</button>' +
            '<div class="settings-hint" data-acc-msg></div>';
    }

    /* ================================================================
     *  交互
     * ================================================================ */

    _onClick(e) {
        const btn = e.target.closest ? e.target.closest('[data-acc-act]') : null;
        if (!btn || !this.body.contains(btn)) return;

        const act = btn.getAttribute('data-acc-act');
        if (act === 'logout') this._logout(btn);
        else if (act === 'edit') { this._editing = true; this.render(); }
        else if (act === 'cancel') { this._editing = false; this.render(); }
        else if (act === 'retry') this.refresh();
    }

    /**
     * 提交按钮与输入框回车都走这里。
     * 下拉里的表单必须拦下默认提交，否则页面会被整个刷走。
     */
    _onSubmit(e) {
        e.preventDefault();
        const form = e.target.closest ? e.target.closest('[data-acc-form]') : null;
        if (!form || !this.body.contains(form)) return;

        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;

        if (form.getAttribute('data-acc-form') === 'login') this._login(btn);
        else this._save(btn);
    }

    _login(btn) {
        const user = this._value('#navAccUser').trim();
        const pass = this._value('#navAccPass');
        if (!user || !pass) { this._flash('请填写账号和密码'); return; }

        this._busy(btn, true, '登录中…');
        this.api.login(user, pass).then(r => {
            this.state.backend = true;
            this.state.loggedIn = true;
            this.state.user = (r && r.user) || user;
            this._editing = false;
            this.render();
            this._flash('登录成功');
            this._announce();
        }).catch(e => {
            if (e && e.code === NavApi.NOT_API) {
                this.state.backend = false;
                this.render();
                return;
            }
            this._busy(btn, false, '登录');
            // 401 是「账号或密码不对」，其余（数据库连不上等）以后端给的说明为准
            this._flash(e && e.status === 401 ? '账号或密码错误' : ('登录失败：' + (e.message || '未知错误')));
        });
    }

    _logout(btn) {
        this._busy(btn, true, '退出中…');
        this.api.logout().then(() => {
            this.state.loggedIn = false;
            this.state.user = '';
            this._editing = false;
            this.render();
            this._flash('已退出登录');
            this._announce();
        }).catch(e => {
            this._busy(btn, false, '退出登录');
            this._flash('退出失败：' + (e.message || '未知错误'));
        });
    }

    _save(btn) {
        const user = this._value('#navAccNewUser').trim();
        const oldPass = this._value('#navAccOldPass');
        const newPass = this._value('#navAccNewPass');

        if (!user) { this._flash('账号不能为空'); return; }
        if (!oldPass) { this._flash('请填写当前密码'); return; }
        if (newPass && newPass.length < 4) { this._flash('新密码至少 4 位'); return; }

        const payload = { user: user, oldPass: oldPass };
        if (newPass) payload.pass = newPass;

        this._busy(btn, true, '保存中…');
        this.api.updateAccount(payload).then(r => {
            this.state.user = (r && r.user) || user;
            this._editing = false;
            this.render();
            this._flash(newPass ? '已保存，其它设备需重新登录' : '已保存');
            this._announce();
        }).catch(e => {
            this._busy(btn, false, '保存');
            this._flash(e && e.status === 401 ? '当前密码不正确' : ('保存失败：' + (e.message || '未知错误')));
        });
    }

    /* ================================================================
     *  小工具
     * ================================================================ */

    _value(selector) {
        const el = this.body.querySelector(selector);
        return el ? el.value : '';
    }

    _busy(btn, busy, text) {
        btn.disabled = busy;
        btn.textContent = text;
    }

    _flash(message) {
        const el = this.body && this.body.querySelector('[data-acc-msg]');
        if (el) el.textContent = message;
    }

    _esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    _escAttr(s) { return this._esc(s); }
}

window.AccountManager = AccountManager;
