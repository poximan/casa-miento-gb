# Casa Miento Movil

Aplicacion Android del proyecto, dedicada al modo organizador.

## Responsabilidad del modulo

`casa-miento-celu` existe para darle al organizador una interfaz movil simple, sin replicar logica de negocio ni credenciales de servicios externos.

Sus responsabilidades son:

- mostrar splash de entrada
- consultar resumen de respuestas
- enviar difusion
- administrar el carrusel
- subir imagenes al carrusel a traves del backend web

No es responsabilidad de la app:

- conectarse directo a Postgres
- conectarse directo a Cloudinary
- enviar correo SMTP
- resolver reglas de negocio del backend

## Arquitectura

La app movil funciona como cliente del backend web.

Flujo general:

- Android UI -> `OrganizerViewModel`
- `OrganizerViewModel` -> repositorios clientes
- repositorios -> `OrganizerApiClient`
- `OrganizerApiClient` -> backend web `/api/...`
- backend web -> capa `server/services`
- servicios web -> Postgres / Cloudinary / SMTP

## Estructura

### Bootstrap y shell

- `SplashActivity.kt`: pantalla inicial y validacion de config
- `MainActivity.kt`: contenedor principal del panel movil
- `AppConfig.kt`: lectura de config desde `BuildConfig`

### Configuracion

- `config/ProtectedConfigKey.kt`: claves obligatorias del cliente
- `config/ConfigurationValueProvider.kt`: exposicion de valores de config
- `config/ConfigurationValidationService.kt`: validacion fail-fast

### Cliente HTTP

- `data/OrganizerApiClient.kt`: cliente HTTP comun para hablar con el backend web

### Repositorios cliente

- `data/NeonRsvpRepository.kt`: cliente del backend para resumen y publicaciones del carrusel
- `data/CloudinaryRepository.kt`: cliente del backend para assets y subida de imagenes
- `mail/EmailDiffusionSender.kt`: cliente del backend para difusion

Nota:

- los nombres historicos `NeonRsvpRepository` y `CloudinaryRepository` hoy representan clientes del backend, no acceso directo a servicios externos

### Modelo y estado

- `data/AdminSummary.kt`: resumen para UI
- `model/RsvpRecord.kt`: registro de RSVP y extras
- `model/OrganizerBootstrapCache.kt`: cache corta entre splash y pantalla principal

### UI organizador

- `ui/OrganizerViewModel.kt`: estado y coordinacion principal
- `ui/ConfirmedListFragment.kt`: resumen y listado de respuestas
- `ui/DiffusionFragment.kt`: envio de difusion
- `ui/CarouselFragment.kt`: gestion del carrusel
- `ui/adapter/RsvpAdapter.kt`: adapter de la lista
- `ui/feedback/ConfigIssueFeedbackService.kt`: aviso visual y log ante errores de config

### Layouts

- `activity_splash.xml`
- `activity_main.xml`
- `fragment_confirmed_list.xml`
- `fragment_diffusion.xml`
- `fragment_carousel.xml`
- `item_rsvp.xml`

## Contrato con el backend

La app usa estos endpoints:

- `GET /api/admin-summary`
- `POST /api/admin-broadcast`
- `GET /api/admin-photos`
- `POST /api/admin-photos`
- `GET /api/cloudinary-assets`
- `POST /api/cloudinary-assets`
- `DELETE /api/cloudinary-assets`

Autorizacion:

- siempre manda `Authorization: Bearer <MOBILE_ORGANIZER_TOKEN>`

Ese token no se pide en pantalla. Se configura localmente para la app.

## Configuracion local

Archivo real:

- `local.properties`

Plantilla:

- `local.properties.example`

Variables requeridas:

```properties
API_BASE_URL=https://tu-dominio-app.vercel.app
MOBILE_ORGANIZER_TOKEN=token-largo-de-app
sdk.dir=C\:\\Users\\tu-usuario\\AppData\\Local\\Android\\Sdk
```

## Reglas del modulo

- Sin login UI.
- Sin secretos de DB, SMTP o Cloudinary en la app.
- Sin defaults silenciosos para config obligatoria.
- Si falta una clave critica, la app debe avisar y cortar.

## Carrusel desde movil

El carrusel se maneja asi:

- listar assets: backend consulta Cloudinary
- subir imagen: Android manda bytes al backend y el backend sube a Cloudinary
- borrar asset: backend borra en Cloudinary
- publicar seleccion: backend persiste URLs publicadas en DB

Esto evita que la app cargue credenciales de Cloudinary o de DB.

## Nota de documentacion

Este README debe mantenerse libre de datos sensibles.
Siempre usar:

- dominios fake
- tokens fake
- rutas de ejemplo

Nunca documentar valores reales de `API_BASE_URL`, `MOBILE_ORGANIZER_TOKEN` o configuraciones privadas del entorno.
