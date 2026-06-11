"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell, EmptyStateCard, MatchCard, PageWrap, Panel, PlayerCard, SectionTitle, TeamBadge } from "@/app/_components/sports-ui";
import { getClub, getClubTeams, getTeamMatches, getTeamPlayers, getTeamStanding, getTournament, useBairesData } from "@/lib/baires-data";

export default function ClubPage() {
  const { loading, error } = useBairesData();
  const { id } = useParams<{ id?: string }>();

  if (loading) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-slate-500">Cargando club...</div></Panel></PageWrap></AppShell>;
  }

  if (error) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-red-500">{error}</div></Panel></PageWrap></AppShell>;
  }

  const club = id ? getClub(id) : undefined;
  const participations = id ? getClubTeams(id) : [];
  if (!club || !participations.length) {
    return <AppShell><PageWrap><div className="p-4"><EmptyStateCard title="Club no encontrado" message="No existe un club publicado con ese identificador." /></div></PageWrap></AppShell>;
  }

  const matches = uniqueBy(participations.flatMap((team) => getTeamMatches(team.id)), (match) => match.id)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const nextMatch = [...matches]
    .filter((match) => match.status === "scheduled" || match.status === "live")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  const lastMatches = matches.filter((match) => match.status === "finished").slice(0, 5);
  const players = uniqueBy(participations.flatMap((team) => getTeamPlayers(team.id)), (player) => player.id);
  const standings = participations.map((team) => getTeamStanding(team.id)).filter(Boolean);
  const totals = standings.reduce(
    (acc, row) => ({
      pj: acc.pj + (row?.pj ?? 0),
      pts: acc.pts + (row?.pts ?? 0),
      gf: acc.gf + (row?.gf ?? 0),
      gc: acc.gc + (row?.gc ?? 0),
    }),
    { pj: 0, pts: 0, gf: 0, gc: 0 },
  );

  return (
    <AppShell>
      <PageWrap>
        <Panel>
          <div className="bg-slate-950 p-4 text-white sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                {club.badgeUrl ? <Image src={club.badgeUrl} alt={club.name} width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <span className="text-xl font-black">{club.name.slice(0, 2).toUpperCase()}</span>}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">Ficha global del club</p>
                <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-5xl">{club.name}</h1>
                <p className="mt-2 text-sm font-bold text-slate-300">{participations.length} competiciones · {players.length} jugadores · DG {totals.gf - totals.gc}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 px-2 py-3"><p className="text-2xl font-black">{totals.pj}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">PJ</p></div>
              <div className="rounded-2xl bg-white/10 px-2 py-3"><p className="text-2xl font-black">{totals.pts}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">PTS</p></div>
              <div className="rounded-2xl bg-white/10 px-2 py-3"><p className="text-2xl font-black">{totals.gf}:{totals.gc}</p><p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Goles</p></div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Próximo partido" />
          {nextMatch ? <MatchCard match={nextMatch} /> : <div className="p-4"><EmptyStateCard title="Sin próximo partido" message="Todavía no se publicaron próximos partidos para este club." /></div>}
        </Panel>

        <Panel>
          <SectionTitle title="Competiciones activas" />
          <div className="grid gap-2 p-4 sm:grid-cols-2">
            {participations.map((team) => {
              const tournament = getTournament(team.tournamentId);
              const row = getTeamStanding(team.id);
              return (
                <Link key={team.id} href={`/equipos/${team.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <TeamBadge team={team} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{tournament?.name ?? "Torneo"}</span>
                    <span className="mt-0.5 block text-xs font-bold text-slate-500 dark:text-slate-400">{row ? `${row.position}° · ${row.pts} pts · ${row.pj} PJ` : "Sin tabla"}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Últimos resultados" />
          {lastMatches.length ? lastMatches.map((match) => <MatchCard key={match.id} match={match} />) : <div className="p-4"><EmptyStateCard title="Sin resultados" message="Cuando haya partidos finalizados, los vas a ver acá." /></div>}
        </Panel>

        <Panel>
          <SectionTitle title="Plantel general" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {players.length ? players.map((player) => <PlayerCard key={player.id} player={player} />) : <EmptyStateCard title="Sin jugadores" message="Todavía no hay jugadores publicados para este club." />}
          </div>
        </Panel>
      </PageWrap>
    </AppShell>
  );
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
