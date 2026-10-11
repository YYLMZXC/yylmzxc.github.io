/**
 * 生存战争网 - 联机服务器列表管理器（门面 / 协调者）
 *
 * 只负责编排各子系统的协作，具体职责已拆分为：
 * - ServerApiClient（网络层：同源接口优先 / 代理回退 / 超时重试 / 数据提取）
 * - ServerCache（数据层：localStorage 缓存）
 * - ServerListView（视图层：列表渲染与交互）
 * - ServerLatencyChecker（延迟检测，暂未接线：延迟/人数先占位展示）
 *
 * 共享管理器（主题 / 语言 / 站点信息）由组合根 App 统一创建并通过构造注入
 */

/**
 * HTML 文本转义：版本号是本机输入，拼进 innerHTML 前先转义
 * @param {string} s
 * @returns {string}
 */
function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/**
 * HTML 属性转义（title / data-* 等带引号属性）
 * @param {string} s
 * @returns {string}
 */
function escAttr(s) {
    return escHtml(s);
}

class OnlineServerManager {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.languageManager = app.languageManager;
        this.siteInfoManager = app.siteInfoManager;

        // API 配置
        this.apiUrl = 'https://api.sckey.net/server/serverlist';
        // 版本列表：先按本机缓存渲染首屏，init 里再以数据库为准（增改删只有连上数据库才能保存）
        this.versions = ServerVersionStore.load();
        this.serverVersion = ServerVersionStore.getSelected(this.versions);
        this.currentFilter = 'all';

        // 组装子系统（依赖注入，保持子系统之间相互解耦）
        this.apiClient = new ServerApiClient({
            apiUrl: this.apiUrl,
            timeout: 15000,
            corsProxies: [
                'https://corsproxy.io/?',
                'https://api.allorigins.win/raw?url=',
                'https://proxy.cors.sh/'
            ],
            useCorsProxy: false,
            fallbackVersion: this.serverVersion
        });

        this.cache = new ServerCache(10);

        // 延迟 / 在线人数暂为占位展示（列表接口不返回，ping 上游也未开放），
        // ServerLatencyChecker 保留未接线，后续恢复时重新注入即可。
        this.listView = new ServerListView({
            getServerText: (key) => this.getServerText(key),
            getStatsText: (key) => this.getStatsText(key),
            getTranslations: (lang) => this.getTranslations(lang),
            onFilterChange: (filter) => this.loadServerList(filter)
        });

        this.init();
    }

    /**
     * 初始化管理器：初始化版本选择器、绑定事件并加载服务器列表
     */
    init() {
        this.initVersionSelector();
        this.initVersionManage();
        this.bindEvents();
        this.loadServerList();

        // 版本列表以数据库为准（读接口开放）：连上后端时静默替换本地缓存/出厂默认
        this.syncVersionsFromServer();

        console.log('[OnlineServerManager] 初始化完成');
    }

    /**
     * 初始化版本选择器下拉框
     * 根据 this.versions 配置生成 option 元素（versions 为版本号字符串数组）
     */
    initVersionSelector() {
        const versionSelector = document.getElementById('versionSelector');
        if (!versionSelector) return;

        versionSelector.innerHTML = '';
        this.versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = version;
            if (version === this.serverVersion) {
                option.selected = true;
            }
            versionSelector.appendChild(option);
        });
    }

    /**
     * 初始化版本管理菜单（✏️）：渲染条目、绑定添加 / 重命名 / 删除事件，
     * 并把菜单注册进全局 DropdownManager 获得互斥展开
     */
    initVersionManage() {
        const dropdown = document.getElementById('versionManageDropdown');
        if (dropdown && this.app.dropdownManager) {
            this.app.dropdownManager.register('versionManageDropdown', dropdown, '#versionManageToggle');

            // ✏️ 按钮负责展开/收起（DropdownManager 只提供互斥，不代绑开关点击）
            const toggleBtn = document.getElementById('versionManageToggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.app.dropdownManager.toggle('versionManageDropdown');
                });
            }
        }

        this.updateVersionManageTexts();
        this.renderVersionManage();

        const addBtn = document.getElementById('versionAddBtn');
        const addInput = document.getElementById('versionAddInput');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addVersion());
        }
        if (addInput) {
            addInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addVersion();
                }
            });
        }

        // 条目改名 / 删除用事件委托：增删会重画列表，委托免去重复绑定
        const list = document.getElementById('versionManageList');
        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-vm-act]');
                if (!btn) return;
                const version = btn.getAttribute('data-vm-version');
                if (btn.getAttribute('data-vm-act') === 'rename') this.renameVersion(version);
                if (btn.getAttribute('data-vm-act') === 'remove') this.removeVersion(version);
            });
        }
    }

    /**
     * 渲染版本管理菜单条目：每行 label + ✏️ 改名 + 🗑️ 删除，当前选中版本高亮
     */
    renderVersionManage() {
        const list = document.getElementById('versionManageList');
        if (!list) return;

        list.innerHTML = this.versions.map(v => {
            const active = v === this.serverVersion ? ' version-item-active' : '';
            return '<div class="version-item' + active + '">' +
                '<span class="version-item-label" title="' + escAttr(v) + '">' + escHtml(v) + '</span>' +
                '<button type="button" class="version-item-btn" data-vm-act="rename" data-vm-version="' + escAttr(v) + '" title="' + escAttr(this.getServerText('versionRename')) + '">✏️</button>' +
                '<button type="button" class="version-item-btn" data-vm-act="remove" data-vm-version="' + escAttr(v) + '" title="' + escAttr(this.getServerText('versionDelete')) + '">🗑️</button>' +
                '</div>';
        }).join('');
    }

    /**
     * 更新版本管理菜单的静态文案（开关按钮 title、添加输入框占位符）
     */
    updateVersionManageTexts() {
        const toggle = document.getElementById('versionManageToggle');
        if (toggle) toggle.title = this.getServerText('versionManage');
        const addInput = document.getElementById('versionAddInput');
        if (addInput) addInput.placeholder = this.getServerText('versionPlaceholder');
        const addBtn = document.getElementById('versionAddBtn');
        if (addBtn) addBtn.title = this.getServerText('versionAdd');
    }

    /**
     * 把新版本列表保存进数据库——增 / 改 / 删的唯一落库入口。
     * 只有连上数据库（后端在线 + 已登录）才能保存成功：
     *   没后端 → 提示「连数据库才能修改」；未登录 → 提示「先登录」；
     *   其余报错 → 转述原因。任何失败都不改动本地列表。
     * @param {string[]} candidateList - 修改后的完整列表
     * @param {function(string[])} [onSaved] - 保存成功后的回调（参数为服务端确认的列表）
     */
    async _saveVersions(candidateList, onSaved) {
        try {
            const saved = await ServerVersionStore.saveRemote(candidateList);
            SCUtils.toast('ok', this.getServerText('versionSaved'));
            if (onSaved) onSaved(saved);
        } catch (e) {
            if (e && e.code === 'NOT_API') {
                SCUtils.toast('error', this.getServerText('versionNotConnected'));
            } else if (e && (e.code === 'UNAUTHORIZED' || e.status === 401)) {
                SCUtils.toast('error', this.getServerText('versionNeedLogin'));
            } else {
                SCUtils.toast('error', this.getServerText('versionSaveFailed') + (e && e.message ? '：' + e.message : ''));
            }
        }
    }

    /**
     * 从数据库同步版本列表（读接口开放）：拿到后整体替换本地并重绘。
     * 连不上后端 / 拉取失败时保持本地（缓存或出厂默认），控制台留痕。
     */
    async syncVersionsFromServer() {
        const remote = await ServerVersionStore.fetchRemote();
        if (!remote) return;

        this.versions = remote;
        if (remote.indexOf(this.serverVersion) < 0) {
            // 当前选中的版本在库里已不存在：落到第一个（随后的 loadServerList 会按新版本拉）
            this.serverVersion = remote[0];
            if (window.ServerVersionStore) ServerVersionStore.setSelected(this.serverVersion);
        }
        this.initVersionSelector();
        this.renderVersionManage();
        this.loadServerList(this.currentFilter, false);
    }

    /**
     * 添加版本：成功落库后自动选中该版本并加载对应服务器列表
     */
    async addVersion() {
        const input = document.getElementById('versionAddInput');
        if (!input) return;

        const s = ServerVersionStore.normOne(input.value);
        if (!s) {
            SCUtils.toast('error', this.getServerText('versionInvalid'));
            return;
        }
        if (this.versions.indexOf(s) >= 0) {
            SCUtils.toast('error', this.getServerText('versionExists'));
            return;
        }

        await this._saveVersions(this.versions.concat([s]), (saved) => {
            this.versions = saved;
            input.value = '';
            this.selectVersion(s);
        });
    }

    /**
     * 重命名版本（改的是透传给 API 的 ?version= 参数，改名后按新版本重新拉取）
     * @param {string} version - 原版本号
     */
    renameVersion(version) {
        const next = window.prompt(this.getServerText('versionRename') + ': ' + version, version);
        if (next == null) return;   // 用户取消

        const s = ServerVersionStore.normOne(next);
        if (!s || s === version) return;
        if (this.versions.indexOf(s) >= 0) {
            SCUtils.toast('error', this.getServerText('versionExists'));
            return;
        }

        this._saveVersions(this.versions.map(v => (v === version ? s : v)), (saved) => {
            this.versions = saved;
            if (this.serverVersion === version) {
                // 改的是当前选中的版本：选中态跟着走
                this.serverVersion = s;
                if (window.ServerVersionStore) ServerVersionStore.setSelected(s);
            }
            this.initVersionSelector();
            this.renderVersionManage();
            this.loadServerList(this.currentFilter, false);
        });
    }

    /**
     * 删除版本：至少保留一个；删当前选中版本时自动落到剩余第一个并重新加载
     * @param {string} version - 待删除版本号
     */
    removeVersion(version) {
        if (this.versions.length <= 1) {
            SCUtils.toast('error', this.getServerText('versionLast'));
            return;
        }
        if (!window.confirm(this.getServerText('versionDeleteConfirm') + '\n' + version)) return;

        this._saveVersions(this.versions.filter(v => v !== version), (saved) => {
            this.versions = saved;
            if (this.serverVersion === version) {
                this.selectVersion(this.versions[0]);
            } else {
                this.initVersionSelector();
                this.renderVersionManage();
            }
        });
    }

    /**
     * 选中某个版本：写本机、同步下拉与菜单高亮，并按该版本加载列表
     * @param {string} version - 目标版本号
     */
    selectVersion(version) {
        console.log('版本变更为:', version);
        this.serverVersion = version;
        if (window.ServerVersionStore) ServerVersionStore.setSelected(version);
        this.initVersionSelector();
        this.renderVersionManage();
        this.loadServerList(this.currentFilter, false);
    }

    /**
     * 绑定事件监听：版本变更、代理切换、刷新按钮、语言切换
     */
    bindEvents() {
        const versionSelector = document.getElementById('versionSelector');
        if (versionSelector) {
            versionSelector.addEventListener('change', (e) => this.onVersionChange(e.target));
        }

        const proxyBtn = document.getElementById('proxyBtn');
        if (proxyBtn) {
            proxyBtn.addEventListener('click', () => this.toggleProxy());
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadServerList(this.currentFilter, true));
        }

        // 监听语言切换事件，实时更新界面文本
        document.addEventListener('languageChanged', (e) => {
            this.onLanguageChanged(e.detail ? e.detail.lang : this.languageManager.currentLang);
        });
    }

    /**
     * 语言切换回调：更新静态文本、筛选按钮并刷新显示
     * @param {string} lang - 新的语言代码
     */
    onLanguageChanged(lang) {
        this.listView.updateServerTexts(lang, this.apiClient.useCorsProxy);
        this.listView.updateFilterButtons(lang);
        this.updateVersionManageTexts();
        this.renderVersionManage();
        this.refreshServerDisplayIfNeeded(lang);
    }

    /**
     * 如果当前已加载服务器列表，则重新渲染以应用新语言
     * @param {string} lang - 语言代码
     */
    refreshServerDisplayIfNeeded(lang) {
        if (this.listView.currentStatus === 'ready' && this.listView.lastFilteredCount > 0) {
            const servers = this.cache.getCachedData(this.serverVersion);
            if (servers) {
                this.listView.render(servers, this.currentFilter);
            }
        }
    }

    /**
     * 获取指定语言的翻译对象
     * @param {string} [lang] - 语言代码，默认使用当前语言
     * @returns {Object} 翻译对象
     */
    getTranslations(lang) {
        const langToUse = lang || (this.languageManager ? this.languageManager.currentLang : 'zh');
        return this.languageManager.getTranslations(langToUse);
    }

    /**
     * 获取服务器相关文本
     * @param {string} key - 文本键
     * @returns {string} 翻译后的文本
     */
    getServerText(key) {
        const translations = this.getTranslations();
        if (!translations || !translations.server) return key;
        return translations.server[key] || key;
    }

    /**
     * 获取统计数据文本
     * @param {string} key - 文本键
     * @returns {string} 翻译后的文本
     */
    getStatsText(key) {
        const translations = this.getTranslations();
        if (!translations || !translations.stats) return key;
        return translations.stats[key] || key;
    }

    /**
     * 异步加载服务器列表
     * 编排：优先使用缓存（非强制刷新时）→ 网络获取 → 失败回退缓存
     * @param {string} [filter] - 筛选条件 (all/lobby/premium/community)
     * @param {boolean} [forceRefresh] - 是否强制刷新（忽略缓存）
     */
    async loadServerList(filter = this.currentFilter, forceRefresh = false) {
        this.currentFilter = filter;
        const apiUrl = `${this.apiUrl}?version=${encodeURIComponent(this.serverVersion)}`;

        this.listView.showConnecting();

        if (!forceRefresh) {
            const cachedServers = this.cache.getCachedData(this.serverVersion);
            if (cachedServers) {
                console.log('使用缓存数据');
                this.listView.render(cachedServers, filter);
                this.fetchAndUpdateCache(apiUrl);
                return;
            }
        }

        let data = null;
        try {
            data = await this.apiClient.fetchWithRetry(apiUrl);
        } catch (e) {
            console.warn('API请求失败:', e.message);
        }

        if (!data) {
            const cachedServers = this.cache.getCachedData(this.serverVersion);
            if (cachedServers) {
                console.log('API请求失败，使用缓存数据');
                this.listView.render(cachedServers, filter);
                return;
            }
            this.listView.setStatus('loadFailed');
            this.listView.showLoadFailed();
            return;
        }

        const servers = this.apiClient.extractServerList(data);
        if (!servers || servers.length === 0) {
            console.log('服务器列表为空');
            this.listView.setStatus('loadFailed');
            this.listView.showNoServers();
            return;
        }

        this.cache.saveToCache(this.serverVersion, servers);
        this.listView.render(servers, filter);
    }

    /**
     * 后台异步获取新数据并更新缓存（不阻塞当前显示）
     * @param {string} apiUrl - API 请求地址
     */
    async fetchAndUpdateCache(apiUrl) {
        try {
            const data = await this.apiClient.fetchWithRetry(apiUrl);
            if (data) {
                const servers = this.apiClient.extractServerList(data);
                if (servers && servers.length > 0) {
                    this.cache.saveToCache(this.serverVersion, servers);
                    this.listView.render(servers, this.currentFilter);
                    console.log('缓存已更新');
                }
            }
        } catch (e) {
            console.log('后台更新缓存失败:', e.message);
        }
    }

    /**
     * 切换 CORS 代理模式
     * 在直连模式和代理模式之间切换，并强制刷新服务器列表
     */
    toggleProxy() {
        const useCorsProxy = this.apiClient.toggleUseCorsProxy();
        const proxyBtn = document.getElementById('proxyBtn');

        if (useCorsProxy) {
            proxyBtn.textContent = '🌐 ' + (this.getServerText('proxyMode') || '代理模式');
            proxyBtn.classList.add('proxy-active');
            console.log('启用公共CORS代理作为后备');
        } else {
            proxyBtn.textContent = '🔗 ' + (this.getServerText('directMode') || '直连模式');
            proxyBtn.classList.remove('proxy-active');
            console.log('仅使用自建代理和直连');
        }

        this.loadServerList(this.currentFilter, true);
    }

    /**
     * 版本变更处理：统一走 selectVersion（写本机、同步高亮、按缓存优先加载列表）
     * @param {HTMLSelectElement} selectElement - 版本选择器元素
     */
    onVersionChange(selectElement) {
        const newVersion = selectElement.value;
        if (newVersion && newVersion !== this.serverVersion) {
            this.selectVersion(newVersion);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig, window.ServerLanguageConfig)
    });
    window.onlineServerManager = new OnlineServerManager(app);
});
