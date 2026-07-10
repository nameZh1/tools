import os
import threading
from dataclasses import dataclass
from core.safety import assess_risk, is_already_symlink, get_symlink_target, RiskLevel
from config import MAX_SCAN_ENTRIES, MAX_SCAN_DEPTH, SIZE_CALC_TIMEOUT


@dataclass
class FileEntry:
    name: str
    path: str
    is_dir: bool
    is_file: bool
    is_symlink: bool
    is_hidden: bool
    size: int
    link_target: str | None
    risk: RiskLevel
    status: str


def scan_directory(path: str) -> list[FileEntry]:
    entries = []
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    is_link = is_already_symlink(entry.path)
                    is_hidden = False
                    try:
                        attrs = entry.stat(follow_symlinks=False).st_file_attributes
                        is_hidden = bool(attrs & 0x2)
                    except (OSError, AttributeError):
                        pass

                    link_target = get_symlink_target(entry.path) if is_link else None
                    risk = assess_risk(entry.path)

                    if is_link:
                        status = "linked"
                    elif risk == RiskLevel.FORBIDDEN:
                        status = "critical"
                    elif risk == RiskLevel.WARNING:
                        status = "warning"
                    else:
                        status = "safe"

                    size = -1
                    if entry.is_file(follow_symlinks=False):
                        try:
                            size = entry.stat(follow_symlinks=False).st_size
                        except OSError:
                            size = 0

                    entries.append(FileEntry(
                        name=entry.name,
                        path=entry.path,
                        is_dir=entry.is_dir(follow_symlinks=False),
                        is_file=entry.is_file(follow_symlinks=False),
                        is_symlink=is_link,
                        is_hidden=is_hidden,
                        size=size,
                        link_target=link_target,
                        risk=risk,
                        status=status,
                    ))
                except (PermissionError, OSError):
                    continue
    except (PermissionError, OSError):
        pass

    entries.sort(key=lambda e: (not e.is_dir, e.name.lower()))
    return entries


def calc_dir_size(path: str, callback=None) -> int:
    total = 0
    count = 0
    stop_event = threading.Event()

    def _timer_expired():
        stop_event.set()

    timer = threading.Timer(SIZE_CALC_TIMEOUT, _timer_expired)
    timer.daemon = True
    timer.start()

    try:
        for root, dirs, files in os.walk(path):
            if stop_event.is_set():
                break
            depth = root.replace(path, "").count(os.sep)
            if depth >= MAX_SCAN_DEPTH:
                dirs.clear()
                continue
            for f in files:
                if stop_event.is_set():
                    break
                count += 1
                if count > MAX_SCAN_ENTRIES:
                    stop_event.set()
                    break
                try:
                    fp = os.path.join(root, f)
                    total += os.path.getsize(fp)
                except (OSError, PermissionError):
                    continue
            if callback and count % 500 == 0:
                callback(total, count)
    except (PermissionError, OSError):
        pass
    finally:
        timer.cancel()

    return total


def calc_dir_size_async(path: str, on_progress=None, on_complete=None):
    def worker():
        result = calc_dir_size(path, callback=on_progress)
        if on_complete:
            on_complete(result)

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return t
