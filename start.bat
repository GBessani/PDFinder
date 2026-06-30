@echo off
setlocal

set ROOT=%~dp0

echo Iniciando wa-worker...
start "wa-worker" cmd /k "cd /d "%ROOT%wa-worker" && npm start"

echo Iniciando app-web...
start "app-web" cmd /k "cd /d "%ROOT%app-web" && npm run dev"

echo Aguardando o app-web subir...
timeout /t 8 /nobreak >nul

echo Abrindo o navegador...
start chrome "http://localhost:3000"

endlocal
