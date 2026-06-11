"use client";

import Link from "next/link";
import { Trophy, PlayCircle, ArrowRight } from "lucide-react";
import { AdminShell, Card, PrimaryButton } from "../_components/admin-shell";
import { useAdmin } from "../_lib/admin-store";

export default function AdminMatchesPage() {
  const { matches, getTeam } = useAdmin();
  const nextMatches = matches
    .filter((match) => match.status !== "final")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 6);

  return (
    <AdminShell title="Partidos" subtitle="Acceso directo">
      <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Partidos</p>
            <h2 className="mt-1.5 text-[1.65rem] font-black leading-tight text-slate-950">Entrada simple a la gestión de cruces</h2>
            <p className="mt-1.5 max-w-2xl text-sm font-bold text-slate-500">
              La carga y publicación real vive dentro de cada torneo. Acá te dejamos un acceso limpio para llegar rápido al flujo operativo.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200">
            <PlayCircle size={18} className="text-slate-400" />
            {nextMatches.length} activos
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-3.5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Próximos cruces</p>
          <div className="mt-3 grid gap-2">
            {nextMatches.length ? nextMatches.map((match) => (
              <Link key={match.id} href={`/admin/torneos/${match.tournamentId}?tab=partidos&match=${match.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 hover:bg-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{getTeam(match.homeTeamId)?.name ?? "Local"} vs {getTeam(match.awayTeamId)?.name ?? "Visitante"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{match.matchdayName ?? "Sin fecha"} · {match.date} · {match.time}</p>
                  </div>
                  <ArrowRight size={16} className="mt-0.5 text-slate-300" />
                </div>
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-black text-slate-500">
                No hay partidos activos para mostrar.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-3.5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Accesos</p>
          <div className="mt-3 space-y-2">
            <Link href="/admin/torneos" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <Trophy size={16} className="text-slate-400" />
                Ir a torneos
              </span>
              <ArrowRight size={16} className="text-slate-300" />
            </Link>
            <Link href="/admin" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
              <span>Volver al dashboard</span>
              <ArrowRight size={16} className="text-slate-300" />
            </Link>
          </div>
          <Link href="/admin/torneos" className="mt-3 block">
            <PrimaryButton className="w-full">Abrir torneo</PrimaryButton>
          </Link>
        </Card>
      </div>
    </AdminShell>
  );
}
