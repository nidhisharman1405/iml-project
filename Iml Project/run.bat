@echo off
title EnergySight AI - UCI Energy Efficiency Predictor
echo ===================================================
echo   EnergySight AI - Building Energy Intelligence
echo ===================================================
echo.
cd /d "%~dp0"

echo Launching browser at http://localhost:5000...
start "" "http://localhost:5000"

if exist ".venv\Scripts\python.exe" (
    echo Starting server with virtual environment Python...
    ".venv\Scripts\python.exe" app.py
) else (
    echo Starting server with system Python...
    python app.py
)

pause
