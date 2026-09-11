/**
 * 生存战争网 - 通用工具函数库
 * 提供滚动、剪贴板、防抖节流、IP解析等常用功能
 * 挂载到全局 window.SCUtils
 */
window.SCUtils = {
    /**
     * 滚动到指定元素
     * @param {string} elementId - 目标元素的ID
     * @param {string} behavior - 滚动行为 (smooth | auto | instant)
     */
    scrollToElement(elementId, behavior = 'smooth') {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior, block: 'start' });
        }
    },

    /**
     * 将文本复制到剪贴板
     * 优先使用 Clipboard API，不支持时降级为 execCommand
     * @param {string} text - 要复制的文本
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text)
                .then(() => console.log('[Utils] 文本已复制到剪贴板'))
                .catch(err => console.error('[Utils] 复制失败：', err));
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('[Utils] 文本已复制到剪贴板（降级模式）');
    },

    /**
     * 防抖函数
     * 在事件触发后等待指定时间再执行，期间再次触发则重新计时
     * @param {Function} func - 需要防抖的函数
     * @param {number} wait - 等待毫秒数
     * @returns {Function} 防抖处理后的函数
     */
    debounce(func, wait = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 节流函数
     * 限制函数在指定时间间隔内最多执行一次
     * @param {Function} func - 需要节流的函数
     * @param {number} limit - 时间间隔毫秒数
     * @returns {Function} 节流处理后的函数
     */
    throttle(func, limit = 300) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= limit) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    },

    /**
     * 转义 HTML 特殊字符
     * 供拼接 HTML 字符串时使用，避免内容破坏结构或注入
     * @param {*} s - 任意值，null/undefined 视为空串
     * @returns {string}
     */
    escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    /**
     * 接口基路径：跟随页面所在目录，使同一份代码既能部署在域名根，也能部署在子目录。
     * 需要固定写死时，在本脚本加载之前于页面里设置 window.SITE_NAV_API_BASE。
     * nav-api.js 与 settings-store.js 共用这一份，避免两处各写一套。
     * @returns {string}
     */
    apiBase() {
        if (typeof window.SITE_NAV_API_BASE === 'string') {
            return window.SITE_NAV_API_BASE.replace(/\/$/, '');
        }
        const p = String(window.location.pathname || '/');
        const i = p.lastIndexOf('/');
        return i > 0 ? p.slice(0, i) : '';
    },

    /**
     * 统一的安全轻提示入口：SCToast 未加载时降级为控制台输出，
     * 避免「模块在、toast.js 不在」时抛出 ReferenceError。
     * @param {string} kind - info | ok | error
     * @param {string} message - 提示内容
     */
    toast(kind, message) {
        const t = window.SCToast;
        if (!t) {
            console.log('[toast:' + kind + '] ' + message);
            return;
        }
        const fn = t[kind] || t.info;
        if (fn) fn.call(t, message);
    },

    /**
     * 把「连不上后端 / 未登录 / 数据库出错」的错误对象归成一条能照着做的提示。
     * 判断规则只写这一份，各处只在「离线时的提示语」上讲自己的上下文
     * （导航页提醒域名转发，设置页提醒离线用缓存），避免两处各判一套、越走越偏。
     * @param {Object} [e] - 错误对象，可带 code / status / kind / label / hint
     * @param {Object} [opts] - { offlineHint } 离线（code 为 NOT_API）时的提示语
     * @returns {{kind:string, label:string, reason:string, hint:string}}
     */
    describeError(e, opts) {
        opts = opts || {};

        // 后端不存在：拿到的是 HTML 页面而非 JSON（code = NOT_API），与「后端报错」区分开
        if (!e || e.code === 'NOT_API') {
            return {
                kind: 'offline',
                label: '未连接后端服务',
                reason: '后端没有回应',
                hint: opts.offlineHint || '请先运行「启动主页(带数据库).bat」把后端跑起来。'
            };
        }
        // 未登录：后端是通的，只是这道写操作需要身份，别跟「连不上」混为一谈
        if (e.code === 'UNAUTHORIZED' || e.status === 401) {
            return {
                kind: 'auth',
                label: '未登录，无法保存',
                reason: e.message || '请先登录',
                hint: '在设置下拉的「账号」里登录后再改。'
            };
        }
        // 其余：结论由后端给出（kind / label / hint 随报错带回），这里原样转述
        return {
            kind: e.kind || 'unknown',
            label: e.label || '连接数据库失败',
            reason: e.message || e.label || '未知错误',
            hint: e.hint || ''
        };
    },

    /**
     * 合并站点级与页面级语言配置（深度合并）
     * 页面级配置覆盖站点级对应字段，并保留页面级额外顶层字段（如 navigation）
     * @param {Object} baseConfig - 站点级基础配置
     * @param {Object} pageConfig - 页面级配置
     * @returns {Object} 合并后的配置
     */
    mergeConfigs(baseConfig, pageConfig) {
        pageConfig = pageConfig || {};
        const merged = {
            default: pageConfig.default || baseConfig.default,
            supported: pageConfig.supported || baseConfig.supported,
            storageKey: pageConfig.storageKey || baseConfig.storageKey,
            names: pageConfig.names || baseConfig.names,
            translations: {}
        };

        // 保留页面配置中的额外顶层字段（如 navigation），页面级优先
        Object.keys(pageConfig).forEach(key => {
            if (!(key in merged)) {
                merged[key] = pageConfig[key];
            }
        });

        // 合并所有语言版本的翻译
        const languages = [...new Set([
            ...Object.keys((baseConfig && baseConfig.translations) || {}),
            ...Object.keys((pageConfig && pageConfig.translations) || {})
        ])];

        languages.forEach(lang => {
            const base = (baseConfig.translations && baseConfig.translations[lang]) || {};
            const page = (pageConfig.translations && pageConfig.translations[lang]) || {};
            merged.translations[lang] = this.deepMerge(base, page);
        });

        return merged;
    },

    /**
     * 深度合并两个对象
     * 递归合并嵌套对象，source 属性优先级更高
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并结果
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }
};
