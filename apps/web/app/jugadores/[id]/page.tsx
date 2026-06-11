"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, Cake, CalendarDays, Goal, Handshake, RectangleVertical, Shirt, Square, Trophy } from "lucide-react";
import { AppShell, Breadcrumbs, CompareBar, ContextLinksPanel, MatchCard, PageWrap, Panel, SectionTitle, ShareFavoriteActions, Tabs, TeamBadge, useRememberedTab } from "@/app/_components/sports-ui";
import { getClub, getPlayer, getPlayerAppearances, getTeam, getTournament, topAssisters, topScorers, useBairesData } from "@/lib/baires-data";

type Tab = "resumen" | "estadisticas" | "apariciones";

const tabs: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "estadisticas", label: "Estadisticas" },
  { id: "apariciones", label: "Ultimas apariciones" },
];

function formatBirthDate(birthDate?: string) {
  if (!birthDate || birthDate === "-") return "-";
  const [year, month, day] = birthDate.split("-");
  if (!year || !month || !day) return birthDate;
  return `${day}/${month}/${year}`;
}

export default function PlayerPage() {
  const { loading, error } = useBairesData();
  const { id } = useParams<{ id?: string }>();
  const [active, setActive] = useRememberedTab<Tab>(`web:player:${id ?? "unknown"}:tab`, "resumen");

  if (loading) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-slate-500">Cargando jugador...</div></Panel></PageWrap></AppShell>;
  }

  if (error) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-red-500">{error}</div></Panel></PageWrap></AppShell>;
  }

  if (!id) {
    return <AppShell><PageWrap><Panel><div className="p-6 text-sm font-bold text-slate-500">Preparando jugador...</div></Panel></PageWrap></AppShell>;
  }

  const player = getPlayer(id);
  if (!player) {
    return <AppShell><PageWrap><Panel><div className="p-6"><SectionTitle title="Jugador no encontrado" /><p className="text-sm font-bold text-slate-500 dark:text-slate-400">No existe un jugador publicado con ese identificador.</p></div></Panel></PageWrap></AppShell>;
  }

  const team = getTeam(player.teamId);
  const club = getClub(player.clubId);
  const tournament = team ? getTournament(team.tournamentId) : undefined;
  const appearances = getPlayerAppearances(player.id);
  const statsByTournament = playerCompetitionStats(appearances);
  const scorers = topScorers(team?.tournamentId);
  const assisters = topAssisters(team?.tournamentId);
  const maxGoals = Math.max(...scorers.map((item) => item.goals), 1);
  const maxAssists = Math.max(...assisters.map((item) => item.assists), 1);

  return (
    <AppShell>
      <PageWrap
        aside={
          <>
            <Panel>
              <SectionTitle title="Club y equipo" />
              <Link href={club ? `/clubes/${club.id}` : team ? `/equipos/${team.id}` : "/"} className="flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-white/5">
                <TeamBadge team={team} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-black">{club?.name ?? team?.name}</p>
                  <p className="truncate text-sm font-bold text-slate-500 dark:text-slate-400">{team?.name} · {tournament?.name}</p>
                </div>
              </Link>
            </Panel>
            <ContextLinksPanel
              title="Seguí explorando"
              items={[
                team ? { href: `/equipos/${team.id}`, label: team.name, helper: "Ver el plantel completo" } : { href: "/", label: "Equipo no disponible", helper: "Sin referencia actual" },
                tournament ? { href: `/torneos/${tournament.id}`, label: tournament.name, helper: "Volver al torneo" } : { href: "/", label: "Torneo no disponible", helper: "Sin referencia actual" },
                appearances[0] ? { href: `/partidos/${appearances[0].match.id}`, label: "Último partido jugado", helper: "Abrir resumen y eventos" } : { href: "/", label: "Inicio", helper: "Volver a los partidos del día" },
              ]}
            />
          </>
        }
      >
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: team?.name ?? "Equipo", href: `/equipos/${team?.id}` }, { label: player.name }]} />
        <Panel>
          <div className="bg-slate-950 p-5 text-white dark:bg-black sm:p-6">
            <div className="flex justify-end">
              <ShareFavoriteActions favoriteKey={`player:${player.id}`} />
            </div>
            <div className="mt-2 flex flex-col items-center text-center">
              <Image src={player.photo} alt="" width={96} height={96} unoptimized className="h-24 w-24 rounded-full object-cover ring-4 ring-white/10" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.1em] text-emerald-300">#{player.number} · {player.position}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{player.name}</h1>
              <p className="mt-3 text-sm font-bold text-slate-300">{team?.name} · {tournament?.name}</p>
              {club ? <Link href={`/clubes/${club.id}`} className="mt-4 inline-flex min-h-10 items-center rounded-full bg-white/10 px-4 text-sm font-black text-white">Ver ficha del club</Link> : null}
            </div>
          </div>
        </Panel>
        <Panel>
          <Tabs tabs={tabs} active={active} onChange={setActive} />
          {active === "resumen" ? (
            <>
              <SectionTitle title="Detalles del jugador" />
              <div className="bg-[#101920] px-4 py-4 text-white">
                <div className="grid grid-cols-2 gap-0 border-b border-white/10 pb-4 text-center">
                  <PlayerDetail icon={<TeamBadge team={team} size="lg" />} value={team?.name ?? "-"} label="Equipo actual" />
                  <PlayerDetail icon={<Shirt size={26} />} value={`#${player.number}`} label="Dorsal" withDivider />
                </div>
                <div className="grid grid-cols-2 gap-0 pt-4 text-center">
                  <PlayerDetail icon={<Cake size={26} />} value={`${player.age} años`} label={formatBirthDate(player.birthDate)} />
                  <PlayerDetail icon={<CalendarDays size={26} />} value={formatBirthDate(player.birthDate)} label="Fecha de nacimiento" withDivider />
                </div>
              </div>
              <SectionTitle title="Estadisticas" />
              <div className="bg-[#101920] text-white">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Trophy size={20} className="text-amber-300" />
                    <span className="truncate text-sm font-black">{tournament?.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">Temporada actual</span>
                </div>
                <div className="grid grid-cols-3 border-b border-white/10">
                  <PlayerStatIcon icon={<BadgeCheck size={28} className="text-lime-400" />} value={`${player.appearances}`} label="Apariciones" />
                  <PlayerStatIcon icon={<Goal size={28} />} value={`${player.goals}`} label="Goles" withDivider />
                  <PlayerStatIcon icon={<Handshake size={28} className="text-sky-400" />} value={`${player.assists}`} label="Asistencias" withDivider />
                </div>
                <div className="grid grid-cols-2">
                  <PlayerStatIcon icon={<Square size={28} fill="#facc15" className="text-yellow-400" />} value={`${player.yellowCards}`} label="Tarjetas Amarillas" />
                  <PlayerStatIcon icon={<RectangleVertical size={28} fill="#fb405f" className="text-rose-400" />} value={`${player.redCards}`} label="Tarjetas Rojas" withDivider />
                </div>
              </div>
            </>
          ) : null}
          {active === "estadisticas" ? (
            <div className="space-y-5 p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Por competición</p>
                <div className="mt-3 grid gap-2">
                  {statsByTournament.length ? statsByTournament.map((row) => (
                    <div key={row.tournamentId} className="rounded-xl bg-white p-3 shadow-sm dark:bg-black/20">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black">{getTournament(row.tournamentId)?.name ?? "Torneo"}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">{row.appearances} PJ</span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs font-black text-slate-500 dark:text-slate-400">
                        <span>G<br /><b className="text-slate-950 dark:text-white">{row.goals}</b></span>
                        <span>A<br /><b className="text-slate-950 dark:text-white">{row.assists}</b></span>
                        <span>AM<br /><b className="text-slate-950 dark:text-white">{row.yellowCards}</b></span>
                        <span>RJ<br /><b className="text-slate-950 dark:text-white">{row.redCards}</b></span>
                      </div>
                    </div>
                  )) : <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Todavía no hay apariciones publicadas.</p>}
                </div>
              </div>
              <CompareBar label="Goles vs lider torneo" left={player.goals} right={maxGoals} />
              <CompareBar label="Asistencias vs lider torneo" left={player.assists} right={maxAssists} />
              <CompareBar label="Participacion en goles" left={player.goals + player.assists} right={player.appearances} />
              <CompareBar label="Tarjetas por temporada" left={player.yellowCards} right={player.redCards} />
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-white/5">
                <p className="text-sm font-black">Goles por torneo</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((player.goals / maxGoals) * 100, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{tournament?.name}: {player.goals} goles</p>
              </div>
            </div>
          ) : null}
          {active === "apariciones" ? (
            <>
              <SectionTitle title="Ultimos partidos disputados" />
              {appearances.map(({ match, events }) => (
                <div key={match.id} className="border-t border-slate-100 dark:border-white/10">
                  <MatchCard match={match} />
                  <div className="grid grid-cols-4 gap-2 px-4 pb-4 text-center text-xs font-black text-slate-500 dark:text-slate-400">
                    <span>G {events.filter((event) => event.type === "goal").length}</span>
                    <span>A {events.filter((event) => event.type === "assist").length}</span>
                    <span>AM {events.filter((event) => event.type === "yellow").length}</span>
                    <span>RJ {events.filter((event) => event.type === "red").length}</span>
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </Panel>
      </PageWrap>
    </AppShell>
  );
}

function playerCompetitionStats(appearances: ReturnType<typeof getPlayerAppearances>) {
  const rows = new Map<string, { tournamentId: string; appearances: number; goals: number; assists: number; yellowCards: number; redCards: number }>();
  appearances.forEach(({ match, events }) => {
    const current = rows.get(match.tournamentId) ?? { tournamentId: match.tournamentId, appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    current.appearances += 1;
    events.forEach((event) => {
      if (event.type === "goal") current.goals += 1;
      if (event.type === "assist") current.assists += 1;
      if (event.type === "yellow") current.yellowCards += 1;
      if (event.type === "red") current.redCards += 1;
    });
    rows.set(match.tournamentId, current);
  });
  return Array.from(rows.values());
}

function PlayerDetail({ icon, value, label, withDivider = false }: { icon: React.ReactNode; value: string; label: string; withDivider?: boolean }) {
  return (
    <div className={`min-w-0 px-3 ${withDivider ? "border-l border-white/10" : ""}`}>
      <div className="flex h-11 items-center justify-center">{icon}</div>
      <p className="mt-1 truncate text-xl font-black">{value}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-400">{label}</p>
    </div>
  );
}

function PlayerStatIcon({ icon, value, label, withDivider = false }: { icon: React.ReactNode; value: string; label: string; withDivider?: boolean }) {
  return (
    <div className={`flex min-h-36 min-w-0 flex-col items-center justify-center px-2 py-5 text-center ${withDivider ? "border-l border-white/10" : ""}`}>
      <div className="flex h-9 items-center justify-center">{icon}</div>
      <p className="mt-3 text-xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-bold text-white">{label}</p>
    </div>
  );
}
