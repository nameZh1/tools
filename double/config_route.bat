@echo off
chcp 65001 >nul
echo ========================================
echo 双网卡路由配置脚本
echo ========================================
echo.
echo 网络拓扑：
echo   外网: WLAN (Intel 9462, 接口 11) → MiFi-C70A → Internet
echo   内网: WLAN 2 (Ugreen, 接口 5) → MERCURY_2318 → 172.16.x.x / 10.16.x.x
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    echo 右键点击脚本 → 以管理员身份运行
    pause
    exit /b 1
)

echo ========================================
echo 步骤 1: 清理所有旧路由
echo ========================================
route delete 172.16.0.0 >nul 2>&1
route delete 10.16.0.0 >nul 2>&1
route delete 0.0.0.0 mask 0.0.0.0 192.168.1.1 if 5 >nul 2>&1
echo 完成

echo.
echo ========================================
echo 步骤 2: 连接 WLAN 2 到 MERCURY_2318
echo ========================================
netsh wlan connect name="MERCURY_2318" interface="WLAN 2"
echo 等待 DHCP 分配 IP...
timeout /t 8 /nobreak

echo.
echo ========================================
echo 步骤 3: 检查网络状态
echo ========================================
echo.
echo --- WLAN (外网) ---
netsh interface ipv4 show addresses "WLAN" | findstr "IP"
echo.
echo --- WLAN 2 (内网) ---
netsh interface ipv4 show addresses "WLAN 2" | findstr "IP"

echo.
echo ========================================
echo 步骤 4: 配置路由
echo ========================================
echo.
echo [4.1] 删除 WLAN 2 的默认网关（防止冲突）...
netsh interface ipv4 set interface "WLAN 2" metric=9999
route delete 0.0.0.0 mask 0.0.0.0 192.168.1.1 if 5 >nul 2>&1
echo 完成

echo.
echo [4.2] 添加 172.16 网段路由（通过 WLAN 2 接口 5）...
:: 使用接口索引 5 (Ugreen USB WiFi / WLAN 2)
route -p add 172.16.0.0 mask 255.255.0.0 192.168.1.1 if 5 metric 10
if %errorlevel% equ 0 (
    echo [成功] 172.16 路由已添加
) else (
    echo [警告] 172.16 路由可能已存在或添加失败
)

echo.
echo [4.3] 添加 10.16 网段路由（通过 WLAN 2 接口 5）...
route -p add 10.16.0.0 mask 255.255.0.0 192.168.1.1 if 5 metric 10
if %errorlevel% equ 0 (
    echo [成功] 10.16 路由已添加
) else (
    echo [警告] 10.16 路由可能已存在或添加失败
)

echo.
echo ========================================
echo 步骤 5: 验证配置
echo ========================================
echo.
echo --- 路由表 (172.16 相关) ---
route print | findstr "172.16"
echo.
echo --- 路由表 (10.16 相关) ---
route print | findstr "10.16"
echo.
echo --- 默认路由 ---
route print | findstr "0.0.0.0.*0.0.0.0"

echo.
echo ========================================
echo 步骤 6: 测试连接
echo ========================================
echo.
echo 测试外网 (8.8.8.8)...
ping -n 1 -w 1000 8.8.8.8 | findstr "TTL"
if %errorlevel% equ 0 (
    echo [成功] 外网连接正常
) else (
    echo [警告] 外网可能不通
)

echo.
echo 测试内网网关 (172.16.1.1)...
ping -n 1 -w 1000 172.16.1.1 | findstr "TTL"
if %errorlevel% equ 0 (
    echo [成功] 内网网关可达
) else (
    echo [提示] 172.16.1.1 不通，请确认内网网关地址
)

echo.
echo ========================================
echo 配置完成！
echo ========================================
echo.
echo 路由规则：
echo   172.16.x.x → WLAN 2 (Ugreen, 接口 5) → MERCURY_2318 → 内网
echo   10.16.x.x  → WLAN 2 (Ugreen, 接口 5) → MERCURY_2318 → 内网
echo   其他流量   → WLAN (Intel, 接口 11) → MiFi-C70A → 外网
echo.
pause
