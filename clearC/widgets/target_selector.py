import os
import shutil
import customtkinter as ctk
from config import DEFAULT_TARGET_SUBDIR, COLOR_SAFE, COLOR_WARNING


class TargetSelector(ctk.CTkFrame):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self._build_ui()
        self._scan_drives()

    def _build_ui(self):
        title = ctk.CTkLabel(self, text="目标位置", font=("Microsoft YaHei UI", 14, "bold"))
        title.pack(pady=(10, 5), padx=10, anchor="w")

        # 磁盘选择区
        drive_frame = ctk.CTkFrame(self, fg_color="transparent")
        drive_frame.pack(fill="x", padx=10, pady=5)

        ctk.CTkLabel(drive_frame, text="目标磁盘", font=("Microsoft YaHei UI", 11)).pack(anchor="w")

        self.drive_var = ctk.StringVar(value="D:\\")
        self.drive_buttons_frame = ctk.CTkFrame(drive_frame, fg_color="transparent")
        self.drive_buttons_frame.pack(fill="x", pady=5)

        # 目标目录
        dir_frame = ctk.CTkFrame(self, fg_color="transparent")
        dir_frame.pack(fill="x", padx=10, pady=10)

        ctk.CTkLabel(dir_frame, text="目标目录", font=("Microsoft YaHei UI", 11)).pack(anchor="w")

        path_row = ctk.CTkFrame(dir_frame, fg_color="transparent")
        path_row.pack(fill="x", pady=5)

        self.path_entry = ctk.CTkEntry(path_row, placeholder_text="选择目标目录...")
        self.path_entry.pack(side="left", fill="x", expand=True, padx=(0, 5))
        self.path_entry.insert(0, f"D:\\{DEFAULT_TARGET_SUBDIR}")

        browse_btn = ctk.CTkButton(path_row, text="浏览", width=60, command=self._on_browse)
        browse_btn.pack(side="right")

        # 空间信息
        space_frame = ctk.CTkFrame(self, fg_color="transparent")
        space_frame.pack(fill="x", padx=10, pady=10)

        ctk.CTkLabel(space_frame, text="空间概览", font=("Microsoft YaHei UI", 11)).pack(anchor="w")

        self.space_label = ctk.CTkLabel(space_frame, text="--", font=("Microsoft YaHei UI", 10))
        self.space_label.pack(anchor="w", pady=(5, 2))

        self.space_bar = ctk.CTkProgressBar(space_frame)
        self.space_bar.pack(fill="x", pady=5)
        self.space_bar.set(0)

        # 已移动项目列表
        moved_frame = ctk.CTkFrame(self, fg_color="transparent")
        moved_frame.pack(fill="both", expand=True, padx=10, pady=10)

        ctk.CTkLabel(moved_frame, text="已移动项目", font=("Microsoft YaHei UI", 11)).pack(anchor="w")

        self.moved_list = ctk.CTkTextbox(moved_frame, height=120, state="disabled",
                                         font=("Consolas", 9))
        self.moved_list.pack(fill="both", expand=True, pady=5)

    def _scan_drives(self):
        for widget in self.drive_buttons_frame.winfo_children():
            widget.destroy()

        drives = []
        for letter in "DEFGHIJKLMNOPQRSTUVWXYZ":
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                try:
                    total, used, free = shutil.disk_usage(drive)
                    free_gb = free / (1024 ** 3)
                    total_gb = total / (1024 ** 3)
                    drives.append((drive, free_gb, total_gb))
                except (OSError, PermissionError):
                    pass

        for drive, free_gb, total_gb in drives:
            label = f"{drive[0]}: {free_gb:.0f}GB 空闲"
            btn = ctk.CTkRadioButton(
                self.drive_buttons_frame,
                text=label,
                variable=self.drive_var,
                value=drive,
                command=self._on_drive_change
            )
            btn.pack(anchor="w", pady=2)

        if drives:
            self.drive_var.set(drives[0][0])
            self._update_space_info()

    def _on_drive_change(self):
        drive = self.drive_var.get()
        current_path = self.path_entry.get()
        new_path = f"{drive}{DEFAULT_TARGET_SUBDIR}"
        self.path_entry.delete(0, "end")
        self.path_entry.insert(0, new_path)
        self._update_space_info()

    def _on_browse(self):
        directory = ctk.filedialog.askdirectory(
            initialdir=self.drive_var.get(),
            title="选择目标目录"
        )
        if directory:
            self.path_entry.delete(0, "end")
            self.path_entry.insert(0, directory)
            self._update_space_info()

    def _update_space_info(self):
        drive = self.drive_var.get()
        try:
            total, used, free = shutil.disk_usage(drive)
            free_gb = free / (1024 ** 3)
            total_gb = total / (1024 ** 3)
            used_ratio = used / total

            self.space_label.configure(
                text=f"可用: {free_gb:.1f} GB / {total_gb:.1f} GB"
            )
            self.space_bar.set(used_ratio)

            if free_gb < 10:
                self.space_label.configure(text_color=COLOR_WARNING)
            else:
                self.space_label.configure(text_color=COLOR_SAFE)
        except (OSError, PermissionError):
            self.space_label.configure(text="无法读取磁盘信息")

    def get_target_path(self):
        path = self.path_entry.get().strip()
        if not path:
            drive = self.drive_var.get()
            path = f"{drive}{DEFAULT_TARGET_SUBDIR}"
        return path

    def add_moved_item(self, source, target):
        self.moved_list.configure(state="normal")
        self.moved_list.insert("end", f"{source} -> {target}\n")
        self.moved_list.configure(state="disabled")
        self.moved_list.see("end")

    def refresh_space(self):
        self._update_space_info()
