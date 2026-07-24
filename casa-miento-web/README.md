# Casa Miento Web

Aplicacion web responsiva del proyecto. Incluye:

- experiencia publica para invitados
- panel web del organizador
- backend serverless que centraliza DB, correo y Cloudinary

## Responsabilidad del modulo

`casa-miento-web` no es solo frontend. Este modulo contiene la fachada principal del sistema.

Sus responsabilidades son:

- renderizar la landing publica
- recibir RSVPs de invitados
- autenticar al organizador web
- exponer endpoints protegidos para resumen, difusion y carrusel
- actuar como middleware unico frente a Postgres, Cloudinary y SMTP
- servir de backend tambien para la app Android

## Estructura

### Frontend

- `src/pages/LandingPage.vue`: pagina publica principal
- `src/pages/AdminPage.vue`: acceso y bootstrap del panel organizador web
- `src/components/RsvpForm.vue`: formulario de confirmacion
- `src/components/PhotoCarousel.vue`: carrusel publico
- `src/components/AdminPanel.vue`: resumen, difusion y carrusel del organizador
- `src/services/ApiErrorMapper.js`: mapeo de errores de API para UI

### API serverless

- `api/rsvp.js`: alta de confirmaciones y disparo de email
- `api/admin-login.js`: login web y emision de JWT
- `api/admin-summary.js`: resumen protegido para organizador
- `api/admin-broadcast.js`: envio de difusion protegida
- `api/admin-photos.js`: lectura y publicacion de fotos del carrusel
- `api/cloudinary-assets.js`: listar, subir y borrar assets de Cloudinary
- `api/photos.js`: fotos publicas agregadas para la landing

### Nucleo backend

- `server/config.js`: lectura estricta de variables obligatorias
- `server/http.js`: utilidades comunes de CORS y parseo JSON
- `server/db.js`: conexion a DB y validacion estricta de esquema
- `server/admin-auth.js`: JWT web y token tecnico para la app movil
- `server/mailer.js`: transporte SMTP
- `server/email.js`: contenido y envio de confirmacion RSVP
- `server/operational-error.js`: traduccion de errores tecnicos a errores operativos

### Capa middleware interna

- `server/services/admin-summary-service.js`: resumen de confirmaciones
- `server/services/admin-broadcast-service.js`: difusion por email
- `server/services/carousel-service.js`: publicaciones del carrusel en DB
- `server/services/cloudinary-service.js`: integracion con Cloudinary

## Arquitectura

### Web invitado

- UI Vue -> `/api/rsvp`
- Handler -> servicios internos -> DB + correo

### Web organizador

- UI Vue -> login JWT -> endpoints `/api/admin-*`
- Handlers -> servicios internos -> DB + Cloudinary + correo

### App Android

- Android -> `/api/admin-summary`
- Android -> `/api/admin-broadcast`
- Android -> `/api/admin-photos`
- Android -> `/api/cloudinary-assets`

Todos esos handlers pasan por la misma capa `server/services`.

## Por que existe la capa middleware interna

La capa `server/services` cumple dos objetivos:

- evitar que la logica de negocio quede duplicada dentro de cada endpoint
- ofrecer un unico punto de salida hacia sistemas externos para web y movil

En otras palabras:

- el frontend web no toca DB ni Cloudinary directamente
- Android tampoco toca DB ni Cloudinary directamente
- el backend hace de pasamanos y de capa de control

## Seguridad y acceso

Existen dos formas de acceso al area organizador:

- JWT web emitido por `api/admin-login.js`
- token tecnico de app movil validado por `server/admin-auth.js`

El token tecnico evita una pantalla de login en Android, pero sigue manteniendo el acceso concentrado en el backend.

## Reglas de operacion

- Sin fallback de esquema de base.
- Sin valores default silenciosos para secretos.
- Si falta una variable critica, el backend falla.
- Las respuestas de error no deben exponer secretos.

## Variables de entorno

Usar siempre plantillas fake. Nunca pegar secretos reales en esta documentacion.

Archivo:

- `.env.example`: plantilla versionable
- `.env`: configuracion real local o del deploy

Variables principales:

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
```

## Contrato con Android

La app movil espera este contrato:

- `GET /api/admin-summary`
- `POST /api/admin-broadcast`
- `GET /api/admin-photos`
- `POST /api/admin-photos`
- `GET /api/cloudinary-assets`
- `POST /api/cloudinary-assets`
- `DELETE /api/cloudinary-assets`

Autorizacion:

- header `Authorization: Bearer <token>`

El token puede ser:

- JWT del organizador web
- token tecnico de movil configurado en `MOBILE_ORGANIZER_TOKEN`

## Carrusel

El flujo del carrusel quedo completamente centralizado:

- subir imagen: cliente -> `/api/cloudinary-assets` -> Cloudinary
- listar assets: cliente -> `/api/cloudinary-assets` -> Cloudinary
- borrar asset: cliente -> `/api/cloudinary-assets` -> Cloudinary
- publicar seleccion: cliente -> `/api/admin-photos` -> Postgres
- leer carrusel publico: landing -> `/api/photos` -> Postgres

## Nota de documentacion

Este README solo debe mostrar placeholders y ejemplos fake.
Nunca documentar:

- URLs reales de DB
- claves SMTP
- API keys de Cloudinary
- tokens JWT
- tokens tecnicos de movil
