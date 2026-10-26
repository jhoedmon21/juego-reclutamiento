# 🚒 Camaná te necesita — Juego de reclutamiento

Juego 3D (Three.js) para invitar a nuevos bomberos voluntarios en **Camaná, Perú**.
Incluye **contador de visitas**, **registro de postulantes** y un **panel de administración** privado.

> «Servir también es amar a tu tierra.»

- 🎮 **Juego:** https://juego-reclutamiento.vercel.app
- 🔐 **Panel:** https://juego-reclutamiento.vercel.app/admin

---

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | El juego completo (escenarios, misiones, medalla y formulario de inscripción). |
| `admin.html` | Panel de administración: visitas, postulantes, estados y exportación CSV. |
| `api/track.js` | Contador de visitas (total y por día). |
| `api/register.js` | Recibe y valida los registros del juego. |
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

- **Visitas totales / hoy** — cada visita se cuenta una vez por sesión del navegador.
- **Postulantes** — nombre, DNI, edad, WhatsApp, distrito, tipo de ingreso, avance en el juego.
- **Estado** — `nuevo → contactado → voluntario / descartado`.
- **WhatsApp** — cada número abre un chat directo con el postulante.
- **CSV** — exporta lo que esté filtrado, listo para Excel.
- Un mismo DNI no se duplica: se actualiza y se registra cuántas veces volvió.

---

## Privacidad

El formulario pide nombre, DNI, edad, WhatsApp y distrito. Esos datos se usan solo
para contactar al postulante y se muestran únicamente en el panel privado
(protegido con clave, token firmado de 12 h y límite de intentos por IP).
