const http = require('http');
const https = require('https');

const PORT = 8080;

const MIME_TYPES = {
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
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === '/proxy.php' || pathname === '/proxy') {
        handleProxy(url, req, res);
        return;
    }

    handleStaticFile(pathname, req, res);
});

function handleProxy(url, req, res) {
    const action = url.searchParams.get('action') || 'serverlist';
    const version = url.searchParams.get('version') || 'x26.07.20';
    const host = url.searchParams.get('host') || '';
    const port = url.searchParams.get('port') || '';

    let targetUrl;

    switch (action) {
        case 'ping':
            targetUrl = `https://api.sckey.net/server/ping?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}`;
            break;
        case 'serverlist':
        default:
            targetUrl = `https://api.sckey.net/server/serverlist?version=${encodeURIComponent(version)}`;
            break;
    }

    console.log(`[Proxy] ${action} -> ${targetUrl}`);

    const proxyReq = https.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LocalProxy/1.0)',
            'Accept': 'application/json',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 15000,
        rejectUnauthorized: false
    }, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(proxyRes.statusCode || 200);
            res.end(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error(`[Proxy] Error:`, error.message);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(502);
        res.end(JSON.stringify({
            success: false,
            msg: 'Proxy error: ' + error.message,
            code: 502
        }, null, 2));
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        console.error('[Proxy] Timeout');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(504);
        res.end(JSON.stringify({
            success: false,
            msg: 'Proxy timeout',
            code: 504
        }, null, 2));
    });
}

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', 'src');

function handleStaticFile(filePath, req, res) {
    if (filePath === '/') filePath = '/index.html';
    if (filePath === '/online_server') filePath = '/online_server.html';

    const fullPath = path.join(ROOT_DIR, filePath);

    fs.stat(fullPath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(fullPath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(fullPath, (readErr, data) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }

            res.setHeader('Content-Type', contentType + '; charset=utf-8');
            res.writeHead(200);
            res.end(data);
        });
    });
}

server.listen(PORT, () => {
    console.log(`====================================`);
    console.log(`  SC Web Local Server`);
    console.log(`  Proxy + Static Files`);
    console.log(`====================================`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Proxy:   http://localhost:${PORT}/proxy.php`);
    console.log(`  ServerList: http://localhost:${PORT}/proxy.php?action=serverlist&version=x26.07.20`);
    console.log(`  Ping:      http://localhost:${PORT}/proxy.php?action=ping&host=xxx&port=xxx`);
    console.log(`====================================`);
    console.log(`  Press Ctrl+C to stop`);
    console.log(`====================================`);
});
