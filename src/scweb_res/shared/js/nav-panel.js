/**
 * 生存战争网 - 站点导航数据面板（设置下拉里的「导航数据」分区，首页 / 关于页共用）
 *
 * 把数据层的「编辑 / 模式切换 / 导入 / 导出 / 转换」搬到界面上，
 * 只做「按钮 → 数据层方法 → 提示」的编排，不碰数据结构本身。
 * 逐条的增删改由 NavEditor 负责（它可以在首页 / 关于页之间切换），
 * 本模块只负责把入口摆出来，并交代清楚「当前页面用的是哪一份数据」。
 * 挂载到全局 window.NavPanel
 */
class NavPanel {
    /**
     * @param {Object} store - NavStore 实例（绑定本页面身份）
     * @param {Object} settingsManager - 设置下拉，用于追加「导航数据」分区
     * @param {Object} [editor] - NavEditor 实例，「编辑导航」按钮打开它
     * @param {Object} [app] - 共享服务集合，用于读取登录态（写操作要身份）
     */
    constructor(store, settingsManager, editor, app) {
        this.store = store;
        this.settings = settingsManager;
        this.editor = editor || null;
        this.app = app || null;
        this.group = null;
        this.statusEl = null;
        this.hintEl = null;
        this._picker = null;
    }

    init() {
        if (!this.store || !this.settings || !this.settings.addGroup) return;

        this.group = this.settings.addGroup('siteNav', '🧭 导航数据', '' +
            '<div class="settings-status" data-nav-status>—</div>' +
            '<button type="button" class="settings-btn primary" data-nav-act="edit">编辑导航</button>' +
            '<button type="button" class="settings-btn" data-nav-act="mode">切换模式</button>' +
            '<button type="button" class="settings-btn" data-nav-act="import">导入 JSON</button>' +
            '<button type="button" class="settings-btn" data-nav-act="export">导出 JSON</button>' +
            '<button type="button" class="settings-btn" data-nav-act="convert">转换：数据库 → 静态文件</button>' +
            '<div class="settings-hint" data-nav-hint></div>');

        if (!this.group) return;
        this.statusEl = this.group.querySelector('[data-nav-status]');
        this.hintEl = this.group.querySelector('[data-nav-hint]');

        this.group.addEventListener('click', e => this._onClick(e));

        this.store.subscribe(() => this.sync());
        // 登录状态会影响「能不能写」，跟着刷新一次按钮状态
        document.addEventListener('navAccountChanged', () => this.sync());
        this.sync();
    }

    /** 是否已登录：页面没装账号模块时不在本地拦，交给后端去拒绝（与编辑器一致） */
    _loggedIn() {
        const acc = this.app && this.app.accountManager;
        if (!acc || !acc.state) return true;
        return !!acc.state.loggedIn;
    }

    /* ================================================================
     *  界面状态
     * ================================================================ */

    sync() {
        if (!this.group) return;
        const s = this.store.state;

        if (this.statusEl) {
            this.statusEl.textContent = NavStore.modeText(s.mode) + (s.online ? '' : '（未连接）') +
                ' · 本页：' + NavStore.pageText(this.store.page);
        }

        const canWrite = s.mode === 'db' && s.online;
        this._btn('mode').textContent = s.mode === 'db' ? '切换回 web 模式' : '切换到数据库模式';
        // 编辑还要求已登录：写接口要身份，没登录点了也存不下来
        this._btn('edit').disabled = this.editor ? !this.editor.canEdit() : !canWrite;
        // 导入与转换都要走写接口（未登录后端会 401）：除了后端在线还要求已登录
        this._btn('import').disabled = !canWrite || !this._loggedIn();
        this._btn('convert').disabled = !s.online || !this._loggedIn();

        if (this.hintEl) {
            this.hintEl.textContent = this._hintText(s, canWrite);
        }
    }

    _hintText(s, canWrite) {
        if (s.lastError) {
            return s.lastError.label + '：' + s.lastError.reason +
                (s.lastError.hint ? '（' + s.lastError.hint + '）' : '');
        }
        if (s.mode === 'web') {
            return 'web 模式下导航读自静态文件 scweb_res/nav/nav-default.js，不受数据库影响。';
        }
        if (!canWrite) {
            return '当前未连上后端，暂不能编辑或导入。';
        }
        if (!this._loggedIn()) {
            return '转换、导入与编辑都需要登录：请在设置下拉的「账号」里登录后再操作。';
        }
        return '数据库模式下可以直接编辑导航，改动即时写回 MySQL；「编辑导航」里可切换首页 / 关于页，' +
            '转换会把两个页面的数据一起写入静态文件，供 web 模式使用。';
    }

    _btn(act) {
        return this.group.querySelector('[data-nav-act="' + act + '"]');
    }

    /* ================================================================
     *  交互
     * ================================================================ */

    _onClick(e) {
        const btn = e.target.closest ? e.target.closest('[data-nav-act]') : null;
        if (!btn || !this.group.contains(btn)) return;

        const act = btn.getAttribute('data-nav-act');
        if (act === 'edit') this._openEditor();
        else if (act === 'mode') this._toggleMode(btn);
        else if (act === 'import') this._pickFile();
        else if (act === 'export') this._export();
        else if (act === 'convert') this._convert(btn);
    }

    _openEditor() {
        if (!this.editor) return;
        // 编辑器是整屏遮罩，下拉还开着会压在它上面，先收起来
        if (this.editor.open()) {
            const dropdown = document.getElementById('settingsDropdown');
            if (dropdown) dropdown.classList.remove('open');
        }
    }

    _toggleMode(btn) {
        const goingDb = this.store.state.mode !== 'db';
        this._busy(btn, true, goingDb ? '连接中…' : '切换中…');

        this.store.switchMode(goingDb ? 'db' : 'web').then(() => {
            const stats = this.store.statsAll();
            SCToast.ok('已切换到' + NavStore.modeText(this.store.state.mode) +
                '，共 ' + stats.groups + ' 组 / ' + stats.links + ' 条链接（首页 + 关于页）');
        }).catch(e => {
            SCToast.error('切换到数据库模式失败：' + (e.message || '未知错误'));
        }).then(() => {
            this._busy(btn, false, '');
            this.sync();
            // 这里选定的来源与设置面板的「导航数据来源」是同一份值，跟着刷新一下
            if (this.settings && this.settings.sync) this.settings.sync();
        });
    }

    _export() {
        const data = this.store.exportData();
        const stats = this.store.statsAll();
        SCToast.ok('已导出《' + (data.title || '站点导航') + '》' +
            stats.groups + ' 组 / ' + stats.links + ' 条链接（首页 + 关于页）');
    }

    _pickFile() {
        // 按钮在未登录时本是置灰的，这里再拦一道，防止状态不同步时误触发
        if (!this._loggedIn()) {
            SCToast.error('请先在设置下拉的「账号」里登录，登录后才能导入');
            return;
        }

        if (!this._picker) {
            this._picker = document.createElement('input');
            this._picker.type = 'file';
            this._picker.accept = '.json,application/json';
            this._picker.style.display = 'none';
            this._picker.addEventListener('change', () => this._readFile());
            document.body.appendChild(this._picker);
        }
        this._picker.value = '';       // 允许连续导入同一个文件
        this._picker.click();
    }

    _readFile() {
        const file = this._picker.files && this._picker.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            let parsed;
            try {
                parsed = JSON.parse(reader.result);
            } catch (err) {
                SCToast.error('不是合法的 JSON 文件');
                return;
            }

            this.store.importData(parsed).then(r => {
                this._afterWrite(r.saved, file.name);
            }).catch(err => {
                SCToast.error('导入失败：' + (err.message || '未知错误'));
            });
        };
        reader.readAsText(file, 'utf-8');
    }

    // 导入结果的说法取决于「有没有真写进数据库」：web 模式只改了页面，必须讲清楚
    _afterWrite(saved, fileName) {
        const stats = this.store.statsAll();
        if (this.store.state.mode !== 'db') {
            SCToast.info('已在页面上载入《' + fileName + '》' + stats.groups + ' 组 / ' + stats.links + ' 条链接（当前是 web 模式，未写入数据库）');
            return;
        }
        if (saved) {
            SCToast.ok('导入成功，已写入数据库：' + stats.groups + ' 组 / ' + stats.links + ' 条链接');
        } else {
            SCToast.error('导入的内容已载入页面，但写入数据库失败：' +
                (this.store.state.lastError ? this.store.state.lastError.reason : '未知错误'));
        }
    }

    _convert(btn) {
        // 按钮在未登录时本是置灰的，这里再拦一道，防止状态不同步时误触发
        if (!this._loggedIn()) {
            SCToast.error('请先在设置下拉的「账号」里登录，登录后才能转换');
            return;
        }

        const stats = this.store.statsAll();
        const ok = window.confirm(
            '将把当前数据库中的导航数据写入静态文件 scweb_res/nav/nav-default.js\n' +
            '（首页 + 关于页，共 ' + stats.groups + ' 组 / ' + stats.links + ' 条链接），用于 web 模式。\n\n' +
            '该文件会被整份覆盖，是否继续？'
        );
        if (!ok) return;

        this._busy(btn, true, '转换中…');
        this.store.convertToStatic().then(r => {
            const g = (r && r.groups) || stats.groups;
            const l = (r && r.links) || stats.links;
            SCToast.ok('转换完成：已写入 ' + ((r && r.file) || NavStore.STATIC_SRC) + '（' + g + ' 组 / ' + l + ' 条链接）');
        }).catch(e => {
            SCToast.error('转换失败：' + (e.message || '未知错误'));
        }).then(() => {
            this._busy(btn, false, '');
            this.sync();
        });
    }

    _busy(btn, busy, text) {
        if (!btn) return;

        if (busy) {
            // 记下进忙碌前的文案，「转换中…」这类临时字要能还原回去
            if (btn.dataset.idleText === undefined) btn.dataset.idleText = btn.textContent;
            btn.disabled = true;
            btn.textContent = text || btn.dataset.idleText;
            return;
        }

        btn.disabled = false;
        btn.textContent = btn.dataset.idleText || btn.textContent;
        this.sync();   // 模式按钮的文案由 sync 决定，放在还原之后
    }
}

window.NavPanel = NavPanel;
