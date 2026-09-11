/**
 * 生存战争网 - 首页「社区导航」编辑器
 *
 * 在设置下拉里点「编辑导航」打开，成组地添加 / 修改 / 删除 / 排序：
 *   分组：改名、指定多语言词条、上下移、删除（连同组内链接）
 *   链接：网址、名称、多语言词条、是否新窗口打开、上下移、删除
 *
 * 分工：本模块只负责「界面与交互」，数据改动一律交给 NavStore，
 * 改完由数据层写回数据库并广播 data 事件，本模块收到后重画，
 * 因此这里不持有数据的副本，也没有「界面和数据谁为准」的问题。
 * 挂载到全局 window.IndexNavEditor
 */
class IndexNavEditor {
    /**
     * @param {Object} store - NavStore 实例
     * @param {Object} [app] - 共享服务集合，用于按当前语言取词条
     */
    constructor(store, app) {
        this.store = store;
        this.app = app || null;

        this.root = null;      // 整个遮罩层
        this.bodyEl = null;    // 列表 / 表单的容器
        this._form = null;     // 正在填的表单描述；为 null 表示列表视图
    }

    /* ================================================================
     *  构建与开关
     * ================================================================ */

    init() {
        if (!this.store || this.root) return;
        this._build();
        this._bind();

        // 数据被别处改动（导入 / 切模式 / 其它入口编辑）时跟着刷新；
        // 正在填表单就不重画，免得输入到一半被清掉。
        this.store.subscribe(e => {
            // 写回失败（多半是没登录/登录过期）必须当场说清楚：
            // 界面上数据已经变了，不讲一声用户会以为已经存进去了
            if (e && e.type === 'error') {
                if (this.root && !this.root.hidden) {
                    SCToast.error('改动没能存入数据库：' + ((e.error && e.error.reason) || '未知错误'));
                }
                return;
            }
            if (e && e.type !== 'data') return;
            if (this._isIdle()) this._renderList();
        });

        // 切换语言会换掉词条文本，列表里的名字跟着变
        document.addEventListener('languageChanged', () => {
            if (this._isIdle()) this._renderList();
        });
    }

    /** 编辑器关着、或者正在填表单时，都不该被外部刷新打断 */
    _isIdle() {
        return !!this.root && !this.root.hidden && !this._form;
    }

    /**
     * 现在能不能改导航：既要连上数据库，也要已登录（写接口认身份）
     * @returns {boolean}
     */
    canEdit() {
        return !!(this.store && this.store.canEdit()) && this._loggedIn();
    }

    /** 页面没装账号模块时不在本地拦，交给后端去拒绝 */
    _loggedIn() {
        const acc = this.app && this.app.accountManager;
        if (!acc || !acc.state) return true;
        return !!acc.state.loggedIn;
    }

    /** 打不开时告诉用户差在哪一步 */
    _denyReason() {
        if (!this.store || !this.store.canEdit()) {
            return '编辑导航需要先切到数据库模式，并确认后端已连上';
        }
        return '请先在设置下拉的「账号」里登录，登录后才能修改导航数据';
    }

    /** 打开编辑器 */
    open() {
        if (!this.store || !this.root) return false;
        if (!this.canEdit()) {
            SCToast.error(this._denyReason());
            return false;
        }

        this._form = null;
        this._renderList();
        this.root.hidden = false;
        document.body.classList.add('nv-editor-open');
        return true;
    }

    close() {
        if (!this.root) return;
        this.root.hidden = true;
        this._form = null;
        document.body.classList.remove('nv-editor-open');
    }

    /* ================================================================
     *  骨架
     * ================================================================ */

    _build() {
        const root = document.createElement('div');
        root.className = 'nv-editor';
        root.hidden = true;

        const mask = document.createElement('div');
        mask.className = 'nv-editor-mask';
        mask.setAttribute('data-act', 'close');   // 点遮罩关闭

        const card = document.createElement('div');
        card.className = 'nv-editor-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-label', '编辑社区导航');

        const head = document.createElement('div');
        head.className = 'nv-editor-head';
        head.appendChild(this._el('span', 'nv-editor-title', '编辑社区导航'));
        head.appendChild(this._opBtn('close', '', '', '✕', '关闭', false, 'nv-editor-close'));

        const body = document.createElement('div');
        body.className = 'nv-editor-body';

        const foot = document.createElement('div');
        foot.className = 'nv-editor-foot';
        foot.appendChild(this._el('span', 'nv-editor-tip',
            '改动会立即写入数据库；要让 web 模式也生效，请在设置里执行「转换：数据库 → 静态文件」。'));
        foot.appendChild(this._opBtn('close', '', '', '完成', '关闭编辑器'));

        card.appendChild(head);
        card.appendChild(body);
        card.appendChild(foot);
        root.appendChild(mask);
        root.appendChild(card);
        document.body.appendChild(root);

        this.root = root;
        this.bodyEl = body;
    }

    _bind() {
        this.root.addEventListener('click', e => this._onClick(e));
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || this.root.hidden) return;
            // 表单里按 Esc 先退回列表，列表里再按才关掉整个编辑器
            if (this._form) this._renderList();
            else this.close();
        });
    }

    /* ================================================================
     *  DOM 小工具
     * ================================================================ */

    _el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    /**
     * 造一个带 data-act 的按钮，动作靠 data-act / data-gid / data-lid 定位
     * @param {string} act - 动作标识
     * @param {string} gid - 所属分组 id
     * @param {string} lid - 所属链接 id
     * @param {string} text - 按钮文字
     * @param {string} [title] - 悬停提示
     * @param {boolean} [disabled] - 到头/到尾的排序键置灰
     * @param {string} [cls] - 追加的类名
     */
    _opBtn(act, gid, lid, text, title, disabled, cls) {
        const b = this._el('button', 'nv-btn' + (cls ? ' ' + cls : ''), text);
        b.type = 'button';
        b.setAttribute('data-act', act);
        if (gid) b.setAttribute('data-gid', gid);
        if (lid) b.setAttribute('data-lid', lid);
        if (title) b.title = title;
        if (disabled) b.disabled = true;
        return b;
    }

    /** 当前语言的词条表，用来把 key 翻成显示名 */
    _translations() {
        const lm = this.app && this.app.languageManager;
        return (lm && lm.getTranslations) ? lm.getTranslations() : {};
    }

    /* ================================================================
     *  列表视图
     * ================================================================ */

    _renderList() {
        this._form = null;

        const box = this.bodyEl;
        const keepTop = box.scrollTop;      // 重画后别把用户滚回顶部
        box.innerHTML = '';

        const groups = this.store.groups();
        const translations = this._translations();

        if (!groups.length) {
            box.appendChild(this._el('div', 'nv-empty', '还没有任何分组，点下面的「新增分组」开始添加。'));
        }

        groups.forEach((g, gi) => box.appendChild(this._groupEl(g, gi, groups.length, translations)));
        box.appendChild(this._opBtn('group-add', '', '', '＋ 新增分组', '在末尾添加一个分组', false, 'nv-add'));

        box.scrollTop = keepTop;
    }

    /**
     * 一个分组：标题行（名称 / 词条 / 条数 / 操作）+ 组内链接列表
     */
    _groupEl(group, index, total, translations) {
        const wrap = this._el('div', 'nv-group');
        wrap.setAttribute('data-gid', group.id);

        const links = group.links || [];

        const head = this._el('div', 'nv-group-head');
        head.appendChild(this._el('span', 'nv-name', NavStore.groupTitle(group, translations)));
        if (group.key) head.appendChild(this._el('span', 'nv-badge', '词条 ' + group.key));
        head.appendChild(this._el('span', 'nv-count', links.length + ' 条'));

        const ops = this._el('span', 'nv-ops');
        ops.appendChild(this._opBtn('group-up', group.id, '', '↑', '上移', index === 0));
        ops.appendChild(this._opBtn('group-down', group.id, '', '↓', '下移', index === total - 1));
        ops.appendChild(this._opBtn('group-edit', group.id, '', '编辑', '修改分组名称'));
        ops.appendChild(this._opBtn('group-del', group.id, '', '删除', '删除该分组及其全部链接', false, 'danger'));
        head.appendChild(ops);
        wrap.appendChild(head);

        const list = this._el('div', 'nv-links');
        links.forEach((l, li) => list.appendChild(this._linkEl(group, l, li, links.length, translations)));
        list.appendChild(this._opBtn('link-add', group.id, '', '＋ 添加链接', '往该分组添加一条链接', false, 'nv-add'));
        wrap.appendChild(list);

        return wrap;
    }

    /** 一条链接：显示名 + 网址 + 操作 */
    _linkEl(group, link, index, total, translations) {
        const row = this._el('div', 'nv-link');
        row.setAttribute('data-gid', group.id);
        row.setAttribute('data-lid', link.id);

        row.appendChild(this._el('span', 'nv-name', NavStore.linkTitle(link, translations)));
        if (link.key) row.appendChild(this._el('span', 'nv-badge', '词条 ' + link.key));
        if (link.external === false) row.appendChild(this._el('span', 'nv-badge quiet', '本页打开'));
        row.appendChild(this._el('span', 'nv-url', link.url));

        const ops = this._el('span', 'nv-ops');
        ops.appendChild(this._opBtn('link-up', group.id, link.id, '↑', '上移', index === 0));
        ops.appendChild(this._opBtn('link-down', group.id, link.id, '↓', '下移', index === total - 1));
        ops.appendChild(this._opBtn('link-edit', group.id, link.id, '编辑', '修改链接'));
        ops.appendChild(this._opBtn('link-del', group.id, link.id, '删除', '删除该链接', false, 'danger'));
        row.appendChild(ops);

        return row;
    }

    /* ================================================================
     *  表单视图（分组与链接共用一套渲染）
     * ================================================================ */

    _renderForm() {
        const f = this._form;
        const box = this.bodyEl;
        box.innerHTML = '';

        const wrap = this._el('div', 'nv-form');
        wrap.appendChild(this._el('div', 'nv-form-title', f.title));

        f.fields.forEach(field => {
            const line = this._el('label', 'nv-field');
            line.appendChild(this._el('span', 'nv-field-label', field.label));

            if (field.type === 'checkbox') {
                line.classList.add('nv-field-check');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!field.value;
                cb.setAttribute('data-field', field.key);
                line.appendChild(cb);
            } else {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.value = field.value || '';
                inp.placeholder = field.placeholder || '';
                inp.setAttribute('data-field', field.key);
                line.appendChild(inp);
            }

            if (field.hint) line.appendChild(this._el('span', 'nv-field-hint', field.hint));
            wrap.appendChild(line);
        });

        const ops = this._el('div', 'nv-form-ops');
        ops.appendChild(this._opBtn('form-cancel', '', '', '取消', '返回列表'));
        ops.appendChild(this._opBtn('form-submit', '', '', '保存', '保存这一项', false, 'primary'));
        wrap.appendChild(ops);

        box.appendChild(wrap);
        box.scrollTop = 0;

        const first = wrap.querySelector('input[type=text]');
        if (first) first.focus();
    }

    /** 读表单里所有带 data-field 的控件 */
    _fieldValues() {
        const vals = {};
        this.bodyEl.querySelectorAll('[data-field]').forEach(inp => {
            vals[inp.getAttribute('data-field')] = inp.type === 'checkbox' ? inp.checked : inp.value;
        });
        return vals;
    }

    _openGroupForm(group) {
        const isNew = !group;
        this._form = {
            kind: 'group',
            isNew: isNew,
            gid: isNew ? '' : group.id,
            title: isNew ? '新增分组' : '编辑分组',
            fields: [
                {
                    key: 'name', label: '分组名称', value: group ? group.name || '' : '',
                    placeholder: '如：🌏 CN中文导航'
                },
                {
                    key: 'key', label: '多语言词条（可选）', value: group ? group.key || '' : '',
                    placeholder: '如：cnNavigation',
                    hint: '填了就用词条，四种语言各显示自己的标题；留空则各语言都显示上面的名称。'
                }
            ]
        };
        this._renderForm();
    }

    _openLinkForm(gid, link) {
        const isNew = !link;
        this._form = {
            kind: 'link',
            isNew: isNew,
            gid: gid,
            lid: isNew ? '' : link.id,
            title: isNew ? '添加链接' : '编辑链接',
            fields: [
                {
                    key: 'url', label: '网址', value: link ? link.url || '' : '',
                    placeholder: 'https://example.com（只填域名也行）'
                },
                {
                    key: 'title', label: '名称', value: link ? link.title || '' : '',
                    placeholder: '留空则用域名'
                },
                {
                    key: 'key', label: '多语言词条（可选）', value: link ? link.key || '' : '',
                    placeholder: '如：scWiki',
                    hint: '填了就用词条，四种语言各显示自己的名称；留空则各语言都显示上面的名称。'
                },
                {
                    key: 'external', label: '新窗口打开', type: 'checkbox',
                    value: link ? link.external !== false : true,
                    hint: '本站内的页面可以关掉，让它在本页跳转。'
                }
            ]
        };
        this._renderForm();
    }

    /* ================================================================
     *  动作分派
     * ================================================================ */

    _onClick(e) {
        const btn = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!btn || !this.root.contains(btn)) return;

        const act = btn.getAttribute('data-act');
        const gid = btn.getAttribute('data-gid') || '';
        const lid = btn.getAttribute('data-lid') || '';

        switch (act) {
            case 'close': return this.close();
            case 'group-add': return this._openGroupForm(null);
            case 'group-edit': return this._openGroupForm(this.store.findGroup(gid));
            case 'group-del': return this._removeGroup(gid);
            case 'group-up': return this.store.moveGroup(gid, -1);
            case 'group-down': return this.store.moveGroup(gid, 1);
            case 'link-add': return this._openLinkForm(gid, null);
            case 'link-edit': return this._openLinkForm(gid, this.store.findLink(gid, lid));
            case 'link-del': return this._removeLink(gid, lid);
            case 'link-up': return this.store.moveLink(gid, lid, -1);
            case 'link-down': return this.store.moveLink(gid, lid, 1);
            case 'form-cancel': return this._renderList();
            case 'form-submit': return this._submitForm();
        }
    }

    _submitForm() {
        const f = this._form;
        if (!f) return;

        const v = this._fieldValues();
        const patch = f.kind === 'group' ? this._groupPatch(v) : this._linkPatch(v);
        if (!patch) return;      // 校验没过，表单保持原样让人接着改

        // 先退出表单视图：写回后数据层会广播 data 事件，回调据此重画成列表
        this._form = null;
        if (f.isNew) this._applyNew(f, patch);
        else this._applyEdit(f, patch);

        SCToast.ok(f.isNew ? '已添加' : '已保存');
    }

    /**
     * 分组表单 → 待写入字段
     * 名称与词条至少填一个：只填词条时用词条名当兜底名称，
     * 免得某一语言没有对应词条时整个标题空掉。
     * @returns {Object|null} null 表示校验未通过
     */
    _groupPatch(v) {
        const name = String(v.name || '').trim();
        const key = String(v.key || '').trim();
        if (!name && !key) {
            SCToast.error('请填写分组名称，或指定一个多语言词条');
            return null;
        }
        return { name: name || key, key: key };
    }

    /** 链接表单 → 待写入字段；网址必填，名称留空时用域名兜底 */
    _linkPatch(v) {
        const url = NavStore.normalizeUrl(v.url);
        if (!url) {
            SCToast.error('请填写网址');
            return null;
        }
        return {
            url: url,
            title: String(v.title || '').trim() || NavStore.hostOf(url) || url,
            key: String(v.key || '').trim(),
            external: !!v.external
        };
    }

    _applyNew(f, patch) {
        if (f.kind === 'group') this.store.addGroup(patch);
        else this.store.addLink(f.gid, patch);
    }

    _applyEdit(f, patch) {
        if (f.kind === 'group') this.store.updateGroup(f.gid, patch);
        else this.store.updateLink(f.gid, f.lid, patch);
    }

    _removeGroup(gid) {
        const g = this.store.findGroup(gid);
        if (!g) return;

        const n = (g.links || []).length;
        const name = NavStore.groupTitle(g, this._translations());
        const ok = window.confirm(
            '确定删除分组「' + name + '」' + (n ? '及其中的 ' + n + ' 条链接' : '') + '吗？'
        );
        if (!ok) return;

        this.store.removeGroup(gid);
        SCToast.ok('已删除分组');
    }

    _removeLink(gid, lid) {
        const l = this.store.findLink(gid, lid);
        if (!l) return;

        const ok = window.confirm('确定删除链接「' + NavStore.linkTitle(l, this._translations()) + '」吗？');
        if (!ok) return;

        this.store.removeLink(gid, lid);
        SCToast.ok('已删除链接');
    }
}

window.IndexNavEditor = IndexNavEditor;
