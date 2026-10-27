# 🚒 Camaná te necesita — Juego de reclutamiento

Juego 3D (Three.js) para invitar a nuevos bomberos voluntarios en **Camaná, Perú**.
Incluye **contador de visitas**, **formulario de inscripción**, **encuesta ciudadana con
análisis permanente** y un **panel de administración** privado.

> «Servir también es amar a tu tierra.»

- 🎮 **Juego:** https://juego-reclutamiento.vercel.app
- ✉️ **Contacto y registro:** https://juego-reclutamiento.vercel.app/contacto
- 📊 **Encuesta ciudadana:** https://juego-reclutamiento.vercel.app/encuesta
- 🔐 **Panel (resultados e inscripciones):** https://juego-reclutamiento.vercel.app/admin

---

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | El juego completo (escenarios, misiones y medalla). **No registra usuarios, no muestra contadores y no tiene enlaces externos.** |
| `contacto.html` | Formulario oficial de inscripción y contacto. Es la única vía de registro. |
| `encuesta.html` | Encuesta ciudadana de 10 preguntas, anónima. No muestra resultados al público. |
| `admin.html` | Panel privado: inscripciones, encuestas con análisis y registros históricos del juego. |
| `assets/institucional.css` | Sistema de diseño institucional compartido (rojo, dorado y grafito). |
| `assets/rediseno.css` | Capa de diseño 2026 para encuesta e inscripción. |
| `assets/encuesta.js` | Definición única de las 10 preguntas (la usan la encuesta y el panel). |
| `api/track.js` | Contador de visitas (el juego lo llama en silencio, sin mostrarlo). |
| `api/contacto.js` | Inscripciones y mensajes: alta pública, listado, estado y borrado. |
| `api/encuesta.js` | Respuestas de la encuesta: alta pública; lectura y análisis **solo con sesión**. |
| `api/admin/login.js` | Entrega el token de sesión del panel. |
| `api/admin/registros.js` | Listar, cambiar estado y eliminar postulantes históricos. |
| `api/admin/stats.js` | Métricas del panel (visitas, postulantes, series por día). |
| `lib/store.js` | Almacenamiento: Redis → Vercel Blob → archivo local. |
| `lib/auth.js` | Firma y verificación del token de administrador (HMAC, 12 h). |
| `dev-server.js` | Servidor local de desarrollo, sin dependencias. |

---

## Probar en local

```bash
npm install
npm run dev
```

- Juego → http://localhost:3000
- Panel → http://localhost:3000/admin
- Clave por defecto → `bomberoscamana`

En local, si no hay variables de entorno, los datos se guardan en
`.data/store.json` (ignorado por Git). Si defines `KV_REST_API_*` o
`BLOB_READ_WRITE_TOKEN`, usa ese almacén también en local.

---

## Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `ADMIN_PASSWORD` | Clave del panel de administración. | Sí en producción |
| `ADMIN_SECRET` | Clave para firmar los tokens de sesión. Si falta se usa `ADMIN_PASSWORD`. | Recomendada |
| `KV_REST_API_URL` | URL REST de Upstash Redis. | Sí (o Blob) |
| `KV_REST_API_TOKEN` | Token REST de Upstash Redis. | Sí (o Blob) |
| `BLOB_READ_WRITE_TOKEN` | Alternativa de almacenamiento si no hay Redis. | No |

> También se aceptan `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

### Almacenamiento

`lib/store.js` elige el primer backend disponible:

1. **Upstash Redis** (`KV_REST_API_*`) — recomendado. Contador atómico y escrituras seguras.
2. **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) — alternativa sin Redis; el contador usa
   escrituras condicionales por ETag para no perder visitas.
3. **Archivo local** — solo para desarrollo.

Ambos almacenes ya están conectados al proyecto en Vercel.

### Cambiar la clave del panel

```bash
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SECRET production
vercel --prod
```

---

## Despliegue

```bash
npm install -g vercel   # si aún no lo tienes
vercel --prod
```

Para que cada `git push` despliegue solo, conecta el repositorio en
**Vercel → Settings → Git** (`vercel git connect`).

---

## Cómo funciona el panel

El panel tiene tres pestañas, cada una con sus propias métricas y exportación CSV:

**Postulantes**
- Histórico de los registros que enviaba la versión anterior del juego (el juego ya no
  registra usuarios). Los postulantes nuevos llegan por el formulario de la web.
- Nombre, DNI, edad, WhatsApp, distrito, tipo de ingreso y avance en el juego.
- Estado: `nuevo → contactado → voluntario / descartado`.

**Mensajes de contacto**
- Todo lo que llega desde `/contacto`: remitente, correo, teléfono, distrito y motivo.
- Estado: `nuevo → atendido / archivado`.
- Botón directo a WhatsApp y enlace `mailto:` para responder.

**Inscripciones** (pestaña principal del panel)
- Todo lo que llega desde `/contacto`: folio, fecha, nombre, DNI, edad, correo, teléfono,
  distrito, motivo, disponibilidad y mensaje.
- Filtro «Solo postulantes a voluntario» para separar a quien quiere postular del resto de consultas.
- Estado: `nuevo → atendido / archivado`. Botón directo a WhatsApp y enlace `mailto:`.

**Encuestas**
- Participación de la campaña: total acumulado, hoy, últimos 7 días, origen y avance de meta.
- KPIs: promedio de la labor, nota global y porcentaje que recomendaría ser bombero.
- Gráficos de las 10 preguntas: distribución de notas, actividades de interés, contacto con
  emergencias, vínculo con un bombero, recomendación, conocimiento del cuartel, prioridades
  de mejora, disposición a apoyar, distrito y edad.
- **Lectura automática**: el análisis completo, visible solo con sesión iniciada.
- Tabla con filtro «solo con comentario» y «nota global ≤ 5» para priorizar casos críticos.

---

## Encuesta ciudadana

Las 10 preguntas están definidas en `assets/encuesta.js` (las usan el formulario y el panel).
Para cambiar textos u opciones, edita ese archivo y el arreglo `REQUERIDAS` / `OPCIONES` /
`MULTIPLE` de `api/encuesta.js`.

Cuatro bloques que van de lo más simple a lo más comprometido, para que nadie abandone a
mitad de camino. El número visible sale del orden del arreglo (`n`), así que la encuesta
siempre se numera 1 a 10 sin huecos.

| # | Bloque | Pregunta | Tipo |
|---|---|---|---|
| 1 | Tu experiencia | Pensando en lo que has visto o escuchado, ¿cómo calificas la labor de los Bomberos de Camaná? | Escala 1–10 |
| 2 | Tu experiencia | ¿Has visto a los bomberos de Camaná trabajando en una emergencia real? | Opciones |
| 3 | Tu confianza | ¿Qué tan preparados sientes a los bomberos para una emergencia grande (sismo, incendio forestal, accidente múltiple)? | Escala 1–10 |
| 4 | Tu confianza | Si hubiera una emergencia en tu casa, ¿sabrías dónde queda la compañía más cercana? | Opciones |
| 5 | Tu confianza | ¿Tienes algún amigo o familiar que sea bombero voluntario? | Opciones |
| 6 | Lo que pides | Si tuvieras que decidir, ¿qué debería mejorar primero la compañía? | Selección múltiple |
| 7 | Lo que pides | ¿Qué te gustaría ver de cerca en una jornada de puertas abiertas? | Selección múltiple |
| 8 | Tu compromiso | ¿Le recomendarías a un joven de tu distrito ser bombero voluntario? | Opciones |
| 9 | Tu compromiso | ¿Cómo te gustaría apoyar a los bomberos de Camaná? | Opciones |
| 10 | Tu compromiso | Para terminar: ¿qué le pedirías a los Bomberos de Camaná? | Texto libre (opcional) |

La pregunta 3 (preparación percibida) reemplazó a la antigua «nota global», que repetía la
pregunta 1. Ahora el panel puede comparar **labor vs. preparación** y sacar de ahí el
argumento para pedir equipamiento y más voluntarios.

Los `id` (`p1`…`p7`, `p12`…`p14`) se mantienen estables respecto a las versiones anteriores
para no romper las respuestas ya guardadas; `p12`–`p14` evitan chocar con las preguntas
`p8`–`p11` heredadas, que se aceptan por compatibilidad pero ya no se muestran. **El número
visible no es el `id`**: vive en `n`, dentro de `assets/encuesta.js`.

Además, dos datos opcionales: distrito y rango de edad.

### Análisis permanente

`GET /api/encuesta?resumen=1` devuelve solo cifras agregadas y un bloque `analisis` con la
lectura automática de los resultados (imagen de la compañía, cobertura de emergencias,
demanda de actividades, red de reclutamiento, disposición a recomendar, conocimiento del
cuartel, prioridades de mejora, gente dispuesta a apoyar y ritmo de la campaña).

> **Requiere sesión de administrador.** Los resultados ya no son públicos: sin token, la API
> responde `401`. Ese bloque alimenta únicamente la pestaña **Encuestas** del panel interno.

### Las 7 misiones del simulador

Todas son tareas reales de la profesión, no acertijos: se resuelven conduciendo la unidad,
deteniéndose en el lugar correcto y manteniendo la tecla de la acción.

| # | Misión | Cómo se resuelve | Tecla |
|---|--------|------------------|-------|
| 1 | 🔥 Incendio estructural | Rociar los 3 focos (ventanas y techo) | **E** |
| 2 | 🆘 Rescate de personas | Detenerse a menos de 9 m de cada víctima y mantener | **R** |
| 3 | ☣️ Fuga tóxica | Rociar la fuga desde la zona segura (8–18 m) | **E** |
| 4 | 🚗 Rescate vehicular | Detenerse a menos de 11 m del auto y usar la herramienta hidráulica | **R** |
| 5 | 🚰 Hidrante | Detenerse junto al hidrante y llenar el tanque | **E** |
| 6 | 🩺 Primeros auxilios | Detenerse a menos de 7 m del herido y estabilizarlo | **R** |
| 7 | 📢 Evacuación | Encender la sirena y pasar a menos de 13 m de los 3 vecinos | **Espacio** |

Detalles de diseño que se ven en el juego:

- **El agua es finita.** Cada descarga baja el tanque (barra celeste) y solo se recupera en los
  **2 hidrantes** del mapa, que aparecen en celeste en el minimapa. Junto al hidrante, `E`
  recarga en lugar de rociar.
- **Pista contextual.** Una pastilla flotante indica la tecla exacta de lo que tienes al lado
  («`R` mantén pulsado para rescatar a la persona», «`Espacio` enciende la sirena para evacuar»…),
  para que nadie tenga que adivinar.
- **El patio del cuartel tiene equipo real**: pilas de manguera, bidones de espuma, conos,
  vallas y extintores. Se acabaron las cajas de empujar: no hay ninguna mecánica de arrastre.
- **Sin zonas de información en el mapa.** Requisitos, beneficios y deberes ya no ocupan un
  aro: eran ruido para conducir y su contenido vive ahora en el **Manual del bombero (`M`)**.
  En el mapa quedan 5 aros: Incendio, Rescate, Materiales peligrosos, Rescate vehicular y
  Compañía. El cartel de bienvenida del cuartel reemplazó a los cubos con letras.
- **Manual del bombero (`M`)** con las pestañas Requisitos, Beneficios, Deberes, Agua,
  Auxilios y Evacuar, además del protocolo que aparece al entrar a cada zona (se cierra solo
  a los 12 s para no tapar la conducción).
- **Etiquetas de zona** que se desvanecen cuando la cámara pasa cerca, para no tapar la vista.

### Cómo se conecta con el juego

El juego es deliberadamente cerrado: **no muestra contadores, no tiene menú de navegación ni
enlaces al sitio**, y no ofrece inscribirse ni responder la encuesta dentro del mapa. La única
conexión es el final:

1. Al completar las 7 misiones aparece la pantalla final con un solo pedido: responder la
   encuesta para desbloquear la medalla.
2. Al enviar la encuesta se guarda el folio en `localStorage` (`camana_enc`). Al volver al
   juego con `?enc=1` o con ese folio guardado, la medalla se desbloquea y queda estampada
   con **«ENCUESTA RESPONDIDA»**.
3. Si alguien pulsa «Descargar mi medalla» sin haber respondido, ve un aviso con el enlace a la
   encuesta en lugar de la medalla.
4. La pantalla de éxito de la encuesta ofrece volver al juego a recoger la medalla y compartir
   por WhatsApp.

La medalla lleva un **hito de Camaná elegido al azar** en cada emisión (Plaza de Armas, Malecón,
Cuartel B-35, Puente del río, Valle o Cerros), dibujado en canvas junto al sello de la encuesta.

La inscripción real **solo** ocurre en `/contacto`. El juego no pide nombre, DNI ni ningún
dato personal: la medalla se dibuja en el navegador.

---

## Privacidad

El formulario de contacto pide nombre, DNI (opcional), correo, teléfono y distrito.
Esos datos se usan solo para responder la comunicación y se muestran únicamente en el
panel privado (protegido con clave, token firmado de 12 h y límite de intentos por IP).

La encuesta es **anónima**: no pide nombre, DNI ni correo. Solo guarda las respuestas,
la fecha y, si la persona lo decide, distrito y rango de edad.

El **juego no recopila datos personales**: no hay formulario de registro dentro del juego,
la medalla se genera en el navegador y lo único que se guarda en el equipo de la persona es
el folio de la encuesta para poder mostrar la insignia.
