# Casa Miento

Sistema para gestionar confirmaciones de asistencia de un casamiento, su panel organizador y la administracion del carrusel de fotos.

## Vision general

El proyecto esta dividido en dos aplicaciones:

- `casa-miento-web`: experiencia web responsiva para invitado y organizador.
- `casa-miento-celu`: app Android pensada solo para el modo organizador.

La solucion fue pensada como una arquitectura distribuida con un backend concentrador:

- La web publica de invitado consume su propio frontend Vue y llama APIs serverless para confirmar asistencia.
- La web de organizador consume el mismo backend para resumen, difusion y carrusel.
- La app Android no habla directo con Neon, Cloudinary ni SMTP.
- La app Android consume el backend web como middleware unico para todo lo que requiere salir a servicios externos.

## Modos de uso

### Invitado

- Entra sin login.
- Ve la landing, el carrusel y los datos visibles del evento.
- Confirma si asiste o no.
- El backend persiste la decision y dispara el email de confirmacion.

### Organizador web

- Entra por `/admin`.
- Usa login web con JWT.
- Consulta resumen de respuestas.
- Envia mensajes de difusion.
- Gestiona assets y publicaciones del carrusel.

### Organizador movil

- No tiene pantalla de login.
- Usa un token tecnico configurado localmente en la app.
- Consume los mismos endpoints protegidos del backend web.
- Puede consultar resumen, enviar difusion y administrar el carrusel, incluida la subida de imagenes via backend.

## Arquitectura distribuida

### Capa cliente

- `casa-miento-web/src`: UI publica y UI admin.
- `casa-miento-celu/app/src/main/java/rsvp/casamiento`: cliente Android del organizador.

### Capa API

- `casa-miento-web/api`: handlers serverless expuestos por Vercel o por el entorno Node local.
- Estos handlers validan permisos, parsean requests y delegan en servicios internos.

### Capa middleware interna

- `casa-miento-web/server/services`: capa pasamanos entre los handlers y los sistemas externos.
- Esta capa concentra reglas de negocio y acceso a DB, Cloudinary y correo.
- Web y movil quedan desacoplados de Neon, Cloudinary y SMTP.

### Sistemas externos

- Postgres/Neon para persistencia.
- Cloudinary para assets del carrusel.
- SMTP para emails.

## Flujos principales

### RSVP invitado

- `LandingPage` -> `RsvpForm` -> `/api/rsvp`
- `/api/rsvp` -> `db.js` + `email.js` + `mailer.js`
- Resultado: respuesta persistida y email emitido

### Resumen organizador

- Web admin o Android -> `/api/admin-summary`
- Handler -> `server/services/admin-summary-service.js`
- Servicio -> Postgres

### Difusion organizador

- Web admin o Android -> `/api/admin-broadcast`
- Handler -> `server/services/admin-broadcast-service.js`
- Servicio -> Postgres + SMTP

### Carrusel organizador

- Web admin o Android -> `/api/cloudinary-assets`
- Handler -> `server/services/cloudinary-service.js`
- Servicio -> Cloudinary

- Web admin o Android -> `/api/admin-photos`
- Handler -> `server/services/carousel-service.js`
- Servicio -> Postgres

### Carrusel publico

- Landing publica -> `/api/photos`
- Handler -> `server/services/carousel-service.js`
- Servicio -> Postgres + validacion contra Cloudinary

## Principios tecnicos del proyecto

- Sin estrategias de fallback de compatibilidad de datos.
- Si cambia el modelo esperado de DB, el backend falla y obliga a recrear la base.
- Si falta una variable critica, la aplicacion falla rapido.
- No se usan valores default silenciosos para secretos o conexiones.
- Los archivos y ejemplos de configuracion deben manejarse en UTF-8.
- La documentacion nunca debe publicar datos reales; solo plantillas o placeholders.

## Configuracion por entorno

### Web

- Usa `casa-miento-web/.env`
- El archivo versionable es `casa-miento-web/.env.example`

### Android

- Usa `casa-miento-celu/local.properties`
- El archivo versionable es `casa-miento-celu/local.properties.example`

## Variables sensibles

Nunca documentar valores reales en README, tickets, capturas o commits.

Ejemplos correctos:

- `DB_URL=postgresql://usuario:clave@host:5432/base`
- `API_BASE_URL=https://tu-dominio-app.vercel.app`
- `MOBILE_ORGANIZER_TOKEN=token-largo-de-app`
- `CLOUDINARY_API_KEY=tu-api-key`

## Estructura resumida

- `README.md`: panorama general del mono repo.
- `casa-miento-web/README.md`: detalle de la app web y de su backend.
- `casa-miento-celu/README.md`: detalle de la app Android y su contrato con el backend web.
