'use strict';
const store = require('../lib/store');
const { json, preflight } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Metodo no permitido' });
  }
  try {
    const s = req.method === 'POST' ? await store.addVisit() : await store.getVisits();
    const [registros, encuestas] = await Promise.all([
      store.countRegs().catch(() => 0),
      store.countEncuestas().catch(() => 0),
    ]);
    json(res, 200, { ok: true, visitas: s.visits, hoy: s.today, registros, encuestas });
  } catch (e) {
    json(res, 200, { ok: false, visitas: 0, hoy: 0, registros: 0, encuestas: 0, error: String(e.message || e) });
  }
};
