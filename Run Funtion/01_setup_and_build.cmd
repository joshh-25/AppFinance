@echo off
setlocal

cd /d "%~dp0\.."

echo [1/4] Installing backend dependencies...
cd backend
call composer install
if errorlevel 1 goto :error

echo [2/4] Running backend migrations...
call php tools\run_migrations.php
if errorlevel 1 goto :error

echo [3/4] Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 goto :error

echo [4/4] Building frontend...
call npm run build
if errorlevel 1 goto :error

echo.
echo Setup and build completed.
exit /b 0

:error
echo.
echo Setup failed. Check the error logs above.
exit /b 1
