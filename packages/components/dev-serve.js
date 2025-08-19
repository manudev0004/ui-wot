#!/usr/bin/env node

// Simple dev launcher: starts Stencil in dev watch/serve and provides a static fallback server for demo pages
// - runs `stencil build --dev --watch --serve` as a child process
// - starts a small static server that serves files from www/ and src/ so demo pages load without copying

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const WWW = path.join(ROOT, 'www');
const SRC = path.join(ROOT, 'src');
const PORT = process.env.PORT || 3333;

// Start stencil in dev serve/watch mode
const stencil = spawn('npx', ['stencil', 'build', '--dev', '--watch', '--serve'], { stdio: 'inherit' });

stencil.on('exit', (code) => {
  console.log('stencil process exited with', code);
  process.exit(code);
});

// Simple static server that checks www first then src
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // serve root index.html from www if exists
  const urlPath = req.url === '/' ? '/index.html' : req.url;

  const tryFiles = [path.join(WWW, urlPath), path.join(SRC, urlPath)];

  function serveFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath);
    const contentType = mime[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
    return true;
  }

  for (const f of tryFiles) {
    if (serveFile(f)) return;
  }

  // not found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Static demo server listening on http://localhost:${PORT}`);
  console.log('Serving from (www -> src):');
  console.log('  ', WWW);
  console.log('  ', SRC);
});

// On exit, kill child
process.on('exit', () => {
  try { stencil.kill(); } catch {}
});
process.on('SIGINT', () => process.exit(0));
