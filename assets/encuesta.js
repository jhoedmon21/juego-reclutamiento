/* Definición única de la encuesta ciudadana.
   La usan encuesta.html (para pintar el formulario) y admin.html (para los gráficos). */
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
      seccion: 'Su experiencia con la Compañía',
      n: 1,
      tipo: 'escala',
      min: 1,
      max: 10,
      etiquetas: ['Muy deficiente', 'Excelente'],
      titulo: '¿Cómo califica la labor que realiza la Compañía de Bomberos Voluntarios de Camaná?',
      ayuda: 'Marque un valor del 1 al 10, donde 1 es muy deficiente y 10 es excelente.',
    },
    {
      id: 'p2',
      seccion: 'Su experiencia con la Compañía',
      n: 2,
      tipo: 'opciones',
      titulo: '¿Ha presenciado alguna vez la intervención de los Bomberos de Camaná durante una emergencia?',
      opciones: [
        { v: 'si', t: 'Sí, en más de una ocasión' },
        { v: 'una', t: 'Sí, una sola vez' },
        { v: 'no', t: 'No, nunca' },
        { v: 'ns', t: 'No lo recuerdo' },
      ],
    },
    {
      id: 'p3',
      seccion: 'Su experiencia con la Compañía',
      n: 3,
      tipo: 'opciones',
      titulo: '¿Qué tipo de intervención le gustaría conocer más de cerca?',
      ayuda: 'Puede elegir más de una opción.',
      multiple: true,
      opciones: [
        { v: 'incendios', t: 'Incendios y rescate estructural' },
        { v: 'rescate', t: 'Rescate de personas' },
        { v: 'vehicular', t: 'Accidentes vehiculares' },
        { v: 'matpel', t: 'Materiales peligrosos' },
        { v: 'prevencion', t: 'Prevención y primeros auxilios' },
        { v: 'otro', t: 'Otro' },
      ],
    },
    {
      id: 'p4',
      seccion: 'Su vínculo con la institución',
      n: 4,
      tipo: 'opciones',
      titulo: '¿Tiene usted algún familiar o amigo que sea bombero voluntario?',
      opciones: [
        { v: 'familiar', t: 'Sí, un familiar' },
        { v: 'amigo', t: 'Sí, un amigo' },
        { v: 'ambos', t: 'Sí, familiar y amigo' },
        { v: 'no', t: 'No' },
      ],
    },
    {
      id: 'p5',
      seccion: 'Su vínculo con la institución',
      n: 5,
      tipo: 'escala',
      min: 1,
      max: 10,
      etiquetas: ['Muy baja', 'Muy alta'],
      titulo: '¿Qué nota final le pondría usted a los Bomberos de Camaná?',
      ayuda: 'Una sola calificación global, del 1 al 10.',
    },
    {
      id: 'p6',
      seccion: 'Su vínculo con la institución',
      n: 6,
      tipo: 'opciones',
      titulo: '¿Recomendaría a otra persona integrarse como bombero voluntario?',
      opciones: [
        { v: 'si', t: 'Sí, sin dudarlo' },
        { v: 'talvez', t: 'Tal vez' },
        { v: 'no', t: 'No' },
      ],
    },
    {
      id: 'p7',
      seccion: 'Sus sugerencias',
      n: 7,
      tipo: 'abierta',
      titulo: '¿Qué aspecto considera usted que debería mejorar la Compañía de Bomberos de Camaná?',
      ayuda: 'Su respuesta es opcional y se usa únicamente para mejorar el servicio.',
      placeholder: 'Escriba aquí su sugerencia…',
      max: 600,
      requerido: false,
    },
    {
      id: 'p8',
      seccion: 'Información y participación',
      n: 8,
      tipo: 'opciones',
      titulo: '¿Conoce el número de emergencia de los Bomberos?',
      ayuda: 'El número de emergencia a nivel nacional es el 116.',
      opciones: [
        { v: 'si', t: 'Sí, lo conozco' },
        { v: 'duda', t: 'Lo he escuchado, pero no lo recuerdo' },
        { v: 'no', t: 'No lo conocía' },
      ],
    },
    {
      id: 'p9',
      seccion: 'Información y participación',
      n: 9,
      tipo: 'opciones',
      titulo: '¿Qué tan informado se siente sobre las labores de prevención que realiza la Compañía?',
      opciones: [
        { v: 'mucho', t: 'Muy informado' },
        { v: 'algo', t: 'Algo informado' },
        { v: 'poco', t: 'Poco informado' },
        { v: 'nada', t: 'Nada informado' },
      ],
    },
    {
      id: 'p10',
      seccion: 'Información y participación',
      n: 10,
      tipo: 'opciones',
      titulo: '¿Por qué medio prefiere recibir información institucional?',
      opciones: [
        { v: 'whatsapp', t: 'WhatsApp' },
        { v: 'facebook', t: 'Redes sociales' },
        { v: 'radio', t: 'Radio local' },
        { v: 'presencial', t: 'Talleres presenciales' },
        { v: 'otro', t: 'Otro medio' },
      ],
    },
    {
      id: 'p11',
      seccion: 'Información y participación',
      n: 11,
      tipo: 'opciones',
      titulo: '¿Estaría dispuesto(a) a participar en actividades de prevención y capacitación organizadas por la Compañía?',
      opciones: [
        { v: 'si', t: 'Sí, me gustaría participar' },
        { v: 'talvez', t: 'Tal vez' },
        { v: 'no', t: 'No' },
      ],
    },
  ];

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

  w.ENCUESTA = {
    preguntas: PREGUNTAS,
    secciones: SECCIONES,
    distritos: DISTRITOS,
    edades: EDADES,
    total: PREGUNTAS.length,
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
