# 🚒 Camaná te necesita — Juego de reclutamiento

Juego 3D (Three.js) para invitar a nuevos bomberos voluntarios en **Camaná, Perú**.
Incluye **contador de visitas**, **registro de postulantes** y un **panel de administración** privado.

> «Servir también es amar a tu tierra.»

- 🎮 **Juego:** https://juego-reclutamiento.vercel.app
- ✉️ **Contacto y registro:** https://juego-reclutamiento.vercel.app/contacto
- 📊 **Encuesta ciudadana:** https://juego-reclutamiento.vercel.app/encuesta
- 🔐 **Panel:** https://juego-reclutamiento.vercel.app/admin

---

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | El juego completo (escenarios, misiones, medalla y formulario de inscripción). |
| `contacto.html` | Formulario institucional de contacto y registro, con validación accesible. |
| `encuesta.html` | Encuesta de opinión ciudadana (11 preguntas, barra de progreso y resumen final). |
| `admin.html` | Panel de administración con pestañas: postulantes, mensajes y encuestas. |
| `assets/institucional.css` | Sistema de diseño institucional compartido (rojo, dorado y grafito). |
| `assets/encuesta.js` | Definición única de las preguntas de la encuesta. |
| `api/track.js` | Contador de visitas (total y por día). |
| `api/register.js` | Recibe y valida los registros del juego. |
| `api/contacto.js` | Mensajes de contacto: alta pública, listado, estado y borrado. |
| `api/encuesta.js` | Respuestas de la encuesta: alta pública, resumen agregado y administración. |
| `api/admin/login.js` | Entrega el token de sesión del panel. |
| `api/admin/registros.js` | Listar, cambiar estado y eliminar postulantes. |
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
- Visitas totales y del día, postulantes y pendientes de contactar.
- Nombre, DNI, edad, WhatsApp, distrito, tipo de ingreso y avance en el juego.
- Estado: `nuevo → contactado → voluntario / descartado`.
- Un mismo DNI no se duplica: se actualiza y se registra cuántas veces volvió.

**Mensajes de contacto**
- Todo lo que llega desde `/contacto`: remitente, correo, teléfono, distrito y motivo.
- Estado: `nuevo → atendido / archivado`.
- Botón directo a WhatsApp y enlace `mailto:` para responder.
- Filtro por estado y búsqueda por texto.

**Encuestas**
- Respuestas totales, promedio de la calificación de la labor y de la nota global,
  y porcentaje que recomendaría ser bombero.
- Gráficos: distribución de notas 1–10, intervenciones de interés, canal preferido,
  conocimiento de la línea 116 y distribución por distrito.
- Tabla con filtro «solo con comentario» y «nota global ≤ 5» para priorizar casos críticos.

---

## Encuesta ciudadana

Las 11 preguntas están definidas en `assets/encuesta.js` (las usa el formulario y el panel).
Para cambiar textos, opciones o agregar preguntas, edita ese archivo y el arreglo
`REQUERIDAS` / `OPCIONES` de `api/encuesta.js`.

| # | Pregunta | Tipo |
|---|---|---|
| 1 | Calificación de la labor de la Compañía | Escala 1–10 |
| 2 | ¿Ha presenciado una intervención de emergencia? | Opciones |
| 3 | ¿Qué intervención le gustaría conocer más de cerca? | Selección múltiple |
| 4 | ¿Tiene familiar o amigo bombero? | Opciones |
| 5 | Nota final a los Bomberos de Camaná | Escala 1–10 |
| 6 | ¿Recomendaría integrarse como bombero voluntario? | Opciones |
| 7 | ¿Qué debería mejorar la Compañía? | Texto libre (opcional) |
| 8 | ¿Conoce el número de emergencia 116? | Opciones |
| 9 | ¿Qué tan informado se siente sobre prevención? | Opciones |
| 10 | ¿Por qué medio prefiere recibir información? | Opciones |
| 11 | ¿Participaría en actividades de prevención? | Opciones |

Al terminar, la persona ve un resumen agregado (respuestas totales y promedios) para
cerrar el ciclo de retroalimentación. El endpoint público solo devuelve cifras,
nunca respuestas individuales.

---

## Privacidad

El formulario de contacto pide nombre, DNI (opcional), correo, teléfono y distrito.
Esos datos se usan solo para responder la comunicación y se muestran únicamente en el
panel privado (protegido con clave, token firmado de 12 h y límite de intentos por IP).

La encuesta es **anónima**: no pide nombre, DNI ni correo. Solo guarda las respuestas,
la fecha y, si la persona lo decide, distrito y rango de edad.
