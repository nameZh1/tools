@echo off
chcp 65001 >nul
echo ========================================
echo 恢复原始路由配置
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    pause
    exit /b 1
)

echo 步骤 1: 删除所有内网路由...
route delete 10.16.0.0 >nul 2>&1
route delete 172.16.0.0 >nul 2>&1
echo 完成

echo.
echo 步骤 2: 重新添加 172.16 永久路由（接口 5）...
route -p add 172.16.0.0 mask 255.255.0.0 192.168.1.1 if 5 metric 10
if %errorlevel% equ 0 (
    echo [成功] 172.16 路由已恢复
) else (
    echo [警告] 路由添加可能失败
)

echo.
echo 步骤 3: 恢复 WLAN 2 为 DHCP...
netsh interface ipv4 set address "WLAN 2" dhcp
echo 完成

echo.
echo 步骤 4: 重新连接 WLAN 2...
netsh wlan disconnect interface="WLAN 2" >nul 2>&1
timeout /t 2 /nobreak >nul
netsh wlan connect name="MERCURY_2318" interface="WLAN 2"
echo 等待连接...
timeout /t 8 /nobreak

echo.
echo 步骤 5: 设置 WLAN 2 高跃点数...
netsh interface ipv4 set interface "WLAN 2" metric=9999
echo 完成

echo.
echo ========================================
echo 验证配置
echo ========================================
echo.
echo --- 172.16 路由 ---
route print | findstr "172.16"
echo.
echo --- 测试内网网关 ---
ping -n 1 -w 2000 172.16.1.1
echo.

echo ========================================
echo 恢复完成！
echo ========================================
pause
