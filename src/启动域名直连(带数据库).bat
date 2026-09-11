@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   生存战争网 - 域名直连（Node 自己监听 80 / 443，无需 Apache）
echo   主站 + mod 由同一个后端进程提供：
echo     主页              /index.html
echo     接口              /api/*
echo     已启用 mod 的接口  例：/yylmzxcweb/api/*
echo ============================================================
echo.

rem ------------------------------------------------------------------
rem  证书：换成你自己的即可（保持文件名一致，或改下面的路径）
rem    key\example.key  私钥    key\example.crt  站点证书
rem  证书链若是单独文件（如 chain.crt / ca-bundle.crt），打开下面这行
rem    以 Apache 的 crt / pem 格式可直接使用
rem ------------------------------------------------------------------
set "SCWEB_DOMAIN_HTTP_PORT=80"
set "SCWEB_DOMAIN_HTTPS_PORT=443"
set "SCWEB_TLS_KEY=%~dp0key\example.key"
set "SCWEB_TLS_CERT=%~dp0key\example.crt"
rem set "SCWEB_TLS_CHAIN=%~dp0key\chain.crt"

rem 80 / 443 被占多半是 IIS / Apache / 其它服务：本脚本会先结束占用进程
rem 8000 是本进程同时监听的本地端口，一并释放，避免旧服务抢占
rem 如果这些端口还要留给别的站点用，请勿运行本脚本，改用 Apache 反代。
for %%P in (8000 80 443) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
    echo 释放 %%P 端口，结束进程 PID %%p
    taskkill /f /pid %%p >nul 2>nul
  )
)

rem 后端在 src 目录下的 server 目录，首次运行自动安装依赖
rem 各 mod 的依赖由主站后端统一提供（见 server\mods.js），无需单独安装
if not exist "server\node_modules" (
  echo 正在安装后端依赖 ...
  pushd "server"
  call npm install --no-fund --no-audit
  popd
)

echo.
echo 数据库配置：主站见 server\config.json（默认 root / root，库名 scweb）
echo               导航站见 yylmzxcweb\server\config.json（默认 root / root，库名 yylmzxc_nav）
echo 加载哪些 mod 见 server\config.json 的 mods 段（把 yylmzxcweb 设为 false 即不再加载）
echo 证书当前用的是 key\ 下的 example 占位文件，请替换成真实证书
echo.
echo 启动后直接用域名访问： http://你的域名/  与  https://你的域名/
echo 整个 src/ 会作为站点根被托管，默认首页即 index.html
echo 也可本地访问： http://localhost:8000/index.html
echo.

node "server\server.js"

echo.
echo 服务已退出。
pause
