# Cloudflare Workers翻译服务部署指南

## 项目概述

本项目已从Google翻译转换为基于Cloudflare Workers AI的翻译服务，提供更稳定、更快速的翻译体验。

## 当前状态

✅ **已完成工作:**
- 创建了Cloudflare Worker翻译API (`worker.js`)
- 移除了所有Google翻译相关代码
- 实现了新的前端翻译逻辑
- 创建了本地测试服务 (`translate-server.php`)

## 文件结构

```
scweb/
├── index.php                 # 主页面文件（已更新翻译逻辑）
├── worker.js                # Cloudflare Worker翻译API代码
├── translate-server.php     # 本地测试服务
└── DEPLOYMENT.md           # 部署指南（本文件）
```

## 部署选项

### 选项1: 使用Cloudflare Workers AI（推荐）

#### 步骤1: 部署Cloudflare Worker

1. **登录Cloudflare Dashboard**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 选择你的域名或创建一个新的Worker

2. **创建Worker**
   ```bash
   # 使用Wrangler CLI（可选）
   npm install -g wrangler
   wrangler login
   wrangler init sc-translate
   cd sc-translate
   ```

3. **部署Worker代码**
   - 将 `worker.js` 内容复制到Cloudflare Worker编辑器
   - 点击"Deploy"部署

4. **获取Worker URL**
   - 部署后会得到类似: `https://sc-translate.your-username.workers.dev`

#### 步骤2: 更新前端配置

修改 `index.php` 中的配置：

```javascript
var translatorConfig = {
    from: "zh",      // 源语言：中文
    workerUrl: "https://你的-worker-url.workers.dev", // 替换为实际URL
    // ... 其他配置
};
```

### 选项2: 使用本地测试服务（开发阶段）

当前配置已经设置为本地测试服务：

```javascript
workerUrl: "http://localhost:8080/translate-server.php"
```

## 使用说明

### 本地测试

1. **启动服务器**
   ```bash
   cd c:\Users\YYLMZXC\Desktop\sc\1\scweb
   php -S localhost:8080
   ```

2. **访问测试**
   - 打开浏览器访问: `http://localhost:8080`
   - 测试翻译功能

### 功能特性

- **27种语言支持**: 涵盖主流国际语言
- **智能进度提示**: 翻译时显示进度动画
- **错误处理**: 完善的错误提示和重试机制
- **CORS支持**: 跨域请求完全支持
- **响应式设计**: 适配PC和移动设备

### 支持的语言

| 语言 | 代码 | 标志 | 说明 |
|------|------|------|------|
| 中文简体 | zh | 🇨🇳 | 默认源语言 |
| 中文繁体 | zh-TW | 🇹🇼 | 台湾繁体 |
| 英语 | en | 🇺🇸 | 默认翻译语言 |
| 日语 | ja | 🇯🇵 | 日本語 |
| 韩语 | ko | 🇰🇷 | 한국어 |
| 法语 | fr | 🇫🇷 | Français |
| 德语 | de | 🇩🇪 | Deutsch |
| 西班牙语 | es | 🇪🇸 | Español |
| 其他语言 | ... | ... | 详见下拉菜单 |

## 故障排除

### 常见问题

1. **翻译服务不可用**
   - 检查Worker URL是否正确
   - 确认Worker已成功部署
   - 查看浏览器控制台错误信息

2. **跨域错误**
   - 确保Worker设置了正确的CORS头部
   - 检查前端请求URL是否正确

3. **翻译失败**
   - 检查文本长度（建议不超过5000字符）
   - 确认语言代码正确
   - 查看网络连接状态

### 调试方法

1. **浏览器控制台**
   - 按F12打开开发者工具
   - 查看Console选项卡的错误信息
   - 检查Network选项卡的请求状态

2. **Worker日志**
   - 在Cloudflare Dashboard查看Worker执行日志
   - 使用 `console.log()` 输出调试信息

## 性能优化

### 建议的改进

1. **缓存机制**
   - 实现翻译结果缓存
   - 减少重复翻译请求

2. **分块翻译**
   - 大文本分块处理
   - 并行翻译提升速度

3. **错误重试**
   - 实现指数退避重试
   - 降级到备用翻译服务

## 安全性

### 注意事项

1. **API密钥保护**
   - 不要在前端暴露敏感API密钥
   - 使用环境变量存储配置

2. **输入验证**
   - 验证翻译文本长度
   - 过滤恶意输入

3. **速率限制**
   - 实施翻译请求频率限制
   - 防止API滥用

## 维护和监控

### 监控指标

- 翻译请求成功率
- 平均响应时间
- 错误率统计
- 用户使用频率

### 定期维护

- 更新依赖包
- 监控API限制
- 优化性能
- 备份配置

## 联系支持

如有问题，请检查：
1. 浏览器控制台错误信息
2. Cloudflare Worker执行日志
3. 网络连接状态
4. 配置参数正确性

---

**最后更新**: 2025年1月14日  
**版本**: v1.0  
**状态**: 生产就绪