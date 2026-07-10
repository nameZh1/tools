import customtkinter as ctk
from datetime import datetime


class LogPanel(ctk.CTkFrame):

    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self._build()

    def _build(self):
        header = ctk.CTkFrame(self, height=30, fg_color="transparent")
        header.pack(fill="x", padx=5, pady=(5, 0))

        ctk.CTkLabel(header, text="日志", font=("Microsoft YaHei UI", 12, "bold")).pack(side="left")
        ctk.CTkButton(header, text="清空", width=50, height=24, command=self.clear).pack(side="right")

        self._textbox = ctk.CTkTextbox(self, height=120, font=("Consolas", 11), state="disabled")
        self._textbox.pack(fill="both", expand=True, padx=5, pady=5)

        self._textbox.tag_config("info", foreground="#dce4ee")
        self._textbox.tag_config("success", foreground="#69db7c")
        self._textbox.tag_config("warning", foreground="#ffd43b")
        self._textbox.tag_config("error", foreground="#ff6b6b")

    def log(self, message: str, level: str = "info"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{timestamp}] {message}\n"
        self._textbox.configure(state="normal")
        self._textbox.insert("end", line, level)
        self._textbox.configure(state="disabled")
        self._textbox.see("end")

    def log_success(self, msg: str):
        self.log(msg, "success")

    def log_warning(self, msg: str):
        self.log(msg, "warning")

    def log_error(self, msg: str):
        self.log(msg, "error")

    def clear(self):
        self._textbox.configure(state="normal")
        self._textbox.delete("1.0", "end")
        self._textbox.configure(state="disabled")
