@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_desktop_shortcut.ps1"
if errorlevel 1 (
  echo.
  echo Could not create the shortcut. Please make sure Chrome or Microsoft Edge is installed.
  pause
)
endlocal
