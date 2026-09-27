@echo off
title Push EnergySight AI to GitHub
echo ===================================================
echo   Pushing project to GitHub:
echo   https://github.com/nidhisharman1405/EnergyEfficiencyCalculator
echo ===================================================
echo.

set PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%
cd /d "%~dp0"

echo Current git status:
git status
echo.
echo Pushing branch 'main' to origin...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo   SUCCESS! Pushed successfully to GitHub!
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo   Push failed or requires GitHub login.
    echo ===================================================
)

echo.
pause
