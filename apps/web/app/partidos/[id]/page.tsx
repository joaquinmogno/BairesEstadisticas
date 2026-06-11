"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "clsx";
import { CircleDot, Medal, Square, Ticket } from "lucide-react";
import {
  AppShell,
  Breadcrumbs,
  CompareBar,
  ContextLinksPanel,
  EmptyStateCard,
  LoadingCard,
  MatchCard,
  MatchHeader,
  PageWrap,
  Panel,
  SectionTitle,
  StandingTable,
  StatGrid,
  Tabs,
  TeamBadge,
  useRememberedTab,
} from "@/app/_components/sports-ui";
import {
  fullDateLabel,
  getMatch,
  getPlayer,
  getTeam,
  getTeamMatches,
  getTeamPlayers,
  getTournament,
  getTournamentMatches,
  getTournamentStandings,
  useMatchSummary,
  useBairesData,
  type MatchEvent,
  type Player,
  type Team,
} from "@/lib/baires-data";

type Tab = "resumen" | "alineaciones" | "estadisticas" | "enfrentamientos" | "posiciones";
type MatchEventView = {
  id: string;
  minute?: number;
  teamId: string;
  playerId?: string;
  assistPlayerId?: string;
  detail?: string;
  matchId?: string;
  type: MatchEvent["type"];
};

const tabs: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "alineaciones", label: "Alineaciones" },
  { id: "estadisticas", label: "Estadisticas" },
  { id: "enfrentamientos", label: "Enfrentamientos" },
  { id: "posiciones", label: "Posiciones" },
];

export default function MatchPage() {
  const { loading, error } = useBairesData();
  const { id } = useParams<{ id?: string }>();
  const [active, setActive] = useRememberedTab<Tab>(`web:match:${id ?? "unknown"}:tab`, "resumen");

  if (loading) {
    return <AppShell><PageWrap><LoadingCard title="Cargando partido" message="Estamos preparando el resumen, las alineaciones y el relato del juego." /></PageWrap></AppShell>;
  }

  if (error) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-red-500">{error}</div></Panel></PageWrap></AppShell>;
  }

  if (!id) {
    return <AppShell><PageWrap><LoadingCard title="Preparando partido" message="Estamos resolviendo el identificador del partido." /></PageWrap></AppShell>;
  }

  const match = getMatch(id);
  if (!match) {
    return <AppShell><PageWrap><div className="p-4"><EmptyStateCard title="Partido no encontrado" message="No existe un partido publicado con ese identificador." /></div></PageWrap></AppShell>;
  }
  const { data: summary, loading: summaryLoading } = useMatchSummary(match.id);

  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const tournament = getTournament(match.tournamentId);
  const standings = getTournamentStandings(match.tournamentId);
  const h2h = getTournamentMatches(match.tournamentId).filter(
    (item) =>
      (item.homeTeamId === match.homeTeamId && item.awayTeamId === match.awayTeamId) ||
      (item.homeTeamId === match.awayTeamId && item.awayTeamId === match.homeTeamId),
  );
  const mvp = match.mvpPlayerId ? getPlayer(match.mvpPlayerId) : undefined;
  const goals = summary?.goals ?? match.events.filter((event) => event.type === "goal").map((event) => ({ ...event, matchId: match.id }));
  const assists = summary?.assists ?? match.events.filter((event) => event.type === "assist").map((event) => ({ ...event, matchId: match.id }));
  const yellow = summary?.yellowCards ?? match.events.filter((event) => event.type === "yellow").map((event) => ({ ...event, matchId: match.id }));
  const red = summary?.redCards ?? match.events.filter((event) => event.type === "red").map((event) => ({ ...event, matchId: match.id }));
  const homeMatchStats = {
    goals: goals.filter((event) => event.teamId === match.homeTeamId).length,
    assists: assists.filter((event) => event.teamId === match.homeTeamId).length,
    yellow: yellow.filter((event) => event.teamId === match.homeTeamId).length,
    red: red.filter((event) => event.teamId === match.homeTeamId).length,
  };
  const awayMatchStats = {
    goals: goals.filter((event) => event.teamId === match.awayTeamId).length,
    assists: assists.filter((event) => event.teamId === match.awayTeamId).length,
    yellow: yellow.filter((event) => event.teamId === match.awayTeamId).length,
    red: red.filter((event) => event.teamId === match.awayTeamId).length,
  };
  const homePlayers = getTeamPlayers(match.homeTeamId);
  const awayPlayers = getTeamPlayers(match.awayTeamId);

  return (
    <AppShell>
      <PageWrap
        aside={
          <>
            <Panel>
              <SectionTitle title="Mas de este torneo" />
              {getTournamentMatches(match.tournamentId).filter((item) => item.id !== match.id).slice(0, 4).map((item) => (
                <MatchCard key={item.id} match={item} compact />
              ))}
            </Panel>
            <ContextLinksPanel
              title="Cruces relacionados"
              items={[
                home ? { href: `/equipos/${home.id}`, label: home.name, helper: "Ver equipo local" } : { href: "/", label: "Equipo local", helper: "Sin datos" },
                away ? { href: `/equipos/${away.id}`, label: away.name, helper: "Ver equipo visitante" } : { href: "/", label: "Equipo visitante", helper: "Sin datos" },
                tournament ? { href: `/torneos/${tournament.id}`, label: tournament.name, helper: "Volver al torneo" } : { href: "/", label: "Inicio", helper: "Volver a los partidos del día" },
              ]}
            />
          </>
        }
      >
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: tournament?.name ?? "Torneo", href: `/torneos/${match.tournamentId}` }, { label: "Partido" }]} />
        <MatchHeader match={match} tournament={tournament ? { name: tournament.name, logo: tournament.logo } : undefined} />
        <Panel>
          <Tabs tabs={tabs} active={active} onChange={setActive} />
          {active === "resumen" ? (
            <>
              <div className="px-4 pb-4">
                {summaryLoading ? <LoadingCard title="Actualizando relato" message="Estamos ordenando las jugadas publicadas del partido." /> : null}
                <MatchEventsBoard
                  home={home}
                  away={away}
                  goals={goals}
                  yellowCards={yellow}
                  redCards={red}
                  mvp={mvp}
                />
              </div>
              <SectionTitle title="Ultimos partidos" />
              <RecentMatchesComparison homeTeamId={match.homeTeamId} awayTeamId={match.awayTeamId} />
              <SectionTitle title="Informacion" />
              <StatGrid
                items={[
                  { label: "Resultado final", value: match.status === "scheduled" ? "-" : `${match.homeScore ?? 0}-${match.awayScore ?? 0}` },
                  { label: "MVP", value: mvp?.name ?? "-" },
                  { label: "Amarillas", value: yellow.length },
                  { label: "Rojas", value: red.length },
                  { label: "Fecha", value: fullDateLabel(match.date) },
                  { label: "Cancha", value: match.court },
                  { label: "Goles", value: goals.length },
                  { label: "Asistencias", value: assists.length },
                ]}
              />
            </>
          ) : null}
          {active === "alineaciones" ? (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <LineupList title={home?.name ?? "Local"} players={homePlayers} starters={match.starters[match.homeTeamId] ?? []} substitutes={match.substitutes[match.homeTeamId] ?? []} />
              <LineupList title={away?.name ?? "Visitante"} players={awayPlayers} starters={match.starters[match.awayTeamId] ?? []} substitutes={match.substitutes[match.awayTeamId] ?? []} />
            </div>
          ) : null}
          {active === "estadisticas" ? (
            <div className="space-y-5 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MatchStatCard title="Goles" left={homeMatchStats.goals} right={awayMatchStats.goals} leftLabel={home?.name ?? "Local"} rightLabel={away?.name ?? "Visitante"} />
                <MatchStatCard title="Asistencias" left={homeMatchStats.assists} right={awayMatchStats.assists} leftLabel={home?.name ?? "Local"} rightLabel={away?.name ?? "Visitante"} />
                <MatchStatCard title="Amarillas" left={homeMatchStats.yellow} right={awayMatchStats.yellow} leftLabel={home?.name ?? "Local"} rightLabel={away?.name ?? "Visitante"} />
                <MatchStatCard title="Rojas" left={homeMatchStats.red} right={awayMatchStats.red} leftLabel={home?.name ?? "Local"} rightLabel={away?.name ?? "Visitante"} />
              </div>
              {!goals.length && !assists.length && !yellow.length && !red.length ? (
                <EmptyStateCard title="Sin estadisticas del encuentro" message="Cuando se publique la planilla vas a ver goles, asistencias y tarjetas aca." />
              ) : null}
              <CompareBar label="Goles del partido" left={homeMatchStats.goals} right={awayMatchStats.goals} />
              <CompareBar label="Asistencias del partido" left={homeMatchStats.assists} right={awayMatchStats.assists} />
              <CompareBar label="Amarillas del partido" left={homeMatchStats.yellow} right={awayMatchStats.yellow} />
              <CompareBar label="Rojas del partido" left={homeMatchStats.red} right={awayMatchStats.red} />
            </div>
          ) : null}
          {active === "enfrentamientos" ? (
            <>
              <StatGrid
                items={[
                  { label: `Victorias de ${home?.name ?? "Local"}`, value: h2h.filter((item) => winner(item) === home?.id).length },
                  { label: `Victorias de ${away?.name ?? "Visitante"}`, value: h2h.filter((item) => winner(item) === away?.id).length },
                  { label: "Empates", value: h2h.filter((item) => winner(item) === "draw").length },
                  { label: "Goles totales", value: h2h.reduce((sum, item) => sum + (item.homeScore ?? 0) + (item.awayScore ?? 0), 0) },
                ]}
              />
              <SectionTitle title="Ultimos enfrentamientos" />
              {h2h.length ? h2h.map((item) => <MatchCard key={item.id} match={item} />) : <div className="p-4"><EmptyStateCard title="Sin antecedentes" message="Todavia no hay enfrentamientos anteriores entre estos equipos." /></div>}
            </>
          ) : null}
          {active === "posiciones" ? <StandingTable rows={standings} highlightTeamIds={[match.homeTeamId, match.awayTeamId]} /> : null}
        </Panel>
      </PageWrap>
    </AppShell>
  );
}

function LineupList({
  title,
  players,
  starters,
  substitutes,
}: {
  title: string;
  players: ReturnType<typeof getTeamPlayers>;
  starters: string[];
  substitutes: string[];
}) {
  return (
    <Panel>
      <SectionTitle title={title} />
      <div className="space-y-2 px-4 pb-4">
        {players.length ? players.map((player) => {
          const role = starters.includes(player.id) ? "Titular" : substitutes.includes(player.id) ? "Suplente" : "";
          return (
            <div key={player.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
              <Image src={player.photo} alt={player.name} width={48} height={48} unoptimized className="h-12 w-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{player.name}</p>
                <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                  #{player.number || "-"} · {player.position}{role ? ` · ${role}` : ""}
                </p>
              </div>
            </div>
          );
        }) : (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sin jugadores cargados.</p>
        )}
      </div>
    </Panel>
  );
}

function RecentMatchesComparison({ homeTeamId, awayTeamId }: { homeTeamId: string; awayTeamId: string }) {
  const homeMatches = getTeamMatches(homeTeamId).filter((match) => match.status !== "scheduled").slice(0, 5);
  const awayMatches = getTeamMatches(awayTeamId).filter((match) => match.status !== "scheduled").slice(0, 5);
  return (
    <div className="border-b border-slate-100 px-4 pb-4 dark:border-white/10">
      <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-4">
        <RecentTeamRun matches={homeMatches} teamId={homeTeamId} />
        <div className="bg-slate-200 dark:bg-white/10" />
        <RecentTeamRun matches={awayMatches} teamId={awayTeamId} align="right" />
      </div>
      <div className="mt-3 grid grid-cols-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>Ultimos 5 partidos</span>
        <span className="text-right">Ultimos 5 partidos</span>
      </div>
    </div>
  );
}

function RecentTeamRun({ matches, teamId, align = "left" }: { matches: ReturnType<typeof getTeamMatches>; teamId: string; align?: "left" | "right" }) {
  useBairesData();
  return (
    <div className={`flex min-w-0 gap-2 overflow-hidden ${align === "right" ? "justify-end" : ""}`}>
      {matches.map((item) => {
        const rival = getTeam(item.homeTeamId === teamId ? item.awayTeamId : item.homeTeamId);
        const own = item.homeTeamId === teamId ? item.homeScore ?? 0 : item.awayScore ?? 0;
        const other = item.homeTeamId === teamId ? item.awayScore ?? 0 : item.homeScore ?? 0;
        const result = own > other ? "border-emerald-400 text-emerald-100" : own === other ? "border-amber-400 text-amber-100" : "border-red-400 text-red-100";
        return (
          <div key={item.id} className="flex min-w-9 flex-col items-center gap-1">
            <TeamBadge team={rival} size="sm" />
            <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-black tabular-nums ${result}`}>{own}-{other}</span>
          </div>
        );
      })}
    </div>
  );
}

function winner(match: { homeTeamId: string; awayTeamId: string; homeScore?: number; awayScore?: number }) {
  if ((match.homeScore ?? 0) > (match.awayScore ?? 0)) return match.homeTeamId;
  if ((match.awayScore ?? 0) > (match.homeScore ?? 0)) return match.awayTeamId;
  return "draw";
}

function MatchEventsBoard({
  home,
  away,
  goals,
  yellowCards,
  redCards,
  mvp,
}: {
  home?: Team;
  away?: Team;
  goals: MatchEventView[];
  yellowCards: MatchEventView[];
  redCards: MatchEventView[];
  mvp?: Player;
}) {
  const homeGoals = goals.filter((event) => event.teamId === home?.id);
  const awayGoals = goals.filter((event) => event.teamId === away?.id);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-white/10 dark:bg-[#111820] dark:text-white">
      <div className="space-y-4 p-4">
        <div className="border-b border-slate-100 pb-4 dark:border-white/10">
          <div className="grid grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)] items-start gap-3">
            <TeamScorerColumn events={homeGoals} align="left" />
            <div className="mt-8 flex justify-center text-slate-400 dark:text-white/55">
              <CircleDot size={16} />
            </div>
            <TeamScorerColumn events={awayGoals} align="right" />
          </div>

          <div className="mt-4 space-y-2">
            <CardsStrip title="Amarillas" icon={<Ticket size={13} />} events={yellowCards} tone="yellow" />
            <CardsStrip title="Expulsiones" icon={<Square size={11} />} events={redCards} tone="red" />
          </div>
        </div>

        <MvpCard mvp={mvp} />
      </div>
    </section>
  );
}

function TeamScorerColumn({
  events,
  align,
}: {
  events: MatchEventView[];
  align: "left" | "right";
}) {
  return (
    <div className={clsx("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <div className="space-y-1">
        {events.length ? events.map((event) => (
          <GoalRow key={event.id} event={event} align={align} />
        )) : (
          <p className={clsx("text-xs font-bold text-slate-400 dark:text-white/45", align === "right" ? "text-right" : "text-left")}>Sin goles</p>
        )}
      </div>
    </div>
  );
}

function GoalRow({ event, align }: { event: MatchEventView; align: "left" | "right" }) {
  const player = event.playerId ? getPlayer(event.playerId) : undefined;
  const assister = event.assistPlayerId ? getPlayer(event.assistPlayerId) : undefined;

  return (
    <div className={clsx("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <p className="truncate text-sm font-black leading-tight text-slate-950 dark:text-white">{player?.name ?? "Jugador"}</p>
      {assister ? <p className="truncate text-[11px] font-bold leading-tight text-slate-500 dark:text-white/55">Asistencia {assister.name}</p> : null}
    </div>
  );
}

function CardsStrip({
  title,
  icon,
  events,
  tone,
}: {
  title: string;
  icon: ReactNode;
  events: MatchEventView[];
  tone: "yellow" | "red";
}) {
  if (!events.length) return null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-start gap-3">
      <div />
      <span
        title={title}
        className={clsx(
          "mt-0.5 flex h-4 w-4 items-center justify-center rounded-[3px]",
          tone === "yellow" ? "bg-amber-300 text-amber-950" : "bg-red-500 text-white",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 space-y-1">
        {events.map((event) => {
          const player = event.playerId ? getPlayer(event.playerId) : undefined;
          return (
            <p key={event.id} className="truncate text-sm font-bold leading-tight text-slate-950 dark:text-white">
              {player?.name ?? "Jugador"}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function MvpCard({ mvp }: { mvp?: Player }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/10">
          {mvp?.photo ? (
            <Image src={mvp.photo} alt={mvp.name} width={64} height={64} unoptimized className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-white/60">
              <Medal size={20} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">Jugador del partido</p>
          <h3 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{mvp?.name ?? "Sin definir"}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-white/65">{mvp ? `#${mvp.number || "-"}` : "Esperando definición del MVP"}</p>
        </div>
      </div>
    </div>
  );
}

function MatchStatCard({
  title,
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  title: string;
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{leftLabel}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{left}</p>
        </div>
        <span className="text-sm font-black text-slate-400">vs</span>
        <div className="text-right">
          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{rightLabel}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{right}</p>
        </div>
      </div>
    </div>
  );
}
