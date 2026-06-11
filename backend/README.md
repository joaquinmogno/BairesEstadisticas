# Baires Torneos API

Backend NestJS para la API de Baires Torneos.

## Stack

- NestJS
- PostgreSQL
- Prisma ORM
- JWT para la siguiente etapa de autenticacion real

## Comandos

```bash
npm install
npm run prisma:generate
npx prisma db push
npm run start:dev
```

Con Docker Compose, el servicio `backend` instala dependencias, genera Prisma, sincroniza el schema y arranca Nest.

## Endpoints implementados

- `GET /api/health`
- `GET /api/tournaments`
- `POST /api/tournaments`
- `GET /api/teams`
- `GET /api/players`
- `GET /api/matches`
- `POST /api/matches/:id/events`
- `GET /api/tournaments/:id/standings`
- `GET /api/players/:id/stats`

## Base de datos

El contrato principal esta en `prisma/schema.prisma`.

El archivo `database/schema.sql` solo habilita extensiones utiles al iniciar PostgreSQL; las tablas las crea Prisma con `prisma db push` o migraciones.

## Uploads

Las imagenes se guardan fisicamente en `backend/uploads` y se sirven publicamente desde:

```text
http://localhost:4000/uploads/<subcarpeta>/<archivo>
```

Subcarpetas:

- `uploads/team-badges`
- `uploads/player-photos`
- `uploads/team-photos`
- `uploads/tournament-logos`

La base de datos solo guarda metadatos y URL en `MediaAsset`.
