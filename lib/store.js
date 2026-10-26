'use strict';
/**
 * Capa de almacenamiento unica, con tres backends por orden de preferencia:
 *
 *  1. Redis (Upstash / Vercel KV)  -> KV_REST_API_URL + KV_REST_API_TOKEN
 *  2. Vercel Blob                  -> BLOB_READ_WRITE_TOKEN
 *  3. Archivo JSON local           -> .data/store.json  (solo desarrollo)
 *
 * El primero que este configurado es el que se usa.
 */

const fs = require('fs');
const path = require('path');

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_KV = Boolean(KV_URL && KV_TOKEN);

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const USE_BLOB = Boolean(BLOB_TOKEN);

let blobSdk = null;
if (USE_BLOB) {
  try {
    blobSdk = require('@vercel/blob');
  } catch (e) {
    blobSdk = null;
  }
}

const FILE = process.env.DATA_FILE || path.join(process.cwd(), '.data', 'store.json');

const P_VISITS = 'data/visits.json';
const P_REGS = 'data/regs/';

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

/* ------------------------------------------------------------------- Blob */

async function bGet(p) {
  if (!blobSdk) return null;
  const r = await blobSdk.get(p, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return { text: await new Response(r.stream).text(), etag: r.blob.etag };
}

async function bPut(p, text, etag) {
  const opts = {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  };
  if (etag) opts.ifMatch = etag;
  return blobSdk.put(p, text, opts);
}

async function bList(prefix) {
  if (!blobSdk) return [];
  const out = [];
  let cursor;
  for (let guard = 0; guard < 20; guard++) {
    const r = await blobSdk.list({ prefix, limit: 1000, cursor });
    (r.blobs || []).forEach((b) => out.push(b.pathname));
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  return out;
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

/* ------------------------------------------------------------------- Utils */

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
  if (USE_KV || USE_BLOB) return true;
  return !process.env.VERCEL; // en local siempre se puede escribir el archivo
}

function backend() {
  if (USE_KV) return 'redis';
  if (USE_BLOB) return 'blob';
  return 'file';
}

/* ---------------------------------------------------------------- Lectura */

async function getVisits() {
  if (USE_KV) {
    const [total, today] = await kvPipe([['GET', 'visits'], ['GET', 'vday:' + dayKey()]]);
    return { visits: Number(total) || 0, today: Number(today) || 0 };
  }
  if (USE_BLOB) {
    const r = await bGet(P_VISITS);
    const doc = r ? JSON.parse(r.text) : { total: 0, days: {} };
    return { visits: doc.total || 0, today: (doc.days || {})[dayKey()] || 0 };
  }
  const d = fileRead();
  return { visits: d.visits || 0, today: (d.days || {})[dayKey()] || 0 };
}

async function countRegs() {
  if (USE_KV) return Number(await kvCall(['ZCARD', 'regs:idx'])) || 0;
  if (USE_BLOB) return (await bList(P_REGS)).length;
  return Object.keys(fileRead().regs || {}).length;
}

async function getReg(dni) {
  if (USE_KV) {
    const raw = await kvCall(['GET', 'reg:' + dni]);
    return raw ? JSON.parse(raw) : null;
  }
  if (USE_BLOB) {
    const r = await bGet(P_REGS + dni + '.json');
    return r ? JSON.parse(r.text) : null;
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

  if (USE_BLOB) {
    const paths = await bList(P_REGS);
    const out = [];
    for (let i = 0; i < paths.length; i += 16) {
      const chunk = paths.slice(i, i + 16);
      const res = await Promise.all(chunk.map((p) => bGet(p).catch(() => null)));
      res.forEach((r) => {
        if (!r) return;
        try {
          out.push(JSON.parse(r.text));
        } catch (e) {
          /* ignora blobs corruptos */
        }
      });
    }
    return out.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, max);
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

  if (USE_BLOB) {
    const r = await bGet(P_VISITS);
    const doc = r ? JSON.parse(r.text) : { days: {} };
    return days.map((d) => ({ dia: d, visitas: (doc.days || {})[d] || 0 }));
  }

  const store = fileRead();
  return days.map((d) => ({ dia: d, visitas: (store.days || {})[d] || 0 }));
}

/* --------------------------------------------------------------- Escritura */

async function addVisit() {
  if (USE_KV) {
    const [total, today] = await kvPipe([['INCR', 'visits'], ['INCR', 'vday:' + dayKey()]]);
    return { visits: Number(total) || 0, today: Number(today) || 0 };
  }

  if (USE_BLOB) {
    const k = dayKey();
    // Escritura condicional por ETag: si otra visita gano la carrera, se reintenta.
    for (let attempt = 0; attempt < 6; attempt++) {
      let doc = { total: 0, days: {} };
      let etag = null;
      try {
        const r = await bGet(P_VISITS);
        if (r) {
          doc = JSON.parse(r.text);
          etag = r.etag;
        }
      } catch (e) {
        /* doc inexistente o ilegible: se crea */
      }
      doc.total = (doc.total || 0) + 1;
      doc.days = doc.days || {};
      doc.days[k] = (doc.days[k] || 0) + 1;
      try {
        await bPut(P_VISITS, JSON.stringify(doc), etag);
        return { visits: doc.total, today: doc.days[k] };
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/precondition|already exists|conflict/i.test(msg)) continue;
        throw e;
      }
    }
    const r = await bGet(P_VISITS).catch(() => null);
    const doc = r ? JSON.parse(r.text) : { total: 0, days: {} };
    return { visits: doc.total || 0, today: (doc.days || {})[k] || 0 };
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
  const json = JSON.stringify(doc);

  if (USE_KV) {
    await kvPipe([
      ['SET', 'reg:' + doc.d, json],
      ['ZADD', 'regs:idx', doc.ts, doc.d],
    ]);
  } else if (USE_BLOB) {
    await bPut(P_REGS + doc.d + '.json', json);
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
    await kvPipe([['DEL', 'reg:' + dni], ['ZREM', 'regs:idx', dni]]);
    return true;
  }
  if (USE_BLOB) {
    if (!(await getReg(dni))) return false;
    await blobSdk.del(P_REGS + dni + '.json');
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
  const json = JSON.stringify(doc);

  if (USE_KV) await kvCall(['SET', 'reg:' + dni, json]);
  else if (USE_BLOB) await bPut(P_REGS + dni + '.json', json);
  else {
    const d = fileRead();
    d.regs[dni] = doc;
    fileWrite(d);
  }
  return doc;
}

module.exports = {
  backend,
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
