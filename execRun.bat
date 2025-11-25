@echo off
REM Wrapper to start the production server using the shipped PowerShell script
SETLOCAL
SET SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%run.ps1'"
ENDLOCAL
