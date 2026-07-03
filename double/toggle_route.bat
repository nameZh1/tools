@echo off
setlocal

set "NIC1_IF=WLAN"
set "NIC2_IF=WLAN 2"
set "IN_IF=%NIC1_IF%"
set "OUT_IF=%NIC2_IF%"
set "IN_SSID=MERCURY_5G_2318"
set "OUT_SSID=GOGOGO"
set "IN_TEST_IP=172.16.15.76"

echo ========================================
echo  Fixed Dual WiFi Route Toggle
echo ========================================
echo  NIC1/Intranet : %IN_IF% -^> %IN_SSID%
echo  NIC2/Internet : %OUT_IF% -^> %OUT_SSID%
echo ========================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please run as Administrator.
    pause
    exit /b 1
)

call :get_if_index "%IN_IF%" IN_IDX
call :get_if_index "%OUT_IF%" OUT_IDX
if "%IN_IDX%"=="" (
    echo [ERROR] Intranet interface not found: %IN_IF%
    pause
    exit /b 1
)
if "%OUT_IDX%"=="" (
    echo [ERROR] Internet interface not found: %OUT_IF%
    pause
    exit /b 1
)
echo [INFO] Intranet interface index: %IN_IDX%
echo [INFO] Internet interface index: %OUT_IDX%
echo.

call :check_profile "%IN_SSID%" || exit /b 1
call :check_profile "%OUT_SSID%" || exit /b 1

set "ROUTE_COUNT=0"
for /f "tokens=*" %%r in ('powershell -NoProfile -Command "@(Get-NetRoute -InterfaceAlias '%IN_IF%' -DestinationPrefix '172.16.0.0/16' -ErrorAction SilentlyContinue).Count"') do set "ROUTE_COUNT=%%r"
set "IN_SSID_CONNECTED=0"
netsh wlan show interfaces | findstr /I /C:"SSID                   : %IN_SSID%" >nul 2>&1
if %errorlevel% equ 0 set "IN_SSID_CONNECTED=1"

if "%IN_SSID_CONNECTED%"=="1" (
    if not "%ROUTE_COUNT%"=="0" (
        echo [STATUS] Current: ON  ^-^> turning OFF
        echo.
        goto :close
    )
)

echo [STATUS] Current: OFF ^-^> turning ON
echo.
goto :open


:open
echo ========================================
echo  Enabling fixed dual-WiFi routing
echo ========================================
echo.

echo [1/8] Cleaning old intranet routes...
call :remove_intranet_routes
echo Done

echo.
echo [2/8] Resetting both WiFi adapters to DHCP...
netsh wlan disconnect interface="%IN_IF%" >nul 2>&1
netsh wlan disconnect interface="%OUT_IF%" >nul 2>&1
timeout /t 2 /nobreak >nul
netsh interface ipv4 set address "%IN_IF%" dhcp >nul 2>&1
netsh interface ipv4 set address "%OUT_IF%" dhcp >nul 2>&1
echo Done

echo.
echo [3/8] Connecting Internet WiFi on %OUT_IF%...
netsh wlan connect name="%OUT_SSID%" interface="%OUT_IF%" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to connect %OUT_IF% to %OUT_SSID%.
    pause
    exit /b 1
)
echo Waiting for Internet DHCP gateway...
set /a RETRY=0
:wait_out_dhcp
timeout /t 1 /nobreak >nul
set /a RETRY+=1
set "OUT_GW="
for /f "tokens=*" %%g in ('powershell -NoProfile -Command "(Get-NetIPConfiguration -InterfaceAlias '%OUT_IF%' -ErrorAction SilentlyContinue).IPv4DefaultGateway.NextHop"') do set "OUT_GW=%%g"
if defined OUT_GW goto :out_dhcp_ready
if %RETRY% geq 20 (
    echo [TIMEOUT] Internet gateway not assigned after 20s.
    pause
    exit /b 1
)
echo   Waiting... %RETRY%/20
goto :wait_out_dhcp

:out_dhcp_ready
echo   [OK] Internet gateway: %OUT_GW%

echo.
echo [4/8] Connecting Intranet WiFi on %IN_IF%...
netsh wlan connect name="%IN_SSID%" interface="%IN_IF%" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to connect %IN_IF% to %IN_SSID%.
    pause
    exit /b 1
)
echo Waiting for Intranet DHCP...
set /a RETRY=0
:wait_in_dhcp
timeout /t 1 /nobreak >nul
set /a RETRY+=1
set "IN_IP="
set "GW="
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -InterfaceAlias '%IN_IF%' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress -notmatch '^169\.254'} | Select-Object -First 1).IPAddress"') do set "IN_IP=%%i"
for /f "tokens=*" %%g in ('powershell -NoProfile -Command "(Get-NetIPConfiguration -InterfaceAlias '%IN_IF%' -ErrorAction SilentlyContinue).IPv4DefaultGateway.NextHop"') do set "GW=%%g"
if defined IN_IP if defined GW goto :in_dhcp_ready
if %RETRY% geq 20 (
    echo [TIMEOUT] Intranet DHCP not assigned after 20s.
    pause
    exit /b 1
)
echo   Waiting... %RETRY%/20
goto :wait_in_dhcp

:in_dhcp_ready
echo   [OK] Intranet DHCP assigned in %RETRY%s
echo   Gateway : %GW%
echo   IP      : %IN_IP%

echo.
echo [5/8] Detecting intranet subnet mask...
set "MASK="
for /f "tokens=*" %%m in ('powershell -NoProfile -Command "$p=(Get-NetIPAddress -InterfaceAlias '%IN_IF%' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress -eq '%IN_IP%'} | Select-Object -First 1).PrefixLength; if($null -ne $p){$bits=('1' * [int]$p).PadRight(32,'0'); (0..3 | ForEach-Object {[Convert]::ToInt32($bits.Substring($_*8,8),2)}) -join '.'}"') do set "MASK=%%m"
if "%MASK%"=="" set "MASK=255.255.255.0"
echo   Mask    : %MASK%

echo.
echo [6/8] Removing default gateway from intranet adapter...
netsh interface ipv4 set address "%IN_IF%" static %IN_IP% %MASK% none
if %errorlevel% neq 0 (
    echo [ERROR] Failed to set static intranet IP without default gateway.
    pause
    exit /b 1
)
netsh interface ipv4 set interface "%IN_IF%" metric=9999 >nul 2>&1
netsh interface ipv4 set interface "%OUT_IF%" metric=5 >nul 2>&1
echo Done

echo.
echo [7/8] Adding persistent intranet routes via %GW%...
route -p add 172.16.0.0 mask 255.255.0.0 %GW% if %IN_IDX% metric 10
if %errorlevel% equ 0 (echo   172.16: OK) else (echo   172.16: FAILED)
route -p add 10.16.0.0  mask 255.255.0.0 %GW% if %IN_IDX% metric 10
if %errorlevel% equ 0 (echo   10.16:  OK) else (echo   10.16:  FAILED)

echo.
echo [8/8] Verify...
echo --- 172.16 routes ---
route print | findstr "172.16"
echo.
echo --- 10.16 routes ---
route print | findstr "10.16"
echo.
echo Testing Internet (8.8.8.8)...
ping -n 1 -w 2000 8.8.8.8 | findstr "TTL" >nul 2>&1
if %errorlevel% equ 0 (echo [OK] Internet OK) else (echo [WARN] Internet unreachable)
echo Testing intranet (%IN_TEST_IP%)...
ping -n 1 -w 2000 %IN_TEST_IP% | findstr "TTL" >nul 2>&1
if %errorlevel% equ 0 (echo [OK] Intranet reachable) else (echo [INFO] %IN_TEST_IP% unreachable)
echo.
echo ========================================
echo  ENABLED  ^|  Intranet GW: %GW%  ^|  IP: %IN_IP%
echo ========================================
goto :end


:close
echo ========================================
echo  Disabling fixed dual-WiFi routing
echo ========================================
echo.

echo [1/4] Removing intranet routes...
call :remove_intranet_routes
echo Done

echo.
echo [2/4] Disconnecting intranet adapter...
netsh wlan disconnect interface="%IN_IF%" >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done

echo.
echo [3/4] Restoring adapter metrics and DHCP...
netsh interface ipv4 set address "%IN_IF%" dhcp >nul 2>&1
netsh interface ipv4 set interface "%IN_IF%" metric=9999 >nul 2>&1
netsh interface ipv4 set interface "%OUT_IF%" metric=5 >nul 2>&1
netsh wlan connect name="%OUT_SSID%" interface="%OUT_IF%" >nul 2>&1
echo Done

echo.
echo [4/4] Verifying routes cleared...
set "REMAIN=0"
for /f "tokens=*" %%r in ('powershell -NoProfile -Command "@(Get-NetRoute -InterfaceAlias '%IN_IF%' -ErrorAction SilentlyContinue | Where-Object {$_.DestinationPrefix -match '^(172\.16|10\.16)'}).Count"') do set "REMAIN=%%r"
if "%REMAIN%"=="0" (echo [OK] All intranet routes on %IN_IF% cleared) else (echo [WARN] %REMAIN% route(s) still present on %IN_IF%)
echo.
echo ========================================
echo  Fixed dual-WiFi routing DISABLED
echo ========================================

:end
echo.
pause
endlocal
exit /b 0


:get_if_index
set "%~2="
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPInterface -InterfaceAlias '%~1' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).InterfaceIndex"') do set "%~2=%%i"
exit /b 0


:check_profile
netsh wlan show profiles | findstr /I /C:"%~1" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No WiFi profile for %~1. Connect it manually once first.
    pause
    exit /b 1
)
exit /b 0


:remove_intranet_routes
powershell -NoProfile -Command "foreach($alias in '%IN_IF%','%OUT_IF%'){Get-NetRoute -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.DestinationPrefix -match '^(172\.16|10\.16)'} | Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue}" >nul 2>&1
powershell -NoProfile -Command "$key='HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\PersistentRoutes'; if(Test-Path $key){(Get-Item $key).GetValueNames() | Where-Object {$_ -match '^(172\.16\.0\.0|10\.16\.0\.0),'} | ForEach-Object {Remove-ItemProperty $key -Name $_ -ErrorAction SilentlyContinue}}" >nul 2>&1
exit /b 0
