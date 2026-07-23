import http.server
import urllib.request
import urllib.error
import ssl
import json
import sys
import os

PORT = 8080
ROOT_DIR = os.path.join(os.path.dirname(__file__), 'src')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
}

MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain'
}


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_GET(self):
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == '/proxy.php' or path == '/proxy':
            self.handle_proxy(params)
        else:
            self.handle_static(path)

    def handle_proxy(self, params):
        action = params.get('action', ['serverlist'])[0]
        version = params.get('version', ['x26.07.20'])[0]
        host = params.get('host', [''])[0]
        port = params.get('port', [''])[0]

        if action == 'ping':
            target_url = f'https://api.sckey.net/server/ping?host={urllib.parse.quote(host)}&port={urllib.parse.quote(port)}'
        else:
            target_url = f'https://api.sckey.net/server/serverlist?version={urllib.parse.quote(version)}'

        print(f'[Proxy] {action} -> {target_url}')

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            target_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; LocalProxy/1.0)',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=15, context=ctx) as response:
                data = response.read().decode('utf-8')
                self.send_response(response.status)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(data.encode('utf-8'))
        except urllib.error.URLError as e:
            error_response = json.dumps({
                'success': False,
                'msg': f'Proxy error: {str(e.reason)}',
                'code': 502
            }, ensure_ascii=False)
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(error_response.encode('utf-8'))
        except Exception as e:
            error_response = json.dumps({
                'success': False,
                'msg': f'Error: {str(e)}',
                'code': 500
            }, ensure_ascii=False)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(error_response.encode('utf-8'))

    def handle_static(self, path):
        if path == '/':
            path = '/index.html'
        elif path == '/online_server':
            path = '/online_server.html'

        full_path = os.path.join(ROOT_DIR, path.lstrip('/'))

        if not os.path.isfile(full_path):
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'404 Not Found')
            return

        ext = os.path.splitext(full_path)[1].lower()
        content_type = MIME_TYPES.get(ext, 'application/octet-stream')

        try:
            with open(full_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', f'{content_type}; charset=utf-8')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'500 Internal Server Error')

    def log_message(self, format, *args):
        print(f'[{self.command}] {args[0]}')


def main():
    server = http.server.HTTPServer(('0.0.0.0', PORT), ProxyHandler)
    print('=' * 50)
    print('  SC Web Local Server (Python)')
    print('  Proxy + Static Files')
    print('=' * 50)
    print(f'  Local:   http://localhost:{PORT}')
    print(f'  Proxy:   http://localhost:{PORT}/proxy.php')
    print(f'  ServerList: http://localhost:{PORT}/proxy.php?action=serverlist&version=x26.07.20')
    print(f'  Ping:      http://localhost:{PORT}/proxy.php?action=ping&host=xxx&port=xxx')
    print('=' * 50)
    print('  Press Ctrl+C to stop')
    print('=' * 50)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
        server.server_close()


if __name__ == '__main__':
    main()
