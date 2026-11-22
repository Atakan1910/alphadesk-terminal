@echo off
chcp 65001 >nul
title AlphaDesk Terminal
cd /d "%~dp0"
echo ========================================================
echo               AlphaDesk Terminal Başlatılıyor
echo ========================================================
echo.
echo Tarayıcınız otomatik olarak açılacaktır (http://localhost:5173)...
echo Kapatmak için bu pencereyi kapatabilirsiniz.
echo.
npm run dev
pause
