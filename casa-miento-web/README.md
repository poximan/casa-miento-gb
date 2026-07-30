# Casa Miento Web

Aplicacion Vue con landing publica, panel organizador y backend serverless. El backend centraliza Postgres, Cloudinary y SMTP para la web y Android.

## Componentes

- `src/pages`: landing y panel `/admin`.
- `src/components`: RSVP, resumen y carrusel.
- `api`: handlers serverless.
- `server/services`: reglas de negocio e integraciones.
- `server/db.js`: conexion y validacion estricta del esquema.
- `server/admin-auth.js`: JWT web y token tecnico movil.

## Endpoints

| Ruta | Uso |
| --- | --- |
| `POST /api/rsvp` | Registrar asistencia y enviar confirmacion. |
| `POST /api/admin-login` | Autenticar al organizador web. |
| `GET /api/admin-summary` | Consultar respuestas. |
| `POST /api/admin-broadcast` | Enviar difusion. |
| `GET/POST /api/admin-photos` | Consultar o publicar el carrusel. |
| `GET/POST/DELETE /api/cloudinary-assets` | Gestionar assets. |
| `GET /api/photos` | Obtener el carrusel publico. |

Los endpoints administrativos aceptan JWT web o `Authorization: Bearer <MOBILE_ORGANIZER_TOKEN>` para Android.

## Configuracion

Copiar `.env.example` como `.env`. Variables principales:

```env
DB_URL=postgresql://usuario:clave@host:5432/base
DB_SSL_REJECT_UNAUTHORIZED=true
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=robot@example.com
EMAIL_PASS=clave-app
EMAIL_FROM=robot@example.com
ADMIN_USER=admin
ADMIN_PASS=clave-segura
ADMIN_JWT_SECRET=clave-larga-y-unica
ADMIN_JWT_TTL_MINUTES=720
MOBILE_ORGANIZER_TOKEN=token-largo-de-app
SERVER_PORT=6001
CLOUDINARY_CLOUD_NAME=tu-cloud
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
CLOUDINARY_FOLDER=carpeta-carrusel
CLOUDINARY_UPLOAD_MAX_BYTES=4194304
```

No se admiten defaults silenciosos para secretos ni fallbacks de esquema. `.env` y los valores operativos reales quedan fuera de Git.
