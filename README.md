# 🚒 Camaná te necesita — Juego de reclutamiento

Juego 3D (Three.js) para invitar a nuevos bomberos voluntarios en **Camaná, Perú**.
Incluye **contador de visitas**, **registro de postulantes** y un **panel de administración** privado.

> «Servir también es amar a tu tierra.»

---

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | El juego completo (escenarios, misiones, medalla y formulario de inscripción). |
| `admin.html` | Panel de administración: visitas, postulantes, estados, CSV. |
| `api/track.js` | Contador de visitas (total y por día). |
| `api/register.js` | Recibe y valida los registros del juego. |
| `api/admin/*` | Login, listado, cambio de estado y borrado de registros. |
| `lib/store.js` | Almacenamiento (Redis en producción / archivo JSON en local). |
| `lib/auth.js` | Firma y verificación del token de administrador. |
| `server.js` | Servidor local de desarrollo, sin dependencias. |

---

## Probar en local

```bash
node server.js
```

- Juego → http://localhost:3000
- Panel → http://localhost:3000/admin
- Clave por defecto → `camanabomberos2026`

En local los datos se guardan en `.data/store.json` (no se sube a Git).

---

## Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `ADMIN_PASSWORD` | Clave del panel de administración. | Sí (en producción) |
| `ADMIN_SECRET` | Clave para firmar los tokens. Si falta se usa `ADMIN_PASSWORD`. | Recomendada |
| `KV_REST_API_URL` | URL REST de Upstash Redis. | Sí |
| `KV_REST_API_TOKEN` | Token REST de Upstash Redis. | Sí |

> También se aceptan `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

### Cómo conectar la base de datos en Vercel (2 minutos)

1. En el proyecto de Vercel → pestaña **Storage** → **Create Database**.
2. Elige **Upstash Redis** → plan **Free** → región `us-east-1` (la más cercana a Perú).
3. Pulsa **Connect Project** y selecciona este proyecto (todos los entornos).
4. Vercel inyecta `KV_REST_API_URL` y `KV_REST_API_TOKEN` automáticamente.
5. Vuelve a desplegar: **Deployments → ⋯ → Redeploy**.

Sin este paso el juego funciona igual, pero el contador y los registros
quedan desactivados y el panel muestra un aviso de configuración.

### Cambiar la clave del panel

```bash
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SECRET production
vercel --prod
```

---

## Despliegue

```bash
vercel --prod
```

El sitio queda en `https://<proyecto>.vercel.app` y el panel en `/admin`.

---

## Notas de privacidad

El formulario pide nombre, DNI, edad, WhatsApp y distrito. Esos datos solo se usan
para contactar al postulante y se muestran únicamente en el panel privado.
El token de sesión del panel caduca a las 12 horas.
