# Invitacion de boda (Evelin & Damian)

Stack: Vite + Vue (frontend) y funciones serverless en Node con Postgres.

## Configuracion rapida

1. Copia variables:
```bash
cp .env.example .env
```

2. Completa en `.env`:
- `DB_URL`
- `ADMIN_TOKEN`
- `SERVER_PORT`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

3. Instala dependencias:
```bash
npm install
```

4. Ejecuta local:
```bash
npm run desplegar-local
```

5. Deploy:
```bash
npm run desplegar
```

## API

- `POST /api/rsvp`: guarda respuesta y envia email.
- `GET /api/admin-summary`: requiere header `x-admin-token`.

## Nota importante

Si falta configuracion sensible del servidor, las APIs devuelven error seguro `CONFIG_MISSING`.
