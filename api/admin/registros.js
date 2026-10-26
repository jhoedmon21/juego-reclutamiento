'use strict';
const store = require('../../lib/store');
const auth = require('../../lib/auth');
const { json, readBody, preflight } = require('../../lib/http');

const ESTADOS = ['nuevo', 'contactado', 'voluntario', 'descartado'];

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (!auth.requireAdmin(req)) return json(res, 401, { ok: false, error: 'Sesion expirada. Vuelve a entrar.' });

  const url = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'GET') {
      const regs = await store.listRegs(Number(url.searchParams.get('limit')) || 500);
      return json(res, 200, { ok: true, total: regs.length, registros: regs });
    }

    if (req.method === 'DELETE') {
      const dni = String(url.searchParams.get('dni') || '').replace(/\D/g, '');
      if (!/^\d{8}$/.test(dni)) return json(res, 400, { ok: false, error: 'DNI invalido' });
      const done = await store.deleteReg(dni);
      return json(res, done ? 200 : 404, { ok: done, error: done ? null : 'No existe' });
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const body = await readBody(req);
      const dni = String(body.dni || '').replace(/\D/g, '');
      const estado = String(body.estado || '');
      if (!/^\d{8}$/.test(dni)) return json(res, 400, { ok: false, error: 'DNI invalido' });
      if (ESTADOS.indexOf(estado) < 0) return json(res, 400, { ok: false, error: 'Estado invalido' });
      const doc = await store.setEstado(dni, estado);
      return json(res, doc ? 200 : 404, { ok: Boolean(doc), registro: doc });
    }

    json(res, 405, { ok: false, error: 'Metodo no permitido' });
  } catch (e) {
    json(res, 500, { ok: false, error: 'Error del servidor' });
  }
};
