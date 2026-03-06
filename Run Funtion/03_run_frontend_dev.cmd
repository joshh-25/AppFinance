@echo off
setlocal

cd /d "%~dp0\..\frontend"
call npm run dev
