@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   生存战争网 - 启动导航站（yylmzxc.html + MySQL 数据库）
echo ============================================================
echo.

rem 释放 8000 端口，避免旧的静态服务（python -m http.server 8000）抢占
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo 释放 8000 端口，结束进程 PID %%p
  taskkill /f /pid %%p >nul 2>nul
)

rem 首次运行自动安装后端依赖
if not exist "yylmzxcweb\server\node_modules" (
  echo 正在安装后端依赖 ...
  pushd yylmzxcweb\server
  call npm install --no-fund --no-audit
  popd
)

echo.
echo 数据库配置见 yylmzxcweb\server\config.json（默认 root / root）
echo.
echo 服务启动后会自动打开导航站： http://localhost:8000/yylmzxcweb/yylmzxc.html
echo.

rem 延迟约 2 秒再打开浏览器：等 node 监听端口并完成 MySQL 初始化，避免访问过早打到「无法访问」页
rem 用独立进程执行，不阻塞下面的服务；/min 避免多弹一个窗口
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:8000/yylmzxcweb/yylmzxc.html"

node yylmzxcweb\server\server.js

echo.
echo 服务已退出。
pause
