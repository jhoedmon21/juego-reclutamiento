'use strict';
/**
 * Capa de almacenamiento unica.
 *
 *  - En produccion (Vercel) usa un Redis compatible con la API REST de Upstash.
 *    Sirve tanto para "Upstash Redis" del Marketplace de Vercel como para el
 *    antiguo "Vercel KV": ambos inyectan KV_REST_API_URL / KV_REST_API_TOKEN.
 *  - En local, si no hay variables de entorno, guarda todo en .data/store.json.
 */

const fs = require('fs');
const path = require('path');

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_KV = Boolean(KV_URL && KV_TOKEN);

const FILE = process.env.DATA_FILE || path.join(process.cwd(), '.data', 'store.json');

/* ------------------------------------------------------------------ Redis */

async function kvCall(args) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KV_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map((a) => String(a))),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('KV ' + res.status + ': ' + text.slice(0, 180));
  const data = JSON.parse(text);
  if (data && data.error) throw new Error('KV: ' + data.error);
  return data.result;
}

async function kvPipe(cmds) {
  const res = await fetch(KV_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KV_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds.map((c) => c.map((a) => String(a)))),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('KV ' + res.status + ': ' + text.slice(0, 180));
  const data = JSON.parse(text);
  return data.map((d) => (d && d.error ? null : d.result));
}

/* ------------------------------------------------------------- Archivo local */

function fileRead() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return { visits: 0, days: {}, regs: {} };
  }
}

function fileWrite(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

/* ------------------------------------------------------------------ Utils */

/** Dia calendario en hora de Peru (UTC-5). */
function dayKey(offsetDays) {
  const d = new Date(Date.now() + (offsetDays || 0) * 86400000 - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function lastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(-i));
  return out;
}

function isConfigured() {
  return USE_KV || fs.existsSync(FILE) || !process.env.VERCEL;
}

/* ---------------------------------------------------------------- Lectura */

async function getVisits() {
  if (USE_KV) {
    const [total, today] = await kvPipe([['GET', 'visits'], ['GET', 'vday:' + dayKey()]]);
    return { visits: Number(total) || 0, today: Number(today) || 0 };
  }
  const d = fileRead();
  return { visits: d.visits || 0, today: (d.days || {})[dayKey()] || 0 };
}

async function countRegs() {
  if (USE_KV) return Number(await kvCall(['ZCARD', 'regs:idx'])) || 0;
  return Object.keys(fileRead().regs || {}).length;
}

async function getReg(dni) {
  if (USE_KV) {
    const raw = await kvCall(['GET', 'reg:' + dni]);
    return raw ? JSON.parse(raw) : null;
  }
  return (fileRead().regs || {})[dni] || null;
}

async function listRegs(limit) {
  const max = Math.min(Number(limit) || 500, 2000);
  if (USE_KV) {
    const dnis = await kvCall(['ZREVRANGE', 'regs:idx', 0, max - 1]);
    if (!dnis || !dnis.length) return [];
    const raws = await kvCall(['MGET'].concat(dnis.map((d) => 'reg:' + d)));
    return raws.filter(Boolean).map((r) => JSON.parse(r));
  }
  return Object.values(fileRead().regs || {})
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, max);
}

async function visitsByDay(n) {
  const days = lastDays(Math.min(Number(n) || 14, 90));
  if (USE_KV) {
    const vals = await kvCall(['MGET'].concat(days.map((d) => 'vday:' + d)));
    return days.map((d, i) => ({ dia: d, visitas: Number(vals[i]) || 0 }));
  }
  const store = fileRead();
  return days.map((d) => ({ dia: d, visitas: (store.days || {})[d] || 0 }));
}

/* --------------------------------------------------------------- Escritura */

async function addVisit() {
  if (USE_KV) {
    const [total, today] = await kvPipe([
      ['INCR', 'visits'],
      ['INCR', 'vday:' + dayKey()],
    ]);
    return { visits: Number(total) || 0, today: Number(today) || 0 };
  }
  const d = fileRead();
  d.visits = (d.visits || 0) + 1;
  d.days = d.days || {};
  d.days[dayKey()] = (d.days[dayKey()] || 0) + 1;
  fileWrite(d);
  return { visits: d.visits, today: d.days[dayKey()] };
}

/**
 * Guarda (o actualiza) un registro. Si el DNI ya existe se conserva la fecha
 * original y se refrescan los datos, para que la persona no aparezca dos veces.
 */
async function saveReg(rec) {
  const prev = await getReg(rec.d);
  const doc = Object.assign({}, prev || {}, rec, {
    ts: prev && prev.ts ? prev.ts : rec.ts,
    creado: prev && prev.creado ? prev.creado : rec.creado,
    actualizado: new Date().toISOString(),
    estado: (prev && prev.estado) || rec.estado || 'nuevo',
    veces: prev ? (prev.veces || 1) + 1 : 1,
  });

  if (USE_KV) {
    await kvPipe([
      ['SET', 'reg:' + doc.d, JSON.stringify(doc)],
      ['ZADD', 'regs:idx', doc.ts, doc.d],
    ]);
  } else {
    const d = fileRead();
    d.regs = d.regs || {};
    d.regs[doc.d] = doc;
    fileWrite(d);
  }
  return { doc, dup: Boolean(prev) };
}

async function deleteReg(dni) {
  if (USE_KV) {
    await kvPipe([
      ['DEL', 'reg:' + dni],
      ['ZREM', 'regs:idx', dni],
    ]);
    return true;
  }
  const d = fileRead();
  if (!d.regs || !d.regs[dni]) return false;
  delete d.regs[dni];
  fileWrite(d);
  return true;
}

async function setEstado(dni, estado) {
  const doc = await getReg(dni);
  if (!doc) return null;
  doc.estado = estado;
  doc.actualizado = new Date().toISOString();
  if (USE_KV) await kvCall(['SET', 'reg:' + dni, JSON.stringify(doc)]);
  else {
    const d = fileRead();
    d.regs[dni] = doc;
    fileWrite(d);
  }
  return doc;
}

module.exports = {
  isConfigured,
  addVisit,
  getVisits,
  countRegs,
  listRegs,
  getReg,
  saveReg,
  deleteReg,
  setEstado,
  visitsByDay,
  dayKey,
};
