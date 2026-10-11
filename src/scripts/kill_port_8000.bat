@echo off
chcp 65001 >nul
echo 正在查找占用8000端口的进程...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 终止进程 PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! equ 0 (
        echo   PID %%a 已终止
    ) else (
        echo   PID %%a 终止失败
    )
)

echo.
echo 完成！
pause
