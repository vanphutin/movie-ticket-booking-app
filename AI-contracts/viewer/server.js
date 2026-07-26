const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3950;
const PUBLIC_DIR = __dirname;
const AI_CONTRACTS_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.yml': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'] });
    res.end(JSON.stringify({ status: 'OK', app: 'AI-contracts-viewer-v2', port: PORT }));
    return;
  }

  if (pathname === '/api/contracts') {
    try {
      const contractsData = require('./contracts-data.js');
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'] });
      res.end(JSON.stringify(contractsData));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': MIME_TYPES['.json'] });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === '/api/state/patch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const patchData = JSON.parse(body);
        console.log(`[STATE PATCH RECEIVED]:`, patchData.reason);
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'] });
        res.end(JSON.stringify({ success: true, message: 'JSON Patch received successfully', patch: patchData }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': MIME_TYPES['.json'] });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'text/plain; charset=utf-8';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>500 Server Error</h1>');
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    }
  });
});

// Command-line flag support (--check)
if (process.argv.includes('--check')) {
  console.log(`AI Contracts Server script check passed.`);
  process.exit(0);
}

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 AI Control Plane Workbench v2 running at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`==================================================`);
});
