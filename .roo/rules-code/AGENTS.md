# Code Mode Rules

## 非显而易见的编码规则

- **中文文件名**: 上传文件名必须通过 `Buffer.from(name, 'latin1').toString('utf8')` 转换
- **shared_files 目录**: 必须存在，否则上传会失败（无自动创建逻辑）
- **API 响应格式**: 成功返回 `{ message: '...' }`，文件列表返回 `[{ name, size, mtime }]`
- **路径安全检查**: 删除文件时检查 `..`、`/`、`\\` 字符（[`server.js:94`](server.js:94)）
