import os
from tkinter import ttk
import customtkinter as ctk

from core.scanner import scan_directory
from config import (
    COLOR_CRITICAL, COLOR_CRITICAL_BG, COLOR_LINKED,
    COLOR_HIDDEN, COLOR_SAFE, TREEVIEW_BG, TREEVIEW_FG,
    TREEVIEW_SELECTED_BG, TREEVIEW_HEADING_BG
)


class FileBrowser(ctk.CTkFrame):

    def __init__(self, master, log_callback=None):
        super().__init__(master)
        self._log_callback = log_callback
        self.current_path = "C:\\"
        self.show_hidden = False
        self._path_map = {}

        self._build_toolbar()
        self._build_treeview()
        self._populate("C:\\")

    def _build_toolbar(self):
        toolbar = ctk.CTkFrame(self, height=36, fg_color="transparent")
        toolbar.pack(fill="x", padx=4, pady=(4, 0))

        self.path_label = ctk.CTkLabel(
            toolbar, text="C:\\", font=("Microsoft YaHei UI", 11),
            anchor="w"
        )
        self.path_label.pack(side="left", fill="x", expand=True, padx=4)

        btn_frame = ctk.CTkFrame(toolbar, fg_color="transparent")
        btn_frame.pack(side="right")

        ctk.CTkButton(
            btn_frame, text="上级", width=50, height=28,
            command=self._go_up
        ).pack(side="left", padx=2)

        ctk.CTkButton(
            btn_frame, text="刷新", width=50, height=28,
            command=self.refresh
        ).pack(side="left", padx=2)

        ctk.CTkButton(
            btn_frame, text="C:\\", width=40, height=28,
            command=lambda: self._populate("C:\\")
        ).pack(side="left", padx=2)

    def _build_treeview(self):
        container = ctk.CTkFrame(self)
        container.pack(fill="both", expand=True, padx=4, pady=4)

        style = ttk.Style()
        style.theme_use("default")
        style.configure("ClearC.Treeview",
            background=TREEVIEW_BG,
            foreground=TREEVIEW_FG,
            fieldbackground=TREEVIEW_BG,
            borderwidth=0,
            rowheight=26,
            font=("Microsoft YaHei UI", 10)
        )
        style.configure("ClearC.Treeview.Heading",
            background=TREEVIEW_HEADING_BG,
            foreground=TREEVIEW_FG,
            borderwidth=1,
            font=("Microsoft YaHei UI", 10, "bold")
        )
        style.map("ClearC.Treeview",
            background=[("selected", TREEVIEW_SELECTED_BG)],
            foreground=[("selected", "white")]
        )

        columns = ("size", "type", "status")
        self.tree = ttk.Treeview(
            container, columns=columns, show="tree headings",
            selectmode="extended", style="ClearC.Treeview"
        )
        self.tree.heading("#0", text="名称", anchor="w")
        self.tree.heading("size", text="大小", anchor="e")
        self.tree.heading("type", text="类型", anchor="center")
        self.tree.heading("status", text="状态", anchor="center")

        self.tree.column("#0", width=320, minwidth=200)
        self.tree.column("size", width=90, minwidth=60, anchor="e")
        self.tree.column("type", width=70, minwidth=50, anchor="center")
        self.tree.column("status", width=100, minwidth=70, anchor="center")

        scrollbar_y = ttk.Scrollbar(container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar_y.set)

        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar_y.pack(side="right", fill="y")

        self.tree.tag_configure("critical", foreground=COLOR_CRITICAL, background=COLOR_CRITICAL_BG)
        self.tree.tag_configure("warning", foreground="#ffd43b")
        self.tree.tag_configure("linked", foreground=COLOR_LINKED)
        self.tree.tag_configure("hidden", foreground=COLOR_HIDDEN)
        self.tree.tag_configure("safe", foreground=COLOR_SAFE)
        self.tree.tag_configure("dir", font=("Microsoft YaHei UI", 10, "bold"))

        self.tree.bind("<Double-1>", self._on_double_click)
        self.tree.bind("<<TreeviewOpen>>", self._on_expand)

    def _populate(self, path):
        self.current_path = path
        self.path_label.configure(text=path)
        self._path_map.clear()
        for item in self.tree.get_children():
            self.tree.delete(item)
        self._load_directory(path, "")

    def _load_directory(self, path, parent_iid):
        try:
            entries = scan_directory(path)
        except PermissionError:
            self._log(f"无权限访问: {path}", "warning")
            return
        except Exception as e:
            self._log(f"扫描失败: {path} - {e}", "error")
            return

        for entry in entries:
            if not self.show_hidden and entry.is_hidden:
                continue
            self._insert_entry(parent_iid, entry)

    def _insert_entry(self, parent_iid, entry):
        if entry.is_symlink:
            prefix = "[L] "
            type_text = "链接"
        elif entry.is_dir:
            prefix = "[D] "
            type_text = "文件夹"
        else:
            prefix = "    "
            type_text = "文件"

        size_text = self._format_size(entry.size) if entry.size >= 0 else "--"
        status_text, tag = self._get_status_display(entry)

        tags = (tag,) if tag else ()
        if entry.is_dir and tag != "critical":
            tags = tags + ("dir",)

        iid = self.tree.insert(
            parent_iid, "end",
            text=f"{prefix}{entry.name}",
            values=(size_text, type_text, status_text),
            tags=tags, open=False
        )

        self._path_map[iid] = entry.path

        if entry.is_dir and not entry.is_symlink:
            self.tree.insert(iid, "end", text="...")

        return iid

    def _get_status_display(self, entry):
        if entry.is_symlink:
            target = entry.link_target or "?"
            return f"-> {os.path.basename(target)}", "linked"
        if entry.status == "critical":
            return "禁止移动", "critical"
        if entry.status == "warning":
            return "注意风险", "warning"
        return "安全", "safe"

    def _on_expand(self, event):
        iid = self.tree.focus()
        children = self.tree.get_children(iid)
        if len(children) == 1 and self.tree.item(children[0], "text") == "...":
            self.tree.delete(children[0])
            path = self._path_map.get(iid)
            if path:
                self._load_directory(path, iid)

    def _on_double_click(self, event):
        iid = self.tree.focus()
        if not iid:
            return
        path = self._path_map.get(iid)
        if path and os.path.isdir(path) and not os.path.islink(path):
            self._populate(path)

    def _go_up(self):
        norm = os.path.normpath(self.current_path)
        parent = os.path.dirname(norm)
        if parent == norm:
            return
        if len(parent) == 2 and parent[1] == ':':
            parent += "\\"
        self._populate(parent)

    def refresh(self):
        self._populate(self.current_path)

    def set_show_hidden(self, show):
        self.show_hidden = show
        self.refresh()

    def get_selected_items(self):
        selected = []
        for iid in self.tree.selection():
            path = self._path_map.get(iid)
            if path:
                selected.append(path)
        return selected

    def _format_size(self, size_bytes):
        if size_bytes < 0:
            return "--"
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 ** 2:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 ** 3:
            return f"{size_bytes / 1024 ** 2:.1f} MB"
        else:
            return f"{size_bytes / 1024 ** 3:.2f} GB"

    def _log(self, msg, level="info"):
        if self._log_callback:
            self._log_callback(msg, level=level)

    def set_log_callback(self, callback):
        self._log_callback = callback
