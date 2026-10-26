'use strict';
const auth = require('../../lib/auth');
const { json, readBody, preflight } = require('../../lib/http');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Metodo no permitido' });

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'desconocida';

  if (auth.tooMany(ip)) {
    return json(res, 429, { ok: false, error: 'Demasiados intentos. Espera 10 minutos.' });
  }

  const body = await readBody(req);
  if (!auth.checkPassword(body.password)) {
    return json(res, 401, { ok: false, error: 'Clave incorrecta.' });
  }

  auth.resetAttempts(ip);
  json(res, 200, { ok: true, token: auth.sign() });
};
