"use client";

import Link from "next/link";
import { UsersRound, Trophy, Shield, Image } from "lucide-react";
import { AdminShell, Card, PrimaryButton } from "../_components/admin-shell";

const links = [
  { href: "/admin/torneos", label: "Torneos", helper: "Abrí un torneo para cargar planteles", icon: Trophy },
  { href: "/admin/torneos", label: "Equipos", helper: "Los jugadores viven dentro de cada torneo", icon: Shield },
  { href: "/admin/multimedia", label: "Fotos", helper: "Subí imágenes de jugadores y equipos", icon: Image },
];

export default function AdminPlayersPage() {
  return (
    <AdminShell title="Jugadores" subtitle="Acceso directo">
      <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Jugadores</p>
            <h2 className="mt-1.5 text-2xl font-black leading-tight text-slate-950 sm:text-[1.65rem]">Gestión centrada en el torneo</h2>
            <p className="mt-1.5 max-w-2xl text-sm font-bold leading-relaxed text-slate-500">
              Esta pantalla queda como acceso simple: para editar jugadores, entrá a un torneo y cargá el plantel desde ahí.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200">
            <UsersRound size={18} className="text-slate-400" />
            1 flujo claro
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Dónde cargarlos</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-slate-100 active:scale-[0.99]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">{item.label}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{item.helper}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Atajo</p>
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-black text-slate-950">Abrí un torneo para seguir</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Desde ahí vas a poder ver equipos, fechas, partidos y planteles en el mismo lugar.</p>
          </div>
          <Link href="/admin/torneos" className="mt-3 block">
            <PrimaryButton className="w-full">Ir a torneos</PrimaryButton>
          </Link>
          <Link href="/admin" className="mt-2 block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            Volver al dashboard
          </Link>
        </Card>
      </div>
    </AdminShell>
  );
}
