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

| # | Pregunta | Tipo |
|---|---|---|
| 1 | ¿Cómo calificas la labor de los Bomberos de Camaná? | Escala 1–10 |
| 2 | ¿Alguna vez has visto trabajar a los bomberos en una emergencia? | Opciones |
| 3 | ¿Qué trabajo te gustaría presenciar de las actividades de los bomberos? | Selección múltiple |
| 4 | ¿Tienes algún amigo o familiar que sea bombero? | Opciones |
| 5 | ¿Qué nota le pondrías a los Bomberos de Camaná? | Escala 1–10 |
| 6 | ¿Recomendarías a alguien ser bombero voluntario? | Opciones |
| 7 | ¿Qué le pedirías a los Bomberos de Camaná? | Texto libre (opcional) |
| 8 | ¿Sabes dónde queda la compañía más cercana a tu casa? | Opciones |
| 9 | ¿Qué debería mejorar primero la compañía? | Selección múltiple |
| 10 | ¿Cómo te gustaría apoyar a los bomberos de Camaná? | Opciones |

Las preguntas 8–10 se añadieron después de las 7 del cuaderno de la compañía y usan los
identificadores `p12`, `p13` y `p14` para no chocar con las preguntas `p8`–`p11` de la
versión anterior, que se siguen aceptando por compatibilidad pero ya no se muestran.

Además, dos datos opcionales: distrito y rango de edad.

### Análisis permanente

`GET /api/encuesta?resumen=1` devuelve solo cifras agregadas y un bloque `analisis` con la
lectura automática de los resultados (imagen de la compañía, cobertura de emergencias,
demanda de actividades, red de reclutamiento, disposición a recomendar, conocimiento del
cuartel, prioridades de mejora, gente dispuesta a apoyar y ritmo de la campaña).

> **Requiere sesión de administrador.** Los resultados ya no son públicos: sin token, la API
> responde `401`. Ese bloque alimenta únicamente la pestaña **Encuestas** del panel interno.

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
