@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   生存战争网 - 域名直连（Node 自己监听 80 / 443，无需 Apache）
echo   页面与接口 /api/* 、/yylmzxcweb/api/* 都由此进程提供
echo ============================================================
echo.

rem ------------------------------------------------------------------
rem  证书：换成你自己的即可（保持文件名一致，或改下面的路径）
rem    key\example.key  私钥    key\example.crt  站点证书
rem  证书链若是单独文件（如 chain.crt / ca-bundle.crt），打开下面这行
rem    以 Apache 的 crt / pem 格式可直接使用
rem ------------------------------------------------------------------
set "NAV_DOMAIN_HTTP_PORT=80"
set "NAV_DOMAIN_HTTPS_PORT=443"
set "NAV_TLS_KEY=%~dp0key\example.key"
set "NAV_TLS_CERT=%~dp0key\example.crt"
rem set "NAV_TLS_CHAIN=%~dp0key\chain.crt"

rem 80 / 443 被占多半是 IIS / Apache / 其它服务：本脚本会先结束占用进程
rem 如果这两个端口还要留给别的站点用，请勿运行本脚本，改用 Apache 反代。
for %%P in (80 443) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
    echo 释放 %%P 端口，结束进程 PID %%p
    taskkill /f /pid %%p >nul 2>nul
  )
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
echo 证书当前用的是 key\ 下的 example 占位文件，请替换成真实证书
echo.
echo 启动后直接用域名访问： http://你的域名/  与  https://你的域名/
echo 整个 src/ 会作为站点根被托管，默认首页即 index.html
echo.

node yylmzxcweb\server\server.js

echo.
echo 服务已退出。
pause
