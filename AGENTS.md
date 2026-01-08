# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目概述

局域网文件/文本共享应用 - Node.js + Express 单文件服务器，无构建步骤。

## 命令

- `npm start` - 启动服务器（端口 3000，自动递增如被占用）

## 非显而易见的模式

- **UTF-8 文件名处理**: [`server.js:24`](server.js:24) 使用 `Buffer.from(file.originalname, 'latin1').toString('utf8')` 修复中文文件名
- **端口自动递增**: 端口被占用时自动尝试下一个端口（见 [`startServer()`](server.js:127)）
- **文本自动保存**: 前端文本框有 1 秒防抖自动保存（[`index.html:698`](public/index.html:698)）
- **共享文本存储**: 文本保存在项目根目录 `shared_text.txt`，非数据库

## 目录结构

- `shared_files/` - 上传文件存储目录（必须存在）
- `public/` - 静态前端文件
- `shared_text.txt` - 共享文本持久化文件

## 安全注意

- 文件删除 API 有基本路径遍历检查（[`server.js:94`](server.js:94)），但无认证机制
- 仅限局域网使用，不应暴露到公网
