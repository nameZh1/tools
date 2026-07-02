@echo off

echo ========================================
echo  Dual NIC Route Toggle
echo ========================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please run as Administrator.
    pause
    exit /b 1
)

set IF_IDX=
for /f "tokens=1" %%i in ('netsh interface ipv4 show interfaces ^| findstr /C:"WLAN 2"') do set IF_IDX=%%i
if "%IF_IDX%"=="" (
    echo [ERROR] WLAN 2 interface not found. Check USB WiFi adapter.
    pause
    exit /b 1
)
echo [INFO] WLAN 2 interface index: %IF_IDX%
echo.

netsh wlan show interfaces | findstr /C:"MERCURY_2318" >nul 2>&1
if %errorlevel% equ 0 (
    echo [STATUS] Current: ON  ^-^> turning OFF
    echo.
    goto :close
)
echo [STATUS] Current: OFF ^-^> turning ON
echo.
goto :open


:open
echo ========================================
echo  Enabling dual-NIC routing
echo ========================================
echo.

echo [1/6] Cleaning old routes on this interface...
powershell -NoProfile -Command "Get-NetRoute -InterfaceAlias 'WLAN 2' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.DestinationPrefix -match '^(172\.16|10\.16)'} | Remove-NetRoute -Confirm:$false" >nul 2>&1
echo Done

echo.
echo [2/6] Checking WiFi profile and connecting via DHCP...
netsh interface ipv4 set address "WLAN 2" dhcp >nul 2>&1
netsh wlan show profiles | findstr /C:"MERCURY_2318" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No WiFi profile for MERCURY_2318. Connect manually first.
    pause
    exit /b 1
)
netsh wlan connect name="MERCURY_2318" interface="WLAN 2" >nul 2>&1
echo Waiting for DHCP...

set /a RETRY=0
:wait_dhcp
timeout /t 1 /nobreak >nul
set /a RETRY+=1
set CHECK_IP=
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -InterfaceAlias \"WLAN 2\" -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress -notmatch \"^169\.254\"} | Select-Object -First 1).IPAddress"') do set CHECK_IP=%%i
if not "%CHECK_IP%"=="" goto :dhcp_ready
if %RETRY% geq 20 (
    echo [TIMEOUT] DHCP not assigned after 20s.
    pause
    exit /b 1
)
echo   Waiting... %RETRY%/20
goto :wait_dhcp

:dhcp_ready
echo   [OK] DHCP assigned in %RETRY%s: %CHECK_IP%

echo.
echo [3/6] Auto-detecting gateway and subnet mask...
set GW=
set WLAN2_IP=
set MASK=
for /f "tokens=*" %%g in ('powershell -NoProfile -Command "(Get-NetIPConfiguration -InterfaceAlias \"WLAN 2\" -ErrorAction SilentlyContinue).IPv4DefaultGateway.NextHop"') do set GW=%%g
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -InterfaceAlias \"WLAN 2\" -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress"') do set WLAN2_IP=%%i
for /f "tokens=*" %%m in ('powershell -NoProfile -Command "$p=(Get-NetIPAddress -InterfaceAlias \"WLAN 2\" -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).PrefixLength; if($p){([ipaddress]([uint32]0xFFFFFFFF -band ([uint32]0xFFFFFFFF -shl (32-[int]$p)))).ToString()}"') do set MASK=%%m
if "%GW%"=="" (
    echo [ERROR] Failed to detect gateway.
    pause
    exit /b 1
)
if "%MASK%"=="" set MASK=255.255.255.0
echo   Gateway : %GW%
echo   IP      : %WLAN2_IP%
echo   Mask    : %MASK%

echo.
echo [4/6] Setting static IP with no default gateway...
netsh interface ipv4 set address "WLAN 2" static %WLAN2_IP% %MASK% none
netsh interface ipv4 set interface "WLAN 2" metric=9999 >nul 2>&1
echo Done

echo.
echo [5/6] Adding persistent routes via %GW%...
route -p add 172.16.0.0 mask 255.255.0.0 %GW% if %IF_IDX% metric 10
if %errorlevel% equ 0 (echo   172.16: OK) else (echo   172.16: FAILED)
route -p add 10.16.0.0  mask 255.255.0.0 %GW% if %IF_IDX% metric 10
if %errorlevel% equ 0 (echo   10.16:  OK) else (echo   10.16:  FAILED)

echo.
echo [6/6] Verify...
echo --- 172.16 routes ---
route print | findstr "172.16"
echo.
echo --- 10.16 routes ---
route print | findstr "10.16"
echo.
echo Testing Internet (8.8.8.8)...
ping -n 1 -w 2000 8.8.8.8 | findstr "TTL" >nul 2>&1
if %errorlevel% equ 0 (echo [OK] Internet OK) else (echo [WARN] Internet unreachable)
echo Testing intranet (172.16.15.76)...
ping -n 1 -w 2000 172.16.15.76 | findstr "TTL" >nul 2>&1
if %errorlevel% equ 0 (echo [OK] Intranet reachable) else (echo [INFO] 172.16.15.76 unreachable)
echo.
echo ========================================
echo  ENABLED  ^|  Gateway: %GW%  ^|  IP: %WLAN2_IP%
echo ========================================
goto :end


:close
echo ========================================
echo  Disabling dual-NIC routing
echo ========================================
echo.

echo [1/4] Getting gateway from route table...
set GW=
for /f "tokens=*" %%g in ('powershell -NoProfile -Command "(Get-NetRoute -InterfaceAlias \"WLAN 2\" -DestinationPrefix \"172.16.0.0/16\" -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop"') do set GW=%%g
if "%GW%"=="" (
    echo [INFO] Gateway not found in routes, removing all 172.16/10.16 routes on WLAN 2
) else (
    echo [INFO] Gateway: %GW%
)

echo.
echo [2/4] Removing intranet routes on WLAN 2...
powershell -NoProfile -Command "Get-NetRoute -InterfaceAlias 'WLAN 2' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.DestinationPrefix -match '^(172\.16|10\.16)'} | Remove-NetRoute -Confirm:$false" >nul 2>&1
powershell -NoProfile -Command "(Get-Item 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes').GetValueNames() | Where-Object {$_ -match '^172\.16\.0\.0,'} | ForEach-Object {Remove-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes' -Name $_}" >nul 2>&1
powershell -NoProfile -Command "(Get-Item 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes').GetValueNames() | Where-Object {$_ -match '^10\.16\.0\.0,'} | ForEach-Object {Remove-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes' -Name $_}" >nul 2>&1
echo Done

echo.
echo [3/4] Disconnecting WLAN 2...
netsh wlan disconnect interface="WLAN 2" >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done

echo.
echo [4/4] Restoring WLAN 2 to DHCP...
netsh interface ipv4 set address "WLAN 2" dhcp
echo Done

echo.
echo Verifying routes cleared on WLAN 2...
set REMAIN=0
for /f "tokens=*" %%r in ('powershell -NoProfile -Command "(Get-NetRoute -InterfaceAlias \"WLAN 2\" -ErrorAction SilentlyContinue | Where-Object {$_.DestinationPrefix -match \"^(172\.16|10\.16)\"}).Count"') do set REMAIN=%%r
if "%REMAIN%"=="0" (echo [OK] All intranet routes on WLAN 2 cleared) else (echo [WARN] %REMAIN% route(s) still present on WLAN 2)
echo.
echo ========================================
echo  Dual-NIC routing DISABLED
echo ========================================

:end
echo.
pause
