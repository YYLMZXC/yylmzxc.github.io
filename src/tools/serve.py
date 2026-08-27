#!/usr/bin/env python3
"""
生存战争网 - 本地开发服务器
支持 Range 请求（HTTP 206）+ 禁用缓存 + 多线程
"""
import http.server
import os
import sys
import socketserver
import re

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class RangeHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """支持 Range 请求的开发服务器"""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        """处理 GET 请求，支持 Range 头"""
        range_header = self.headers.get('Range')

        if not range_header:
            # 没有 Range 头，走正常流程
            super().do_GET()
            return

        # 解析 Range: bytes=start-end
        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not match:
            super().do_GET()
            return

        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else None

        # 获取请求的文件路径
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            super().do_GET()
            return

        file_size = os.path.getsize(path)

        if end is None:
            end = file_size - 1
        end = min(end, file_size - 1)

        content_length = end - start + 1

        # 发送 206 Partial Content 响应
        try:
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(content_length))
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            # 读取并发送指定范围的数据
            with open(path, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(65536, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    self.wfile.write(data)
                    remaining -= len(data)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass  # 客户端断开连接

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

socketserver.ThreadingTCPServer.allow_reuse_address = True

with socketserver.ThreadingTCPServer(("", PORT), RangeHTTPHandler) as httpd:
    print(f"🎵 服务已启动: http://localhost:{PORT}")
    print(f"📁 工作目录: {os.getcwd()}")
    print("按 Ctrl+C 停止服务器")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
