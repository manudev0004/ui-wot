#!/usr/bin/env node

// Simple dev launcher:
// - runs an initial `stencil build --dev` to ensure fresh assets
// - starts `stencil build --dev --watch` (no built-in server)
// - serves www/ and src/ with a small static server (www has priority)

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const WWW = path.join(ROOT, 'www');
const SRC = path.join(ROOT, 'src');
const PORT = process.env.PORT || 3333;

// Clean stale build output to avoid serving partial/old chunks
function cleanDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[dev-serve] cleaned: ${dir}`);
    }
  } catch (err) {
    console.warn(`[dev-serve] failed to clean ${dir}:`, err?.message || err);
  }
}

cleanDir(path.join(ROOT, 'www', 'build'));
cleanDir(path.join(ROOT, 'dist'));

// Perform a synchronous initial build to guarantee non-empty chunks before serving
console.log('[dev-serve] running initial build...');
const initial = spawnSync('npx', ['stencil', 'build', '--dev'], { stdio: 'inherit' });
if (initial.status !== 0) {
  console.error('[dev-serve] initial build failed. Exiting.');
  process.exit(initial.status || 1);
}

// Start stencil in dev watch mode (no built-in server)
const stencil = spawn('npx', ['stencil', 'build', '--dev', '--watch'], { stdio: 'inherit' });
stencil.on('exit', (code) => {
  console.log('stencil (watch) process exited with', code);
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
