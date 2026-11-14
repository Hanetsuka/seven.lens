@echo off
title Upload svn.lens Studio ke GitHub
color 0A
cd /d "%~dp0"

echo ========================================================
echo   UPLOAD PROJECT SVN.LENS STUDIO KE GITHUB
echo ========================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git belum terinstall di komputer Anda.
    echo Silakan download dan install Git dari https://git-scm.com/
    pause
    exit /b 1
)

if not exist ".git" (
    echo [1/4] Menginisialisasi repository Git lokal...
    git init
    git branch -M main
)

echo [2/4] Menambahkan semua file ke Git staging...
git add .
git commit -m "Initial commit: svn.lens Studio Photo & 3D LUT Editor" 2>nul

echo.
echo Buat repository kosong baru di https://github.com/new
echo lalu copy URL repository Anda (contoh: https://github.com/username/aplikasi-edit-foto.git)
echo.
set /p REPO_URL="Paste URL Repository GitHub Anda di sini: "

if "%REPO_URL%"=="" (
    echo [BATAL] URL Repository tidak boleh kosong.
    pause
    exit /b 1
)

echo.
echo [3/4] Menghubungkan ke remote repository...
git remote remove origin 2>nul
git remote add origin "%REPO_URL%"

echo [4/4] Mengunggah (Push) project ke GitHub (branch main)...
git branch -M main
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   BERHASIL! Project Anda sudah terupload ke GitHub.
    echo   Untuk mengaktifkan link website online ^(GitHub Pages^):
    echo   Buka Settings ^> Pages di repo GitHub Anda, lalu pilih
    echo   Source: GitHub Actions ^(atau Deploy from branch: main^).
    echo ========================================================
) else (
    echo ========================================================
    echo   Gagal melakukan push. Pastikan URL repo benar dan
    echo   Anda sudah login ke akun GitHub Anda di Git.
    echo ========================================================
)
echo.
pause
