@echo off
setlocal

cd /d "%~dp0\..\frontend"
echo Running frontend lint...
call npm run lint
if errorlevel 1 goto :error

echo Running frontend tests...
call npm run test
if errorlevel 1 goto :error

cd /d "%~dp0\..\backend"
echo Running backend tests...
call composer test
if errorlevel 1 goto :error

echo.
echo All checks passed.
exit /b 0

:error
echo.
echo One or more checks failed.
exit /b 1
