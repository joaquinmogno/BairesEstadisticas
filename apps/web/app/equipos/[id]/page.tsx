"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MatchCard, PageWrap, Panel, PlayerCard, SectionTitle, StandingTable, StatGrid, Tabs, TeamHero, AppShell, Breadcrumbs, EmptyStateCard, FormDots, ContextLinksPanel, useRememberedTab } from "@/app/_components/sports-ui";
import { getClubTeams, getTeam, getTeamMatches, getTeamPlayers, getTeamStanding, getTournament, getTournamentStandings, useBairesData } from "@/lib/baires-data";

type Tab = "resumen" | "partidos" | "posiciones" | "plantel";

const tabs: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "partidos", label: "Partidos" },
  { id: "posiciones", label: "Posiciones" },
  { id: "plantel", label: "Plantel" },
];

const filters = ["Todos", "Local", "Visitante", "Ganados", "Empatados", "Perdidos"];

export default function TeamPage() {
  const { loading, error } = useBairesData();
  const { id } = useParams<{ id?: string }>();
  const [active, setActive] = useRememberedTab<Tab>(`web:team:${id ?? "unknown"}:tab`, "resumen");
  const [filter, setFilter] = useState("Todos");
  const team = id ? getTeam(id) : undefined;
  const tournament = team ? getTournament(team.tournamentId) : undefined;
  const clubTeams = team ? getClubTeams(team.clubId) : [];
  const row = team ? getTeamStanding(team.id) : undefined;
  const teamMatches = team ? getTeamMatches(team.id) : [];
  const players = team ? getTeamPlayers(team.id) : [];
  const nextMatch = teamMatches.find((match) => match.status === "scheduled");
  const lastMatches = teamMatches.filter((match) => match.status !== "scheduled").slice(0, 4);
  const filteredMatches = useMemo(() => {
    if (!team) return [];
    return teamMatches.filter((match) => {
      if (filter === "Local") return match.homeTeamId === team.id;
      if (filter === "Visitante") return match.awayTeamId === team.id;
      if (filter === "Ganados") return resultFor(match, team.id) === "V";
      if (filter === "Empatados") return resultFor(match, team.id) === "E";
      if (filter === "Perdidos") return resultFor(match, team.id) === "D";
      return true;
    });
  }, [filter, team, teamMatches]);

  if (loading) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-slate-500">Cargando equipo...</div></Panel></PageWrap></AppShell>;
  }

  if (error) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-red-500">{error}</div></Panel></PageWrap></AppShell>;
  }
  if (!id) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-slate-500">Preparando equipo...</div></Panel></PageWrap></AppShell>;
  }
  if (!team) {
    return <AppShell><PageWrap><div className="p-4"><EmptyStateCard title="Equipo no encontrado" message="No existe un equipo publicado con ese identificador." /></div></PageWrap></AppShell>;
  }

  return (
    <AppShell>
      <PageWrap
        aside={
          <>
            <Panel>
              <SectionTitle title="Estadisticas de esta competicion" />
              <StatGrid
                items={[
                  { label: "PJ", value: row?.pj ?? 0 },
                  { label: "PG", value: row?.pg ?? 0 },
                  { label: "PE", value: row?.pe ?? 0 },
                  { label: "PP", value: row?.pp ?? 0 },
                  { label: "GF", value: row?.gf ?? 0 },
                  { label: "GC", value: row?.gc ?? 0 },
                  { label: "DG", value: (row?.gf ?? 0) - (row?.gc ?? 0) },
                  { label: "PTS", value: row?.pts ?? 0 },
                ]}
              />
            </Panel>
            <ContextLinksPanel
              title={clubTeams.length > 1 ? "Competiciones del club" : "Más del equipo"}
              items={[
                ...clubTeams.map((participation) => {
                  const participationTournament = getTournament(participation.tournamentId);
                  return {
                    href: `/equipos/${participation.id}`,
                    label: participationTournament?.name ?? participation.name,
                    helper: participation.id === team.id ? "Competicion actual" : "Ver ficha en esta competicion",
                  };
                }),
                players[0] ? { href: `/jugadores/${players[0].id}`, label: players[0].name, helper: "Abrir un jugador del plantel" } : { href: "/", label: "Plantel pendiente", helper: "Todavía no hay jugadores cargados" },
                { href: "/", label: "Inicio", helper: "Volver a los partidos del día" },
              ]}
            />
          </>
        }
      >
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: tournament?.name ?? "Torneo", href: `/torneos/${team.tournamentId}` }, { label: team.name }]} />
        <TeamHero team={team} />
        <Panel>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Vista de competición</p>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">Esta pantalla muestra los datos de {tournament?.name ?? "este torneo"}.</p>
            </div>
            <Link href={`/clubes/${team.clubId}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              Ver ficha global
            </Link>
          </div>
        </Panel>
        {clubTeams.length > 1 ? (
          <Panel>
            <SectionTitle title="Competiciones" />
            <div className="flex gap-2 overflow-x-auto px-4 pb-4">
              {clubTeams.map((participation) => {
                const participationTournament = getTournament(participation.tournamentId);
                const activeParticipation = participation.id === team.id;
                return (
                  <Link
                    key={participation.id}
                    href={`/equipos/${participation.id}`}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black transition ${
                      activeParticipation
                        ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {participationTournament?.name ?? participation.name}
                  </Link>
                );
              })}
            </div>
          </Panel>
        ) : null}
        <Panel>
          <Tabs tabs={tabs} active={active} onChange={setActive} />
          {active === "resumen" ? (
            <>
              <SectionTitle title="Proximo partido" />
              {nextMatch ? <MatchCard match={nextMatch} /> : <div className="p-4 text-sm font-bold text-slate-500">Sin proximo partido programado.</div>}
              <SectionTitle title="Ultimos partidos" />
              {lastMatches.map((match) => <MatchCard key={match.id} match={match} />)}
              <SectionTitle title="Posicion actual" />
              <StandingTable rows={getTournamentStandings(team.tournamentId).slice(0, 6)} highlightTeamIds={[team.id]} />
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-white/10">
                <span className="text-sm font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Racha</span>
                <FormDots form={row?.form ?? []} />
              </div>
            </>
          ) : null}
          {active === "partidos" ? (
            <>
              <div className="flex gap-2 overflow-x-auto p-3">
                {filters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black ${filter === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {filteredMatches.map((match) => <MatchCard key={match.id} match={match} />)}
            </>
          ) : null}
          {active === "posiciones" ? (
            <StandingTable rows={getTournamentStandings(team.tournamentId)} highlightTeamIds={[team.id]} />
          ) : null}
          {active === "plantel" ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {players.map((player) => <PlayerCard key={player.id} player={player} />)}
            </div>
          ) : null}
        </Panel>
      </PageWrap>
    </AppShell>
  );
}

function resultFor(match: { status: string; homeTeamId: string; awayTeamId: string; homeScore?: number; awayScore?: number }, teamId: string) {
  if (match.status === "scheduled") return "";
  const own = match.homeTeamId === teamId ? match.homeScore ?? 0 : match.awayScore ?? 0;
  const rival = match.homeTeamId === teamId ? match.awayScore ?? 0 : match.homeScore ?? 0;
  if (own > rival) return "V";
  if (own < rival) return "D";
  return "E";
}
