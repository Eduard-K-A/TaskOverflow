@echo off
setlocal
cd /d "%~dp0.."
call "%CD%\node_modules\.bin\electron-vite.cmd" dev
exit /b %errorlevel%
