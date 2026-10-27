/* Definición única de la encuesta ciudadana.
   La usan encuesta.html (para pintar el formulario) y admin.html (gráficos,
   análisis y exportación).

   Estructura: 10 preguntas en cuatro bloques que van de lo más simple a lo más
   comprometido, para que nadie abandone a mitad:

     1. Tu experiencia  · qué ha visto y cómo califica la labor          (2)
     2. Tu confianza    · preparación percibida, ubicación y vínculo     (3)
     3. Lo que pides    · prioridades de mejora y actividades a mostrar  (2)
     4. Tu compromiso   · recomendación, apoyo y pedido abierto          (3)

   El número que se muestra (`n`) sigue el orden del arreglo: 1 a 10. La
   pregunta abierta es la 10 y va al final porque es la única opcional.
   Los `id` se mantienen estables respecto a las versiones anteriores para no
   romper las respuestas ya guardadas ni la validación de /api/encuesta. */
(function (w) {
  'use strict';

  var DISTRITOS = [
    'Camaná',
    'Samuel Pastor',
    'Nicolás de Piérola',
    'Mariscal Cáceres',
    'José María Quimper',
    'Ocoña',
    'Otro distrito',
  ];

  var EDADES = ['Menor de 18', '18 a 24', '25 a 34', '35 a 44', '45 a 59', '60 a más'];

  var PREGUNTAS = [
    /* ── 1. Tu experiencia ───────────────────────────────────────────── */
    {
      id: 'p1',
      seccion: 'Tu experiencia',
      n: 1,
      icono: '⭐',
      tipo: 'escala',
      min: 1,
      max: 10,
      etiquetas: ['Muy deficiente', 'Excelente'],
      corto: 'Calificación de la labor',
      titulo: 'Pensando en lo que has visto o escuchado, ¿cómo calificas la labor de los Bomberos de Camaná?',
      ayuda: 'Del 1 al 10: 1 es «muy deficiente» y 10 es «excelente». No hay respuesta correcta.',
    },
    {
      id: 'p2',
      seccion: 'Tu experiencia',
      n: 2,
      icono: '👀',
      tipo: 'opciones',
      corto: '¿Ha visto trabajar a los bomberos?',
      titulo: '¿Has visto a los bomberos de Camaná trabajando en una emergencia real?',
      ayuda: 'Cuenta también si los viste pasar con la unidad o en un simulacro.',
      opciones: [
        { v: 'si', t: 'Sí, más de una vez', icono: '🔁' },
        { v: 'una', t: 'Sí, una sola vez', icono: '1️⃣' },
        { v: 'no', t: 'No, nunca', icono: '🚫' },
        { v: 'ns', t: 'No lo recuerdo', icono: '🤔' },
      ],
    },

    /* ── 2. Tu confianza ─────────────────────────────────────────────── */
    {
      id: 'p5',
      seccion: 'Tu confianza',
      n: 3,
      icono: '🛡️',
      tipo: 'escala',
      min: 1,
      max: 10,
      etiquetas: ['Nada preparados', 'Muy preparados'],
      corto: 'Preparación para una emergencia grande',
      titulo: '¿Qué tan preparados sientes a los bomberos de Camaná para una emergencia grande: un sismo, un incendio forestal o un accidente con muchas víctimas?',
      ayuda: 'Del 1 al 10. No evalúa a las personas: evalúa si la compañía tiene con qué responder.',
    },
    {
      id: 'p12',
      seccion: 'Tu confianza',
      n: 4,
      icono: '📍',
      tipo: 'opciones',
      corto: '¿Sabe dónde está la compañía?',
      titulo: 'Si hubiera una emergencia en tu casa, ¿sabrías dónde queda la compañía de bomberos más cercana?',
      ayuda: 'Nos dice si la gente del distrito tiene claro a dónde acudir.',
      opciones: [
        { v: 'si', t: 'Sí, la ubico de inmediato', icono: '🏠' },
        { v: 'maso', t: 'Más o menos', icono: '🤔' },
        { v: 'no', t: 'No lo sé', icono: '🚫' },
      ],
    },
    {
      id: 'p4',
      seccion: 'Tu confianza',
      n: 5,
      icono: '🤝',
      tipo: 'opciones',
      corto: '¿Tiene un bombero cerca?',
      titulo: '¿Tienes algún amigo o familiar que sea bombero voluntario?',
      ayuda: 'Tener un bombero cerca cambia la forma en que se vive la institución.',
      opciones: [
        { v: 'amigo', t: 'Sí, un amigo', icono: '🧑‍🤝‍🧑' },
        { v: 'familiar', t: 'Sí, un familiar', icono: '👨‍👩‍👧' },
        { v: 'ambos', t: 'Sí, ambos', icono: '👥' },
        { v: 'no', t: 'No', icono: '🚫' },
      ],
    },

    /* ── 3. Lo que pides ─────────────────────────────────────────────── */
    {
      id: 'p13',
      seccion: 'Lo que pides',
      n: 6,
      icono: '🛠️',
      tipo: 'opciones',
      corto: 'Qué debe mejorar primero',
      titulo: 'Si tuvieras que decidir, ¿qué debería mejorar primero la compañía?',
      ayuda: 'Puedes marcar más de una opción. Es lo que más nos ayuda a priorizar.',
      multiple: true,
      opciones: [
        { v: 'equipo', t: 'Equipo y unidades', icono: '🚒' },
        { v: 'capacitacion', t: 'Capacitación del personal', icono: '🎓' },
        { v: 'respuesta', t: 'Tiempo de respuesta', icono: '⏱️' },
        { v: 'comunicacion', t: 'Comunicación con el barrio', icono: '📢' },
        { v: 'voluntarios', t: 'Más voluntarios', icono: '🙋' },
        { v: 'local', t: 'Local e instalaciones', icono: '🏢' },
      ],
    },
    {
      id: 'p3',
      seccion: 'Lo que pides',
      n: 7,
      icono: '🚒',
      tipo: 'opciones',
      corto: 'Actividad que quiere conocer',
      titulo: '¿Qué te gustaría ver de cerca en una jornada de puertas abiertas?',
      ayuda: 'Puedes marcar más de una opción.',
      multiple: true,
      opciones: [
        { v: 'incendios', t: 'Incendios', icono: '🔥' },
        { v: 'rescate', t: 'Rescate de personas', icono: '🆘' },
        { v: 'vehicular', t: 'Accidentes vehiculares', icono: '🚗' },
        { v: 'matpel', t: 'Materiales peligrosos', icono: '☣️' },
        { v: 'prevencion', t: 'Prevención y primeros auxilios', icono: '🩺' },
        { v: 'otro', t: 'Otro', icono: '✳️' },
      ],
    },

    /* ── 4. Tu compromiso ────────────────────────────────────────────── */
    {
      id: 'p6',
      seccion: 'Tu compromiso',
      n: 8,
      icono: '🙌',
      tipo: 'opciones',
      corto: '¿Recomendaría ser bombero?',
      titulo: '¿Le recomendarías a un joven de tu distrito ser bombero voluntario?',
      opciones: [
        { v: 'si', t: 'Sí, sin dudarlo', icono: '✅' },
        { v: 'talvez', t: 'Tal vez', icono: '🤷' },
        { v: 'no', t: 'No', icono: '❌' },
      ],
    },
    {
      id: 'p14',
      seccion: 'Tu compromiso',
      n: 9,
      icono: '🤲',
      tipo: 'opciones',
      corto: 'Cómo le gustaría apoyar',
      titulo: '¿Cómo te gustaría apoyar a los bomberos de Camaná?',
      ayuda: 'Elige la que de verdad podrías sostener en el tiempo.',
      opciones: [
        { v: 'voluntario', t: 'Siendo voluntario', icono: '🧑‍🚒' },
        { v: 'donacion', t: 'Con una donación', icono: '🎁' },
        { v: 'difundir', t: 'Difundiendo su trabajo', icono: '📣' },
        { v: 'aprender', t: 'Aprendiendo primeros auxilios', icono: '🩺' },
        { v: 'ahora', t: 'Por ahora no puedo', icono: '🙅' },
      ],
    },
    {
      id: 'p7',
      seccion: 'Tu compromiso',
      n: 10,
      icono: '✍️',
      tipo: 'abierta',
      corto: '¿Qué le pediría a la compañía?',
      titulo: 'Para terminar: ¿qué le pedirías a los Bomberos de Camaná?',
      ayuda: 'Opcional. Un pedido, una idea o una queja: todo se lee en la Comandancia.',
      placeholder: 'Ej. Que visiten los colegios para enseñar primeros auxilios…',
      max: 600,
      requerido: false,
    },
  ];

  /* Bajada de cada bloque: la usa la cabecera de cada paso del formulario. */
  var SUB = {
    'Tu experiencia': 'Lo que has visto del trabajo de la compañía en tu distrito.',
    'Tu confianza': 'Qué tan preparada y cerca sientes a la institución.',
    'Lo que pides': 'Lo que debe mejorar y lo que te gustaría ver de cerca.',
    'Tu compromiso': 'Si recomendarías ser bombero, cómo apoyarías y tu pedido final.',
  };

  /* Etiquetas legibles de cada respuesta cerrada (las usan el tablero y el panel). */
  var ETIQUETAS = {};
  PREGUNTAS.forEach(function (p) {
    if (p.tipo === 'opciones') {
      var m = {};
      p.opciones.forEach(function (o) {
        m[o.v] = o.t;
      });
      ETIQUETAS[p.id] = m;
    }
  });

  var SECCIONES = [];
  PREGUNTAS.forEach(function (p) {
    var s = SECCIONES.filter(function (x) {
      return x.titulo === p.seccion;
    })[0];
    if (!s) {
      s = { titulo: p.seccion, sub: SUB[p.seccion] || '', preguntas: [] };
      SECCIONES.push(s);
    }
    s.preguntas.push(p);
  });

  function porId(id) {
    return PREGUNTAS.filter(function (p) {
      return p.id === id;
    })[0] || null;
  }

  w.ENCUESTA = {
    preguntas: PREGUNTAS,
    secciones: SECCIONES,
    distritos: DISTRITOS,
    edades: EDADES,
    etiquetas: ETIQUETAS,
    total: PREGUNTAS.length,
    obligatorias: PREGUNTAS.filter(function (p) {
      return p.requerido !== false;
    }).length,
    porId: porId,
    /** Devuelve el texto legible de una respuesta. */
    texto: function (p, v) {
      if (v === undefined || v === null || v === '') return '—';
      if (p.tipo === 'escala') return String(v) + ' / ' + p.max;
      if (p.tipo === 'abierta') return String(v);
      if (p.multiple) {
        var arr = Array.isArray(v) ? v : [v];
        return arr
          .map(function (k) {
            var o = (p.opciones || []).filter(function (x) {
              return x.v === k;
            })[0];
            return o ? o.t : k;
          })
          .join(', ');
      }
      var op = (p.opciones || []).filter(function (x) {
        return x.v === v;
      })[0];
      return op ? op.t : String(v);
    },
  };
})(window);
