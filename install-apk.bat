@echo off
echo ========================================================
echo Installing CashFlow APK to connected Android device...
echo ========================================================
echo.

adb version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ADB is not found in your system PATH.
    echo Please connect your device via USB and transfer CashFlow.apk manually,
    echo or install Android Platform Tools.
    pause
    exit /b 1
)

echo Checking for connected Android devices...
adb devices
echo.

echo Installing CashFlow.apk...
adb install -r "%~dp0CashFlow.apk"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] CashFlow installed successfully on your device!
    echo Launching CashFlow...
    adb shell monkey -p com.cashflow.expensetracker -c android.intent.category.LAUNCHER 1
    echo ========================================================
) else (
    echo.
    echo [ERROR] Installation failed. Ensure USB Debugging is enabled on your device.
)

pause

