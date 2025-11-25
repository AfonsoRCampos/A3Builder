@echo off
REM Wrapper to install deps (if needed) and run build via PowerShell
SETLOCAL
SET SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%build.ps1'"
ENDLOCAL
