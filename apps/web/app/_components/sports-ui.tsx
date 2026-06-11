"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Bell,
  BellRing,
  CalendarDays,
  ChevronRight,
  Copy,
  Heart,
  LayoutDashboard,
  MessageCircle,
  Menu,
  Moon,
  Search,
  Share2,
  Shield,
  Star,
  Sun,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  dateLabel,
  fullDateLabel,
  getTeam,
  getTeamMatches,
  getTournament,
  goalDifference,
  statusLabel,
  statusTone,
  teamRecord,
  useBairesData,
  type Match,
  type Player,
  type Standing,
  type Team,
} from "@/lib/baires-data";

export function AppShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data, loading, error } = useBairesData();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(stored ? stored === "dark" : prefersDark);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, mounted]);

  return (
    <div className={clsx(
      "min-h-screen text-slate-950 transition-colors dark:text-white",
      dark ? "bg-[#090d12]" : "bg-[radial-gradient(circle_at_top,#d9f99d_0%,#f4f6f8_22%,#eef2f6_48%,#f4f6f8_100%)]",
    )}>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#111820]/90">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-[138px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/90 px-2 shadow-sm dark:bg-black sm:w-[150px]">
              <Image src="/baires-torneos-logo.png" alt="Baires Torneos" width={150} height={60} priority className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black tracking-tight">Baires Torneos</span>
            </span>
          </Link>

          {pathname !== "/" ? (
            <div className="ml-auto hidden h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 md:flex">
              <Search size={17} />
              <span className="truncate">Buscar equipo, jugador, torneo o partido</span>
            </div>
          ) : null}

          <IconButton label={menuOpen ? "Cerrar menu" : "Abrir menu"} onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </IconButton>
        </div>
      </header>
      {loading ? (
        <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          Sincronizando partidos, tablas y estadisticas en vivo
        </div>
      ) : null}
      {error ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-black text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
          No pudimos actualizar todos los datos ahora mismo. Si estás con señal lenta, la plataforma se va a reintentar sola.
        </div>
      ) : null}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35" onClick={() => setMenuOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-[min(360px,88vw)] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#111820]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">Menu</p>
                <h2 className="text-xl font-black">Torneos</h2>
              </div>
              <IconButton label="Cerrar menu" onClick={() => setMenuOpen(false)}>
                <X size={18} />
              </IconButton>
            </div>

            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              <span>{mounted && dark ? "Modo claro" : "Modo oscuro"}</span>
              {mounted && dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="mt-5 space-y-2">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <LayoutDashboard size={18} />
                Inicio
              </Link>
              {data.tournaments.length ? data.tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/torneos/${tournament.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/20 dark:text-emerald-300">
                    {tournament.logo ? (
                      <Image src={tournament.logo} alt={tournament.name} width={44} height={44} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <Image src="/baires-torneos-logo.png" alt="Baires Torneos" width={44} height={44} className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{tournament.name}</span>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">{tournament.category}</span>
                  </span>
                </Link>
              )) : (
                <Panel className="p-4">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Todavia no hay torneos creados.</p>
                </Panel>
              )}
            </div>
          </aside>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

export function PageWrap({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
      <div className="min-w-0 space-y-5">{children}</div>
      {aside ? <aside className="hidden min-w-0 space-y-5 lg:block">{aside}</aside> : null}
    </main>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111820]", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <h2 className="truncate text-sm font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{title}</h2>
      {action}
    </div>
  );
}

export function TeamBadge({ team, size = "md" }: { team?: Team; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  };
  return (
    <span
      className={clsx("flex shrink-0 items-center justify-center rounded-full font-black text-white shadow-sm ring-1 ring-black/5", sizes[size])}
      style={{ backgroundColor: team?.primary ?? "#0f172a" }}
    >
      {team?.badgeUrl ? (
        <Image src={team.badgeUrl} alt={team.name} width={80} height={80} unoptimized className="h-full w-full rounded-full object-cover" />
      ) : (
        team?.badge ?? "BT"
      )}
    </span>
  );
}

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  useBairesData();
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const tournament = getTournament(match.tournamentId);
  const score = match.status === "scheduled" || match.status === "suspended" ? match.time : `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`;

  return (
    <Link href={`/partidos/${match.id}`} className="group block border-t border-slate-100 px-4 py-3 transition first:border-t-0 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{tournament?.name}</span>
        <span className={clsx("shrink-0 rounded-full px-2 py-1 text-[11px] font-black", statusTone(match.status))}>{statusLabel(match.status)}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)_20px] items-center gap-2">
        <TeamLine team={home} reverse />
        <div className={clsx("rounded-lg bg-slate-950 px-2 py-2 text-center font-black tabular-nums text-white dark:bg-white dark:text-slate-950", compact ? "text-sm" : "text-lg")}>{score}</div>
        <TeamLine team={away} />
        <ChevronRight className="text-slate-300 transition group-hover:translate-x-0.5 dark:text-slate-600" size={18} />
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <CalendarDays size={14} />
        <span>{dateLabel(match.date)} · {match.court}</span>
      </div>
    </Link>
  );
}

function TeamLine({ team, reverse = false }: { team?: Team; reverse?: boolean }) {
  return (
    <div className={clsx("flex min-w-0 items-center gap-2", reverse ? "justify-end text-right" : "justify-start")}>
      {reverse ? <span className="truncate text-sm font-black">{team?.name}</span> : <TeamBadge team={team} size="sm" />}
      {reverse ? <TeamBadge team={team} size="sm" /> : <span className="truncate text-sm font-black">{team?.name}</span>}
    </div>
  );
}

export function StandingTable({ rows, highlightTeamIds = [], showZones = true }: { rows: Standing[]; highlightTeamIds?: string[]; showZones?: boolean }) {
  useBairesData();
  const router = useRouter();
  const zones = standingZones(rows.length);

  if (!rows.length) {
    return <EmptyStateCard title="Tabla sin datos" message="Todavia no hay partidos publicados para armar posiciones." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] table-fixed text-xs sm:min-w-[760px] sm:text-sm">
        <colgroup>
          <col className="w-[44px]" />
          <col className="w-[220px]" />
          <col className="w-[64px]" />
          <col className="w-[64px]" />
          <col className="w-[64px]" />
          <col className="w-[72px]" />
          <col className="w-[48px]" />
          <col className="w-[48px]" />
          <col className="w-[48px]" />
          <col className="w-[64px]" />
        </colgroup>
        <thead className="border-y border-slate-100 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:border-white/10 sm:text-[11px]">
          <tr>
            <th className="sticky left-0 z-20 bg-white px-2 py-2 text-left dark:bg-[#111820] sm:px-3">#</th>
            <th className="sticky left-[44px] z-20 bg-white px-1.5 py-2 text-left dark:bg-[#111820] sm:px-2">Equipo</th>
            <th className="sticky left-[264px] z-20 bg-white px-2 py-2 text-center dark:bg-[#111820] sm:px-3">PTS</th>
            <th className="sticky left-[328px] z-20 bg-white px-1.5 py-2 text-center dark:bg-[#111820] sm:px-2">PJ</th>
            <th className="px-1.5 py-2 text-center sm:px-2">+/-</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell sm:px-2">GOL</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell sm:px-2">G</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell sm:px-2">E</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell sm:px-2">P</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell sm:px-2">Ult.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const team = getTeam(row.teamId);
            const active = highlightTeamIds.includes(row.teamId);
            const zone = standingZoneForRow(row.position, zones);
            return (
              <tr
                key={row.teamId}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/equipos/${row.teamId}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/equipos/${row.teamId}`);
                  }
                }}
                className={clsx("cursor-pointer border-b font-bold transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5", showZones && zone.rowTone, active && "ring-1 ring-inset ring-emerald-400/60")}
              >
                <td className="sticky left-0 z-10 bg-inherit px-2 py-2 font-black sm:px-3">{row.position}</td>
                <td className="sticky left-[44px] z-10 bg-inherit px-1.5 py-2 sm:px-2">
                  <Link href={`/equipos/${row.teamId}`} className="flex items-center gap-1.5 sm:gap-2" onClick={(event) => event.stopPropagation()}>
                    <TeamBadge team={team} size="sm" />
                    <span className="max-w-[150px] truncate sm:max-w-none sm:whitespace-nowrap">{team?.name}</span>
                  </Link>
                </td>
                <td className="sticky left-[264px] z-10 bg-inherit px-2 py-2 text-center text-base font-black tabular-nums sm:px-3 sm:text-lg">{row.pts}</td>
                <Cell stickyLeft="left-[328px]">{row.pj}</Cell>
                <Cell>{goalDifference(row)}</Cell>
                <SecondaryCell>{row.gf}:{row.gc}</SecondaryCell>
                <SecondaryCell>{row.pg}</SecondaryCell>
                <SecondaryCell>{row.pe}</SecondaryCell>
                <SecondaryCell>{row.pp}</SecondaryCell>
                <td className="hidden px-1.5 py-2 sm:table-cell sm:px-2"><FormDots form={row.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ children, stickyLeft }: { children: ReactNode; stickyLeft?: string }) {
  return <td className={clsx("px-1.5 py-2 text-center tabular-nums sm:px-2", stickyLeft ? `sticky z-10 bg-inherit ${stickyLeft}` : "")}>{children}</td>;
}

function SecondaryCell({ children }: { children: ReactNode }) {
  return <td className="hidden px-1.5 py-2 text-center tabular-nums sm:table-cell sm:px-2">{children}</td>;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-2 dark:border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx(
            "shrink-0 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.06em] transition",
            active === tab.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StatGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-xl font-black tabular-nums">{item.value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function CompareBar({ label, left, right }: { label: string; left: number; right: number }) {
  const total = Math.max(left + right, 1);
  const leftWidth = `${Math.max((left / total) * 100, left ? 10 : 0)}%`;
  const rightWidth = `${Math.max((right / total) * 100, right ? 10 : 0)}%`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
        <span>{left}</span>
        <span>{label}</span>
        <span>{right}</span>
      </div>
      <div className="grid h-2 grid-cols-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className="flex justify-end">
          <span className="block h-full rounded-l-full bg-emerald-500" style={{ width: leftWidth }} />
        </div>
        <div>
          <span className="block h-full rounded-r-full bg-blue-500" style={{ width: rightWidth }} />
        </div>
      </div>
    </div>
  );
}

export function EmptyStateCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center dark:border-white/10 dark:bg-white/5">
      <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
      <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function LoadingCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm dark:border-white/10 dark:bg-[#111820]">
      <div className="h-2 w-16 rounded-full bg-slate-200 dark:bg-white/10" />
      <p className="mt-4 text-lg font-black text-slate-950 dark:text-white">{title}</p>
      <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{message}</p>
      <div className="mt-4 grid gap-2">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function PlayerCard({ player }: { player: Player }) {
  useBairesData();
  const team = getTeam(player.teamId);
  return (
    <Link href={`/jugadores/${player.id}`} className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#111820]">
      <div className="flex items-center gap-3">
        <Image src={player.photo} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="truncate font-black">{player.name}</p>
          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">#{player.number} · {player.position}</p>
          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{team?.name} · {player.age} años</p>
        </div>
      </div>
    </Link>
  );
}

export function PlayerRow({ player, metric }: { player: Player; metric: "goals" | "assists" }) {
  useBairesData();
  const team = getTeam(player.teamId);
  return (
    <Link href={`/jugadores/${player.id}`} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
      <Image src={player.photo} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{player.name}</p>
        <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{team?.name}</p>
      </div>
      <span className="text-lg font-black tabular-nums">{metric === "goals" ? player.goals : player.assists}</span>
    </Link>
  );
}

export function ShareFavoriteActions({ favoriteKey, shareText }: { favoriteKey: string; shareText?: string }) {
  const [fav, setFav] = useState(false);
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    setFav(localStorage.getItem(`fav:${favoriteKey}`) === "1");
    setNotify(localStorage.getItem(`notify:${favoriteKey}`) === "1");
  }, [favoriteKey]);

  function toggle() {
    const next = !fav;
    setFav(next);
    localStorage.setItem(`fav:${favoriteKey}`, next ? "1" : "0");
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: document.title, text: shareText, url: window.location.href }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(shareText ? `${shareText}\n${window.location.href}` : window.location.href);
  }

  function shareWhatsApp() {
    openWhatsAppShare(shareText);
  }

  function toggleNotifications() {
    const next = !notify;
    setNotify(next);
    localStorage.setItem(`notify:${favoriteKey}`, next ? "1" : "0");
  }

  return (
    <div className="flex gap-2">
      <IconButton label="Favorito" onClick={toggle}>{fav ? <Star size={18} fill="currentColor" /> : <Heart size={18} />}</IconButton>
      <IconButton label="Notificaciones" onClick={toggleNotifications}>{notify ? <BellRing size={18} /> : <Bell size={18} />}</IconButton>
      {shareText ? <IconButton label="Compartir por WhatsApp" onClick={shareWhatsApp}><MessageCircle size={18} /></IconButton> : null}
      <IconButton label="Compartir" onClick={share}><Share2 size={18} /></IconButton>
    </div>
  );
}

function WhatsAppShareButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => openWhatsAppShare(text)}
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 text-xs font-black text-white transition hover:bg-white/15"
    >
      <MessageCircle size={16} />
      WhatsApp
    </button>
  );
}

function openWhatsAppShare(text?: string) {
  const message = text ? `${text}\n${window.location.href}` : window.location.href;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

export function FollowedItemsPanel() {
  const { data } = useBairesData();
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);

  useEffect(() => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("fav:") && localStorage.getItem(key) === "1");
    setFavoriteKeys(keys);
  }, [data.matches.length, data.players.length, data.teams.length, data.tournaments.length]);

  const items = useMemo(() => {
    return favoriteKeys.flatMap((key) => {
      const entity = key.replace(/^fav:/, "");
      const [type, id] = entity.split(":");
      if (!type || !id) return [];
      if (type === "team") {
        const team = data.teams.find((item) => item.id === id);
        const teamMatches = team ? getTeamMatches(team.id) : [];
        const next = teamMatches.find((match) => match.status === "scheduled" || match.status === "live");
        const last = teamMatches.find((match) => match.status === "finished");
        const helper = next
          ? `Próximo: ${dateLabel(next.date)} ${next.time}`
          : last ? `Último: ${last.homeScore ?? 0}-${last.awayScore ?? 0}` : "Equipo seguido";
        return team ? [{ href: `/equipos/${team.id}`, label: team.name, helper }] : [];
      }
      if (type === "player") {
        const player = data.players.find((item) => item.id === id);
        return player ? [{ href: `/jugadores/${player.id}`, label: player.name, helper: "Jugador seguido" }] : [];
      }
      if (type === "tournament") {
        const tournament = data.tournaments.find((item) => item.id === id);
        return tournament ? [{ href: `/torneos/${tournament.id}`, label: tournament.name, helper: "Torneo seguido" }] : [];
      }
      if (type === "match") {
        const match = data.matches.find((item) => item.id === id);
        const home = match ? getTeam(match.homeTeamId) : undefined;
        const away = match ? getTeam(match.awayTeamId) : undefined;
        return match ? [{ href: `/partidos/${match.id}`, label: `${home?.name ?? "Local"} vs ${away?.name ?? "Visitante"}`, helper: "Partido seguido" }] : [];
      }
      return [];
    }).slice(0, 6);
  }, [data.matches, data.players, data.teams, data.tournaments, favoriteKeys]);

  return (
    <Panel>
      <SectionTitle title="Seguidos" />
      <div className="space-y-2 p-4">
        {items.length ? items.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} className="block rounded-xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10">
            <p className="truncate text-sm font-black">{item.label}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.helper}</p>
          </Link>
        )) : (
          <EmptyStateCard title="Todavia no seguis nada" message="Marcá torneos, equipos, jugadores o partidos como favoritos para encontrarlos rápido acá." />
        )}
      </div>
    </Panel>
  );
}

export function ContextLinksPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string; helper: string }>;
}) {
  return (
    <Panel>
      <SectionTitle title={title} />
      <div className="space-y-2 p-4">
        {items.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
            <p className="truncate text-sm font-black">{item.label}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.helper}</p>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export function useRememberedTab<T extends string>(storageKey: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as T | null;
    if (stored) setValue(stored);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return [value, setValue] as const;
}

export function QuickAccess() {
  const { data } = useBairesData();
  const suggestions = useMemo(
    () => [
      data.teams[0] ? { href: `/equipos/${data.teams[0].id}`, label: data.teams[0].name, icon: <Shield size={18} /> } : { href: "/", label: "Equipos", icon: <Shield size={18} /> },
      data.players[0] ? { href: `/jugadores/${data.players[0].id}`, label: data.players[0].name, icon: <UserRound size={18} /> } : { href: "/", label: "Jugadores", icon: <UserRound size={18} /> },
      data.tournaments[0] ? { href: `/torneos/${data.tournaments[0].id}`, label: data.tournaments[0].name, icon: <Trophy size={18} /> } : { href: "/", label: "Torneos", icon: <Trophy size={18} /> },
      { href: "/admin", label: "Panel admin", icon: <LayoutDashboard size={18} /> },
    ],
    [data.players, data.teams, data.tournaments],
  );

  return (
    <Panel>
      <SectionTitle title="Accesos rápidos" />
      <div className="grid grid-cols-2 gap-2 p-4">
        {suggestions.map((item) => (
          <Link key={item.href} href={item.href} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-black transition hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10">
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export function TeamHero({ team }: { team: Team }) {
  useBairesData();
  const tournament = getTournament(team.tournamentId);
  const row = teamRecord(team.id);
  return (
    <Panel>
      <div className="p-5 text-center sm:p-6">
        <div className="flex justify-end">
          <ShareFavoriteActions favoriteKey={`team:${team.id}`} shareText={`Mirá el equipo ${team.name} en Baires Torneos.`} />
        </div>
        <div className="mt-1 flex flex-col items-center">
          <TeamBadge team={team} size="xl" />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-300">{team.category} · {tournament?.name}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{team.name}</h1>
          <div className="mt-5 grid w-full grid-cols-4 gap-2">
            <TeamMetric label="PTS" value={row.pts} />
            <TeamMetric label="PJ" value={row.pj} />
            <TeamMetric label="GF" value={row.gf} />
            <TeamMetric label="DG" value={goalDifference(row)} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TeamMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

type StandingZoneDescriptor = {
  label: string;
  from: number;
  to: number;
  rowTone: string;
  cardTone: string;
  badgeTone: string;
};

function standingZones(rowCount: number): StandingZoneDescriptor[] {
  if (rowCount >= 12) {
    return [
      { label: "Zona de clasificacion", from: 1, to: 4, rowTone: "bg-emerald-50/70 dark:bg-emerald-500/10", cardTone: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-500/10", badgeTone: "bg-emerald-600 text-white" },
      { label: "Zona de repechaje", from: 5, to: 6, rowTone: "bg-sky-50/70 dark:bg-sky-500/10", cardTone: "border-sky-200 bg-sky-50/80 dark:border-sky-400/20 dark:bg-sky-500/10", badgeTone: "bg-sky-600 text-white" },
      { label: "Zona de descenso", from: rowCount - 1, to: rowCount, rowTone: "bg-rose-50/70 dark:bg-rose-500/10", cardTone: "border-rose-200 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-500/10", badgeTone: "bg-rose-600 text-white" },
    ];
  }

  if (rowCount >= 8) {
    return [
      { label: "Zona de clasificacion", from: 1, to: 2, rowTone: "bg-emerald-50/70 dark:bg-emerald-500/10", cardTone: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-500/10", badgeTone: "bg-emerald-600 text-white" },
      { label: "Zona de repechaje", from: 3, to: 4, rowTone: "bg-sky-50/70 dark:bg-sky-500/10", cardTone: "border-sky-200 bg-sky-50/80 dark:border-sky-400/20 dark:bg-sky-500/10", badgeTone: "bg-sky-600 text-white" },
      { label: "Zona de descenso", from: rowCount, to: rowCount, rowTone: "bg-rose-50/70 dark:bg-rose-500/10", cardTone: "border-rose-200 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-500/10", badgeTone: "bg-rose-600 text-white" },
    ];
  }

  if (rowCount >= 5) {
    return [
      { label: "Zona de clasificacion", from: 1, to: 2, rowTone: "bg-emerald-50/70 dark:bg-emerald-500/10", cardTone: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-500/10", badgeTone: "bg-emerald-600 text-white" },
      { label: "Zona baja", from: rowCount, to: rowCount, rowTone: "bg-rose-50/70 dark:bg-rose-500/10", cardTone: "border-rose-200 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-500/10", badgeTone: "bg-rose-600 text-white" },
    ];
  }

  return [
    { label: "Lider", from: 1, to: 1, rowTone: "bg-emerald-50/70 dark:bg-emerald-500/10", cardTone: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-500/10", badgeTone: "bg-emerald-600 text-white" },
  ];
}

function standingZoneForRow(position: number, zones: StandingZoneDescriptor[]) {
  return zones.find((zone) => position >= zone.from && position <= zone.to) ?? {
    label: "Mitad de tabla",
    rowTone: "border-slate-100 dark:border-white/10",
    cardTone: "border-slate-200 bg-white dark:border-white/10 dark:bg-[#111820]",
    badgeTone: "bg-slate-900 text-white dark:bg-white dark:text-slate-950",
  };
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="flex min-w-0 items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {item.href ? <Link href={item.href} className="truncate hover:text-slate-950 dark:hover:text-white">{item.label}</Link> : <span className="truncate">{item.label}</span>}
          {index < items.length - 1 ? <ChevronRight size={14} /> : null}
        </span>
      ))}
    </div>
  );
}

export function MatchHeader({ match, tournament }: { match: Match; tournament?: { name: string; logo?: string } }) {
  useBairesData();
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  return (
    <Panel className="overflow-hidden">
      <div className={clsx("p-3 text-white lg:p-5 dark:bg-black", match.status === "live" ? "bg-[radial-gradient(circle_at_top,#064e3b_0%,#020617_62%)] ring-2 ring-emerald-400/40" : "bg-slate-950")}>
        <div className="lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/80">
              {tournament?.logo ? (
                <Image src={tournament.logo} alt={tournament.name} width={18} height={18} unoptimized className="h-[18px] w-[18px] rounded-full object-cover" />
              ) : (
                <Trophy size={14} />
              )}
              <span className="truncate">{tournament?.name ?? "Liga"}</span>
            </span>
            <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]", statusTone(match.status))}>
              {statusLabel(match.status)}
            </span>
          </div>
          {match.status === "live" ? <div className="mt-2 rounded-full bg-emerald-400 px-3 py-1 text-center text-[11px] font-black uppercase tracking-[0.18em] text-emerald-950">En juego ahora</div> : null}
          <div className="mt-2 flex justify-end">
            <WhatsAppShareButton text={`Mirá ${home?.name ?? "Local"} vs ${away?.name ?? "Visitante"} en Baires Torneos.`} />
          </div>

          <div className="mt-3 rounded-[24px] border border-white/10 bg-black/30 px-3 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_78px_minmax(0,1fr)] items-center gap-2 text-center">
              <Link href={`/equipos/${home?.id}`} className="min-w-0 justify-self-center">
                <TeamBadge team={home} size="md" />
                <p className="mt-2 max-w-[92px] whitespace-normal break-words text-center text-[13px] font-black leading-tight">{home?.name}</p>
              </Link>
              <div className="flex min-h-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white px-2 py-2 text-center text-2xl font-black leading-none tabular-nums text-slate-950">
                {match.status === "scheduled" ? match.time : `${match.homeScore ?? 0}-${match.awayScore ?? 0}`}
              </div>
              <Link href={`/equipos/${away?.id}`} className="min-w-0 justify-self-center">
                <TeamBadge team={away} size="md" />
                <p className="mt-2 max-w-[92px] whitespace-normal break-words text-center text-[13px] font-black leading-tight">{away?.name}</p>
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] font-bold text-white/70">
              <span className="shrink-0">{fullDateLabel(match.date)}</span>
              <span className="shrink-0">•</span>
              <span className="shrink-0">{match.time}</span>
              <span className="shrink-0">•</span>
              <span className="min-w-0 truncate">{match.court}</span>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div className="h-px bg-white/10" />
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{statusLabel(match.status)}</span>
              <div className="h-px bg-white/10" />
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className={clsx("rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]", statusTone(match.status))}>{statusLabel(match.status)}</span>
          <ShareFavoriteActions favoriteKey={`match:${match.id}`} shareText={`Mirá ${home?.name ?? "Local"} vs ${away?.name ?? "Visitante"} en Baires Torneos.`} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-3 text-center">
          <Link href={`/equipos/${home?.id}`} className="min-w-0 justify-self-center">
            <TeamBadge team={home} size="lg" />
            <p className="mt-2 max-w-[120px] whitespace-normal break-words text-center text-sm font-black leading-tight sm:text-lg">{home?.name}</p>
          </Link>
          <div className="flex min-h-[54px] items-center justify-center rounded-lg bg-white px-2 py-3 text-center text-2xl font-black leading-none tabular-nums text-slate-950">
            {match.status === "scheduled" ? match.time : `${match.homeScore ?? 0}-${match.awayScore ?? 0}`}
          </div>
          <Link href={`/equipos/${away?.id}`} className="min-w-0 justify-self-center">
            <TeamBadge team={away} size="lg" />
            <p className="mt-2 max-w-[120px] whitespace-normal break-words text-center text-sm font-black leading-tight sm:text-lg">{away?.name}</p>
          </Link>
        </div>
        <h1 className="mt-4 text-center text-xl font-black tracking-tight text-white sm:text-2xl">
          {home?.name} vs {away?.name}
        </h1>
        <div className="mt-5 text-center text-sm font-bold text-slate-300">
          {fullDateLabel(match.date)} · {match.time} · {match.court}
        </div>
        </div>
      </div>
    </Panel>
  );
}

export function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm dark:border-white/10 dark:bg-[#111820]">
      <Search size={18} className="text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar en Baires Torneos"
        className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
      />
      <Copy size={16} className="text-slate-300" />
    </label>
  );
}

export function FormDots({ form }: { form: Array<"V" | "E" | "D"> }) {
  return (
    <div className="flex gap-1">
      {form.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white",
            item === "V" && "bg-emerald-500",
            item === "E" && "bg-slate-400",
            item === "D" && "bg-red-500",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Panel>
      <div className="p-8 text-center">
        <p className="text-lg font-black">{title}</p>
        <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </Panel>
  );
}
