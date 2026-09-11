/**
 * 生存战争网 - 首页导航数据面板（设置下拉里的「导航数据」分区）
 *
 * 把数据层的「模式切换 / 导入 / 导出 / 转换」搬到界面上，
 * 只做「按钮 → 数据层方法 → 提示」的编排，不碰数据结构本身。
 * 挂载到全局 window.IndexNavPanel
 */
class IndexNavPanel {
    /**
     * @param {Object} store - NavStore 实例
     * @param {Object} settingsManager - 设置下拉，用于追加「导航数据」分区
     */
    constructor(store, settingsManager) {
        this.store = store;
        this.settings = settingsManager;
        this.group = null;
        this.statusEl = null;
        this.hintEl = null;
        this._picker = null;
    }

    init() {
        if (!this.store || !this.settings || !this.settings.addGroup) return;

        this.group = this.settings.addGroup('siteNav', '🧭 导航数据', '' +
            '<div class="settings-status" data-nav-status>—</div>' +
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

    /* ================================================================
     *  界面状态
     * ================================================================ */

    sync() {
        if (!this.group) return;
        const s = this.store.state;

        if (this.statusEl) {
            this.statusEl.textContent = NavStore.modeText(s.mode) + (s.online ? '' : '（未连接）');
        }

        const canWrite = s.mode === 'db' && s.online;
        this._btn('mode').textContent = s.mode === 'db' ? '切换回 web 模式' : '切换到数据库模式';
        this._btn('import').disabled = !canWrite;      // web 模式只读，导入无处可存
        this._btn('convert').disabled = !s.online;     // 转换需要后端

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
            return '当前未连上后端，暂不能导入或转换。';
        }
        return '数据库模式下，导入会写回 MySQL；转换会把当前数据写入静态文件，供 web 模式使用。';
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
        if (act === 'mode') this._toggleMode(btn);
        else if (act === 'import') this._pickFile();
        else if (act === 'export') this._export();
        else if (act === 'convert') this._convert(btn);
    }

    _toggleMode(btn) {
        const goingDb = this.store.state.mode !== 'db';
        this._busy(btn, true, goingDb ? '连接中…' : '切换中…');

        this.store.switchMode(goingDb ? 'db' : 'web').then(() => {
            const stats = this.store.stats();
            SCToast.ok('已切换到' + NavStore.modeText(this.store.state.mode) +
                '，共 ' + stats.groups + ' 组 / ' + stats.links + ' 条链接');
        }).catch(e => {
            SCToast.error('切换到数据库模式失败：' + (e.message || '未知错误'));
        }).then(() => {
            this._busy(btn, false, '');
            this.sync();
        });
    }

    _export() {
        const data = this.store.exportData();
        const stats = this.store.stats();
        SCToast.ok('已导出《' + (data.title || '社区导航') + '》' + stats.groups + ' 组 / ' + stats.links + ' 条链接');
    }

    _pickFile() {
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
        const stats = this.store.stats();
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
        const stats = this.store.stats();
        const ok = window.confirm(
            '将把当前数据库中的导航数据写入静态文件 scweb_res/nav/nav-default.js\n' +
            '（' + stats.groups + ' 组 / ' + stats.links + ' 条链接），用于 web 模式。\n\n' +
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
        btn.disabled = busy;
        if (text) btn.textContent = text;
        else this.sync();
    }
}

window.IndexNavPanel = IndexNavPanel;
