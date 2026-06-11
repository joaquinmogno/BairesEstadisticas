"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { AdminShell, Card, StatCard, todayInputValue } from "./_components/admin-shell";
import { useAdmin } from "./_lib/admin-store";

export default function AdminIndex() {
  const { tournaments, teams, players, matches, getTeam, playersByTeam } = useAdmin();

  const today = todayInputValue();
  const todayMatches = matches.filter((match) => match.date === today);
  const matchesToLoad = matches.filter((match) => match.status !== "final");
  const draftMatches = matches.filter((match) => match.publicationStatus !== "published");
  const teamsWithoutBadge = teams.filter((team) => !team.badgeUrl);
  const teamsWithoutRoster = teams.filter((team) => playersByTeam(team.id).length === 0);
  const playersWithoutPhoto = players.filter((player) => !player.photoUrl);
  const nextMatches = matches.filter((match) => match.status !== "final").slice(0, 6);

  return (
    <AdminShell title="Inicio" subtitle="BairesStats Admin">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Hoy" value={todayMatches.length} helper="partidos" />
        <StatCard label="Por cargar" value={matchesToLoad.length} helper="pendientes" />
        <StatCard label="Borradores" value={draftMatches.length} helper="sin publicar" />
        <StatCard label="Planteles" value={teamsWithoutRoster.length} helper="equipos vacios" />
      </div>

      <section className="mt-3">
        <Card className="p-3">
          <Link href="/admin/torneos" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-center text-sm font-black text-white shadow-sm transition hover:brightness-95">
            <Trophy size={17} />
            Nuevo torneo
          </Link>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Card className="p-4 xl:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Jornada de hoy</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {todayMatches.length ? todayMatches.map((match) => (
              <Link key={match.id} href={`/admin/torneos/${match.tournamentId}?tab=partidos&match=${match.id}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100">
                <p className="text-sm font-black text-slate-950">{getTeam(match.homeTeamId)?.name ?? "Local"} vs {getTeam(match.awayTeamId)?.name ?? "Visitante"}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{match.time} · {match.court} · {match.publicationStatus === "published" ? "Publicado" : "Borrador"}</p>
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-black text-slate-500 md:col-span-2">
                No hay partidos cargados para hoy. Si hay jornada, agregala desde el torneo correspondiente.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Pendientes por torneo</p>
          <div className="mt-3 grid gap-2">
            {tournaments.length ? tournaments.map((tournament) => {
              const tournamentMatches = matches.filter((match) => match.tournamentId === tournament.id);
              return (
              <Link key={tournament.id} href={`/admin/torneos/${tournament.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{tournament.name}</p>
                    <p className="truncate text-xs font-bold text-slate-500">{tournament.category} · {tournamentMatches.length} partidos</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                    {tournamentMatches.filter((match) => match.publicationStatus !== "published").length} pend.
                  </span>
                </Link>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-black text-slate-500">
                Sin torneos cargados.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Próximos partidos</p>
          <div className="mt-3 grid gap-2">
            {nextMatches.length ? nextMatches.map((match) => (
              <Link key={match.id} href={`/admin/torneos/${match.tournamentId}?tab=partidos&match=${match.id}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100">
                <p className="text-sm font-black text-slate-950">{getTeam(match.homeTeamId)?.name ?? "Local"} vs {getTeam(match.awayTeamId)?.name ?? "Visitante"}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(match.date)} · {match.time} · {match.court}</p>
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-black text-slate-500">
                Sin partidos programados.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 xl:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Alertas útiles</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <AdminAlert title="Equipos sin plantel" value={teamsWithoutRoster.length} href="/admin/torneos" />
            <AdminAlert title="Equipos sin escudo" value={teamsWithoutBadge.length} href="/admin/multimedia" />
            <AdminAlert title="Jugadores sin foto" value={playersWithoutPhoto.length} href="/admin/jugadores" />
          </div>
        </Card>
      </section>
    </AdminShell>
  );
}

function AdminAlert({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 hover:bg-slate-100">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</p>
    </Link>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}
