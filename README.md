# Casa Miento

Aplicación para organizar confirmaciones de asistencia de un casamiento.

- **Web (casa-miento-web):** landing pública en Vercel (Vite + Vue) y funciones serverless Node con Postgres. Invitados confirman asistencia y reciben tarjeta. Panel admin separado en `/admin` con login (JWT).
- **Android (casa-miento-celu):** panel del organizador para ver respuestas y enviar difusiones, ahora consumiendo las APIs protegidas (sin credenciales de DB/SMTP en el cliente).

## Notas rápidas

- Variables sensibles van en `.env` (web) y `local.properties` (Android) o env vars locales; no se incluyen en `public/` ni en BuildConfig.
- Si falta configuración crítica, las APIs devuelven `CONFIG_MISSING` en 500 sin filtrar datos.
- `public/event-config.json` solo contiene información visible del evento y sugerencias de invitados, no credenciales.
