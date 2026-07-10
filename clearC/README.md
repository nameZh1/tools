# ClearC - C盘空间释放工具

将 C 盘文件/文件夹移动到其他磁盘，在原位创建符号链接，程序和快捷方式照常使用。

## 使用方式

### 直接运行（开发模式）

```bash
cd D:\Desktop\zh1\tools\clearC
python main.py
```

会自动请求管理员权限（UAC 弹窗）。

### 双击运行（打包后）

双击 `dist\ClearC.exe` 即可，自带管理员权限请求。

---

## 自行打包

### 前提条件

```bash
pip install customtkinter pyinstaller
```

### 打包命令

```bash
cd D:\Desktop\zh1\tools\clearC
pyinstaller clearc.spec
```

产物在 `dist\ClearC.exe`，约 13MB，单文件免安装。

### 打包参数说明（clearc.spec）

| 参数 | 作用 |
|------|------|
| `onefile=True` | 打包为单个 exe |
| `console=False` | 不显示命令行窗口 |
| `uac_admin=True` | 启动时请求管理员权限 |
| `icon='clearc.ico'` | 应用图标（UAC manifest 嵌入必需） |
| `upx=True` | 压缩减小体积 |

### 等效命令行打包（不用 spec 文件）

```bash
pyinstaller --onefile --noconsole --uac-admin --icon=clearc.ico --name=ClearC main.py
```

### 注意事项

1. `--uac-admin` 必须配合 `--icon` 使用，否则 manifest 不会正确嵌入
2. 打包前确保 `clearc.ico` 存在于项目根目录
3. 如果打包后 UAC 未触发，程序内有代码层提权兜底（main.py 中的 `run_as_admin`）
4. 每次修改代码后重新打包：先删除 `build/` 和 `dist/` 目录再执行

### 清理重新打包

```bash
rd /s /q build dist
pyinstaller clearc.spec
```

---

## 功能说明

- 左侧：C 盘文件浏览器，可展开/进入目录，显示文件大小和风险状态
- 中间：操作按钮（移动并链接、计算大小、显示/隐藏隐藏文件）
- 右侧：目标磁盘和目录选择，显示剩余空间
- 底部：操作日志

## 风险标识

- 红色（禁止）：Windows、System32、pagefile 等系统关键路径
- 黄色（警告）：Program Files、AppData 等，操作前会额外确认
- 绿色（安全）：普通文件和目录

## 操作流程

1. 左侧选中要移动的文件/文件夹
2. 右侧选择目标磁盘和目录
3. 点击 "移动并链接"
4. 确认对话框中核实信息
5. 确认后自动执行：移动 -> 创建链接 -> 验证
