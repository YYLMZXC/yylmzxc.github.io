@echo off
REM ============================================================
REM 生存战争网 - 本地开发服务器启动脚本
REM ============================================================
REM 功能：启动 Python 内置 HTTP 服务器，用于本地开发和测试
REM 端口：8000
REM 访问：http://localhost:8000
REM
REM 使用方法：
REM   1. 确保已安装 Python 3.x
REM   2. 双击运行此文件
REM   3. 在浏览器中访问 http://localhost:8000/online_server.html
REM
REM 注意：
REM   - 此服务器仅用于静态文件服务，不支持 PHP
REM   - 若需测试 proxy.php 功能，请使用 PHP 环境或 start.py
REM   - 按 Ctrl+C 可停止服务器
REM ============================================================

python -m http.server 8000 --bind 0.0.0.0

pause
