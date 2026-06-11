"use client";

import Link from "next/link";
import { Settings2, Shield, Trophy, Image } from "lucide-react";
import { AdminShell, Card } from "../_components/admin-shell";

const shortcuts = [
  { href: "/admin", label: "Dashboard", helper: "Resumen general y accesos rápidos", icon: Trophy },
  { href: "/admin/torneos", label: "Torneos", helper: "Estructura, equipos, fechas y partidos", icon: Shield },
  { href: "/admin/multimedia", label: "Multimedia", helper: "Subir y limpiar imágenes", icon: Image },
];

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Configuración" subtitle="Panel simple">
      <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Configuración</p>
            <h2 className="mt-1.5 text-2xl font-black leading-tight text-slate-950 sm:text-[1.65rem]">Ajustes del administrador</h2>
            <p className="mt-1.5 max-w-2xl text-sm font-bold leading-relaxed text-slate-500">
              Este panel queda deliberadamente simple: los ajustes importantes se resuelven desde el dashboard y los torneos.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2">
            <Settings2 size={18} className="text-slate-400" />
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Sin complejidad extra</span>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Accesos</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition hover:bg-slate-100 active:scale-[0.99]">
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
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Estado</p>
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-black text-slate-950">Sin opciones innecesarias</p>
              <p className="mt-1 text-sm font-bold text-slate-500">La idea es que el admin no haga perder tiempo.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-black text-slate-950">Flujos directos</p>
              <p className="mt-1 text-sm font-bold text-slate-500">Cada área abre lo justo para editar o cargar contenido.</p>
            </div>
            <Link href="/admin" className="block rounded-2xl bg-emerald-700 px-4 py-3 text-center text-sm font-black text-white shadow-sm transition hover:brightness-95">
              Volver al dashboard
            </Link>
            <Link href="/admin/torneos" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
              Ir a torneos
            </Link>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
