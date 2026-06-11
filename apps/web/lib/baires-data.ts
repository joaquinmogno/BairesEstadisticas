"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  MatchSummaryPayload,
  MatchdayWithMatchesPayload,
  SharedAdminMatchStatus,
  SharedPublicationStatus,
  SnapshotPayload,
  SnapshotTournamentRankings,
} from "../../../shared/contracts";

export type MatchStatus = "finished" | "live" | "suspended" | "scheduled";
export type EventType = "goal" | "assist" | "yellow" | "red" | "mvp";
export type PlayerPosition = "Arquero" | "Defensor" | "Mediocampista" | "Delantero";

export type Team = {
  id: string;
  clubId: string;
  name: string;
  shortName: string;
  badge: string;
  badgeUrl?: string;
  primary: string;
  category: string;
  tournamentId: string;
  photo: string;
  founded: string;
};

export type Player = {
  id: string;
  teamId: string;
  clubId: string;
  teamIds: string[];
  name: string;
  number: number;
  position: PlayerPosition;
  age: number;
  birthDate: string;
  photo: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvps: number;
};

export type Tournament = {
  id: string;
  name: string;
  category: string;
  status: "En juego" | "Programado" | "Finalizado";
  rounds: number;
  venue: string;
  logo?: string;
};

export type Club = {
  id: string;
  name: string;
  badgeUrl?: string;
  colors?: string;
  photoUrl?: string;
  category?: string;
};

export type MatchEvent = {
  id: string;
  playId?: string;
  minute: number;
  type: EventType;
  teamId: string;
  playerId: string;
  detail?: string;
};

export type Match = {
  id: string;
  tournamentId: string;
  matchdayId?: string;
  matchdayName?: string;
  date: string;
  time: string;
  court: string;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  publicationStatus?: SharedPublicationStatus;
  mvpPlayerId?: string;
  events: MatchEvent[];
  starters: Record<string, string[]>;
  substitutes: Record<string, string[]>;
};

export type Standing = {
  tournamentId: string;
  teamId: string;
  position: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  pts: number;
  form: Array<"V" | "E" | "D">;
  cleanSheets: number;
};

type PublicData = {
  tournaments: Tournament[];
  clubs: Club[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  standings: Standing[];
  rankings: SnapshotTournamentRankings[];
};

type StoreState = {
  data: PublicData;
  loading: boolean;
  error?: string;
};

const emptyData: PublicData = {
  tournaments: [],
  clubs: [],
  teams: [],
  players: [],
  matches: [],
  standings: [],
  rankings: [],
};

let storeState: StoreState = { data: emptyData, loading: true };
let currentRequest: Promise<void> | null = null;
const listeners = new Set<() => void>();
const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

function emit() {
  for (const listener of listeners) listener();
}

function setStoreState(next: StoreState) {
  storeState = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return storeState;
}

function apiUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
}

async function loadPublicData() {
  if (typeof window === "undefined") return;
  if (currentRequest) return currentRequest;

  currentRequest = fetch(`${apiUrl()}/snapshot`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar la API (${response.status})`);
      }
      return response.json() as Promise<SnapshotPayload>;
    })
    .then((payload) => {
      setStoreState({ data: mapSnapshotToPublicData(payload), loading: false });
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Error desconocido al cargar la API";
      setStoreState({ data: emptyData, loading: false, error: message });
    })
    .finally(() => {
      currentRequest = null;
    });

  return currentRequest;
}

export function useBairesData() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!snapshot.loading && (snapshot.data.tournaments.length || snapshot.error)) return;
    void loadPublicData();
  }, [snapshot.loading, snapshot.data.tournaments.length, snapshot.error]);

  return snapshot;
}

function dynamicArray<T>(loader: () => T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, prop) {
      const data = loader();
      const value = data[prop as keyof T[]];
      return typeof value === "function" ? value.bind(data) : value;
    },
    ownKeys() {
      return Reflect.ownKeys(loader());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Object.getOwnPropertyDescriptor(loader(), prop);
    },
  });
}

function mapSnapshotToPublicData(snapshot: SnapshotPayload): PublicData {
  const clubs = (snapshot.clubs ?? []).map<Club>((club) => ({
    id: club.id,
    name: club.name,
    badgeUrl: club.badgeUrl,
    colors: club.colors,
    photoUrl: club.photoUrl,
    category: club.category,
  }));

  const teams = snapshot.teams.map<Team>((team, index) => ({
    id: team.id,
    clubId: team.clubId,
    name: team.name,
    shortName: initials(team.name),
    badge: team.badge || initials(team.name),
    badgeUrl: team.badgeUrl,
    primary: extractPrimaryColor(team.colors, index),
    category: team.category ?? "Libre",
    tournamentId: team.tournamentId,
    photo: team.photoUrl ?? defaultTeamPhoto(index),
    founded: snapshot.tournaments.find((tournament) => tournament.id === team.tournamentId)?.season ?? "-",
  }));

  const matches = snapshot.matches
    .map<Match>((match) => ({
      id: match.id,
      tournamentId: match.tournamentId,
      matchdayId: match.matchdayId,
      matchdayName: match.matchdayName ?? snapshot.matchdays.find((matchday) => matchday.id === match.matchdayId)?.name,
      date: match.date,
      time: match.time,
      court: match.court || "Cancha 1",
      status: mapMatchStatus(match.status),
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore ?? scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId).home,
      awayScore: match.awayScore ?? scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId).away,
      publicationStatus: match.publicationStatus,
      mvpPlayerId: match.mvpPlayerId,
      events: match.events.map((event) => ({
        ...event,
        playId: event.playId,
        playerId: event.playerId ?? "",
      })),
      starters: match.starters ?? {},
      substitutes: match.substitutes ?? {},
    }))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const players = snapshot.players.map<Player>((player, index) => {
    const fullName = [player.name, player.lastName].filter(Boolean).join(" ").trim();
    const stats = statsForPlayer(player.id, matches);
    return {
      id: player.id,
      teamId: player.teamId,
      clubId: player.clubId,
      teamIds: player.teamIds?.length ? player.teamIds : [player.teamId],
      name: fullName || player.name,
      number: player.number ?? 0,
      position: normalizePosition(player.position),
      age: ageFromBirthDate(player.birthDate),
      birthDate: player.birthDate ?? "-",
      photo: player.photoUrl ?? defaultPlayerPhoto(index),
      appearances: stats.appearances,
      goals: stats.goals,
      assists: stats.assists,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
      mvps: stats.mvps,
    };
  });

  const standings = standingsFromMatches(teams, matches);
  const roundsByTournament = snapshot.matchdays.reduce<Record<string, number>>((acc, matchday) => {
    acc[matchday.tournamentId] = (acc[matchday.tournamentId] ?? 0) + 1;
    return acc;
  }, {});

  const tournaments = snapshot.tournaments.map<Tournament>((tournament) => ({
    id: tournament.id,
    name: tournament.name,
    logo: tournament.logo,
    category: tournament.category,
    status: mapTournamentStatus(tournament.status),
    rounds: roundsByTournament[tournament.id] ?? (uniqueMatchDates(matches, tournament.id).length || 1),
    venue: `Temporada ${tournament.season}`,
  }));

  return { tournaments, clubs, teams, players, matches, standings, rankings: snapshot.rankings ?? [] };
}

function mapTournamentStatus(status: SnapshotPayload["tournaments"][number]["status"]): Tournament["status"] {
  if (status === "live") return "En juego";
  if (status === "finished") return "Finalizado";
  return "Programado";
}

function mapMatchStatus(status: SnapshotPayload["matches"][number]["status"]): MatchStatus {
  if (status === "final") return "finished";
  if (status === "live") return "live";
  if (status === "suspended") return "suspended";
  return "scheduled";
}

function uniqueMatchDates(matchesData: Match[], tournamentId: string) {
  return Array.from(new Set(matchesData.filter((match) => match.tournamentId === tournamentId).map((match) => match.date))).sort();
}

function scoreFromEvents(events: Array<Pick<MatchEvent, "type" | "teamId">>, homeTeamId: string, awayTeamId: string) {
  return events.reduce((score, event) => {
    if (event.type !== "goal") return score;
    if (event.teamId === homeTeamId) score.home += 1;
    if (event.teamId === awayTeamId) score.away += 1;
    return score;
  }, { home: 0, away: 0 });
}

function standingsFromMatches(teamsData: Team[], matchesData: Match[]) {
  const rows = new Map(
    teamsData.map((team) => [
      team.id,
      {
        tournamentId: team.tournamentId,
        teamId: team.id,
        position: 0,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        pts: 0,
        form: [] as Array<"V" | "E" | "D">,
        cleanSheets: 0,
      },
    ]),
  );

  matchesData
    .filter((match) => match.status === "finished")
    .forEach((match) => {
      const home = rows.get(match.homeTeamId);
      const away = rows.get(match.awayTeamId);
      if (!home || !away) return;

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      home.pj += 1;
      away.pj += 1;
      home.gf += homeScore;
      home.gc += awayScore;
      away.gf += awayScore;
      away.gc += homeScore;

      if (awayScore === 0) home.cleanSheets += 1;
      if (homeScore === 0) away.cleanSheets += 1;

      if (homeScore > awayScore) {
        home.pg += 1;
        home.pts += 3;
        home.form.push("V");
        away.pp += 1;
        away.form.push("D");
      } else if (homeScore < awayScore) {
        away.pg += 1;
        away.pts += 3;
        away.form.push("V");
        home.pp += 1;
        home.form.push("D");
      } else {
        home.pe += 1;
        away.pe += 1;
        home.pts += 1;
        away.pts += 1;
        home.form.push("E");
        away.form.push("E");
      }
    });

  const grouped = new Map<string, Standing[]>();
  for (const row of rows.values()) {
    const current = grouped.get(row.tournamentId) ?? [];
    current.push(row);
    grouped.set(row.tournamentId, current);
  }

  return Array.from(grouped.values()).flatMap((tournamentRows) =>
    tournamentRows
      .sort((a, b) => b.pts - a.pts || goalDifference(b) - goalDifference(a) || b.gf - a.gf || a.teamId.localeCompare(b.teamId))
      .map((row, index) => ({ ...row, position: index + 1, form: row.form.slice(-5) })),
  );
}

function statsForPlayer(playerId: string, matchesData: Match[]) {
  const appearances = new Set<string>();
  const stats = { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, mvps: 0 };

  matchesData.forEach((match) => {
    const hasLineup = Object.values(match.starters).some((ids) => ids.includes(playerId)) || Object.values(match.substitutes).some((ids) => ids.includes(playerId));
    const playerEvents = match.events.filter((event) => event.playerId === playerId);
    if (hasLineup || playerEvents.length) appearances.add(match.id);

    playerEvents.forEach((event) => {
      if (event.type === "goal") stats.goals += 1;
      if (event.type === "assist") stats.assists += 1;
      if (event.type === "yellow") stats.yellowCards += 1;
      if (event.type === "red") stats.redCards += 1;
      if (event.type === "mvp") stats.mvps += 1;
    });
  });

  stats.appearances = appearances.size;
  return stats;
}

function normalizePosition(position?: string): PlayerPosition {
  if (position === "Arquero" || position === "Defensor" || position === "Mediocampista" || position === "Delantero") {
    return position;
  }
  return "Delantero";
}

function dateInAppTimeZone(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T12:00:00-03:00`);
}

function ageFromBirthDate(birthDate?: string) {
  if (!birthDate) return 0;
  const today = dateInAppTimeZone(new Date());
  const born = new Date(`${birthDate}T12:00:00-03:00`);
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1;
  return Number.isFinite(age) ? Math.max(age, 0) : 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function extractPrimaryColor(colors: string | undefined, index: number) {
  return colors?.split(",")[0]?.trim() || colorFor(index);
}

function colorFor(index: number) {
  const colors = ["#16a34a", "#2563eb", "#dc2626", "#7c3aed", "#f97316", "#0891b2", "#0f766e", "#9333ea"];
  return colors[index % colors.length];
}

function defaultTeamPhoto(index: number) {
  const images = [
    "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1000&q=80",
  ];
  return images[index % images.length];
}

function defaultPlayerPhoto(index: number) {
  void index;
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="28" fill="#E2E8F0"/>
      <circle cx="100" cy="76" r="34" fill="#94A3B8"/>
      <path d="M52 164c6-27 27-42 48-42s42 15 48 42" fill="#94A3B8"/>
    </svg>`,
  );
}

export const tournaments = dynamicArray(() => storeState.data.tournaments);
export const clubs = dynamicArray(() => storeState.data.clubs);
export const teams = dynamicArray(() => storeState.data.teams);
export const players = dynamicArray(() => storeState.data.players);
export const matches = dynamicArray(() => storeState.data.matches);
export const standings = dynamicArray(() => storeState.data.standings);
export const rankings = dynamicArray(() => storeState.data.rankings);

export function getTeam(id: string) {
  return teams.find((team) => team.id === id);
}

export function getClub(id: string) {
  return clubs.find((club) => club.id === id);
}

export function getPlayer(id: string) {
  return players.find((player) => player.id === id);
}

export function getTournament(id: string) {
  return tournaments.find((tournament) => tournament.id === id);
}

export function getMatch(id: string) {
  return matches.find((match) => match.id === id);
}

export function getTeamPlayers(teamId: string) {
  return players.filter((player) => player.teamId === teamId || player.teamIds.includes(teamId));
}

export function getClubTeams(clubId: string) {
  return teams.filter((team) => team.clubId === clubId);
}

export function getTournamentTeams(tournamentId: string) {
  return teams.filter((team) => team.tournamentId === tournamentId);
}

export function getTournamentStandings(tournamentId: string) {
  return standings.filter((row) => row.tournamentId === tournamentId).sort((a, b) => a.position - b.position);
}

export function getTeamStanding(teamId: string) {
  return standings.find((row) => row.teamId === teamId);
}

export function getTournamentMatches(tournamentId: string) {
  return matches.filter((match) => match.tournamentId === tournamentId).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export function getTeamMatches(teamId: string) {
  return matches
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
}

export function getPlayerAppearances(playerId: string) {
  return matches
    .filter((match) => {
      const hasLineup = Object.values(match.starters).some((ids) => ids.includes(playerId)) || Object.values(match.substitutes).some((ids) => ids.includes(playerId));
      return hasLineup || match.events.some((event) => event.playerId === playerId);
    })
    .map((match) => ({
      match,
      events: match.events.filter((event) => event.playerId === playerId),
    }));
}

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00-03:00`));
}

export function fullDateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00-03:00`));
}

export function statusLabel(status: MatchStatus) {
  const labels: Record<MatchStatus, string> = {
    finished: "Finalizado",
    live: "En juego",
    suspended: "Suspendido",
    scheduled: "Programado",
  };
  return labels[status];
}

export function statusTone(status: MatchStatus) {
  const tones: Record<MatchStatus, string> = {
    finished: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    live: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    suspended: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  };
  return tones[status];
}

export function teamRecord(teamId: string) {
  const row = getTeamStanding(teamId);
  return row ?? { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, form: [], cleanSheets: 0, position: 0, tournamentId: "", teamId };
}

export function topScorers(tournamentId?: string) {
  return rankingPlayers(tournamentId, "goals");
}

export function topAssisters(tournamentId?: string) {
  return rankingPlayers(tournamentId, "assists");
}

export function topYellowCards(tournamentId?: string) {
  return rankingPlayers(tournamentId, "yellowCards");
}

export function topRedCards(tournamentId?: string) {
  return rankingPlayers(tournamentId, "redCards");
}

export function goalDifference(row: Pick<Standing, "gf" | "gc">) {
  return row.gf - row.gc;
}

function rankingPlayers(tournamentId: string | undefined, metric: "goals" | "assists" | "yellowCards" | "redCards") {
  if (!tournamentId) return [];
  const tournamentRanking = rankings.find((item) => item.tournamentId === tournamentId);
  const source = metric === "goals"
    ? tournamentRanking?.goals
    : metric === "assists"
      ? tournamentRanking?.assists
      : metric === "yellowCards"
        ? tournamentRanking?.yellowCards
        : tournamentRanking?.redCards;

  return (source ?? [])
    .map((row) => {
      const player = getPlayer(row.playerId);
      return player ? { ...player, rankingValue: row.value } : null;
    })
    .filter((player): player is Player & { rankingValue: number } => Boolean(player));
}

type ApiResourceState<T> = {
  data: T;
  loading: boolean;
  error?: string;
};

const apiResourceCache = new Map<string, unknown>();

async function fetchApiResource<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar la API (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function useApiResource<T>(path: string | null, fallback: T): ApiResourceState<T> {
  const [state, setState] = useState<ApiResourceState<T>>({ data: fallback, loading: Boolean(path) });

  useEffect(() => {
    if (!path) {
      setState({ data: fallback, loading: false });
      return;
    }

    const cached = apiResourceCache.get(path) as T | undefined;
    if (cached) {
      setState({ data: cached, loading: false });
      return;
    }

    let cancelled = false;
    setState((current) => ({ data: current.data, loading: true }));

    fetchApiResource<T>(path)
      .then((data) => {
        if (cancelled) return;
        apiResourceCache.set(path, data);
        setState({ data, loading: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No se pudo cargar la informacion.";
        setState({ data: fallback, loading: false, error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

export function useTournamentRankings(tournamentId?: string) {
  const fallback = rankings.find((item) => item.tournamentId === tournamentId) ?? {
    tournamentId: tournamentId ?? "",
    goals: [],
    assists: [],
    yellowCards: [],
    redCards: [],
  };
  return useApiResource<SnapshotTournamentRankings>(tournamentId ? `/tournaments/${tournamentId}/rankings` : null, fallback);
}

export function useTournamentMatchdays(tournamentId?: string) {
  const fallback: MatchdayWithMatchesPayload = tournamentId
    ? getTournamentMatches(tournamentId).reduce<MatchdayWithMatchesPayload>((acc, match) => {
        const key = match.matchdayId ?? match.matchdayName ?? "Sin fecha";
        const existing = acc.find((item) => item.id === key);
        const mappedMatch = {
          id: match.id,
          date: match.date,
          time: match.time,
          court: match.court,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          status: toAdminMatchStatus(match.status),
          publicationStatus: match.publicationStatus ?? "draft",
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
        };
        if (existing) {
          existing.matches.push(mappedMatch);
        } else {
          acc.push({
            id: key,
            name: match.matchdayName ?? "Sin fecha",
            matches: [mappedMatch],
          });
        }
        return acc;
      }, [])
    : [];

  return useApiResource<MatchdayWithMatchesPayload>(tournamentId ? `/tournaments/${tournamentId}/matchdays-with-matches` : null, fallback);
}

export function useMatchSummary(matchId?: string) {
  const baseMatch = matchId ? getMatch(matchId) : undefined;
  const fallback: MatchSummaryPayload | null = baseMatch
    ? {
        id: baseMatch.id,
        tournamentId: baseMatch.tournamentId,
        tournamentName: getTournament(baseMatch.tournamentId)?.name ?? "Torneo",
        matchdayId: baseMatch.matchdayId,
        matchdayName: baseMatch.matchdayName,
        status: baseMatch.status === "finished" ? "final" : baseMatch.status === "scheduled" ? "pending" : baseMatch.status,
        publicationStatus: baseMatch.publicationStatus ?? "draft",
        homeTeamId: baseMatch.homeTeamId,
        homeTeamName: getTeam(baseMatch.homeTeamId)?.name ?? "Local",
        awayTeamId: baseMatch.awayTeamId,
        awayTeamName: getTeam(baseMatch.awayTeamId)?.name ?? "Visitante",
        homeScore: baseMatch.homeScore ?? 0,
        awayScore: baseMatch.awayScore ?? 0,
        goals: baseMatch.events.filter((event) => event.type === "goal").map((event) => ({ ...event, matchId: baseMatch.id })),
        assists: baseMatch.events.filter((event) => event.type === "assist").map((event) => ({ ...event, matchId: baseMatch.id })),
        yellowCards: baseMatch.events.filter((event) => event.type === "yellow").map((event) => ({ ...event, matchId: baseMatch.id })),
        redCards: baseMatch.events.filter((event) => event.type === "red").map((event) => ({ ...event, matchId: baseMatch.id })),
        mvpPlayerId: baseMatch.mvpPlayerId,
      }
    : null;

  return useApiResource<MatchSummaryPayload | null>(matchId ? `/matches/${matchId}/summary` : null, fallback);
}

function toAdminMatchStatus(status: MatchStatus): SharedAdminMatchStatus {
  if (status === "finished") return "final";
  if (status === "scheduled") return "pending";
  return status;
}
