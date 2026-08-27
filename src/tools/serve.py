#!/usr/bin/env python3
"""
生存战争网 - 本地开发服务器
多线程 + 禁用缓存 + 大文件容错
"""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class DevHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """开发服务器：禁用缓存"""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass  # 浏览器 seek 大音频时中断连接，属正常行为

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

socketserver.ThreadingTCPServer.allow_reuse_address = True

with socketserver.ThreadingTCPServer(("", PORT), DevHTTPHandler) as httpd:
    print(f"🎵 服务已启动: http://localhost:{PORT}")
    print(f"📁 工作目录: {os.getcwd()}")
    print("按 Ctrl+C 停止服务器")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
