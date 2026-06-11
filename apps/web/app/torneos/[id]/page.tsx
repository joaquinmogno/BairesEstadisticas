"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { AppShell, Breadcrumbs, ContextLinksPanel, EmptyStateCard, LoadingCard, MatchCard, PageWrap, Panel, SectionTitle, ShareFavoriteActions, StandingTable, Tabs, TeamBadge, useRememberedTab } from "@/app/_components/sports-ui";
import { getPlayer, getTeam, getTournament, getTournamentMatches, getTournamentStandings, getTournamentTeams, useBairesData, useTournamentMatchdays, useTournamentRankings, type Match } from "@/lib/baires-data";

type Tab = "resumen" | "posiciones" | "partidos" | "estadisticas";

const tabs: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "posiciones", label: "Posiciones" },
  { id: "partidos", label: "Partidos" },
  { id: "estadisticas", label: "Estadisticas" },
];

const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

export default function TournamentPage() {
  const { loading, error } = useBairesData();
  const { id } = useParams<{ id?: string }>();
  const [active, setActive] = useRememberedTab<Tab>(`web:tournament:${id ?? "unknown"}:tab`, "resumen");
  const tournament = id ? getTournament(id) : undefined;
  const teams = tournament ? getTournamentTeams(tournament.id) : [];
  const matches = tournament ? getTournamentMatches(tournament.id) : [];
  const rows = tournament ? getTournamentStandings(tournament.id) : [];
  const { data: remoteRankings, loading: rankingsLoading } = useTournamentRankings(tournament?.id);
  const { data: remoteMatchdays, loading: matchdaysLoading } = useTournamentMatchdays(tournament?.id);
  const scorers = useMemo(() => rankingPlayersFromRows(remoteRankings.goals), [remoteRankings.goals]);
  const assisters = useMemo(() => rankingPlayersFromRows(remoteRankings.assists), [remoteRankings.assists]);
  const yellowCards = useMemo(() => rankingPlayersFromRows(remoteRankings.yellowCards), [remoteRankings.yellowCards]);
  const redCards = useMemo(() => rankingPlayersFromRows(remoteRankings.redCards), [remoteRankings.redCards]);
  const todayMatches = useMemo(() => matches.filter((match) => match.date === todayInputValue()), [matches]);
  const matchdayGroups = useMemo(() => {
    if (remoteMatchdays.length) {
      return remoteMatchdays
        .map((matchday) => ({
          id: matchday.id,
          name: matchday.name,
          matches: matchday.matches
            .map((match): Match => {
              const baseMatch = matches.find((item) => item.id === match.id);
              return {
                ...(baseMatch ?? {
                  id: match.id,
                  tournamentId: tournament?.id ?? "",
                  date: match.date,
                  time: match.time,
                  court: match.court,
                  homeTeamId: match.homeTeamId,
                  awayTeamId: match.awayTeamId,
                  status: toPublicMatchStatus(match.status),
                  homeScore: match.homeScore,
                  awayScore: match.awayScore,
                  events: [],
                  starters: {},
                  substitutes: {},
                }),
                date: match.date,
                time: match.time,
                court: match.court,
                matchdayName: matchday.name,
                status: toPublicMatchStatus(match.status),
                publicationStatus: match.publicationStatus,
                homeScore: match.homeScore,
                awayScore: match.awayScore,
              };
            }),
        }))
        .filter((group) => group.matches.length);
    }

    const grouped = new Map<string, typeof matches>();
    for (const match of matches) {
      const key = match.matchdayName ?? "Sin fecha";
      const current = grouped.get(key) ?? [];
      current.push(match);
      grouped.set(key, current);
    }
    return Array.from(grouped.entries()).map(([name, roundMatches]) => ({
      id: name,
      name,
      matches: roundMatches.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    }));
  }, [matches, remoteMatchdays, tournament?.id]);
  const [selectedMatchdayId, setSelectedMatchdayId] = useState("");
  const selectedMatchdayIndex = matchdayGroups.findIndex((group) => group.id === selectedMatchdayId);
  const selectedMatchday = selectedMatchdayIndex >= 0 ? matchdayGroups[selectedMatchdayIndex] : matchdayGroups[0];

  useEffect(() => {
    if (!matchdayGroups.length) return;
    if (!selectedMatchdayId || !matchdayGroups.some((group) => group.id === selectedMatchdayId)) {
      setSelectedMatchdayId(matchdayGroups[0].id);
    }
  }, [matchdayGroups, selectedMatchdayId]);

  if (loading) {
    return <AppShell><PageWrap><LoadingCard title="Cargando torneo" message="Estamos preparando posiciones, partidos y estadisticas." /></PageWrap></AppShell>;
  }

  if (error) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-red-500">{error}</div></Panel></PageWrap></AppShell>;
  }
  if (!id) {
    return <AppShell><PageWrap><LoadingCard title="Preparando torneo" message="Estamos resolviendo el identificador del torneo." /></PageWrap></AppShell>;
  }
  if (!tournament) {
    return <AppShell><PageWrap><div className="p-4"><EmptyStateCard title="Torneo no encontrado" message="No existe un torneo publicado con ese identificador." /></div></PageWrap></AppShell>;
  }

  return (
    <AppShell>
      <PageWrap
        aside={
          <ContextLinksPanel
            title="Seguí navegando"
            items={[
              teams[0] ? { href: `/equipos/${teams[0].id}`, label: teams[0].name, helper: "Abrir un equipo de este torneo" } : { href: "/", label: "Esperando equipos", helper: "Todavía no hay clubes cargados" },
              matches[0] ? { href: `/partidos/${matches[0].id}`, label: "Ir al último partido", helper: "Resumen, alineaciones y antecedentes" } : { href: "/", label: "Esperando fixture", helper: "Cuando haya partidos los verás acá" },
              { href: "/", label: "Inicio", helper: "Volver a los partidos del día" },
            ]}
          />
        }
      >
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: tournament.name }]} />
        <Panel>
          <div className="bg-slate-950 p-5 text-white dark:bg-black sm:p-6">
            <div className="flex justify-end">
              <ShareFavoriteActions favoriteKey={`tournament:${tournament.id}`} />
            </div>
            <div className="mt-3 flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                {tournament.logo ? (
                  <Image src={tournament.logo} alt={tournament.name} width={64} height={64} unoptimized className="h-full w-full object-cover" />
                ) : (
                  <Trophy size={28} className="text-emerald-300" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.1em] text-emerald-300">{tournament.category} · {tournament.status}</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{tournament.name}</h1>
                <p className="mt-3 text-sm font-bold text-slate-300">{tournament.venue} · {tournament.rounds} fechas</p>
              </div>
            </div>
          </div>
        </Panel>
        <Panel>
          <Tabs tabs={tabs} active={active} onChange={setActive} />
          {active === "resumen" ? (
            <>
              <SectionTitle title="Tabla de posiciones" />
              <StandingTable rows={rows.slice(0, 8)} showZones={false} />
              <SectionTitle title="Partidos de hoy" />
              <MatchList matches={todayMatches} />
            </>
          ) : null}
          {active === "posiciones" ? <StandingTable rows={rows} showZones={false} /> : null}
          {active === "partidos" ? (
            <>
              <SectionTitle title="Partidos" />
              {matchdaysLoading ? (
                <div className="px-4 pb-4"><LoadingCard title="Cargando fechas" message="Estamos ordenando los partidos por fecha del torneo." /></div>
              ) : (
                <>
                  <MatchdaySelector
                    groups={matchdayGroups}
                    selectedId={selectedMatchday?.id ?? ""}
                    onChange={setSelectedMatchdayId}
                    onPrev={() => {
                      const nextIndex = Math.max(0, selectedMatchdayIndex - 1);
                      setSelectedMatchdayId(matchdayGroups[nextIndex]?.id ?? "");
                    }}
                    onNext={() => {
                      const nextIndex = Math.min(matchdayGroups.length - 1, selectedMatchdayIndex + 1);
                      setSelectedMatchdayId(matchdayGroups[nextIndex]?.id ?? "");
                    }}
                    canPrev={selectedMatchdayIndex > 0}
                    canNext={selectedMatchdayIndex >= 0 && selectedMatchdayIndex < matchdayGroups.length - 1}
                  />
                  <RoundMatchList group={selectedMatchday} />
                </>
              )}
            </>
          ) : null}
          {active === "estadisticas" ? (
            <>
              {rankingsLoading ? <div className="px-4 pb-4"><LoadingCard title="Cargando rankings" message="Estamos armando los lideres del torneo." /></div> : null}
              <SectionTitle title="Goleadores" />
              <PlayerStatTable players={scorers} metric="goals" label="Goles" />
              <SectionTitle title="Asistencias" />
              <PlayerStatTable players={assisters} metric="assists" label="Asistencias" />
              <SectionTitle title="Tarjetas rojas" />
              <PlayerStatTable players={redCards} metric="redCards" label="Rojas" />
              <SectionTitle title="Tarjetas amarillas" />
              <PlayerStatTable players={yellowCards} metric="yellowCards" label="Amarillas" />
            </>
          ) : null}
        </Panel>
      </PageWrap>
    </AppShell>
  );
}

function MatchdaySelector({
  groups,
  selectedId,
  onChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  groups: Array<{ id: string; name: string; matches: ReturnType<typeof getTournamentMatches> }>;
  selectedId: string;
  onChange: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  if (!groups.length) return null;

  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 border-b border-slate-100 px-4 pb-4 dark:border-white/10">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-white"
        aria-label="Fecha anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <select
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none dark:border-white/10 dark:bg-[#111820] dark:text-white"
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id} className="bg-white text-slate-950 dark:bg-[#111820] dark:text-white">{group.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-white"
        aria-label="Fecha siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function MatchList({ matches }: { matches: ReturnType<typeof getTournamentMatches> }) {
  if (!matches.length) {
    return <div className="p-4"><EmptyStateCard title="Sin partidos para hoy" message="No hay partidos programados para la fecha de hoy en este torneo." /></div>;
  }
  return matches.map((match) => <MatchCard key={match.id} match={match} />);
}

function RoundMatchList({
  group,
}: {
  group?: { name: string; matches: ReturnType<typeof getTournamentMatches> };
}) {
  if (!group) {
    return <div className="p-4"><EmptyStateCard title="No hay fechas cargadas" message="Cuando se publiquen las fechas vas a verlas agrupadas aca." /></div>;
  }

  if (!group.matches.length) {
    return <div className="p-4"><EmptyStateCard title="Sin partidos en esta fecha" message="Todavia no hay cruces cargados para esta fecha del torneo." /></div>;
  }

  return (
    <div className="p-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">{group.name}</p>
        </div>
        <div className="bg-white dark:bg-transparent">
          {group.matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      </div>
    </div>
  );
}

function PlayerStatTable({
  players,
  metric,
  label,
}: {
  players: Array<typeof import("@/lib/baires-data").players[number] & { rankingValue?: number }>;
  metric: "goals" | "assists" | "yellowCards" | "redCards";
  label: string;
}) {
  const filteredPlayers = players.filter((player) => player[metric] > 0);

  if (!filteredPlayers.length) {
    return (
      <div className="px-4 pb-4">
        <EmptyStateCard title={`Sin ${label.toLowerCase()}`} message={`No hay datos cargados todavia para ${label.toLowerCase()}.`} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="space-y-3 md:hidden">
        {filteredPlayers.map((player) => {
          const team = getTeam(player.teamId);
          return (
            <Link key={`${metric}-${player.id}`} href={`/jugadores/${player.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
              <Image src={player.photo} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">{player.name}</p>
                <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{team?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-black tabular-nums text-slate-950 dark:text-white">{player.rankingValue ?? player[metric]}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-y border-slate-100 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 text-left">Jugador</th>
              <th className="px-2 py-3 text-left">Equipo</th>
              <th className="px-4 py-3 text-center">{label}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const team = getTeam(player.teamId);
              return (
                <tr key={`${metric}-${player.id}`} className="border-b border-slate-100 font-bold dark:border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/jugadores/${player.id}`} className="flex items-center gap-3">
                      <Image src={player.photo} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
                      <span>{player.name}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    <Link href={`/equipos/${team?.id}`} className="flex items-center gap-2">
                      <TeamBadge team={team} size="sm" />
                      <span>{team?.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-base font-black tabular-nums">{player.rankingValue ?? player[metric]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rankingPlayersFromRows(rows: Array<{ playerId: string; value: number }>) {
  return rows
    .map((row) => {
      const player = getPlayer(row.playerId);
      return player ? { ...player, rankingValue: row.value } : null;
    })
    .filter((player): player is ReturnType<typeof getPlayer> & { rankingValue: number } => Boolean(player));
}

function toPublicMatchStatus(status: "pending" | "live" | "suspended" | "final"): Match["status"] {
  if (status === "final") return "finished";
  if (status === "pending") return "scheduled";
  return status;
}

function todayInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
