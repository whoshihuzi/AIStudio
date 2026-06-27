@echo off
setlocal

REM ============================================================
REM  AI Studio — Development Launcher
REM  Double-click this file to start AI Studio in dev mode (HMR).
REM ============================================================

cd /d "%~dp0.."

echo.
echo AI Studio — Development Mode
echo =============================
echo.

REM --- Environment Check ---
node scripts\check-env.mjs
if errorlevel 1 (
    echo.
    echo Environment check failed. See errors above.
    pause
    exit /b 1
)

REM --- Launch ---
echo.
echo Starting AI Studio with hot-reload...
echo Press Ctrl+C or close the window to stop.
echo.
call npm run dev
