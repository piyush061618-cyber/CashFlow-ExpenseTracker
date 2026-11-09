@echo off
echo ========================================================
echo Building CashFlow Android App Bundle (.aab) for Google Play...
echo ========================================================
echo.

cd android
call gradlew.bat bundleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] App Bundle built successfully!
    echo Output file:
    echo android\app\build\outputs\bundle\release\app-release.aab
    echo ========================================================
) else (
    echo.
    echo [ERROR] Build failed. Please check Gradle error logs above.
)

cd ..
pause

