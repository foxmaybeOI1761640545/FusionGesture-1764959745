@echo off
chcp 65001 >nul

cd /d "%~dp0fusion-gesture"
call npm install
call npm run start

pause