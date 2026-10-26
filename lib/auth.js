'use strict';
const crypto = require('crypto');

const PASSWORD = process.env.ADMIN_PASSWORD || 'camanabomberos2026';
const SECRET = process.env.ADMIN_SECRET || PASSWORD;
const TTL_MS = 12 * 3600 * 1000;

function b64(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function mac(payload) {
  return b64(crypto.createHmac('sha256', SECRET).update(payload).digest());
}

function sign() {
  const payload = b64(JSON.stringify({ exp: Date.now() + TTL_MS, n: crypto.randomBytes(6).toString('hex') }));
  return payload + '.' + mac(payload);
}

function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return false;
  const i = token.lastIndexOf('.');
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = mac(payload);
  if (sig.length !== expect.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  try {
    const data = JSON.parse(unb64(payload));
    return data && typeof data.exp === 'number' && data.exp > Date.now();
  } catch (e) {
    return false;
  }
}

function checkPassword(input) {
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(PASSWORD);
  if (a.length !== b.length) {
    // comparacion de duracion constante aun con longitudes distintas
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/** Token recibido por cabecera Authorization: Bearer x, o por ?t= */
function tokenFrom(req) {
  const h = req.headers.authorization || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('t') || '';
}

function requireAdmin(req) {
  return verify(tokenFrom(req));
}

/* Limite simple de intentos por IP (en memoria, por instancia). */
const attempts = new Map();
function tooMany(ip) {
  const now = Date.now();
  const rec = attempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > 10 * 60 * 1000) {
    rec.n = 0;
    rec.t = now;
  }
  rec.n += 1;
  attempts.set(ip, rec);
  return rec.n > 8;
}
function resetAttempts(ip) {
  attempts.delete(ip);
}

module.exports = { sign, verify, checkPassword, requireAdmin, tooMany, resetAttempts, tokenFrom };
