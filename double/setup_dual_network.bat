@echo off
chcp 65001 >nul
echo ========================================
echo 双网卡路由配置脚本
echo ========================================
echo.
echo 当前网络状态：
echo - Intel 9462 (WLAN): 连接外网 192.168.1.199
echo - Ugreen USB WiFi (WLAN 2): 需要连接内网 172.16.x.x
echo.
echo ========================================
echo 步骤 1: 检查 Ugreen USB WiFi 连接状态
echo ========================================
netsh wlan show interfaces | findstr /C:"WLAN 2" /C:"Ugreen"
echo.

echo ========================================
echo 步骤 2: 显示可用的 WiFi 网络
echo ========================================
echo 正在扫描 Ugreen USB WiFi 可见的网络...
netsh wlan show networks interface="WLAN 2"
echo.

echo ========================================
echo 步骤 3: 连接到内网 WiFi
echo ========================================
echo 请手动连接 Ugreen USB WiFi 到内网 WiFi：
echo 1. 打开 Windows 设置 → 网络和 Internet → WLAN
echo 2. 选择 "WLAN 2" 网卡
echo 3. 连接到 172.16 网段的 WiFi
echo.
echo 连接完成后按任意键继续...
pause >nul

echo.
echo ========================================
echo 步骤 4: 检查连接后的 IP 配置
echo ========================================
ipconfig | findstr /C:"WLAN 2" /A:10
echo.

echo ========================================
echo 步骤 5: 添加静态路由
echo ========================================
echo 请输入内网网关 IP (例如: 172.16.1.1):
set /p GATEWAY=网关地址: 

echo.
echo 即将执行以下命令：
echo route -p add 172.16.0.0 mask 255.255.0.0 %GATEWAY% metric 10
echo.
echo 按任意键继续，或 Ctrl+C 取消...
pause >nul

route -p add 172.16.0.0 mask 255.255.0.0 %GATEWAY% metric 10

if %errorlevel% equ 0 (
    echo.
    echo ✓ 路由添加成功！
) else (
    echo.
    echo ✗ 路由添加失败，请确保以管理员身份运行此脚本
    echo   右键点击脚本 → 以管理员身份运行
)

echo.
echo ========================================
echo 步骤 6: 验证路由表
echo ========================================
route print | findstr "172.16"
echo.

echo ========================================
echo 配置完成
echo ========================================
echo 当前路由规则：
echo - 172.16.0.0/16 → Ugreen USB WiFi (内网)
echo - 其他流量 → Intel 9462 (外网)
echo.
pause
