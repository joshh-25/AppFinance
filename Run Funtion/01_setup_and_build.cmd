@echo off
setlocal

cd /d "%~dp0\.."

echo [1/2] Running backend migrations...
cd backend
call php tools\run_migrations.php
if errorlevel 1 goto :error

echo [2/2] Building frontend...
cd ..\frontend
call npm run build
if errorlevel 1 goto :error

echo.
echo Build flow completed.
exit /b 0

:error
echo.
echo Setup failed. Check the error logs above.
exit /b 1
