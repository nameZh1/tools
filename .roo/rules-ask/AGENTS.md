# Ask Mode Rules

## 非显而易见的文档上下文

- **单文件架构**: 整个后端在 [`server.js`](server.js) 一个文件中，前端在 [`public/index.html`](public/index.html) 一个文件中
- **无测试/无 lint**: 项目没有测试框架或代码检查工具配置
- **中文界面**: 前端 UI 为中文（"局域网极速传"），代码注释为英文
- **API 端点**: `/api/files`（GET/DELETE）、`/api/upload`（POST）、`/api/text`（GET/POST）
