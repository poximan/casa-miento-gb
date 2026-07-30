# Casa Miento

Sistema de confirmacion de asistencia, difusion y gestion del carrusel de fotos.

| Aplicacion | Responsabilidad |
| --- | --- |
| `casa-miento-web` | Landing publica, panel organizador y backend serverless. |
| `casa-miento-celu` | Cliente Android exclusivo para organizadores. |

## Arquitectura

```text
Invitado o administrador web -> Vue -> API serverless
Administrador movil          -> API serverless
API serverless               -> Postgres | Cloudinary | SMTP
```

El backend web es la unica salida hacia Postgres, Cloudinary y SMTP. Android no contiene credenciales de esos servicios ni replica reglas de negocio.

## Accesos

- Invitado: acceso publico para consultar el evento y confirmar asistencia.
- Organizador web: `/admin`, autenticado con JWT.
- Organizador movil: token tecnico configurado en la aplicacion; no tiene pantalla de login.

## Configuracion

- Web: copiar `casa-miento-web/.env.example` como `casa-miento-web/.env`.
- Android: copiar `casa-miento-celu/local.properties.example` como `casa-miento-celu/local.properties`.

Los archivos reales, credenciales, URLs privadas y datos persistentes no se versionan. La configuracion obligatoria falla al iniciar si falta o es invalida.

## Documentacion

- `casa-miento-web/README.md`: API, backend y frontend web.
- `casa-miento-celu/README.md`: cliente Android y contrato HTTP.
