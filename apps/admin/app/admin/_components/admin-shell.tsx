"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  ListChecks,
  Menu,
  Search,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useAdmin } from "../_lib/admin-store";

const navItems = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/torneos", label: "Torneos", icon: Trophy },
  { href: "/admin/partidos", label: "Partidos", icon: ListChecks },
];

export function AdminShell({
  title,
  subtitle,
  action,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const {
    tournaments,
    teams,
    players,
    matches,
    getTournament,
    getTeam,
    isReadOnly,
    readOnlyReason,
  } = useAdmin();

  const searchItems = useMemo(() => {
    return [
      ...tournaments.map((tournament) => ({
        href: `/admin/torneos/${tournament.id}`,
        label: tournament.name,
        helper: `Torneo · ${tournament.category}`,
      })),
      ...teams.map((team) => ({
        href: `/admin/torneos/${team.tournamentId}?tab=equipos`,
        label: team.name,
        helper: `Equipo · ${getTournament(team.tournamentId)?.name ?? "Sin torneo"}`,
      })),
      ...players.map((player) => {
        const team = getTeam(player.teamId);
        return {
          href: team ? `/admin/torneos/${team.tournamentId}?tab=equipos` : `/admin/torneos`,
          label: `${player.name} ${player.lastName ?? ""}`.trim(),
          helper: `Jugador · ${team?.name ?? "Sin equipo"}`,
        };
      }),
      ...matches.slice(0, 120).map((match) => ({
        href: `/admin/torneos/${match.tournamentId}?tab=partidos&match=${match.id}`,
        label: `${getTeam(match.homeTeamId)?.name ?? "Local"} vs ${getTeam(match.awayTeamId)?.name ?? "Visitante"}`,
        helper: `Partido · ${getTournament(match.tournamentId)?.name ?? "Torneo"} · ${formatDateDisplay(match.date)} ${match.time}`,
      })),
    ];
  }, [getTeam, getTournament, matches, players, teams, tournaments]);
  const showMobileDock = pathname === "/admin" || pathname === "/admin/torneos" || pathname === "/admin/partidos";
  const mobileLinks = [
    { href: "/admin", label: "Inicio", icon: LayoutDashboard, active: pathname === "/admin" },
    { href: "/admin/torneos", label: "Torneos", icon: Trophy, active: pathname.startsWith("/admin/torneos") },
    { href: "/admin/partidos", label: "Partidos", icon: ListChecks, active: pathname.startsWith("/admin/partidos") },
  ];

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
    router.push("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <AdminSidebar />
        </aside>

        {open ? (
          <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="h-full w-[min(320px,88vw)] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex justify-end px-4 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200">
                  <X size={18} />
                </button>
              </div>
              <AdminSidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        ) : null}

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 lg:hidden">
                <Menu size={18} />
              </button>
              {onBack ? (
                <button type="button" onClick={onBack} className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 sm:flex">
                  <ChevronLeft size={18} />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                {subtitle ? <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{subtitle}</p> : null}
                <h1 className="truncate text-xl font-black sm:text-2xl">{title}</h1>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden h-10 min-w-[220px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm font-black text-slate-500 md:flex"
              >
                <Search size={16} />
                Buscar torneo, equipo, jugador o partido
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden"
              >
                <Search size={16} />
              </button>
              {action}
              <button type="button" onClick={logout} className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 sm:flex">
                <LogOut size={16} />
                Salir
              </button>
            </div>
          </header>
          <div className={clsx("mx-auto max-w-7xl px-4 py-5 sm:px-6", showMobileDock && "pb-24")}>
            {isReadOnly ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
                {readOnlyReason}
              </div>
            ) : null}
            <div className={clsx(isReadOnly && "pointer-events-none select-none opacity-60")}>
              {children}
            </div>
          </div>
        </section>
      </div>
      {showMobileDock ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2">
            {mobileLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition",
                    item.active ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      {searchOpen ? <AdminSearchDialog items={searchItems} onClose={() => setSearchOpen(false)} /> : null}
    </main>
  );
}

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link href="/admin" onClick={onNavigate} className="mb-6 flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Trophy size={22} strokeWidth={2.7} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-black">Baires Torneos</span>
          <span className="block text-xs font-bold text-slate-500">Portal administrativo</span>
        </span>
      </Link>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-black transition",
                active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-lg border border-emerald-100 bg-emerald-50 p-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Modo actual</p>
        <p className="mt-1 text-sm font-bold text-emerald-950">Administrador unico con acceso total y centro operativo por torneo.</p>
      </div>
    </div>
  );
}

function AdminSearchDialog({
  items,
  onClose,
}: {
  items: { href: string; label: string; helper: string }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items.slice(0, 12);
    return items.filter((item) => `${item.label} ${item.helper}`.toLowerCase().includes(value)).slice(0, 16);
  }, [items, query]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/40 px-4 py-8" onClick={onClose}>
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar torneo, equipo, jugador o partido"
            className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-2">
          {matches.length ? matches.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} onClick={onClose} className="block rounded-xl px-3 py-3 hover:bg-slate-50">
              <p className="truncate text-sm font-black text-slate-950">{item.label}</p>
              <p className="truncate text-xs font-bold text-slate-500">{item.helper}</p>
            </Link>
          )) : (
            <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No encontramos resultados para esa busqueda.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-600 text-[11px] font-black text-white shadow-sm">
      {label}
    </span>
  );
}

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  return (
    <div className={clsx(
      "rounded-lg px-3 py-2 text-sm font-black",
      tone === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700",
    )}>
      {message}
    </div>
  );
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "error" }) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-9 items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-amber-100 text-amber-900",
        tone === "error" && "bg-red-100 text-red-700",
      )}
    >
      {label}
    </span>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "min-h-12 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50",
        props.className,
      )}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50",
        props.className,
      )}
    />
  );
}

export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section {...props} className={clsx("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 sm:text-sm",
        props.className,
      )}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-bold outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 sm:text-sm",
        props.className,
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-700",
        props.className,
      )}
    />
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx(
            "h-10 shrink-0 rounded-md px-4 text-sm font-black transition-colors",
            active === tab.key ? "bg-emerald-700 text-white" : "text-slate-500 hover:bg-slate-50",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {helper ? <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{helper}</p> : null}
    </Card>
  );
}

export function EntityHeader({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">{icon}</span>
      <div className="min-w-0">
        <h2 className="truncate text-base font-black">{title}</h2>
        <p className="text-sm font-bold text-slate-500">{text}</p>
      </div>
      <UsersRound className="ml-auto hidden text-slate-300 sm:block" size={22} />
    </div>
  );
}

export function ActionEmptyState({
  title,
  text,
  actionLabel,
  onAction,
  tone = "neutral",
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "warning";
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border px-5 py-6 shadow-sm",
        tone === "neutral" ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={clsx("flex h-11 w-11 items-center justify-center rounded-2xl", tone === "neutral" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800")}>
          <AlertTriangle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{text}</p>
          {actionLabel && onAction ? (
            <button type="button" onClick={onAction} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white">
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function StepGuide({
  steps,
}: {
  steps: Array<{ label: string; helper: string; done: boolean }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Onboarding guiado</p>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.label} className={clsx("rounded-xl border px-3 py-3", step.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50")}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Paso {index + 1}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{step.label}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{step.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function formatDateDisplay(date?: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function todayInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
