# Run Funtion

Use this folder for the commands you need to run the Finance app.

## 0) Before running anything
- Start `Apache` and `MySQL` in XAMPP Control Panel.
- Make sure `composer`, `php`, `node`, and `npm` are available in terminal.

## 1) Build flow (migrate + build)
```powershell
cd C:\xampp\htdocs\Finance
& ".\Run Funtion\01_setup_and_build.cmd"
```

Manual version:
```powershell
cd C:\xampp\htdocs\Finance\backend
php tools\run_migrations.php

cd C:\xampp\htdocs\Finance\frontend
npm run build
```

One-time install commands (only if dependencies are missing):
```powershell
cd C:\xampp\htdocs\Finance\backend
composer install

cd C:\xampp\htdocs\Finance\frontend
npm install
```

## 2) Run OCR API
```powershell
cd C:\xampp\htdocs\Finance
& ".\Run Funtion\02_run_ocr_api.cmd"
```

Manual version:
```powershell
cd C:\xampp\htdocs\Finance
.\start-ocr-api.cmd
```

## 3) Frontend dev server (optional)
```powershell
cd C:\xampp\htdocs\Finance
& ".\Run Funtion\03_run_frontend_dev.cmd"
```

Manual version:
```powershell
cd C:\xampp\htdocs\Finance\frontend
npm run dev
```

## 4) Run checks/tests (optional)
```powershell
cd C:\xampp\htdocs\Finance
& ".\Run Funtion\04_run_checks.cmd"
```

Manual version:
```powershell
cd C:\xampp\htdocs\Finance\frontend
npm run lint
npm run test

cd C:\xampp\htdocs\Finance\backend
composer test
```

## 5) URLs
- Main app (Apache): `http://localhost/Finance/`
- Frontend dev (Vite): `http://localhost:5173/`
