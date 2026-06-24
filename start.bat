@echo off
setlocal enabledelayedexpansion
title VaultAI Control Panel

echo =====================================================================
echo                __     __            _ _    _    ___ 
echo                \ \   / /_ _ _   _  ^| ^| ^|  / \  ^|_ _^|
echo                 \ \ / / _` ^| ^| ^| ^| ^| ^| ^| / _ \  ^| ^| 
echo                  \ V / (_^| ^| ^|_^| ^| ^| ^| ^|/ ___ \ ^| ^| 
echo                   \_/ \__,_^|\__,_^|_^|_^|_/_/   \_\___^|
echo.
echo              Private Document Intelligence Offline RAG Suite
echo =====================================================================
echo.

REM 1. Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

REM 2. Check Node.js and NPM
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [Warning] NPM/Node.js is not installed or not in PATH. 
    echo           Only the Backend Service can be started automatically.
    echo.
)

REM Navigate to backend folder
cd /d "%~dp0backend"

REM Check or create virtual environment
set VENV_PATH=
if exist .venv\Scripts\activate.bat (
    set VENV_PATH=.venv
) else if exist venv\Scripts\activate.bat (
    set VENV_PATH=venv
)

if "%VENV_PATH%"=="" (
    echo [Environment] Local virtual environment not found. Creating one...
    python -m venv .venv
    set VENV_PATH=.venv
)

echo [Environment] Activating local virtual environment (!VENV_PATH!)...
call !VENV_PATH!\Scripts\activate.bat

REM Verify/install backend requirements
echo [Dependencies] Checking backend requirements...
python -c "import uvicorn, fastapi, chromadb, langchain_core" 2>nul
if %errorlevel% neq 0 (
    echo [Dependencies] Installing missing Python requirements...
    pip install -r requirements.txt
)

REM Navigate back to workspace root
cd /d "%~dp0"

echo.
echo =====================================================================
echo   [1] Start Backend Server Only (http://127.0.0.1:8000)
echo   [2] Start Frontend Server Only (http://localhost:3000)
echo   [3] Start Both Services Concurrently (Recommended)
echo   [4] Run Backend Integration Tests
echo =====================================================================
echo.
set /p opt="Select an option [1-4]: "

if "%opt%"=="1" goto BACKEND
if "%opt%"=="2" goto FRONTEND
if "%opt%"=="3" goto BOTH
if "%opt%"=="4" goto TESTS
goto BOTH

:BACKEND
echo [Launcher] Starting backend server...
cd /d "%~dp0backend"
call !VENV_PATH!\Scripts\activate.bat
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
goto END

:FRONTEND
echo [Launcher] Starting frontend dev server...
cd /d "%~dp0frontend"
npm run dev
goto END

:BOTH
echo [Launcher] Launching VaultAI Services Concurrently...
echo [Launcher] Starting backend server in a new window...
start "VaultAI Backend" cmd /k "title VaultAI Backend && cd /d %~dp0backend && call !VENV_PATH!\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [Launcher] Starting frontend dev server in a new window...
start "VaultAI Frontend" cmd /k "title VaultAI Frontend && cd /d %~dp0frontend && npm run dev"

echo.
echo [Launcher] Both services started in separate windows!
echo - Backend API: http://127.0.0.1:8000
echo - Frontend App: http://localhost:3000
echo.
pause
goto END

:TESTS
echo [Launcher] Running backend integration tests...
cd /d "%~dp0backend"
call !VENV_PATH!\Scripts\activate.bat
python test_api.py
pause
goto END

:END
