@echo off
setlocal

rem OCR launcher for the Finance app.
rem By default this starts the local Python OCR API at C:\ocr\app.py.
rem Optional Docker settings remain available if you prefer a containerized OCR API.

set "OCR_DOCKER_DIR=C:\ocr"
set "OCR_COMPOSE_FILE=docker-compose.yml"
set "OCR_SERVICE_NAME="
set "OCR_CONTAINER_NAME="
set "OCR_PYTHON_DIR=C:\ocr"
set "OCR_PYTHON_EXE=.venv\Scripts\python.exe"
set "OCR_APP_MODULE=app:app"
set "OCR_HOST=0.0.0.0"
set "OCR_PORT=8001"
set "OCR_HEALTH_URL=http://localhost:8001/health"

call :healthcheck
if not errorlevel 1 (
  echo OCR API is already running.
  echo Health endpoint: %OCR_HEALTH_URL%
  exit /b 0
)

if not "%OCR_SERVICE_NAME%"=="" (
  call :require_docker || exit /b 1
  if not exist "%OCR_DOCKER_DIR%\%OCR_COMPOSE_FILE%" (
    echo [ERROR] Compose file not found: %OCR_DOCKER_DIR%\%OCR_COMPOSE_FILE%
    echo Update OCR_DOCKER_DIR or OCR_COMPOSE_FILE inside start-ocr-api.cmd.
    exit /b 1
  )

  cd /d "%OCR_DOCKER_DIR%"
  echo Starting OCR service "%OCR_SERVICE_NAME%" with docker compose...
  docker compose -f "%OCR_COMPOSE_FILE%" up -d %OCR_SERVICE_NAME%
  if errorlevel 1 (
    echo [ERROR] Failed to start OCR service with docker compose.
    exit /b 1
  )

  echo OCR service started.
  echo Expected OCR endpoint: %OCR_HEALTH_URL%
  exit /b 0
)

if not "%OCR_CONTAINER_NAME%"=="" (
  call :require_docker || exit /b 1
  echo Starting OCR container "%OCR_CONTAINER_NAME%"...
  docker start "%OCR_CONTAINER_NAME%" >nul
  if errorlevel 1 (
    echo [ERROR] Failed to start OCR container "%OCR_CONTAINER_NAME%".
    echo Update OCR_CONTAINER_NAME inside start-ocr-api.cmd.
    exit /b 1
  )

  echo OCR container started.
  echo Expected OCR endpoint: %OCR_HEALTH_URL%
  exit /b 0
)

if not exist "%OCR_PYTHON_DIR%\%OCR_PYTHON_EXE%" (
  echo [ERROR] Local OCR Python runtime not found: %OCR_PYTHON_DIR%\%OCR_PYTHON_EXE%
  echo Set up the OCR virtual environment or configure OCR_SERVICE_NAME/OCR_CONTAINER_NAME instead.
  exit /b 1
)

if not exist "%OCR_PYTHON_DIR%\app.py" (
  echo [ERROR] Local OCR app was not found: %OCR_PYTHON_DIR%\app.py
  echo Update OCR_PYTHON_DIR inside start-ocr-api.cmd.
  exit /b 1
)

pushd "%OCR_PYTHON_DIR%"
echo Starting local OCR API from "%OCR_PYTHON_DIR%\app.py"...
start "Finance OCR API" /min "%OCR_PYTHON_DIR%\%OCR_PYTHON_EXE%" -m uvicorn %OCR_APP_MODULE% --host %OCR_HOST% --port %OCR_PORT%
popd

set /a OCR_START_ATTEMPTS=0
:wait_for_health
set /a OCR_START_ATTEMPTS+=1
call :healthcheck
if not errorlevel 1 (
  echo OCR API started.
  echo Health endpoint: %OCR_HEALTH_URL%
  exit /b 0
)

if %OCR_START_ATTEMPTS% GEQ 10 (
  echo [ERROR] OCR API did not become healthy at %OCR_HEALTH_URL%.
  echo Check the OCR app logs or run it manually to inspect startup errors.
  exit /b 1
)

timeout /t 1 /nobreak >nul
goto wait_for_health

:require_docker
where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker CLI was not found in PATH.
  echo Start Docker Desktop first, then try again.
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker is not running.
  echo Start Docker Desktop and wait until it finishes loading.
  exit /b 1
)

exit /b 0

:healthcheck
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $response = Invoke-WebRequest -UseBasicParsing '%OCR_HEALTH_URL%' -TimeoutSec 3; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %errorlevel%
