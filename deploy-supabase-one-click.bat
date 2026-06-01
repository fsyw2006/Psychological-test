@echo off
setlocal

set "ROOT=%~dp0"
set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if exist "%CODEX_NODE%\node.exe" set "PATH=%CODEX_NODE%;%PATH%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\deploy-supabase.ps1"

echo.
echo Press any key to close this window.
pause >nul
