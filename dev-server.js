'use strict';
/**
 * Servidor local de desarrollo (sin dependencias).
 * Sirve los archivos estaticos y ejecuta los mismos handlers de /api que Vercel.
 *   node server.js         -> http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

/* Carga .env.local / .env sin dependencias externas. */
['.env.local', '.env'].forEach((name) => {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) return;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    });
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function sendText(res, code, msg) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(msg);
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';

  const file = path.join(ROOT, rel);
  // evita salir de la carpeta del proyecto
  if (!file.startsWith(ROOT)) return sendText(res, 403, 'Prohibido');

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // rutas limpias: /algo -> /algo.html
      const alt = file + '.html';
      if (!err && fs.existsSync(alt)) return stream(alt);
      return sendText(res, 404, 'No encontrado: ' + rel);
    }
    stream(file);
  });

  function stream(f) {
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(f).pipe(res);
  }
}

function loadApi(pathname) {
  // /api/admin/login -> ./api/admin/login.js
  const rel = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  if (!rel) return null;
  const file = path.join(ROOT, 'api', rel + '.js');
  if (!file.startsWith(path.join(ROOT, 'api'))) return null;
  if (!fs.existsSync(file)) return null;
  try {
    return require(file);
  } catch (e) {
    console.error('Error cargando ' + file, e);
    return null;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    const handler = loadApi(pathname);
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: 'Endpoint no encontrado: ' + pathname }));
    }
    req.query = Object.fromEntries(url.searchParams);
    return Promise.resolve(handler(req, res)).catch((e) => {
      console.error(e);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Error interno' }));
      }
    });
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Camana te necesita - servidor local');
  console.log('  Juego  : http://localhost:' + PORT + '/');
  console.log('  Admin  : http://localhost:' + PORT + '/admin');
  console.log('  Clave  : ' + (process.env.ADMIN_PASSWORD || 'bomberoscamana'));
  console.log('  Datos  : ' + (process.env.KV_REST_API_URL ? 'Redis (KV)' : path.join(ROOT, '.data', 'store.json')));
  console.log('');
});
