'use strict';
const store = require('../lib/store');
const auth = require('../lib/auth');
const { json, readBody, preflight } = require('../lib/http');

/* Validación del cuestionario. Los identificadores coinciden con assets/encuesta.js
   Son las 10 preguntas de la campaña, ordenadas en cuatro bloques (experiencia,
   confianza, pedidos y compromiso): p1–p7 del cuaderno de la compañía y p12–p14
   añadidas para orientar el trabajo (ubicación del cuartel, prioridades y
   disposición a apoyar). Se usan ids p12+ para no chocar con las preguntas
   heredadas p8–p11, que se aceptan si vienen pero ya no se muestran.
   El número visible de cada pregunta vive en assets/encuesta.js (`n`), no aquí. */
const ESCALA = { p1: [1, 10], p5: [1, 10] };
const OPCIONES = {
  p2: ['si', 'una', 'no', 'ns'],
  p4: ['amigo', 'familiar', 'ambos', 'no'],
  p6: ['si', 'talvez', 'no'],
  p12: ['si', 'maso', 'no'],
  p14: ['voluntario', 'donacion', 'difundir', 'aprender', 'ahora'],
};
const MULTIPLE = {
  p3: ['incendios', 'rescate', 'vehicular', 'matpel', 'prevencion', 'otro'],
  p13: ['equipo', 'capacitacion', 'respuesta', 'comunicacion', 'voluntarios', 'local'],
};
const REQUERIDAS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p12', 'p13', 'p14'];

/* Preguntas heredadas (solo se guardan si llegan bien formadas). */
const LEGADO_OPCIONES = {
  p8: ['si', 'duda', 'no'],
  p9: ['mucho', 'algo', 'poco', 'nada'],
  p10: ['whatsapp', 'facebook', 'radio', 'presencial', 'otro'],
  p11: ['si', 'talvez', 'no'],
};

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

/** Meta de participación de la campaña. */
const META = 500;

/** Día calendario del Perú (UTC-5) desplazado en `offset` días. */
function dayKey(offset) {
  const d = new Date(Date.now() + (offset || 0) * 86400000 - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

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

  /* Legado: se conserva solo lo que sea válido. */
  for (const id of Object.keys(LEGADO_OPCIONES)) {
    const v = clean(src[id], 40);
    if (LEGADO_OPCIONES[id].indexOf(v) >= 0) r[id] = v;
  }

  return { respuestas: r };
}

/** Métricas agregadas + lectura automática de los resultados. */
function resumen(encs) {
  const n = encs.length;
  const nums = (key) =>
    encs
      .map((e) => Number(e.r && e.r[key]))
      .filter((v) => Number.isFinite(v) && v > 0);

  const promedio = (arr) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  const pct = (parte, todo) => (todo ? Math.round((parte / todo) * 100) : null);

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
  const talVez = encs.filter((e) => e.r && e.r.p6 === 'talvez').length;

  const notasLabor = nums('p1');
  const promotores = notasLabor.filter((v) => v >= 9).length;
  const detractores = notasLabor.filter((v) => v <= 5).length;
  const baseLabor = notasLabor.length;

  const hanVisto = encs.filter((e) => e.r && (e.r.p2 === 'si' || e.r.p2 === 'una')).length;
  const redCercana = encs.filter((e) => e.r && e.r.p4 && e.r.p4 !== 'no').length;

  const distribucion = {};
  for (let i = 1; i <= 10; i++) distribucion[i] = 0;
  notasLabor.forEach((v) => {
    if (distribucion[v] !== undefined) distribucion[v] += 1;
  });

  const notasGlobal = nums('p5');
  const distribucion5 = {};
  for (let i = 1; i <= 10; i++) distribucion5[i] = 0;
  notasGlobal.forEach((v) => {
    if (distribucion5[v] !== undefined) distribucion5[v] += 1;
  });

  // Serie por día calendario del Perú
  const porDia = {};
  encs.forEach((e) => {
    const dia = new Date((e.ts || Date.now()) - 5 * 3600 * 1000).toISOString().slice(0, 10);
    porDia[dia] = (porDia[dia] || 0) + 1;
  });

  // Últimos 30 días, del más antiguo al más reciente
  const serie30 = [];
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(-i);
    serie30.push({ d: k, n: porDia[k] || 0 });
  }

  const ultimos7 = serie30.slice(-7).reduce((a, x) => a + x.n, 0);
  const hoy = porDia[dayKey(0)] || 0;
  const ayer = porDia[dayKey(-1)] || 0;

  let mejorDia = { d: null, n: 0 };
  Object.keys(porDia).forEach((d) => {
    if (porDia[d] > mejorDia.n) mejorDia = { d, n: porDia[d] };
  });

  const origenes = {};
  encs.forEach((e) => {
    const o = e.origen || 'web';
    origenes[o] = (origenes[o] || 0) + 1;
  });

  const ultima = encs.reduce((max, e) => Math.max(max, Number(e.ts) || 0), 0);
  const primera = encs.reduce((min, e) => {
    const t = Number(e.ts) || 0;
    return min && t ? Math.min(min, t) : min || t;
  }, 0);

  const diasActivos = Object.keys(porDia).filter((d) => porDia[d] > 0).length;
  const desdePrimera = primera
    ? Math.max(1, Math.round((Date.now() - primera) / 86400000) + 1)
    : 0;
  const promedioDiario = desdePrimera ? Math.round((n / desdePrimera) * 10) / 10 : 0;
  const ritmo7 = Math.round((ultimos7 / 7) * 10) / 10;

  const actividades = cuenta((e) => e.r && e.r.p3, MULTIPLE.p3);
  const vinculo = cuenta((e) => e.r && e.r.p4, OPCIONES.p4);
  const visto = cuenta((e) => e.r && e.r.p2, OPCIONES.p2);
  const recomendacion = cuenta((e) => e.r && e.r.p6, OPCIONES.p6);
  const ubicacion = cuenta((e) => e.r && e.r.p12, OPCIONES.p12);
  const prioridades = cuenta((e) => e.r && e.r.p13, MULTIPLE.p13);
  const apoyo = cuenta((e) => e.r && e.r.p14, OPCIONES.p14);

  const sabeCuartel = encs.filter((e) => e.r && e.r.p12 === 'si').length;
  const quierenApoyar = encs.filter((e) => e.r && e.r.p14 && e.r.p14 !== 'ahora').length;
  const quierenVoluntario = encs.filter((e) => e.r && e.r.p14 === 'voluntario').length;
  const topPrioridad = Object.keys(prioridades).sort((a, b) => prioridades[b] - prioridades[a])[0];
  const prioridadMax = topPrioridad ? prioridades[topPrioridad] : 0;

  const topActividad = Object.keys(actividades).sort((a, b) => actividades[b] - actividades[a])[0];
  const actividadesMax = topActividad ? actividades[topActividad] : 0;

  const promedioLabor = promedio(notasLabor);
  const promedioNota = promedio(nums('p5'));

  /* ── Lectura automática: se recalcula en cada consulta ─────────────── */
  const analisis = [];
  const push = (k, t, d) => analisis.push({ k, t, d });

  if (!n) {
    push('info', 'Sin datos todavía', 'Cuando lleguen las primeras respuestas verás aquí la lectura automática de la campaña.');
  } else {
    if (promedioLabor != null) {
      const nivel = promedioLabor >= 8.5 ? 'ok' : promedioLabor >= 7 ? 'ok' : promedioLabor >= 5.5 ? 'warn' : 'warn';
      const juicio =
        promedioLabor >= 8.5
          ? 'La comunidad tiene una imagen muy buena de la compañía.'
          : promedioLabor >= 7
            ? 'La imagen de la compañía es buena, con espacio para mejorar.'
            : promedioLabor >= 5.5
              ? 'La valoración es intermedia: conviene reforzar el acercamiento a los vecinos.'
              : 'La valoración es baja: es momento de escuchar y rendir cuentas a la comunidad.';
      push(
        nivel,
        'Imagen de la compañía: ' + promedioLabor + '/10',
        juicio + ' ' + (promotoresPctTexto(baseLabor, promotores) || '')
      );
    }

    if (promedioLabor != null && promedioNota != null) {
      const dif = Math.round((promedioNota - promedioLabor) * 10) / 10;
      const abs = Math.abs(dif);
      const txt = abs === 1 ? '1 punto' : abs + ' puntos';
      if (abs >= 0.5) {
        push(
          'info',
          'Preparación percibida ' + (dif > 0 ? txt + ' por encima' : txt + ' por debajo') + ' de la labor',
          dif > 0
            ? 'La comunidad confía más en la capacidad de respuesta que en el trabajo del día a día. Conviene mostrar más lo que se hace, para que esa confianza se traduzca en apoyo concreto.'
            : 'Se valora mejor la labor del día a día que la preparación para una emergencia mayor. Es el argumento más concreto para sustentar un pedido de equipamiento, unidades y más voluntarios.'
        );
      } else {
        push(
          'ok',
          'Preparación y labor, a la par (' + promedioNota + '/10)',
          'La comunidad percibe a la compañía igual de preparada que de eficaz: no hay una brecha entre lo que se hace y lo que se puede llegar a enfrentar.'
        );
      }
    }

    const pctVisto = pct(hanVisto, n);
    if (pctVisto != null) {
      push(
        pctVisto < 60 ? 'warn' : 'ok',
        'El ' + pctVisto + '% ha visto a los bomberos en acción',
        pctVisto < 60
          ? 'La mayoría nunca presenció una emergencia. Una jornada de puertas abiertas o un simulacro público convierte esa curiosidad en cercanía.'
          : 'Buena parte de la comunidad ya conoce el trabajo real de la compañía; es el mejor punto de partida para reclutar.'
      );
    }

    if (topActividad && actividadesMax) {
      const etiqueta = {
        incendios: 'los incendios',
        rescate: 'el rescate de personas',
        vehicular: 'los accidentes vehiculares',
        matpel: 'los materiales peligrosos',
        prevencion: 'la prevención y los primeros auxilios',
        otro: 'otras actividades',
      }[topActividad];
      push(
        'info',
        'Lo que más quieren ver: ' + (etiqueta || topActividad),
        actividadesMax +
          ' personas lo eligieron (' +
          pct(actividadesMax, n) +
          '%). Es el tema ideal para el próximo taller o demostración abierta.'
      );
    }

    const pctRed = pct(redCercana, n);
    if (pctRed != null) {
      push(
        pctRed >= 50 ? 'ok' : 'info',
        'El ' + pctRed + '% tiene un bombero cerca',
        pctRed >= 50
          ? 'La red de amigos y familiares ya existe: cada bombero puede invitar a una persona y duplicar la convocatoria.'
          : 'Pocas personas conocen a un bombero en persona. Las visitas a colegios y juntas vecinales amplían esa red.'
      );
    }

    const pctRec = pct(recomiendan, n);
    if (pctRec != null) {
      push(
        pctRec >= 60 ? 'ok' : 'warn',
        'El ' + pctRec + '% recomendaría ser bombero',
        pctRec >= 60
          ? 'La disposición a recomendar es alta: el cuello de botella no es la imagen, es la información sobre cómo postular.'
          : 'La recomendación todavía es baja. Mostrar el proceso de inscripción paso a paso ayuda a convertir la simpatía en postulantes.'
      );
    }

    const pctCuartel = pct(sabeCuartel, n);
    if (pctCuartel != null) {
      push(
        pctCuartel >= 70 ? 'ok' : 'warn',
        'El ' + pctCuartel + '% sabe dónde está el cuartel',
        pctCuartel >= 70
          ? 'La ubicación de la compañía es conocida en el distrito: en una emergencia la gente sabe a dónde acudir.'
          : 'Una parte importante no tiene claro dónde queda el cuartel. Un mapa y un cartel visible en la puerta, más difusión en colegios, resuelve algo básico.'
      );
    }

    if (topPrioridad && prioridadMax) {
      const etiquetaPri = {
        equipo: 'equipo y unidades',
        capacitacion: 'capacitación del personal',
        respuesta: 'tiempo de respuesta',
        comunicacion: 'comunicación con el barrio',
        voluntarios: 'más voluntarios',
        local: 'local e instalaciones',
      }[topPrioridad];
      push(
        'info',
        'Lo que piden mejorar: ' + (etiquetaPri || topPrioridad),
        prioridadMax + ' personas lo marcaron (' + pct(prioridadMax, n) + '%). Es el argumento más fuerte para sustentar un pedido de apoyo ante la municipalidad o el gobierno regional.'
      );
    }

    if (quierenApoyar) {
      const pctApoyo = pct(quierenApoyar, n);
      push(
        'ok',
        quierenApoyar + ' personas quieren apoyar',
        (quierenVoluntario ? quierenVoluntario + ' se ofrecieron como voluntarios. ' : '') +
          'El ' + pctApoyo + '% está dispuesto a sumar de alguna forma (voluntariado, donación, difusión o primeros auxilios). Conviene contactarlos mientras la respuesta está fresca.'
      );
    }

    if (ritmo7 >= 1) {
      const falta = Math.max(0, META - n);
      const dias = Math.ceil(falta / ritmo7);
      push(
        'info',
        'Ritmo: ' + ritmo7 + ' respuestas por día',
        falta === 0
          ? 'La meta de ' + META + ' respuestas ya está cumplida. El tablero sigue sumando.'
          : 'Faltan ' + falta + ' respuestas para la meta. A este ritmo se alcanzaría en unos ' + dias + ' días.'
      );
    } else if (n) {
      push(
        'warn',
        'Ritmo todavía bajo',
        'Menos de una respuesta por día en la última semana. Reactivar la difusión —juego, WhatsApp y el QR del cuartel— es la palanca más rápida para llegar a la meta de ' +
          META +
          '.'
      );
    }
  }

  function promotoresPctTexto(base, p) {
    if (!base) return '';
    return 'El ' + pct(p, base) + '% le pone 9 o 10.';
  }

  return {
    total: n,
    meta: META,
    hoy,
    ayer,
    ultimos7,
    primera: primera || null,
    ultima: ultima || null,
    diasActivos,
    promedioDiario,
    ritmo7,
    mejorDia,
    promedioLabor,
    promedioNota,
    recomiendan,
    recomiendaPct: pct(recomiendan, n),
    talVez,
    promotores,
    promotoresPct: pct(promotores, baseLabor),
    detractores,
    detractoresPct: pct(detractores, baseLabor),
    hanVisto,
    hanVistoPct: pct(hanVisto, n),
    redCercana,
    redPct: pct(redCercana, n),
    distribucion,
    distribucion5,
    actividades,
    canales: cuenta((e) => e.r && e.r.p10, LEGADO_OPCIONES.p10),
    conocimiento: cuenta((e) => e.r && e.r.p8, LEGADO_OPCIONES.p8),
    informacion: cuenta((e) => e.r && e.r.p9, LEGADO_OPCIONES.p9),
    participacion: cuenta((e) => e.r && e.r.p11, LEGADO_OPCIONES.p11),
    vinculo,
    visto,
    recomendacion,
    ubicacion,
    prioridades,
    apoyo,
    sabeCuartel,
    sabeCuartelPct: pct(sabeCuartel, n),
    quierenApoyar,
    quierenApoyarPct: pct(quierenApoyar, n),
    quierenVoluntario,
    distritos: cuenta((e) => e.distrito, DISTRITOS),
    edades: cuenta((e) => e.edad, EDADES),
    origenes,
    porDia,
    serie30,
    comentarios: encs.filter((e) => e.r && e.r.p7).length,
    analisis,
  };
}

async function crear(req, res) {
  const body = await readBody(req);
  const { respuestas, error } = validar(body.respuestas);
  if (error) return json(res, 400, { ok: false, error });

  const origenes = ['web', 'juego', 'contacto', 'qr', 'resultados', 'admin'];
  const orgTxt = clean(body.origen, 20).toLowerCase();
  const origen = origenes.indexOf(orgTxt) >= 0 ? orgTxt : 'web';

  const now = new Date();
  const id = folio();
  const doc = {
    id,
    ts: now.getTime(),
    creado: now.toISOString(),
    r: respuestas,
    distrito: DISTRITOS.indexOf(clean(body.distrito, 40)) >= 0 ? clean(body.distrito, 40) : '',
    edad: EDADES.indexOf(clean(body.edad, 20)) >= 0 ? clean(body.edad, 20) : '',
    origen,
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
    /* Los resultados ya no son públicos: solo se consultan con sesión iniciada
       desde el panel interno. Sin token, ni agregados ni respuestas. */
    if (!auth.requireAdmin(req)) {
      return json(res, 401, { ok: false, error: 'Los resultados requieren iniciar sesión.' });
    }

    if (req.method === 'GET' && url.searchParams.get('resumen') === '1') {
      const encs = await store.listEncuestas(5000);
      const s = resumen(encs);
      return json(res, 200, Object.assign({ ok: true }, s));
    }

    if (req.method === 'GET') {
      const encs = await store.listEncuestas(5000);
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
