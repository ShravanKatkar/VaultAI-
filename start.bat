@echo off
title VaultAI Control Panel
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

python start.py
if %errorlevel% neq 0 (
    pause
)
