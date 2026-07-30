# Casa Miento Movil

Aplicacion Android para organizadores. Consulta respuestas, envia difusiones y administra el carrusel mediante el backend de `casa-miento-web`.

## Limites

- No se conecta directamente a Postgres, Cloudinary ni SMTP.
- No contiene reglas de negocio del backend.
- No presenta login; usa un token tecnico local.

## Flujo

```text
UI Android
  -> OrganizerViewModel
  -> repositorios cliente
  -> OrganizerApiClient
  -> casa-miento-web/api
```

## Contrato HTTP

- `GET /api/admin-summary`
- `POST /api/admin-broadcast`
- `GET/POST /api/admin-photos`
- `GET/POST/DELETE /api/cloudinary-assets`

Todas las llamadas incluyen `Authorization: Bearer <MOBILE_ORGANIZER_TOKEN>`.

## Codigo principal

- `SplashActivity.kt`: validacion inicial.
- `MainActivity.kt`: contenedor del panel.
- `AppConfig.kt`: lectura de `BuildConfig`.
- `data/OrganizerApiClient.kt`: cliente HTTP.
- `ui/OrganizerViewModel.kt`: estado y coordinacion.
- `ui/*Fragment.kt`: respuestas, difusion y carrusel.

Los nombres historicos `NeonRsvpRepository` y `CloudinaryRepository` representan clientes del backend; no acceden directamente a esos servicios.

## Configuracion

Copiar `local.properties.example` como `local.properties`:

```properties
API_BASE_URL=https://tu-dominio-app.vercel.app
MOBILE_ORGANIZER_TOKEN=token-largo-de-app
sdk.dir=C\:\\Users\\tu-usuario\\AppData\\Local\\Android\\Sdk
```

La aplicacion falla de forma visible si falta configuracion obligatoria. `local.properties`, credenciales y valores operativos no se versionan.
