/**
 * 生存战争Mod开发工具包 - 工具逻辑
 * 包含三大功能模块：
 *   - Emmet转换工具：XML与Emmet互转
 *   - BlocksData编辑器：CSV文件可视化编辑
 *   - Guid去重器：分析并去除重复的Guid
 *
 * 模块划分（高内聚低耦合）：
 *   - CsvParser          CSV解析/转换纯函数
 *   - EmmetBridge        Emmet转换桥接（依赖外部 emmetLite）
 *   - GuidDeduplicator   Guid分析/去重纯函数
 *   - ModDevKitPageManager  页面编排门面
 */

/* ========================================================================
 * 模块一：CsvParser - CSV解析与转换
 * ====================================================================== */
class CsvParser {
    /**
     * 解析CSV字符串为二维数组
     * @param {string} s - CSV内容
     * @param {string|RegExp} [a] - 行分隔符，默认 /\r?\n/
     * @param {string} [b] - 列分隔符，默认 ";"
     * @returns {string[][]}
     */
    static read(s, a, b) {
        b = b || ';';
        s = s.split(a || /\r?\n/);
        for (var i = 0; i < s.length; !s[i][0] ? s.splice(i, 1) : i++) {
            s[i] = s[i].split(b);
        }
        return s;
    }

    /**
     * 二维数组与HTML表格互转
     * @param {string|string[][]} s - 输入
     * @param {boolean} m - true=表格→文本, false=文本→表格HTML
     * @param {string} [a] - 行分隔符
     * @param {string} [b] - 列分隔符
     * @returns {string}
     */
    static d_t(s, m, a, b) {
        if (!m) {
            for (var i = (s = s.join ? s : CsvParser.read(s, a, b)).length; i--;) {
                s[i] = s[i].join('</td><td>');
            }
            return '<tr><td>' + s.join(a || '</td></tr><tr><td>') + '</td></tr>';
        }
        return s
            .replace(/<(?:\/?tbody|tr|td)>/gi, '')
            .replace(/<\/tr>/gi, a = a || '\r\n')
            .replace(/<\/t(?:d|h)>/gi, b || ';')
            .replace(RegExp(b + a, 'g'), a);
    }

    /**
     * 中文替换映射
     * @param {string} a - 原文
     * @param {string} b - 映射表（%分隔的csv）
     * @param {boolean} m - true=反向替换
     * @returns {string}
     */
    static translate(a, b, m) {
        if (!b) return a;
        for (var i = 0, l = (b = b.join ? b : CsvParser.read(b, '%')).length; i < l; i++) {
            a = m ? a.replace(b[i][2], b[i][1]) : a.replace(b[i][1], b[i][2]);
        }
        return a;
    }
}

/* ========================================================================
 * 模块二：EmmetBridge - Emmet转换桥接
 * ====================================================================== */
class EmmetBridge {
    /**
     * 判断当前内容类型
     * @param {string} val - 编辑器内容
     * @returns {{type: string, label: string}}
     */
    static detectType(val) {
        if (val.length === 0) return { type: '', label: '' };
        var isCsv = val.search(/^.+?(;(?![\x00-\x40\x5b-\x60\x7b-\xff])\S+\b)+\n/) === 0;
        if (isCsv || val[0] === '<') {
            return { type: 'plain/text', label: isCsv ? 'CSV' : 'xml' };
        }
        return { type: 'text/xml', label: 'Emmet' };
    }

    /**
     * 执行Emmet转换
     * @param {string} str - 输入内容
     * @param {string} inputType - 内容类型
     * @param {Object} options - 转换选项
     * @returns {string} 转换结果
     */
    static convert(str, inputType, options) {
        function div() { return 'div'; }
        var tab = options.tab;
        var indent = options.indent;
        var implicitTags = options.implicitTags;
        var abbreviations = options.abbreviations;

        try {
            if (inputType.length === 8) {
                str = Emmet(str, tab ? indent : null, implicitTags ? null : div, abbreviations ? aabbr : {});
                if (tab) str = EmmetBridge.formatXml(str, indent);
            } else {
                str = EmmetBridge.html2emmet(str.replace(/&/g, '&amp;'), indent);
            }
            return str;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 格式化XML
     * @param {string} e - XML字符串
     * @param {string} s - 缩进字符串
     * @returns {string}
     */
    static formatXml(e, s) {
        for (var c = e.replace(/>\s{0}</g, "><").replace(/</g, "~::~<")
            .replace(/\s*xmlns\:/g, "~::~xmlns:").replace(/\s*xmlns\=/g, "~::~xmlns=")
            .split("~::~"), r = c.length, a = false, h = 0, l = "", n = 0, x = ["\n"]; n < 200; n++) x.push(x[n] + s);
        for (n = 0; n < r; n++)
            c[n].search(/<!/) > -1 ? (l += x[h] + c[n], a = true, (c[n].search(/--/) > -1 || c[n].search(/\]>/) > -1 || c[n].search(/!DOCTYPE/) > -1) && (a = false)) :
            c[n].search(/--/) > -1 || c[n].search(/\]>/) > -1 ? (l += c[n], a = false) :
            /^<\w/.exec(c[n - 1]) && /^<\/\w/.exec(c[n]) && /^<[\w:\-\.\,]+/.exec(c[n - 1]) == /^<\/[\w:\-\.\,]+/.exec(c[n])[0].replace("/", "") ? (l += c[n], a || h--) :
            c[n].search(/<\w/) > -1 && -1 == c[n].search(/<\//) && -1 == c[n].search(/\/>/) ? l = l += a ? c[n] : x[h++] + c[n] :
            c[n].search(/<\w/) > -1 && c[n].search(/<\//) > -1 ? l = l += a ? c[n] : x[h] + c[n] :
            c[n].search(/<\//) > -1 ? l = l += a ? c[n] : x[--h] + c[n] :
            c[n].search(/\/>/) > -1 ? l = l += a ? c[n] : x[h] + c[n] :
            c[n].search(/<\?/) > -1 ? l += x[h] + c[n] :
            c[n].search(/xmlns\:/) > -1 || c[n].search(/xmlns\=/) > -1 ? l += x[h] + c[n] :
            l += c[n];
        return "\n" == l[0] ? l.slice(1) : l;
    }

    /**
     * HTML转Emmet（简化版，依赖外部 emmetLite 的 html2emmet）
     * @param {string} html
     * @param {string} indent
     * @returns {string}
     */
    static html2emmet(html, indent) {
        // 委托给外部 emmetLite 库的 html2emmet 函数
        return (typeof html2emmet === 'function') ? html2emmet(html, indent) : html;
    }
}

/* ========================================================================
 * 模块三：GuidDeduplicator - Guid分析与去重
 * ====================================================================== */
class GuidDeduplicator {
    /** Guid正则：带花括号或不带花括号 */
    static GUID_PATTERN = /"\sGuid="((\{)?[\d|a-f]{8}-[\d|a-f]{4}-[\d|a-f]{4}-[\d|a-f]{4}-[\d|a-f]{12}(\})?)"/g;
    /** 紧凑Guid正则：32位无横杠 */
    static GUID_PATTERN_COMPACT = /"\sGuid="([\d|a-f]{32})"/g;

    /**
     * 分析内容中的重复Guid
     * @param {string} content
     * @returns {{ duplicates: string[], duration: number }}
     */
    static analyze(content) {
        var timeStart = Date.now();
        var seen = {};
        var duplicates = [];
        var matches = (content.match(GuidDeduplicator.GUID_PATTERN) || [])
            .concat(content.match(GuidDeduplicator.GUID_PATTERN_COMPACT) || []);

        matches.forEach(function(val) {
            var guid = val.slice(8, -1).replace(/-/g, '');
            if (!seen[guid]) {
                seen[guid] = true;
            } else {
                duplicates.push(val.slice(8, -1));
            }
        });

        return {
            duplicates: duplicates,
            duration: Date.now() - timeStart
        };
    }

    /**
     * 去除重复Guid并生成新Guid
     * @param {string} content
     * @param {boolean} minimize - 是否使用最简Guid
     * @returns {{ result: string, count: number, log: string[], duration: number }}
     */
    static deduplicate(content, minimize) {
        var timeStart = Date.now();
        var seen = {};
        var count = 0;
        var log = [];
        var repPattern = minimize
            ? "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx"
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

        function generateGuid(c) {
            var r = Math.random() * 16 | 0;
            return (c == 'x' ? r : (r & 3 | 8)).toString(16);
        }

        var result = content
            .replace(GuidDeduplicator.GUID_PATTERN, function(a, guid) {
                var key = guid.replace(/-/g, '');
                if (!seen[key]) {
                    seen[key] = true;
                    return a;
                }
                var newGuid = repPattern.replace(/[xy]/g, generateGuid);
                count++;
                log.push('已将' + guid + '替换成' + newGuid);
                return ' Guid="' + newGuid + '"';
            })
            .replace(GuidDeduplicator.GUID_PATTERN_COMPACT, function(a, guid) {
                if (!seen[guid]) {
                    seen[guid] = true;
                    return a;
                }
                var newGuid = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, generateGuid);
                count++;
                log.push('已将' + guid + '替换成' + newGuid);
                return ' Guid="' + newGuid + '"';
            });

        return {
            result: result,
            count: count,
            log: log,
            duration: Date.now() - timeStart
        };
    }
}

/* ========================================================================
 * 模块四：ModDevKitPageManager - 页面编排门面
 * ====================================================================== */
class ModDevKitPageManager {
    constructor() {
        this.editor = null;   // CodeMirror 源编辑器
        this.dst = null;      // CodeMirror 目标编辑器
        this.output = null;   // 日志输出容器
        this.init();
    }

    init() {
        this.initCodeMirror();
        this.bindEvents();
        console.log('[ModDevKitPageManager] 初始化完成');
    }

    /** 初始化CodeMirror编辑器 */
    initCodeMirror() {
        if (typeof CodeMirror === 'undefined') {
            console.error('[ModDevKitPageManager] CodeMirror 未加载');
            return;
        }

        var opt = {
            tabSize: 4,
            mode: 'css',
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            styleActiveLine: true
        };

        var srcEl = document.getElementById('src');
        var dstEl = document.getElementById('dst');
        if (srcEl) this.editor = CodeMirror.fromTextArea(srcEl, opt);
        if (dstEl) this.dst = CodeMirror.fromTextArea(dstEl, opt);

        this.output = document.getElementById('output');

        // 内容类型自动检测
        if (this.editor) {
            this.editor.on('change', () => this.onEditorChange());
        }
    }

    /** 编辑器内容变化回调：自动检测语言类型 */
    onEditorChange() {
        var val = this.editor.getValue().trim();
        var detected = EmmetBridge.detectType(val);

        var lngEl = document.getElementById('lng');
        if (lngEl) lngEl.textContent = detected.label;

        var fnameEl = document.getElementById('fname');
        if (detected.label === 'CSV') {
            this.editor.setOption('mode', '');
            this.dst.setOption('mode', '');
            if (fnameEl) fnameEl.value = 'out.csv';
        } else if (detected.label === 'xml') {
            this.editor.setOption('mode', 'xml');
            this.dst.setOption('mode', '');
            if (fnameEl) fnameEl.value = 'out.txt';
        } else {
            this.editor.setOption('mode', 'css');
            this.dst.setOption('mode', 'xml');
            if (fnameEl) fnameEl.value = 'out.xml';
        }
    }

    /** 绑定所有UI事件 */
    bindEvents() {
        // 主题切换
        var themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', () => this.changeTheme(themeSelect.value));
        }

        // Emmet转换
        var convBtn = document.getElementById('convBtn');
        if (convBtn) {
            convBtn.addEventListener('click', () => this.convertEmmet());
        }

        // BlocksData生成表格
        var genTableBtn = document.getElementById('genTableBtn');
        if (genTableBtn) {
            genTableBtn.addEventListener('click', () => this.generateTable());
        }

        // Guid解析
        var analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeGuid());
        }

        // Guid去重
        var deduplicateBtn = document.getElementById('deduplicateBtn');
        if (deduplicateBtn) {
            deduplicateBtn.addEventListener('click', () => this.deduplicateGuid());
        }

        // 下载
        var downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.download());
        }

        // 拖放文件
        var dropzone = document.getElementById('dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
            dropzone.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); this.loadFiles(e.dataTransfer.files); });
        }

        // 文件选择
        var fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.loadFiles(e.target.files));
        }
    }

    /** 切换CodeMirror主题 */
    changeTheme(theme) {
        if (this.editor) this.editor.setOption('theme', theme);
        if (this.dst) this.dst.setOption('theme', theme);
    }

    /** 加载文件到编辑器 */
    loadFiles(files) {
        if (!files || !files.length) return;
        var reader = new FileReader();
        reader.onload = (e) => {
            if (this.editor) this.editor.setValue(e.target.result);
        };
        reader.readAsText(files[0]);
    }

    /** 执行Emmet转换 */
    convertEmmet() {
        if (!this.editor || !this.dst) return;
        var str = this.editor.getValue();
        var inputType = EmmetBridge.detectType(str).label;

        try {
            var options = {
                tab: document.getElementById('tab') ? document.getElementById('tab').checked : true,
                indent: document.getElementById('ind') ? document.getElementById('ind').value : '  ',
                implicitTags: document.getElementById('itags') ? document.getElementById('itags').checked : true,
                abbreviations: document.getElementById('abbr') ? document.getElementById('abbr').checked : true
            };
            str = EmmetBridge.convert(str, inputType === 'CSV' ? 'csv' : inputType, options);
            this.dst.setValue(str);
        } catch (e) {
            this.logError(e.message || e);
            throw e;
        }
    }

    /** 生成BlocksData表格 */
    generateTable() {
        if (!this.editor) return;
        var ca = document.getElementById('ca');
        var cn = document.getElementById('cn');
        var lf = document.getElementById('lf');
        var c = document.getElementById('c');
        var fname = document.getElementById('fname');

        var content = this.editor.getValue();
        // 中文属性名替换
        if (ca && ca.checked && typeof ba !== 'undefined') {
            content = CsvParser.translate(content, ba);
        }
        // 中文方块名替换
        if (cn && cn.checked && typeof bc !== 'undefined') {
            content = CsvParser.translate(content, bc);
        }

        var rows = CsvParser.read(content);
        var lineSep = (lf && lf.checked) ? '\n' : '\r\n';
        var colSep = c ? c.value : ';';
        var text = CsvParser.d_t(rows, 1, lineSep, colSep);

        // 打印到新窗口
        var w = window.open('', 'editor');
        if (w) {
            w.document.write('<html><head><title>BlocksData Editor</title></head><body>');
            w.document.write('<table border="1"><tbody>' + CsvParser.d_t(rows) + '</tbody></table>');
            w.document.write('</body></html>');
            w.document.close();
        }
    }

    /** 分析Guid重复 */
    analyzeGuid() {
        if (!this.editor) return;
        var content = this.editor.getValue();
        var result = GuidDeduplicator.analyze(content);
        this.log(result.duplicates.length > 0
            ? '有' + result.duplicates.length + '个重复的Guid'
            : '没有重复的Guid');
        result.duplicates.forEach(d => this.log(d));
        this.log('本次操作耗时' + result.duration + '毫秒\n');
    }

    /** 去除重复Guid */
    deduplicateGuid() {
        if (!this.editor || !this.dst) return;
        var content = this.editor.getValue();
        var minimize = document.getElementById('minimize') ? document.getElementById('minimize').checked : false;
        var result = GuidDeduplicator.deduplicate(content, minimize);

        this.dst.setValue(result.result);
        this.log(result.count > 0
            ? '共去除' + result.count + '个重复的Guid'
            : '没有重复的Guid');
        result.log.forEach(l => this.log(l));
        this.log('本次操作耗时' + result.duration + '毫秒\n');
    }

    /** 下载输出内容 */
    download() {
        if (!this.dst) return;
        var fnameEl = document.getElementById('fname');
        var fname = fnameEl ? fnameEl.value : 'output.txt';
        var content = this.dst.getValue();
        var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);
    }

    /** 输出日志 */
    log(msg) {
        if (this.output) this.output.innerHTML += msg + '\n';
    }

    /** 输出错误日志 */
    logError(msg) {
        if (this.output) this.output.innerHTML += '<b class="error">' + msg + '</b>\n';
    }
}

/* ==================== 组合根入口 ==================== */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化共享管理器（主题/语言）
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig)
    });

    // 如果 EmmetLite 尚未加载（CDN），等待其就绪
    if (typeof Emmet === 'undefined' || typeof aabbr === 'undefined') {
        console.warn('[ModDevKit] EmmetLite 未加载，Emmet转换功能不可用');
    }
    window.modDevKitPageManager = new ModDevKitPageManager();
});
