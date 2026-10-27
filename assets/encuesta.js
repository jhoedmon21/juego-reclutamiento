/* Definición única de la encuesta ciudadana.
   La usan encuesta.html (para pintar el formulario), resultados.html (tablero)
   y admin.html (gráficos y exportación).

   Son las 10 preguntas de la campaña: las 7 del cuaderno de la compañía
   (calificación de la labor, contacto con una emergencia, actividad que quiere
   conocer, vínculo con un bombero, nota final, recomendación y pedido abierto)
   más 3 añadidas para orientar el trabajo de la compañía: si sabe dónde queda
   el cuartel, qué debe mejorar primero y cómo le gustaría apoyar. */
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
    {
      id: 'p1',
      seccion: 'Su experiencia',
      n: 1,
      icono: '⭐',
      tipo: 'escala',
      min: 1,
      max: 10,
      etiquetas: ['Muy deficiente', 'Excelente'],
      corto: 'Calificación de la labor',
      titulo: '¿Cómo calificas la labor de los Bomberos de Camaná?',
      ayuda: 'Marca un valor del 1 al 10. No hay respuesta correcta: nos sirve tu impresión real.',
    },
    {
      id: 'p2',
      seccion: 'Su experiencia',
      n: 2,
      icono: '👀',
      tipo: 'opciones',
      corto: '¿Ha visto trabajar a los bomberos?',
      titulo: '¿Alguna vez has visto trabajar a los bomberos en una emergencia?',
      opciones: [
        { v: 'si', t: 'Sí, más de una vez', icono: '🔁' },
        { v: 'una', t: 'Sí, una sola vez', icono: '1️⃣' },
        { v: 'no', t: 'No, nunca', icono: '🚫' },
        { v: 'ns', t: 'No lo recuerdo', icono: '🤔' },
      ],
    },
    {
      id: 'p3',
      seccion: 'Su experiencia',
      n: 3,
      icono: '🚒',
      tipo: 'opciones',
      corto: 'Actividad que quiere conocer',
      titulo: '¿Qué trabajo te gustaría presenciar de las actividades de los bomberos?',
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
    {
      id: 'p4',
      seccion: 'Su vínculo',
      n: 4,
      icono: '🤝',
      tipo: 'opciones',
      corto: '¿Tiene un bombero cerca?',
      titulo: '¿Tienes algún amigo o familiar que sea bombero?',
      opciones: [
        { v: 'amigo', t: 'Sí, un amigo', icono: '🧑‍🤝‍🧑' },
        { v: 'familiar', t: 'Sí, un familiar', icono: '👨‍👩‍👧' },
        { v: 'ambos', t: 'Sí, ambos', icono: '👥' },
        { v: 'no', t: 'No', icono: '🚫' },
      ],
    },
    {
      id: 'p5',
      seccion: 'Su vínculo',
      n: 5,
      icono: '🎖️',
      tipo: 'escala',
      min: 1,
      max: 10,
      etiquetas: ['Muy baja', 'Muy alta'],
      corto: 'Nota a los Bomberos de Camaná',
      titulo: '¿Qué nota le pondrías a los Bomberos de Camaná?',
      ayuda: 'Una sola nota global, del 1 al 10.',
    },
    {
      id: 'p6',
      seccion: 'Su vínculo',
      n: 6,
      icono: '🙌',
      tipo: 'opciones',
      corto: '¿Recomendaría ser bombero?',
      titulo: '¿Recomendarías a alguien ser bombero voluntario?',
      opciones: [
        { v: 'si', t: 'Sí, sin dudarlo', icono: '✅' },
        { v: 'talvez', t: 'Tal vez', icono: '🤷' },
        { v: 'no', t: 'No', icono: '❌' },
      ],
    },
    {
      id: 'p7',
      seccion: 'Su pedido',
      n: 7,
      icono: '✍️',
      tipo: 'abierta',
      corto: '¿Qué le pediría a la compañía?',
      titulo: '¿Qué le pedirías a los Bomberos de Camaná?',
      ayuda: 'Opcional. Una idea, una queja o un pedido concreto: todo se lee en la Comandancia.',
      placeholder: 'Ej. Que visiten los colegios para enseñar primeros auxilios…',
      max: 600,
      requerido: false,
    },
    {
      id: 'p12',
      seccion: 'Su experiencia',
      n: 8,
      icono: '📍',
      tipo: 'opciones',
      corto: '¿Sabe dónde está la compañía?',
      titulo: '¿Sabes dónde queda la compañía de bomberos más cercana a tu casa?',
      ayuda: 'Nos dice si la gente del distrito tiene claro a dónde acudir.',
      opciones: [
        { v: 'si', t: 'Sí, sé dónde está', icono: '🏠' },
        { v: 'maso', t: 'Más o menos', icono: '🤔' },
        { v: 'no', t: 'No lo sé', icono: '🚫' },
      ],
    },
    {
      id: 'p13',
      seccion: 'Su pedido',
      n: 9,
      icono: '🛠️',
      tipo: 'opciones',
      corto: 'Qué debe mejorar primero',
      titulo: '¿Qué debería mejorar primero la compañía?',
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
      id: 'p14',
      seccion: 'Su pedido',
      n: 10,
      icono: '🤲',
      tipo: 'opciones',
      corto: 'Cómo le gustaría apoyar',
      titulo: '¿Cómo te gustaría apoyar a los bomberos de Camaná?',
      opciones: [
        { v: 'voluntario', t: 'Siendo voluntario', icono: '🧑‍🚒' },
        { v: 'donacion', t: 'Con una donación', icono: '🎁' },
        { v: 'difundir', t: 'Difundiendo su trabajo', icono: '📣' },
        { v: 'aprender', t: 'Aprendiendo primeros auxilios', icono: '🩺' },
        { v: 'ahora', t: 'Por ahora no puedo', icono: '🙅' },
      ],
    },
  ];

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
      s = { titulo: p.seccion, preguntas: [] };
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
