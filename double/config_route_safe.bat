@echo off
chcp 65001 >nul
echo ========================================
echo 双网卡路由配置脚本 (安全版)
echo ========================================
echo.
echo 网络拓扑：
echo   外网: WLAN (Intel 9462, 接口 11) → MiFi-C70A → Internet
echo   内网: WLAN 2 (Ugreen, 接口 5) → MERCURY_2318 → 172.16.x.x / 10.16.x.x
echo.
echo 此脚本会确保外网连接不中断！
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

echo ========================================
echo 步骤 1: 清理所有旧路由
echo ========================================
echo 删除所有可能干扰的路由...
route delete 172.16.0.0 >nul 2>&1
route delete 10.16.0.0 >nul 2>&1
:: 删除通过 WLAN 2 网关的默认路由（如果存在）
route delete 0.0.0.0 mask 0.0.0.0 192.168.1.1 if 5 >nul 2>&1
echo 完成
echo.

echo ========================================
echo 步骤 2: 断开 WLAN 2 并配置静态 IP（无默认网关）
echo ========================================
netsh wlan disconnect interface="WLAN 2" >nul 2>&1
timeout /t 2 /nobreak >nul

:: 设置 WLAN 2 使用静态 IP，不设置默认网关
:: 这样连接后不会产生冲突的默认路由
netsh interface ipv4 set address "WLAN 2" static 192.168.1.200 255.255.255.0 none
echo 完成：WLAN 2 已配置为静态 IP 192.168.1.200，无默认网关
echo.

echo ========================================
echo 步骤 3: 添加永久路由（使用接口 5）
echo ========================================
echo.
echo [3.1] 添加 172.16.0.0/16 路由...
:: 使用接口索引 5 (Ugreen USB WiFi / WLAN 2)
route -p add 172.16.0.0 mask 255.255.0.0 192.168.1.1 if 5 metric 10
if %errorlevel% equ 0 (
    echo [成功] 172.16 路由已添加
) else (
    echo [警告] 172.16 路由添加可能失败
)

echo.
echo [3.2] 添加 10.16.0.0/16 路由...
route -p add 10.16.0.0 mask 255.255.0.0 192.168.1.1 if 5 metric 10
if %errorlevel% equ 0 (
    echo [成功] 10.16 路由已添加
) else (
    echo [警告] 10.16 路由添加可能失败
)
echo.

echo ========================================
echo 步骤 4: 连接 WLAN 2 到 MERCURY_2318
echo ========================================
echo 现在连接 WLAN 2（由于没有默认网关，不会影响外网）...
netsh wlan connect name="MERCURY_2318" interface="WLAN 2"
echo.
echo 等待连接建立...
timeout /t 8 /nobreak
echo.

echo ========================================
echo 步骤 5: 设置 WLAN 2 高跃点数（确保不作为默认路由）
echo ========================================
netsh interface ipv4 set interface "WLAN 2" metric=9999
echo 完成
echo.

echo ========================================
echo 步骤 6: 验证配置
echo ========================================
echo.
echo --- 当前 IP 配置 ---
ipconfig | findstr /C:"WLAN" /C:"IPv4" /C:"网关" /C:"Gateway"
echo.
echo --- 172.16 路由 ---
route print | findstr "172.16"
echo.
echo --- 10.16 路由 ---
route print | findstr "10.16"
echo.
echo --- 默认路由（应该只有一个通过 WLAN 接口 11） ---
route print | findstr "0.0.0.0.*0.0.0.0"
echo.

echo ========================================
echo 步骤 7: 测试连接
echo ========================================
echo.
echo 测试外网 (8.8.8.8)...
ping -n 1 -w 2000 8.8.8.8
echo.
echo 测试内网网关 (172.16.1.1)...
ping -n 1 -w 2000 172.16.1.1
echo.

echo ========================================
echo 配置完成！
echo ========================================
echo.
echo 路由规则:
echo   172.16.x.x → WLAN 2 (Ugreen, 接口 5) → MERCURY_2318 → 内网
echo   10.16.x.x  → WLAN 2 (Ugreen, 接口 5) → MERCURY_2318 → 内网
echo   其他流量   → WLAN (Intel, 接口 11) → MiFi-C70A → 外网
echo.
echo 如果内网 172.16.1.1 不通，请确认：
echo   1. MERCURY_2318 路由器的 WAN 口网关是否是 172.16.1.1
echo   2. 或者尝试其他内网 IP 如 172.16.0.1
echo.
pause
