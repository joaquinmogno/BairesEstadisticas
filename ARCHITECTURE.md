# Baires Torneos - Arquitectura objetivo

## Aplicaciones

La plataforma queda separada conceptualmente en tres superficies:

- `backend`: API NestJS en `api.bairestorneos.com`, con PostgreSQL, Prisma, JWT y calculo de estadisticas.
- `apps/web`: portal publico de solo lectura en `bairestorneos.com`, conserva el estilo actual tipo live-center.
- `apps/admin`: portal administrativo independiente en `admin.bairestorneos.com`, con login y usuario administrador unico.

## Modelo de datos

El modelo Prisma esta en `backend/prisma/schema.prisma`.

Entidades principales:

- `AdminUser`: acceso administrativo unico por ahora.
- `Tournament`: nombre, logo, categoria, temporada, fechas, reglamento, estado y tipo.
- `Team`: nombre, escudo, colores, foto grupal y categoria.
- `Player`: foto, nombre, apellido, nacimiento, dorsal, posicion y equipo actual.
- `Matchday`: fechas o jornadas del torneo.
- `Match`: equipos, horario, cancha, estado, resultado derivado y MVP.
- `MatchEvent`: gol, asistencia, amarilla, roja y MVP con jugador, minuto y equipo.
- `LineupPlayer`: titulares y suplentes.
- `MediaAsset`: biblioteca multimedia optimizable.
- Archivos fisicos: `backend/uploads`, con subcarpetas por tipo de imagen. La base guarda URL/metadatos, no el binario.

## APIs REST iniciales

Todas cuelgan de `/api`:

- `GET /health`
- `POST /auth/login`
- `GET /snapshot`
- `GET /tournaments`
- `POST /tournaments`
- `PATCH /tournaments/:id`
- `DELETE /tournaments/:id`
- `GET /teams`
- `POST /teams`
- `PATCH /teams/:id`
- `DELETE /teams/:id`
- `GET /players`
- `POST /players`
- `PATCH /players/:id`
- `DELETE /players/:id`
- `GET /matches`
- `POST /matches`
- `PATCH /matches/:id`
- `POST /matches/:id/events`
- `DELETE /matches/:matchId/events/:eventId`
- `POST /matches/:id/lineup`
- `GET /media`
- `POST /media`
- `POST /media/upload`
- `PATCH /media/:id`
- `DELETE /media/:id`
- `GET /tournaments/:id/standings`
- `GET /players/:id/stats`

Siguientes endpoints previstos:

- `POST /auth/refresh`
- Guards JWT obligatorios por endpoint administrativo.
- Optimizacion avanzada de imagenes con Sharp antes de guardar.

## Flujo automatico de estadisticas

1. El administrador carga resultado y eventos desde el centro de carga.
2. La API persiste eventos normalizados en `MatchEvent`.
3. El resultado del partido se obtiene contando eventos `goal` por equipo.
4. La tabla de posiciones se recalcula desde partidos `finished`.
5. Las estadisticas de jugadores se recalculan desde eventos y alineaciones.
6. El portal publico lee endpoints derivados, por eso posiciones, goleadores, fichas e historiales se actualizan sin intervencion manual.

No existe pantalla para editar posiciones manualmente.

## Wireframes administrativos

Dashboard:

```text
[Sidebar] [Resumen: torneos, equipos, jugadores, pendientes, hoy, proximos]
          [Acciones rapidas]
          [Proximos partidos]
```

Centro de carga:

```text
[Marcador local - visitante]
[Equipo local: jugador | Gol | Asist. | Amarilla | Roja | MVP]
[Equipo visitante: jugador | Gol | Asist. | Amarilla | Roja | MVP]
[Eventos cargados ordenados]
[Iniciar | Suspender | Finalizar | Guardar]
```

Calendario:

```text
[Fecha 1]       [Fecha 2]       [Fecha 3]
 Partido card    Partido card    Partido card
 drag/drop       drag/drop       drag/drop
```

## UI/UX

- Sidebar persistente en desktop y drawer en mobile.
- Formularios cortos, acciones rapidas y pantallas densas para carga veloz.
- Centro de carga en una sola pantalla para cerrar un resultado en menos de un minuto.
- Portal publico mantiene apariencia actual: tarjetas oscuras, live center, buscador y fichas.
- El admin hidrata desde `GET /api/snapshot`; si la API no sincroniza, muestra el ultimo snapshot local en modo solo lectura.
- El portal publico tambien puede leer el estado local del admin en el mismo navegador para reflejar cargas durante desarrollo.
- La biblioteca multimedia permite subir imagenes a `backend/uploads` y asociarlas desde UI a equipos, jugadores y torneos.

## Acceso administrativo

Credenciales seed:

- Se crean solo si definis `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- No hay credenciales hardcodeadas ni fallback local de login.

## Arranque local

Frontend:

```bash
cd apps/web
npm run dev
```

Admin:

```bash
cd apps/admin
npm run dev -- -p 3001
```

Backend + base:

```bash
docker compose up
```

Backend manual:

```bash
cd backend
npm install
npm run prisma:generate
npx prisma db push
npm run start:dev
```

## Estructura de carpetas

```text
backend/
  prisma/schema.prisma
  src/app.controller.ts
  src/prisma.service.ts
  src/stats.service.ts
apps/
  web/
  app/
    page.tsx
    torneos/[id]/page.tsx
    equipos/[id]/page.tsx
    jugadores/[id]/page.tsx
    partidos/[id]/page.tsx
  admin/
    app/admin/
      page.tsx
      torneos/
      equipos/
      jugadores/
      partidos/
      calendario/
      multimedia/
      configuracion/
  lib/baires-data.ts
```

## Tests

Backend:

```bash
cd backend
npm test
```

Cobertura actual:

- Auth admin correcta e incorrecta.
- Estadisticas de tabla y jugadores.
- Carga de evento de partido y recalculo de marcador.
