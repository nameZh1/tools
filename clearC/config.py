import os

WINDOW_TITLE = "ClearC - C盘空间释放工具"
WINDOW_SIZE = (1200, 750)
MIN_WINDOW_SIZE = (900, 600)

APPEARANCE_MODE = "dark"
COLOR_THEME = "blue"

COLOR_CRITICAL = "#ff6b6b"
COLOR_CRITICAL_BG = "#3d1f1f"
COLOR_LINKED = "#6bb5ff"
COLOR_HIDDEN = "#888888"
COLOR_SAFE = "#69db7c"
COLOR_WARNING = "#ffd43b"

TREEVIEW_BG = "#2b2b2b"
TREEVIEW_FG = "#dce4ee"
TREEVIEW_SELECTED_BG = "#1f6aa5"
TREEVIEW_HEADING_BG = "#333333"

DEFAULT_TARGET_SUBDIR = "ClearC_Moved"
DEFAULT_SOURCE_DRIVE = "C:\\"

MAX_SCAN_ENTRIES = 10000
MAX_SCAN_DEPTH = 20
SIZE_CALC_TIMEOUT = 30
SAFETY_MARGIN = 1024 ** 3  # 1GB
SPACE_SAFETY_MARGIN = SAFETY_MARGIN

USERNAME = os.getlogin()

FORBIDDEN_PATHS = [
    "C:\\Windows",
    "C:\\Recovery",
    "C:\\$Recycle.Bin",
    "C:\\System Volume Information",
    "C:\\bootmgr",
    "C:\\pagefile.sys",
    "C:\\hiberfil.sys",
    "C:\\swapfile.sys",
    f"C:\\Users\\{USERNAME}\\NTUSER.DAT",
    f"C:\\Users\\{USERNAME}\\ntuser.dat.LOG1",
    f"C:\\Users\\{USERNAME}\\ntuser.dat.LOG2",
    f"C:\\Users\\{USERNAME}\\ntuser.ini",
]

FORBIDDEN_PREFIXES = [
    "C:\\Windows\\",
    "C:\\Recovery\\",
    "C:\\$Recycle.Bin\\",
    "C:\\System Volume Information\\",
]

WARNING_PREFIXES = [
    "C:\\Program Files\\",
    "C:\\Program Files (x86)\\",
    "C:\\ProgramData\\",
    f"C:\\Users\\{USERNAME}\\AppData\\",
]

CRITICAL_PATHS_FORBIDDEN = FORBIDDEN_PATHS
CRITICAL_PATHS_WARNING = WARNING_PREFIXES
