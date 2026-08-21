/**
 * 模型Meshes读取器 - 页面脚本
 * 负责初始化页面、绑定主题/语言切换事件
 * 依赖注入：共享管理器由组合根 SCApp.create 创建后注入
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = SCApp.create({
        languageConfig: SCUtils.mergeConfigs(window.SiteLanguageConfig)
    });
    console.log('[MeshReader] 页面初始化完成');
});
