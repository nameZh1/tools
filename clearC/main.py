import sys
import os
import ctypes


def is_admin() -> bool:
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except (AttributeError, OSError):
        return False


def run_as_admin():
    script = os.path.abspath(sys.argv[0])
    params = " ".join(sys.argv[1:])
    ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable, f'"{script}" {params}', None, 1
    )
    sys.exit(0)


def main():
    if not is_admin():
        run_as_admin()

    from app import ClearCApp
    app = ClearCApp()
    app.mainloop()


if __name__ == "__main__":
    main()
