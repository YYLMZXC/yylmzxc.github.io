#!/usr/bin/env python3
"""
生存战争网 - 本地开发服务器
处理大文件传输时的 ConnectionResetError（浏览器中断连接）
"""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class QuietHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """抑制 ConnectionResetError 堆栈跟踪"""

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass  # 客户端提前断开连接，静默忽略

    def log_message(self, format, *args):
        # 只显示错误日志，忽略正常的 304/200 请求
        if '500' in str(args) or 'Traceback' in str(args):
            super().log_message(format, *args)

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with socketserver.TCPServer(("", PORT), QuietHTTPHandler) as httpd:
    print(f"🎵 服务已启动: http://localhost:{PORT}")
    print(f"📁 工作目录: {os.getcwd()}")
    print("按 Ctrl+C 停止服务器")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
