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

class DevHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """开发服务器：抑制大文件传输错误 + 禁用缓存"""

    def end_headers(self):
        # 开发环境禁用缓存，确保每次刷新获取最新文件
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass  # 客户端提前断开连接（如大音频文件 seek），静默忽略

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with socketserver.TCPServer(("", PORT), DevHTTPHandler) as httpd:
    print(f"🎵 服务已启动: http://localhost:{PORT}")
    print(f"📁 工作目录: {os.getcwd()}")
    print("按 Ctrl+C 停止服务器")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
