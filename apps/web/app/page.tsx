"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Shield, Star, Trophy, UserRound } from "lucide-react";
import { AppShell, EmptyState, PageWrap, Panel, SearchBox, TeamBadge } from "@/app/_components/sports-ui";
import { dateLabel, getTeam, getTournament, matches, players, statusLabel, teams, tournaments, useBairesData, type Match } from "@/lib/baires-data";

const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

export default function Home() {
  const { loading, error } = useBairesData();
  const today = toInputDate(new Date());
  const yesterday = toInputDate(addDays(parseDate(today), -1));
  const tomorrow = toInputDate(addDays(parseDate(today), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [query, setQuery] = useState("");
  const liveMatches = matches.filter((match) => match.status === "live");
  const dayMatches = matches.filter((match) => match.date === selectedDate);
  const grouped = groupMatches(dayMatches);
  const searchResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return [
      ...teams
        .filter((team) => team.name.toLowerCase().includes(value))
        .map((team) => ({ type: "Equipo", label: team.name, href: `/equipos/${team.id}`, icon: <Shield size={16} /> })),
      ...players
        .filter((player) => player.name.toLowerCase().includes(value))
        .map((player) => ({ type: "Jugador", label: player.name, href: `/jugadores/${player.id}`, icon: <UserRound size={16} /> })),
      ...tournaments
        .filter((tournament) => tournament.name.toLowerCase().includes(value))
        .map((tournament) => ({ type: "Torneo", label: tournament.name, href: `/torneos/${tournament.id}`, icon: <Trophy size={16} /> })),
    ].slice(0, 8);
  }, [query]);

  if (loading) {
    return (
      <AppShell>
        <PageWrap>
          <Panel><div className="p-6 text-sm font-bold text-slate-500">Cargando datos reales...</div></Panel>
        </PageWrap>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageWrap>
          <Panel><div className="p-6 text-sm font-bold text-red-500">{error}</div></Panel>
        </PageWrap>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageWrap>
        <SearchBox value={query} onChange={setQuery} />

        {query ? (
          <Panel>
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {searchResults.length ? searchResults.map((result) => (
                <Link key={`${result.type}-${result.href}`} href={result.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">{result.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{result.label}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{result.type}</span>
                  </span>
                </Link>
              )) : (
                <div className="p-4">
                  <EmptyState title="Sin resultados" text="Proba con otro equipo, jugador o torneo." />
                </div>
              )}
            </div>
          </Panel>
        ) : null}

        <DateMatchHeader selectedDate={selectedDate} onChangeDate={setSelectedDate} today={today} yesterday={yesterday} tomorrow={tomorrow} />

        {liveMatches.length ? (
          <section className="overflow-hidden rounded-xl border border-emerald-500/40 bg-[#071a14] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-400/20 px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">En vivo ahora</p>
                <h2 className="mt-1 text-lg font-black">Partidos en juego</h2>
              </div>
              <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-950">{liveMatches.length}</span>
            </div>
            {liveMatches.map((match) => <ScoreRow key={match.id} match={match} highlight />)}
          </section>
        ) : null}

        {dayMatches.length ? (
          <div className="space-y-3">
            {Object.entries(grouped).map(([tournamentId, leagueMatches]) => (
              <LeagueMatches key={tournamentId} tournamentId={tournamentId} leagueMatches={leagueMatches} />
            ))}
          </div>
        ) : (
          <Panel>
            <div className="p-4">
              <EmptyState title="Sin partidos" text="Todavía no se publicaron partidos para esta fecha." />
              <Link href="/" className="mx-auto mt-3 flex min-h-10 w-fit items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white">Ver próximos partidos</Link>
            </div>
          </Panel>
        )}
      </PageWrap>
    </AppShell>
  );
}

function DateMatchHeader({ selectedDate, onChangeDate, today, yesterday, tomorrow }: { selectedDate: string; onChangeDate: (date: string) => void; today: string; yesterday: string; tomorrow: string }) {
  const [openCalendar, setOpenCalendar] = useState(false);
  const currentDate = parseDate(selectedDate);

  function move(days: number) {
    onChangeDate(toInputDate(addDays(currentDate, days)));
    setOpenCalendar(false);
  }

  return (
    <section className="relative overflow-visible rounded-lg border border-slate-800 bg-[#101920] shadow-sm">
      <div className="grid h-14 grid-cols-[52px_minmax(0,1fr)_52px] items-center bg-[#121d24] text-white sm:grid-cols-[60px_minmax(0,1fr)_60px]">
        <button type="button" onClick={() => move(-1)} className="flex h-full items-center justify-center transition hover:bg-white/5" aria-label="Dia anterior">
          <ChevronLeft size={24} strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={() => setOpenCalendar((value) => !value)}
          className="flex min-w-0 items-center justify-center gap-2 px-2 text-base font-black"
          aria-expanded={openCalendar}
        >
          <span className="truncate">{dateTitle(selectedDate, today, yesterday, tomorrow)}</span>
          {openCalendar ? <ChevronUp size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
        </button>
        <button type="button" onClick={() => move(1)} className="flex h-full items-center justify-center transition hover:bg-white/5" aria-label="Dia siguiente">
          <ChevronRight size={24} strokeWidth={3} />
        </button>
      </div>
      {openCalendar ? (
        <CalendarDropdown selectedDate={selectedDate} today={today} onSelect={(date) => { onChangeDate(date); setOpenCalendar(false); }} />
      ) : null}
    </section>
  );
}

function CalendarDropdown({ selectedDate, today, onSelect }: { selectedDate: string; today: string; onSelect: (date: string) => void }) {
  const selected = parseDate(selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const days = daysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const blanks = Array.from({ length: mondayOffset });

  return (
    <div className="absolute left-1/2 top-14 z-30 w-[min(390px,calc(100vw-32px))] -translate-x-1/2 border border-black/40 bg-[#101920] px-5 pb-5 pt-4 text-white shadow-2xl sm:px-6">
      <div className="mb-5 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center">
        <ChevronLeft className="justify-self-start" size={24} strokeWidth={3} />
        <p className="text-center text-sm font-black">{monthLabel(selected)}</p>
        <ChevronRight className="justify-self-end" size={24} strokeWidth={3} />
      </div>
      <div className="grid grid-cols-7 gap-y-3 text-center text-xs font-bold">
        {["lu", "ma", "mi", "ju", "vi", "sa", "do"].map((day) => <span key={day} className="text-slate-400">{day}</span>)}
        {blanks.map((_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const date = toInputDate(new Date(year, month, day));
          const selectedDay = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition ${selectedDay ? "bg-blue-500 text-white" : "text-white hover:bg-white/10"}`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onSelect(today)} className="mx-auto mt-5 block text-sm font-black text-blue-500">Hoy</button>
    </div>
  );
}

function LeagueMatches({ tournamentId, leagueMatches }: { tournamentId: string; leagueMatches: Match[] }) {
  const tournament = getTournament(tournamentId);
  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#101920] shadow-sm">
      <Link href={`/torneos/${tournamentId}`} className="flex items-center gap-3 bg-[#121d24] px-3 py-3 text-white transition hover:bg-[#17242d]">
        <Star size={22} className="shrink-0 text-blue-500" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
          {tournament?.logo ? (
            <Image src={tournament.logo} alt={tournament.name} width={40} height={40} unoptimized className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-black">BT</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black">{tournament?.name}</p>
          <p className="text-sm font-bold text-slate-400">Argentina</p>
        </div>
      </Link>
      {leagueMatches.map((match) => <ScoreRow key={match.id} match={match} />)}
      <Link href={`/torneos/${tournamentId}`} className="block border-t border-black/40 bg-[#121d24] px-4 py-3 text-center text-sm font-black text-blue-400 transition hover:bg-[#17242d]">
        Ir a seccion {tournament?.name}
      </Link>
    </section>
  );
}

function ScoreRow({ match, highlight = false }: { match: Match; highlight?: boolean }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const middle = match.status === "scheduled" || match.status === "suspended" ? match.time : `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;
  return (
    <Link href={`/partidos/${match.id}`} className={`block border-t border-black/40 px-2 py-3 text-white transition hover:bg-[#17242d] sm:px-3 ${highlight ? "bg-emerald-950/50" : "bg-[#101920]"}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_58px_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-right sm:gap-2">
          <span className="min-w-0 truncate text-sm font-bold sm:text-base">{home?.name}</span>
          <TeamBadge team={home} size="sm" />
        </div>
        <div className="text-center text-base font-black tabular-nums sm:text-lg">{middle}</div>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <TeamBadge team={away} size="sm" />
          <span className="min-w-0 truncate text-sm font-bold sm:text-base">{away?.name}</span>
        </div>
      </div>
      <div className={`mt-2 text-center text-xs font-bold ${match.status === "live" ? "text-emerald-300" : "text-slate-400"}`}>{dateLabel(match.date)} · {statusLabel(match.status)}</div>
    </Link>
  );
}

function groupMatches(dayMatches: Match[]) {
  return dayMatches.reduce<Record<string, Match[]>>((acc, match) => {
    acc[match.tournamentId] = acc[match.tournamentId] ?? [];
    acc[match.tournamentId].push(match);
    return acc;
  }, {});
}

function dateTitle(date: string, today: string, yesterday: string, tomorrow: string) {
  if (date === today) return "Partidos de hoy";
  if (date === yesterday) return "Partidos de ayer";
  if (date === tomorrow) return "Partidos de manana";
  return `Partidos del ${dateLabel(date)}`;
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00-03:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toInputDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: APP_TIME_ZONE, month: "long", year: "numeric" }).format(date);
}
