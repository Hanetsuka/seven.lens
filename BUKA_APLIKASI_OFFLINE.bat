@echo off
title Menjalankan svn.lens Studio (Mode Offline)
cd /d "%~dp0"

set "HTML_PATH=%~dp0index.html"

:: Coba buka dalam mode Aplikasi Desktop (Standalone Window) menggunakan Microsoft Edge atau Chrome jika tersedia
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start "" msedge --app="file:///%HTML_PATH:\=/%"
    exit /b 0
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start "" chrome --app="file:///%HTML_PATH:\=/%"
    exit /b 0
)

:: Fallback ke browser default
start "" "%HTML_PATH%"
