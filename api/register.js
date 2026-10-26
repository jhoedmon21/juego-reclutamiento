'use strict';
const store = require('../lib/store');
const { json, readBody, preflight } = require('../lib/http');

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120);
}

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Metodo no permitido' });

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return json(res, 400, { ok: false, error: 'Datos invalidos' });
  }

  const nombre = clean(body.n, 90).replace(/\s+/g, ' ');
  const dni = clean(body.d, 20).replace(/\D/g, '');
  const edad = Number(body.e);
  const whatsapp = clean(body.w, 30).replace(/\D/g, '');
  const distrito = clean(body.t, 60) || 'Camana';
  const via = clean(body.v, 60) || 'Bombero alumno (desde 15 anos)';

  const err =
    nombre.length < 5 || nombre.split(' ').length < 2
      ? 'Escribe tu nombre y apellido.'
      : !/^\d{8}$/.test(dni)
        ? 'El DNI debe tener 8 digitos.'
        : !(edad >= 15 && edad <= 70)
          ? 'La edad debe estar entre 15 y 70 anos.'
          : whatsapp.length < 9
            ? 'Escribe un WhatsApp de 9 digitos.'
            : '';

  if (err) return json(res, 400, { ok: false, error: err });

  const now = new Date();
  const fecha = now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  const rec = {
    n: nombre,
    d: dni,
    e: edad,
    w: whatsapp,
    t: distrito,
    v: via,
    f: fecha,
    ts: now.getTime(),
    creado: now.toISOString(),
    s: 'CAM-' + dni.slice(-3) + String(now.getTime()).slice(-5),
    progreso: Math.max(0, Math.min(100, Number(body.progreso) || 0)),
    misiones: clean(body.misiones, 200),
    minutos: Math.max(0, Math.min(9999, Number(body.minutos) || 0)),
    origen: clean(body.origen, 40) || 'juego',
    ua: clean(req.headers['user-agent'], 200),
    pais: clean(req.headers['x-vercel-ip-country'], 8),
  };

  try {
    const { doc, dup } = await store.saveReg(rec);
    json(res, 200, { ok: true, id: doc.s, dup, guardado: true });
  } catch (e) {
    json(res, 200, {
      ok: false,
      guardado: false,
      configured: store.isConfigured(),
      error: 'No se pudo guardar en el servidor.',
    });
  }
};
