import os
import threading
import customtkinter as ctk
from config import (
    WINDOW_TITLE, WINDOW_SIZE, MIN_WINDOW_SIZE,
    APPEARANCE_MODE, COLOR_THEME
)
from widgets.file_browser import FileBrowser
from widgets.target_selector import TargetSelector
from widgets.log_panel import LogPanel
from core.fs_ops import move_and_link
from core.safety import assess_risk, RiskLevel, check_target_space, is_already_symlink
from core.scanner import calc_dir_size


class ClearCApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        ctk.set_appearance_mode(APPEARANCE_MODE)
        ctk.set_default_color_theme(COLOR_THEME)

        self.title(WINDOW_TITLE)
        self.geometry(f"{WINDOW_SIZE[0]}x{WINDOW_SIZE[1]}")
        self.minsize(*MIN_WINDOW_SIZE)

        self._moving = False
        self._build_layout()
        self.log_panel.log("就绪，等待操作")

    def _build_layout(self):
        # 主内容区
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=5, pady=5)
        content.grid_columnconfigure(0, weight=5)
        content.grid_columnconfigure(1, weight=0)
        content.grid_columnconfigure(2, weight=4)
        content.grid_rowconfigure(0, weight=1)

        # 左侧：文件浏览器
        self.file_browser = FileBrowser(content)
        self.file_browser.grid(row=0, column=0, sticky="nsew", padx=(0, 3))

        # 中间：操作按钮
        btn_frame = ctk.CTkFrame(content, width=120, fg_color="transparent")
        btn_frame.grid(row=0, column=1, sticky="ns", padx=5)
        btn_frame.grid_propagate(False)

        spacer_top = ctk.CTkFrame(btn_frame, fg_color="transparent")
        spacer_top.pack(expand=True)

        self.move_btn = ctk.CTkButton(
            btn_frame, text=">> 移动并链接", width=110,
            command=self._on_move_click
        )
        self.move_btn.pack(pady=5)

        self.calc_btn = ctk.CTkButton(
            btn_frame, text="计算大小", width=110,
            command=self._on_calc_size
        )
        self.calc_btn.pack(pady=5)

        self.show_hidden_var = ctk.BooleanVar(value=False)
        self.hidden_cb = ctk.CTkCheckBox(
            btn_frame, text="隐藏文件",
            variable=self.show_hidden_var,
            command=self._on_toggle_hidden
        )
        self.hidden_cb.pack(pady=10)

        spacer_bottom = ctk.CTkFrame(btn_frame, fg_color="transparent")
        spacer_bottom.pack(expand=True)

        # 右侧：目标选择器
        self.target_selector = TargetSelector(content)
        self.target_selector.grid(row=0, column=2, sticky="nsew", padx=(3, 0))

        # 底部：日志面板
        self.log_panel = LogPanel(self, height=150)
        self.log_panel.pack(fill="x", padx=5, pady=(3, 5))

    def _on_move_click(self):
        if self._moving:
            self.log_panel.log_warning("正在执行移动操作，请等待完成")
            return

        selected = self.file_browser.get_selected_items()
        if not selected:
            self.log_panel.log_warning("请先选择要移动的文件或文件夹")
            return

        target_dir = self.target_selector.get_target_path()
        if not target_dir:
            self.log_panel.log_warning("请先选择目标路径")
            return

        # 风险检查
        blocked = []
        warnings = []
        safe = []

        for path in selected:
            risk = assess_risk(path)
            if risk == RiskLevel.FORBIDDEN:
                blocked.append(path)
            elif risk == RiskLevel.WARNING:
                warnings.append(path)
            else:
                safe.append(path)

        if blocked:
            self.log_panel.log_error(f"以下路径为系统关键路径，禁止移动：")
            for p in blocked:
                self.log_panel.log_error(f"  {p}")
            if not safe and not warnings:
                return

        items_to_move = safe + warnings
        if not items_to_move:
            return

        # 检查是否已是 symlink
        already_linked = [p for p in items_to_move if is_already_symlink(p)]
        if already_linked:
            self.log_panel.log_warning("以下路径已是符号链接，跳过：")
            for p in already_linked:
                self.log_panel.log_warning(f"  {p}")
            items_to_move = [p for p in items_to_move if p not in already_linked]
            if not items_to_move:
                return

        # 弹出确认对话框
        self._show_confirm_dialog(items_to_move, warnings, target_dir)

    def _show_confirm_dialog(self, items, warnings, target_dir):
        dialog = ctk.CTkToplevel(self)
        dialog.title("确认操作")
        dialog.geometry("500x400")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()

        # 居中
        dialog.update_idletasks()
        x = self.winfo_x() + (self.winfo_width() - 500) // 2
        y = self.winfo_y() + (self.winfo_height() - 400) // 2
        dialog.geometry(f"+{x}+{y}")

        ctk.CTkLabel(
            dialog, text="确认移动并创建链接？",
            font=("Microsoft YaHei UI", 14, "bold")
        ).pack(pady=(15, 10))

        info_frame = ctk.CTkFrame(dialog)
        info_frame.pack(fill="both", expand=True, padx=15, pady=5)

        info_text = ctk.CTkTextbox(info_frame, font=("Consolas", 10))
        info_text.pack(fill="both", expand=True, padx=5, pady=5)

        info_text.insert("end", "即将执行以下操作：\n\n")
        for path in items:
            name = os.path.basename(path)
            prefix = "[!] " if path in warnings else "    "
            info_text.insert("end", f"{prefix}{path}\n")
            info_text.insert("end", f"    -> {os.path.join(target_dir, name)}\n\n")

        if warnings:
            info_text.insert("end", "\n[!] 标记项为系统相关目录，移动可能影响部分程序\n")

        info_text.insert("end", f"\n目标目录: {target_dir}\n")
        info_text.configure(state="disabled")

        btn_frame = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_frame.pack(fill="x", padx=15, pady=15)

        ctk.CTkButton(
            btn_frame, text="取消", width=100, fg_color="gray",
            command=dialog.destroy
        ).pack(side="right", padx=5)

        ctk.CTkButton(
            btn_frame, text="确认执行", width=100,
            command=lambda: self._confirm_move(dialog, items, target_dir)
        ).pack(side="right", padx=5)

    def _confirm_move(self, dialog, items, target_dir):
        dialog.destroy()
        self._execute_moves(items, target_dir)

    def _execute_moves(self, items, target_dir):
        self._moving = True
        self.move_btn.configure(state="disabled")
        self.log_panel.log(f"开始移动 {len(items)} 个项目到 {target_dir}")

        def worker():
            for path in items:
                name = os.path.basename(path)
                self.after(0, self.log_panel.log, f"正在移动: {name}...")

                result = move_and_link(
                    path, target_dir,
                    progress_callback=lambda msg: self.after(0, self.log_panel.log, msg)
                )

                if result.success:
                    self.after(0, self.log_panel.log_success,
                              f"完成: {name} ({self._format_size(result.bytes_moved)})")
                    self.after(0, self.target_selector.add_moved_item, path, result.target)
                else:
                    self.after(0, self.log_panel.log_error,
                              f"失败: {name} - {result.error_msg}")

            self.after(0, self._on_moves_complete)

        threading.Thread(target=worker, daemon=True).start()

    def _on_moves_complete(self):
        self._moving = False
        self.move_btn.configure(state="normal")
        self.target_selector.refresh_space()
        self.file_browser.refresh()
        self.log_panel.log("所有操作已完成")

    def _on_calc_size(self):
        selected = self.file_browser.get_selected_items()
        if not selected:
            self.log_panel.log_warning("请先选择文件或文件夹")
            return

        self.calc_btn.configure(state="disabled")
        self.log_panel.log(f"正在计算 {len(selected)} 个项目的大小...")

        def worker():
            total = 0
            for path in selected:
                size = calc_dir_size(path)
                total += size
                name = os.path.basename(path)
                self.after(0, self.log_panel.log,
                           f"  {name}: {self._format_size(size)}")

            self.after(0, self.log_panel.log_success,
                       f"选中总大小: {self._format_size(total)}")
            self.after(0, lambda: self.calc_btn.configure(state="normal"))

        threading.Thread(target=worker, daemon=True).start()

    def _on_toggle_hidden(self):
        self.file_browser.set_show_hidden(self.show_hidden_var.get())

    def _format_size(self, size_bytes):
        if size_bytes < 0:
            return "--"
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 ** 2:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 ** 3:
            return f"{size_bytes / (1024**2):.1f} MB"
        else:
            return f"{size_bytes / (1024**3):.2f} GB"
