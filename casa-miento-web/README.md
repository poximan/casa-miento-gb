# Invitacion de boda (Evelin & Damian)

Stack: Vite + Vue (frontend) y funciones serverless en Node con Postgres.

## Configuracion rapida

1. Copia variables:
```bash
cp .env.example .env
```

2. Completa en `.env`:
- `DB_URL`
- `DB_SSL_REJECT_UNAUTHORIZED` (true para certs validos)
- `ADMIN_USER` / `ADMIN_PASS`
- `ADMIN_JWT_SECRET` (clave larga para firmar sesiones)
- `SERVER_PORT`
- `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM`
- CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET (unsigned)
- CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / CLOUDINARY_FOLDER (listar/eliminar assets)

## Fotos del carrusel (nuevo flujo)

- Se usa Cloudinary para subir y gestionar imagenes desde el panel admin; cada publicacion crea una fila con hasta 8 URLs.
- Configura `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET` (unsigned) y `CLOUDINARY_API_KEY/SECRET/FOLDER` para listar y eliminar assets del folder.
- En el panel admin podes subir imagenes, seleccionar de lo existente o borrarlas de Cloudinary; al publicar se guarda en la base. El carrusel publico y la app movil consumen `/api/photos` (todas las publicaciones agregadas).

