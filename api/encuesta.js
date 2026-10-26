'use strict';
const store = require('../lib/store');
const auth = require('../lib/auth');
const { json, readBody, preflight } = require('../lib/http');

/* Validación del cuestionario. Los identificadores coinciden con assets/encuesta.js */
const ESCALA = { p1: [1, 10], p5: [1, 10] };
const OPCIONES = {
  p2: ['si', 'una', 'no', 'ns'],
  p4: ['familiar', 'amigo', 'ambos', 'no'],
  p6: ['si', 'talvez', 'no'],
  p8: ['si', 'duda', 'no'],
  p9: ['mucho', 'algo', 'poco', 'nada'],
  p10: ['whatsapp', 'facebook', 'radio', 'presencial', 'otro'],
  p11: ['si', 'talvez', 'no'],
};
const MULTIPLE = { p3: ['incendios', 'rescate', 'vehicular', 'matpel', 'prevencion', 'otro'] };
const REQUERIDAS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p9', 'p10', 'p11'];

const DISTRITOS = [
  'Camaná',
  'Samuel Pastor',
  'Nicolás de Piérola',
  'Mariscal Cáceres',
  'José María Quimper',
  'Ocoña',
  'Otro distrito',
];
const EDADES = ['Menor de 18', '18 a 24', '25 a 34', '35 a 44', '45 a 59', '60 a más'];

function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, max || 200);
}

function folio() {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  let r = '';
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 4; i++) r += abc[Math.floor(Math.random() * abc.length)];
  return 'EN-' + ymd + '-' + r;
}

/** Valida y normaliza las respuestas. Devuelve {respuestas} o {error}. */
function validar(entrada) {
  const r = {};
  const src = entrada && typeof entrada === 'object' ? entrada : {};

  for (const id of REQUERIDAS) {
    const v = src[id];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) {
      return { error: 'Faltan respuestas obligatorias.' };
    }
  }

  for (const id of Object.keys(ESCALA)) {
    const [min, max] = ESCALA[id];
    const n = Number(src[id]);
    if (!Number.isFinite(n) || n < min || n > max || Math.round(n) !== n) {
      return { error: 'Una de las calificaciones está fuera de rango.' };
    }
    r[id] = n;
  }

  for (const id of Object.keys(OPCIONES)) {
    const v = clean(src[id], 40);
    if (OPCIONES[id].indexOf(v) < 0) return { error: 'Una de las opciones no es válida.' };
    r[id] = v;
  }

  for (const id of Object.keys(MULTIPLE)) {
    const arr = Array.isArray(src[id]) ? src[id] : [src[id]];
    const limpio = arr.map((x) => clean(x, 40)).filter((x) => MULTIPLE[id].indexOf(x) >= 0);
    if (!limpio.length) return { error: 'Seleccione al menos una opción.' };
    r[id] = limpio.slice(0, 6);
  }

  r.p7 = clean(src.p7, 600);

  return { respuestas: r };
}

/** Métricas agregadas a partir de las respuestas guardadas. */
function resumen(encs) {
  const n = encs.length;
  const nums = (key) =>
    encs
      .map((e) => Number(e.r && e.r[key]))
      .filter((v) => Number.isFinite(v) && v > 0);

  const promedio = (arr) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  const cuenta = (get, universo) => {
    const out = {};
    (universo || []).forEach((k) => {
      out[k] = 0;
    });
    encs.forEach((e) => {
      const v = get(e);
      if (Array.isArray(v)) v.forEach((x) => (out[x] = (out[x] || 0) + 1));
      else if (v) out[v] = (out[v] || 0) + 1;
    });
    return out;
  };

  const recomiendan = encs.filter((e) => e.r && e.r.p6 === 'si').length;

  const distribucion = {};
  for (let i = 1; i <= 10; i++) distribucion[i] = 0;
  nums('p1').forEach((v) => {
    if (distribucion[v] !== undefined) distribucion[v] += 1;
  });

  const porDia = {};
  encs.forEach((e) => {
    const dia = new Date(e.ts || Date.now()).toISOString().slice(0, 10);
    porDia[dia] = (porDia[dia] || 0) + 1;
  });

  return {
    total: n,
    promedioLabor: promedio(nums('p1')),
    promedioNota: promedio(nums('p5')),
    recomiendaPct: n ? Math.round((recomiendan / n) * 100) : null,
    recomiendan,
    distribucion,
    actividades: cuenta((e) => e.r && e.r.p3, MULTIPLE.p3),
    canales: cuenta((e) => e.r && e.r.p10, OPCIONES.p10),
    conocimiento: cuenta((e) => e.r && e.r.p8, OPCIONES.p8),
    informacion: cuenta((e) => e.r && e.r.p9, OPCIONES.p9),
    participacion: cuenta((e) => e.r && e.r.p11, OPCIONES.p11),
    distritos: cuenta((e) => e.distrito, DISTRITOS),
    edades: cuenta((e) => e.edad, EDADES),
    porDia,
    comentarios: encs.filter((e) => e.r && e.r.p7).length,
  };
}

async function crear(req, res) {
  const body = await readBody(req);
  const { respuestas, error } = validar(body.respuestas);
  if (error) return json(res, 400, { ok: false, error });

  const now = new Date();
  const id = folio();
  const doc = {
    id,
    ts: now.getTime(),
    creado: now.toISOString(),
    r: respuestas,
    distrito: DISTRITOS.indexOf(clean(body.distrito, 40)) >= 0 ? clean(body.distrito, 40) : '',
    edad: EDADES.indexOf(clean(body.edad, 20)) >= 0 ? clean(body.edad, 20) : '',
    ua: clean(req.headers['user-agent'], 200),
  };

  try {
    await store.saveEncuesta(doc);
    json(res, 200, { ok: true, folio: id });
  } catch (e) {
    json(res, 200, { ok: false, error: 'No se pudo registrar su respuesta. Intente más tarde.' });
  }
}

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    if (req.method === 'POST') return await crear(req, res);

    const url = new URL(req.url, 'http://localhost');

    // Resumen público: solo cifras agregadas, nunca respuestas individuales.
    if (req.method === 'GET' && url.searchParams.get('resumen') === '1') {
      const encs = await store.listEncuestas(2000);
      const s = resumen(encs);
      return json(res, 200, {
        ok: true,
        total: s.total,
        promedioLabor: s.promedioLabor,
        promedioNota: s.promedioNota,
        recomiendaPct: s.recomiendaPct,
      });
    }

    if (!auth.requireAdmin(req)) {
      return json(res, 401, { ok: false, error: 'Sesión expirada. Vuelve a entrar.' });
    }

    if (req.method === 'GET') {
      const encs = await store.listEncuestas(2000);
      return json(res, 200, { ok: true, total: encs.length, resumen: resumen(encs), respuestas: encs });
    }

    if (req.method === 'DELETE') {
      const id = clean(url.searchParams.get('id'), 40);
      if (!id) return json(res, 400, { ok: false, error: 'Falta el identificador.' });
      const ok = await store.deleteEncuesta(id);
      return json(res, ok ? 200 : 404, { ok, error: ok ? null : 'No existe' });
    }

    json(res, 405, { ok: false, error: 'Método no permitido' });
  } catch (e) {
    json(res, 500, { ok: false, error: 'Error del servidor' });
  }
};
