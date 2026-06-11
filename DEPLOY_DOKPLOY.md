# Deploy en Dokploy

## Servicios

Este proyecto se deploya con `docker-compose.prod.yml` y levanta:

- `postgres`: base de datos PostgreSQL.
- `backend`: API NestJS en puerto `4000`.
- `web`: portal publico Next.js en puerto `3000`.
- `admin`: panel admin Next.js en puerto `3001`.

## Dominios recomendados

- Web publica: `https://baires-torneos.com` -> servicio `web`, puerto `3000`.
- Admin: `https://admin.baires-torneos.com` -> servicio `admin`, puerto `3001`.
- API: `https://api.baires-torneos.com` -> servicio `backend`, puerto `4000`.

## Variables de entorno

Copiar `.env.dokploy.example` en Dokploy y reemplazar valores:

```env
POSTGRES_DB=baires_torneos
POSTGRES_USER=baires
POSTGRES_PASSWORD=...

JWT_SECRET=...

FRONTEND_URL=https://baires-torneos.com
ADMIN_URL=https://admin.baires-torneos.com
CORS_ORIGINS=https://baires-torneos.com,https://admin.baires-torneos.com
API_PUBLIC_URL=https://api.baires-torneos.com
NEXT_PUBLIC_API_URL=https://api.baires-torneos.com/api

ADMIN_EMAIL=admin@baires-torneos.com
ADMIN_PASSWORD=...
```

Generar `JWT_SECRET` con:

```bash
openssl rand -base64 32
```

## Persistencia

El compose productivo define dos volumenes:

- `postgres_data`: datos de la base.
- `backend_uploads`: escudos, fotos de jugadores, fotos de equipos y logos de torneos.

Configurar backups para ambos volumenes en Dokploy.

## Primer deploy

El backend ejecuta automaticamente:

```bash
npx prisma migrate deploy
npm run seed:admin
npm run start:prod
```

El usuario admin inicial se crea o actualiza con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Verificaciones

Luego del deploy:

```bash
curl https://api.baires-torneos.com/api/health
```

Debe responder:

```json
{"status":"ok","service":"baires-torneos-api"}
```

Despues ingresar al admin con:

- Email: valor de `ADMIN_EMAIL`.
- Password: valor de `ADMIN_PASSWORD`.

## Importante

`NEXT_PUBLIC_API_URL` se inyecta durante el build de la web publica. Si cambia el dominio de la API, hay que rebuild/redeployar el servicio `web`.

Si usas dominios temporales de Dokploy/sslip.io, reemplaza `FRONTEND_URL`, `ADMIN_URL`, `API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL` y `CORS_ORIGINS` por esos dominios generados.
