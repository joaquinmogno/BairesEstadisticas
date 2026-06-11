"use client";

import Link from "next/link";
import { CalendarDays, Trophy, ListChecks, ArrowRight } from "lucide-react";
import { AdminShell, Card, PrimaryButton } from "../_components/admin-shell";
import { useAdmin } from "../_lib/admin-store";

export default function AdminCalendarPage() {
  const { matchdays, matches } = useAdmin();
  const upcomingMatchdays = matchdays
    .map((matchday) => ({
      ...matchday,
      matchCount: matches.filter((match) => match.matchdayId === matchday.id).length,
    }))
    .slice(0, 5);

  return (
    <AdminShell title="Calendario" subtitle="Vista operativa">
      <section className="rounded-3xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Calendario</p>
            <h2 className="mt-1.5 text-[1.65rem] font-black leading-tight text-slate-950">Resumen del fixture por fechas</h2>
            <p className="mt-1.5 max-w-2xl text-sm font-bold text-slate-500">
              El calendario se maneja dentro de cada torneo, pero acá tenés una entrada limpia para revisar el estado general.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200">
            <CalendarDays size={18} className="text-slate-400" />
            {matchdays.length} fechas
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-3.5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Fechas recientes</p>
          <div className="mt-3 grid gap-2">
            {upcomingMatchdays.length ? upcomingMatchdays.map((matchday) => (
              <div key={matchday.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{matchday.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{matchday.matchCount} partidos cargados</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                    {matchday.matchCount}
                  </span>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-black text-slate-500">
                No hay fechas cargadas todavía.
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
            <Link href="/admin/partidos" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <ListChecks size={16} className="text-slate-400" />
                Ver partidos
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
