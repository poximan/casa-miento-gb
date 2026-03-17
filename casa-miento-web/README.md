# Invitación de boda (Evelin & Damián)

Stack: Vite + Vue (frontend estático) y funciones serverless en Vercel (Node) con Postgres (Neon).

## Configuración rápida
1) Clona el repo y copia variables de entorno:
```bash
cp .env.example .env
```
Completa `DATABASE_URL`, `ADMIN_TOKEN` y, si querés mails reales, completa los campos de email (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`). La contraseña de Gmail debe ser una **App Password** (ej: `kkfnusijpsypbsnp`) generada en la consola de seguridad de Google. El correo destino se toma del formulario de cada invitado, no de una variable fija.

2) Ajusta datos del evento en `public/event-config.json` (nombres, fecha, alias/CBU, mapa, fotos, credenciales admin).

3) Instala dependencias:
```bash
npm install
```

4) Pruebas y deploy:
```bash
npm run desplegar-local   # build + servidor local (prod) con APIs
npm run desplegar         # deploy a producción en Vercel
```

## API
- `POST /api/rsvp` guarda la respuesta y envía email (si hay credenciales). Body:
```json
{
  "attending": true,
  "primaryGuest": { "firstName": "Nombre", "lastName": "Apellido", "menu": "clasico" },
  "email": "opcional",
  "phone": "opcional",
  "extraGuests": [{ "firstName": "Invitado", "lastName": "Extra", "menu": "vegetariano|celiaco|infantil|clasico" }]
}
```
- `GET /api/admin-summary` (header `x-admin-token: admin:evelindamian`) devuelve resumen y listado.

La tabla `rsvps` se crea automáticamente si no existe.

## Notas de comportamiento
- Mercado Pago: si estás en mobile intentará abrir el deep link (`mercadoPago.deepLink` en config). En desktop se muestran los datos bancarios.
- Email: si no se configuran credenciales, se loguea en consola del serverless; con SMTP configurado se envía **solo la tarjeta en imagen** generada a partir de `public/assets/plantilla.jpg` directamente al correo ingresado por cada invitado (no hay lista fija en variables).
- Admin: login simple en frontend con usuario/clave definidos en config; el token se compara también en la función.

## Pendientes / personalización
- Cambiá fotos en `public/event-config.json`.
- Si querés contar “pendientes”, necesitarías cargar una base inicial de invitados y comparar contra respuestas (no incluido).
