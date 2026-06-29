@echo off
setlocal

REM ============================================================
REM  AI Studio — Production Launcher
REM  Builds and launches the optimized production version.
REM ============================================================

cd /d "%~dp0.."

echo.
echo AI Studio — Production Mode
echo ============================
echo.

REM --- Environment Check ---
node scripts\check-env.mjs
if errorlevel 1 (
    echo.
    echo Environment check failed. See errors above.
    pause
    exit /b 1
)

REM --- Build ---
echo.
echo Building...
call npm run build
if errorlevel 1 (
    echo.
    echo Build failed.
    pause
    exit /b 1
)

REM --- Launch ---
echo.
echo Starting AI Studio...
call npm start
