import os
import ctypes
import shutil
from enum import Enum
from config import CRITICAL_PATHS_FORBIDDEN, CRITICAL_PATHS_WARNING, SPACE_SAFETY_MARGIN


class RiskLevel(Enum):
    SAFE = "safe"
    WARNING = "warning"
    DANGER = "danger"
    FORBIDDEN = "forbidden"


def _normalize(path: str) -> str:
    return os.path.normcase(os.path.normpath(path))


def is_critical_path(path: str) -> bool:
    norm = _normalize(path)
    for p in CRITICAL_PATHS_FORBIDDEN:
        p_norm = _normalize(p.rstrip("\\/"))
        if norm == p_norm or norm.startswith(p_norm + os.sep):
            return True
    return False


def is_warning_path(path: str) -> bool:
    norm = _normalize(path)
    for p in CRITICAL_PATHS_WARNING:
        p_norm = _normalize(p.rstrip("\\/"))
        if norm == p_norm or norm.startswith(p_norm + os.sep):
            return True
    return False


def assess_risk(path: str) -> RiskLevel:
    if is_critical_path(path):
        return RiskLevel.FORBIDDEN
    if is_warning_path(path):
        return RiskLevel.WARNING
    return RiskLevel.SAFE


def is_file_locked(filepath: str) -> bool:
    if os.path.isdir(filepath):
        return _is_dir_locked(filepath)

    GENERIC_READ = 0x80000000
    GENERIC_WRITE = 0x40000000
    OPEN_EXISTING = 3
    FILE_ATTRIBUTE_NORMAL = 0x80
    INVALID_HANDLE = ctypes.c_void_p(-1).value

    handle = ctypes.windll.kernel32.CreateFileW(
        ctypes.c_wchar_p(filepath),
        GENERIC_READ | GENERIC_WRITE,
        0,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None,
    )
    if handle == INVALID_HANDLE:
        return True
    ctypes.windll.kernel32.CloseHandle(handle)
    return False


def _is_dir_locked(dirpath: str) -> bool:
    try:
        os.rename(dirpath, dirpath)
        return False
    except OSError:
        return True


def is_already_symlink(path: str) -> bool:
    if os.path.islink(path):
        return True
    try:
        attrs = ctypes.windll.kernel32.GetFileAttributesW(path)
        if attrs == -1:
            return False
        REPARSE_POINT = 0x400
        return bool(attrs & REPARSE_POINT)
    except Exception:
        return False


def get_symlink_target(path: str) -> str | None:
    if os.path.islink(path):
        return os.readlink(path)
    return None


def check_target_space(target_path: str, required_bytes: int) -> tuple[bool, int]:
    _, _, free = shutil.disk_usage(target_path)
    enough = (free - required_bytes) > SPACE_SAFETY_MARGIN
    return enough, free
