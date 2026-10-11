/**
 * 生存战争网 - 数据库连接配置面板（挂在设置下拉里的「🗄️ 数据库」分区）
 *
 * MySQL 的地址 / 端口 / 库名 / 账号密码原本只能手改 src/server/config.json，
 * 这里搬到界面里：登录后可查看当前连接、修改并保存 —— 后端先拿新参数试连，
 * 连得上才写回 config.json 并重建连接池（见 routes/db-config.js）。
 *   GET /api/db-config（回显，密码只说设没设）
 *   POST /api/db-config（试连 + 保存 + 重连；密码留空 = 沿用现有）
 * 挂载到全局 window.DbConfigManager
 */
class DbConfigManager {
    /**
     * @param {Object} [api] - 接口封装，默认取 window.NavApi
     * @param {Object} settingsManager - 设置下拉，用于追加「🗄️ 数据库」分区
     * @param {Object} [app] - 共享服务集合，用于读取登录态
     */
    constructor(api, settingsManager, app) {
        this.api = api || window.NavApi;
        this.settings = settingsManager || null;
        this.app = app || null;
        this.state = { backend: true, loaded: false, cfg: null };
        this.group = null;
        this.body = null;
        this._editing = false;
    }

    init() {
        if (!this.api || !this.settings || !this.settings.addGroup) return;

        this.group = this.settings.addGroup('dbConfig', '🗄️ 数据库', '<div class="settings-dbconfig"></div>');
        if (!this.group) return;
        this.body = this.group.querySelector('.settings-dbconfig');

        this.body.addEventListener('click', e => this._onClick(e));
        this.body.addEventListener('submit', e => this._onSubmit(e));

        // 登录态变化影响能不能看 / 能不能改，跟着刷新
        document.addEventListener('navAccountChanged', () => this.refresh());
        this.refresh();
    }

    /** 是否已登录：账号模块不在时不在本地拦，交给后端去拒绝 */
    _loggedIn() {
        const acc = this.app && this.app.accountManager;
        if (!acc || typeof acc.isLoggedIn !== 'function') return true;
        return acc.isLoggedIn();
    }

    /* ================================================================
     *  拉取与渲染
     * ================================================================ */

    refresh() {
        if (!this.group) return;

        // 游客（未登录）看不到数据库配置：整个分区隐藏，登录后恢复
        if (!this._loggedIn()) {
            this.state.loaded = false;
            this.group.style.display = 'none';
            return;
        }
        this.group.style.display = '';

        this.api.getDbConfig().then(cfg => {
            this.state.backend = true;
            this.state.loaded = true;
            this.state.cfg = cfg;
            this.render();
        }).catch(e => {
            if (e && e.code === NavApi.NOT_API) this.state.backend = false;
            this.state.loaded = false;
            this.render();
        });
    }

    render() {
        if (!this.body) return;

        let html;
        if (!this.state.backend) html = this._offlineHtml();
        else if (!this._loggedIn()) html = this._lockedHtml();
        else if (this._editing) html = this._editHtml(this.state.cfg);
        else if (this.state.cfg) html = this._viewHtml(this.state.cfg);
        else html = this._loadingHtml();

        this.body.innerHTML = html;
    }

    _offlineHtml() {
        return '' +
            '<div class="settings-hint">未连接后端服务，数据库配置不可用</div>' +
            '<button type="button" class="settings-btn" data-db-act="retry">重试连接</button>';
    }

    _lockedHtml() {
        return '<div class="settings-hint">数据库连接配置需要登录：请在上方「🔐 账号」里登录后再操作。</div>';
    }

    _loadingHtml() {
        return '<div class="settings-status">读取中…</div>';
    }

    _viewHtml(cfg) {
        return '' +
            '<div class="settings-status">' + this._esc(cfg.user) + '@' + this._esc(cfg.host) + ':' +
            cfg.port + '/' + this._esc(cfg.database) + '</div>' +
            '<div class="settings-hint">密码已' + (cfg.hasPassword ? '设置' : '留空') + '（出于安全不回显）</div>' +
            '<button type="button" class="settings-btn" data-db-act="edit">修改连接</button>' +
            '<div class="settings-hint" data-db-msg></div>';
    }

    _editHtml(cfg) {
        const c = cfg || {};
        return '' +
            '<form class="settings-form" data-db-form="save">' +
                '<div class="settings-field"><input type="text" id="dbCfgHost" value="' + this._escAttr(c.host || '') + '" placeholder="主机（如 127.0.0.1）"></div>' +
                '<div class="settings-field"><input type="number" id="dbCfgPort" min="1" max="65535" value="' + this._escAttr(String(c.port || 3306)) + '" placeholder="端口（如 3306）"></div>' +
                '<div class="settings-field"><input type="text" id="dbCfgDatabase" value="' + this._escAttr(c.database || '') + '" placeholder="库名（如 scweb）"></div>' +
                '<div class="settings-field"><input type="text" id="dbCfgUser" value="' + this._escAttr(c.user || '') + '" placeholder="账号（如 root）"></div>' +
                '<div class="settings-field"><input type="password" id="dbCfgPass" autocomplete="new-password" placeholder="密码（留空表示不修改）"></div>' +
                '<button type="submit" class="settings-btn primary">保存并重连</button>' +
            '</form>' +
            '<button type="button" class="settings-btn" data-db-act="cancel">取消</button>' +
            '<div class="settings-hint">保存前会用新参数试连，连不上不会生效。</div>' +
            '<div class="settings-hint" data-db-msg></div>';
    }

    /* ================================================================
     *  交互
     * ================================================================ */

    _onClick(e) {
        const btn = e.target.closest ? e.target.closest('[data-db-act]') : null;
        if (!btn || !this.body.contains(btn)) return;

        const act = btn.getAttribute('data-db-act');
        if (act === 'edit') { this._editing = true; this.render(); }
        else if (act === 'cancel') { this._editing = false; this.render(); }
        else if (act === 'retry') this.refresh();
    }

    _onSubmit(e) {
        e.preventDefault();
        const form = e.target.closest ? e.target.closest('[data-db-form]') : null;
        if (!form || !this.body.contains(form)) return;

        const btn = form.querySelector('button[type="submit"]');
        if (btn) this._save(btn);
    }

    _save(btn) {
        const host = this._value('#dbCfgHost').trim();
        const port = Number(this._value('#dbCfgPort'));
        const database = this._value('#dbCfgDatabase').trim();
        const user = this._value('#dbCfgUser').trim();
        const password = this._value('#dbCfgPass');

        if (!host || !database || !user) { this._flash('主机、库名与账号都不能为空'); return; }
        if (!Number.isInteger(port) || port < 1 || port > 65535) { this._flash('端口必须是 1 ~ 65535 的整数'); return; }

        this._busy(btn, true, '试连中…');
        this.api.saveDbConfig({ host, port, database, user, password }).then(body => {
            this.state.cfg = (body && body.data) || this.state.cfg;
            this._editing = false;
            this.render();
            this._flash('已保存并重连：' + this.state.cfg.user + '@' + this.state.cfg.host + ':' +
                this.state.cfg.port + '/' + this.state.cfg.database);
        }).catch(e => {
            this._busy(btn, false, '保存并重连');
            this._flash('保存失败：' + (e.hint ? (e.message + '（' + e.hint + '）') : (e.message || '未知错误')));
        });
    }

    /* ================================================================
     *  小工具（与 AccountManager 同一套写法）
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
        const el = this.body && this.body.querySelector('[data-db-msg]');
        if (el) el.textContent = message;
    }

    _esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    _escAttr(s) { return this._esc(s); }
}

window.DbConfigManager = DbConfigManager;
