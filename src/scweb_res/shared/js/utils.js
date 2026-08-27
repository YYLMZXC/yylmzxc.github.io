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
