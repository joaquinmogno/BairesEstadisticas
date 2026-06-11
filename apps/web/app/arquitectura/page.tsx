import { AppShell, PageWrap, Panel, SectionTitle } from "@/app/_components/sports-ui";

const routes = [
  "GET /matches?date=YYYY-MM-DD",
  "GET /matches/:id",
  "GET /teams/:id",
  "GET /teams/:id/matches",
  "GET /players/:id",
  "GET /tournaments/:id",
  "GET /tournaments/:id/standings",
  "POST /auth/login",
  "POST /admin/matches/:id/result",
  "POST /admin/matches/:id/events",
  "CRUD /admin/teams, /admin/players, /admin/tournaments",
];

const tables = [
  "users(id, email, password_hash, role, created_at)",
  "tournaments(id, name, category, status, rounds, venue)",
  "teams(id, tournament_id, name, badge, primary_color, category, photo_url)",
  "players(id, team_id, first_name, last_name, birth_date, number, position, photo_url)",
  "matches(id, tournament_id, home_team_id, away_team_id, date, time, court, status)",
  "match_events(id, match_id, team_id, player_id, type, minute, detail)",
  "standings(id, tournament_id, team_id, pj, pg, pe, pp, gf, gc, pts)",
  "favorites(id, user_id, entity_type, entity_id)",
  "notifications(id, user_id, match_id, channel, scheduled_at, sent_at)",
];

const phases = [
  "Etapa 1: UI publica, navegacion, mock data y panel admin visual.",
  "Etapa 2: Backend NestJS, PostgreSQL, autenticacion JWT y migraciones.",
  "Etapa 3: Carga real de torneos, equipos, jugadores, partidos y eventos.",
  "Etapa 4: Estadisticas calculadas, tablas automaticas, rankings y H2H.",
  "Etapa 5: Favoritos, notificaciones, compartir, roles y permisos finos.",
  "Etapa 6: Deploy con Docker Compose, monitoreo, backups y cache.",
];

export default function ArchitecturePage() {
  return (
    <AppShell>
      <PageWrap>
        <Panel>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">Documento vivo</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Arquitectura Baires Torneos</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
              Plataforma Next.js + NestJS + PostgreSQL para seguir partidos, equipos, jugadores, estadisticas, calendario y administracion.
            </p>
          </div>
        </Panel>

        <InfoSection title="Wireframes">
          <Wireframe title="Home">
            Header con marca, buscador global, tema y notificaciones. Debajo: selector de fecha, marcador de ayer/hoy/manana, cards de partidos y accesos a equipos, jugadores y torneos.
          </Wireframe>
          <Wireframe title="Partido">
            Cabecera con escudos, marcador, estado, fecha, hora y cancha. Tabs: resumen con timeline, estadisticas comparativas, enfrentamientos y posiciones.
          </Wireframe>
          <Wireframe title="Equipo">
            Hero con foto, escudo y metricas. Tabs: resumen, partidos filtrables, posiciones por torneo y plantel en cards.
          </Wireframe>
          <Wireframe title="Jugador">
            Hero con foto, dorsal y datos personales. Tabs: resumen, graficos de rendimiento y ultimas apariciones.
          </Wireframe>
          <Wireframe title="Torneo">
            Resumen del torneo, equipos participantes, calendario completo, tabla y rankings de goleadores/asistidores.
          </Wireframe>
        </InfoSection>

        <InfoSection title="Modelo de base de datos">
          {tables.map((item) => <CodeLine key={item}>{item}</CodeLine>)}
        </InfoSection>

        <InfoSection title="APIs REST">
          {routes.map((item) => <CodeLine key={item}>{item}</CodeLine>)}
        </InfoSection>

        <InfoSection title="Estructura frontend">
          <CodeLine>app/page.tsx</CodeLine>
          <CodeLine>app/partidos/[id]/page.tsx</CodeLine>
          <CodeLine>app/equipos/[id]/page.tsx</CodeLine>
          <CodeLine>app/jugadores/[id]/page.tsx</CodeLine>
          <CodeLine>app/torneos/[id]/page.tsx</CodeLine>
          <CodeLine>app/admin/*</CodeLine>
          <CodeLine>lib/baires-data.ts</CodeLine>
        </InfoSection>

        <InfoSection title="Plan por etapas">
          {phases.map((item) => <p key={item} className="rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-slate-300">{item}</p>)}
        </InfoSection>
      </PageWrap>
    </AppShell>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <SectionTitle title={title} />
      <div className="grid gap-2 p-4">{children}</div>
    </Panel>
  );
}

function Wireframe({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}

function CodeLine({ children }: { children: React.ReactNode }) {
  return <code className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white dark:bg-black">{children}</code>;
}
