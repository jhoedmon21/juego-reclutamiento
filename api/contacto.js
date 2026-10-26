'use strict';
const store = require('../lib/store');
const auth = require('../lib/auth');
const { json, readBody, preflight } = require('../lib/http');

const DISTRITOS = [
  'Camaná',
  'Samuel Pastor',
  'Nicolás de Piérola',
  'Mariscal Cáceres',
  'José María Quimper',
  'Ocoña',
  'Otro distrito',
];

const MOTIVOS = [
  'Quiero ser bombero voluntario',
  'Información sobre el voluntariado',
  'Capacitación y prevención',
  'Donaciones y apoyo',
  'Prensa y comunicación',
  'Constancia o trámite',
  'Otro',
];

const ESTADOS = ['nuevo', 'atendido', 'archivado'];

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
  return 'CT-' + ymd + '-' + r;
}

async function crear(req, res) {
  const body = await readBody(req);

  // Campo trampa: si viene completo es un bot. Se responde igual, sin guardar.
  if (clean(body.empresa)) {
    return json(res, 200, { ok: true, folio: folio() });
  }

  const nombre = clean(body.nombre, 90).replace(/\s+/g, ' ');
  const dni = clean(body.dni, 20).replace(/\D/g, '');
  const correo = clean(body.correo, 120).toLowerCase();
  const telefono = clean(body.telefono, 30);
  const distrito = clean(body.distrito, 60);
  const motivo = clean(body.motivo, 80);
  const mensaje = clean(body.mensaje, 1500);

  let error = '';
  if (nombre.length < 5 || nombre.split(' ').length < 2) {
    error = 'Escriba sus nombres y apellidos completos.';
  } else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(nombre)) {
    error = 'El nombre solo puede contener letras y espacios.';
  } else if (dni && !/^\d{8}$/.test(dni)) {
    error = 'El DNI debe tener 8 dígitos.';
  } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(correo)) {
    error = 'Ingrese un correo electrónico válido.';
  } else if (telefono.replace(/\D/g, '').length < 9) {
    error = 'Ingrese un número de teléfono de 9 dígitos.';
  } else if (DISTRITOS.indexOf(distrito) < 0) {
    error = 'Seleccione un distrito válido.';
  } else if (MOTIVOS.indexOf(motivo) < 0) {
    error = 'Seleccione un motivo de contacto válido.';
  } else if (mensaje.length < 20) {
    error = 'El mensaje debe tener al menos 20 caracteres.';
  } else if (!body.consent) {
    error = 'Debe autorizar el uso de sus datos personales.';
  }

  if (error) return json(res, 400, { ok: false, error });

  const now = new Date();
  const id = folio();
  const doc = {
    id,
    ts: now.getTime(),
    creado: now.toISOString(),
    estado: 'nuevo',
    nombre,
    dni,
    correo,
    telefono,
    distrito,
    motivo,
    mensaje,
    consent: true,
    ua: clean(req.headers['user-agent'], 200),
    pais: clean(req.headers['x-vercel-ip-country'], 8),
  };

  try {
    await store.saveMsg(doc);
    json(res, 200, { ok: true, folio: id });
  } catch (e) {
    json(res, 200, { ok: false, error: 'No se pudo registrar su comunicación. Intente más tarde.' });
  }
}

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;

  try {
    if (req.method === 'POST') return await crear(req, res);

    // A partir de aquí todo requiere sesión de administrador
    if (!auth.requireAdmin(req)) {
      return json(res, 401, { ok: false, error: 'Sesión expirada. Vuelve a entrar.' });
    }

    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET') {
      const msgs = await store.listMsgs(Number(url.searchParams.get('limit')) || 1000);
      const conteo = { nuevo: 0, atendido: 0, archivado: 0 };
      msgs.forEach((m) => {
        conteo[m.estado] = (conteo[m.estado] || 0) + 1;
      });
      return json(res, 200, { ok: true, total: msgs.length, conteo, mensajes: msgs });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = await readBody(req);
      const id = clean(body.id, 40);
      const estado = clean(body.estado, 20);
      if (!id) return json(res, 400, { ok: false, error: 'Falta el identificador.' });
      if (ESTADOS.indexOf(estado) < 0) return json(res, 400, { ok: false, error: 'Estado inválido.' });
      const doc = await store.setMsgEstado(id, estado);
      return json(res, doc ? 200 : 404, { ok: Boolean(doc), mensaje: doc });
    }

    if (req.method === 'DELETE') {
      const id = clean(url.searchParams.get('id'), 40);
      if (!id) return json(res, 400, { ok: false, error: 'Falta el identificador.' });
      const ok = await store.deleteMsg(id);
      return json(res, ok ? 200 : 404, { ok, error: ok ? null : 'No existe' });
    }

    json(res, 405, { ok: false, error: 'Método no permitido' });
  } catch (e) {
    json(res, 500, { ok: false, error: 'Error del servidor' });
  }
};
