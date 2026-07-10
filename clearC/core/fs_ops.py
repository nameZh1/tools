import os
import shutil
import threading
from dataclasses import dataclass
from core.safety import (
    assess_risk, is_file_locked, check_target_space,
    is_already_symlink, RiskLevel
)
from core.scanner import calc_dir_size


@dataclass
class MoveResult:
    success: bool
    source: str
    target: str
    link_created: bool
    error_msg: str
    bytes_moved: int


def create_symlink(target_path: str, link_path: str) -> bool:
    is_dir = os.path.isdir(target_path)
    try:
        os.symlink(target_path, link_path, target_is_directory=is_dir)
        return True
    except OSError:
        return False


def verify_symlink(link_path: str) -> bool:
    if not os.path.islink(link_path):
        return False
    target = os.readlink(link_path)
    return os.path.exists(target)


def move_and_link(source: str, target_dir: str, progress_callback=None) -> MoveResult:
    source = os.path.normpath(source)
    basename = os.path.basename(source)
    target_path = os.path.normpath(os.path.join(target_dir, basename))

    def log(msg):
        if progress_callback:
            progress_callback(msg)

    risk = assess_risk(source)
    if risk == RiskLevel.FORBIDDEN:
        return MoveResult(False, source, target_path, False,
                          "系统关键路径，禁止操作", 0)

    if is_already_symlink(source):
        return MoveResult(False, source, target_path, False,
                          "源路径已是符号链接", 0)

    if os.path.exists(target_path):
        return MoveResult(False, source, target_path, False,
                          f"目标路径已存在: {target_path}", 0)

    log("正在计算大小...")
    if os.path.isdir(source):
        size = calc_dir_size(source)
    else:
        size = os.path.getsize(source)

    target_drive = os.path.splitdrive(target_dir)[0] + "\\"
    space_ok, free_bytes = check_target_space(target_drive, size)
    if not space_ok:
        return MoveResult(False, source, target_path, False,
                          f"空间不足: 需要 {format_size(size)}, 可用 {format_size(free_bytes)}", 0)

    if os.path.isfile(source):
        if is_file_locked(source):
            return MoveResult(False, source, target_path, False,
                              "文件被占用，请关闭相关程序后重试", 0)

    log(f"正在移动: {source} -> {target_path}")
    try:
        os.makedirs(target_dir, exist_ok=True)
        shutil.move(source, target_path)
    except (OSError, shutil.Error) as e:
        return MoveResult(False, source, target_path, False,
                          f"移动失败: {e}", 0)

    log("正在创建符号链接...")
    if not create_symlink(target_path, source):
        log("链接创建失败，正在回滚...")
        try:
            shutil.move(target_path, source)
        except (OSError, shutil.Error):
            pass
        return MoveResult(False, source, target_path, False,
                          "创建符号链接失败，已回滚", 0)

    if not verify_symlink(source):
        log("链接验证失败，正在回滚...")
        try:
            os.remove(source) if os.path.isfile(source) else os.rmdir(source)
            shutil.move(target_path, source)
        except (OSError, shutil.Error):
            pass
        return MoveResult(False, source, target_path, False,
                          "符号链接验证失败，已回滚", 0)

    log(f"完成: 已释放 {format_size(size)}")
    return MoveResult(True, source, target_path, True, "", size)


def undo_move(link_path: str, target_path: str, progress_callback=None) -> MoveResult:
    link_path = os.path.normpath(link_path)
    target_path = os.path.normpath(target_path)

    def log(msg):
        if progress_callback:
            progress_callback(msg)

    if not os.path.islink(link_path):
        return MoveResult(False, target_path, link_path, False,
                          "原路径不是符号链接", 0)

    if not os.path.exists(target_path):
        return MoveResult(False, target_path, link_path, False,
                          "目标文件不存在", 0)

    log("正在删除符号链接...")
    try:
        os.remove(link_path)
    except OSError as e:
        return MoveResult(False, target_path, link_path, False,
                          f"删除链接失败: {e}", 0)

    log(f"正在移回: {target_path} -> {link_path}")
    try:
        shutil.move(target_path, link_path)
    except (OSError, shutil.Error) as e:
        create_symlink(target_path, link_path)
        return MoveResult(False, target_path, link_path, False,
                          f"移回失败: {e}", 0)

    log("撤销完成")
    size = calc_dir_size(link_path) if os.path.isdir(link_path) else os.path.getsize(link_path)
    return MoveResult(True, target_path, link_path, False, "", size)


def move_and_link_async(source: str, target_dir: str,
                        progress_callback=None, on_complete=None):
    def worker():
        result = move_and_link(source, target_dir, progress_callback)
        if on_complete:
            on_complete(result)

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return t


def format_size(size_bytes: int) -> str:
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
