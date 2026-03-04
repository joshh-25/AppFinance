@echo off
setlocal

set "OCR_DIR=C:\ocr"
set "OCR_PY=%OCR_DIR%\.venv\Scripts\python.exe"

if not exist "%OCR_DIR%\app.py" (
  echo [ERROR] app.py not found in %OCR_DIR%
  echo Update OCR_DIR inside start-ocr-api.cmd if your folder is different.
  exit /b 1
)

if not exist "%OCR_PY%" (
  echo [ERROR] Python venv not found: %OCR_PY%
  echo Create your venv first, then try again.
  exit /b 1
)

cd /d "%OCR_DIR%"
echo Starting OCR API on http://0.0.0.0:8001
"%OCR_PY%" -m uvicorn app:app --host 0.0.0.0 --port 8001

//cd:\xampp\htdocs\Finance
start-ocr-api.cmd
