@echo off
setlocal

rem Starts the local OCR API if needed, then runs parser and live runtime validation.

set "ROOT_DIR=%~dp0"
pushd "%ROOT_DIR%" >nul

echo [1/3] Ensuring OCR API is running...
call "%ROOT_DIR%start-ocr-api.cmd"
if errorlevel 1 (
  echo [ERROR] Failed to start or verify the OCR API.
  popd >nul
  exit /b 1
)

echo.
echo [2/3] Validating OCR parser samples...
node infra\scripts\validate-ocr-parser-samples.mjs --check
if errorlevel 1 (
  echo [ERROR] OCR parser validation failed.
  popd >nul
  exit /b 1
)

echo.
echo [3/3] Validating live OCR runtime samples...
node infra\scripts\validate-ocr-runtime-samples.mjs --check
if errorlevel 1 (
  echo [ERROR] OCR runtime validation failed.
  popd >nul
  exit /b 1
)

echo.
echo OCR preflight passed.
popd >nul
exit /b 0
