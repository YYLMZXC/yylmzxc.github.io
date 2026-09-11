@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   生存战争网 - 启动主站 + mod（一个后端进程，两个数据库）
echo   主站主页 index.html      库：scweb
echo   导航站 yylmzxcweb        库：yylmzxc_nav（作为 mod 加载）
echo ============================================================
echo.

rem 释放 8000 端口，避免旧的静态服务（python -m http.server 8000）抢占
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo 释放 8000 端口，结束进程 PID %%p
  taskkill /f /pid %%p >nul 2>nul
)

rem 后端在仓库根的 server 目录，首次运行自动安装依赖
rem 各 mod 的依赖由主站后端统一提供（见 server\mods.js），无需单独安装
if not exist "..\server\node_modules" (
  echo 正在安装后端依赖 ...
  pushd "..\server"
  call npm install --no-fund --no-audit
  popd
)

echo.
echo 数据库配置：主站见 server\config.json（默认 root / root，库名 scweb）
echo               导航站见 yylmzxcweb\server\config.json（默认 root / root，库名 yylmzxc_nav）
echo 加载哪些 mod 见 server\config.json 的 mods 段（把 yylmzxcweb 设为 false 即不再加载）
echo.
echo 服务启动后会自动打开主页与导航站：
echo   http://localhost:8000/index.html
echo   http://localhost:8000/yylmzxcweb/yylmzxc.html
echo.

rem 延迟约 2 秒再打开浏览器：等 node 监听端口并完成 MySQL 初始化，避免访问过早打到「无法访问」页
rem 用独立进程执行，不阻塞下面的服务；/min 避免多弹一个窗口
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:8000/index.html"
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:8000/yylmzxcweb/yylmzxc.html"

node "..\server\server.js"

echo.
echo 服务已退出。
pause
