'use strict';
const store = require('../../lib/store');
const auth = require('../../lib/auth');
const { json, preflight } = require('../../lib/http');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (!auth.requireAdmin(req)) return json(res, 401, { ok: false, error: 'Sesion expirada. Vuelve a entrar.' });

  try {
    const url = new URL(req.url, 'http://localhost');
    const dias = Number(url.searchParams.get('dias')) || 14;

    const [visitas, regs, serie] = await Promise.all([
      store.getVisits(),
      store.listRegs(2000),
      store.visitsByDay(dias),
    ]);

    const hoy = store.dayKey();
    const estados = { nuevo: 0, contactado: 0, voluntario: 0, descartado: 0 };
    const porDia = {};
    let hoyRegs = 0;

    regs.forEach((r) => {
      estados[r.estado] = (estados[r.estado] || 0) + 1;
      const dia = new Date(r.ts || Date.now()).toISOString().slice(0, 10);
      porDia[dia] = (porDia[dia] || 0) + 1;
      if (dia === hoy) hoyRegs += 1;
    });

    json(res, 200, {
      ok: true,
      visitas: visitas.visits,
      visitasHoy: visitas.today,
      registros: regs.length,
      registrosHoy: hoyRegs,
      estados,
      serie,
      serieRegistros: serie.map((s) => ({ dia: s.dia, registros: porDia[s.dia] || 0 })),
      configurado: store.isConfigured(),
    });
  } catch (e) {
    json(res, 500, { ok: false, error: 'Error del servidor' });
  }
};
