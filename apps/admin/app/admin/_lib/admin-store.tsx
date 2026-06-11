"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SharedAdminMatchStatus, SharedEventType, SharedPublicationStatus, SnapshotPayload } from "../../../../../shared/contracts";

/* -------- Types -------- */

export type MatchStatus = SharedAdminMatchStatus;
export type EventType = SharedEventType;

export type Tournament = {
  id: string;
  name: string;
  logo?: string;
  category: string;
  season: string;
  startDate?: string;
  endDate?: string;
  rules?: string;
  status: "scheduled" | "live" | "finished";
  type: "league" | "cup" | "groups_playoffs" | "knockout";
};

export type Team = { id: string; tournamentId: string; clubId?: string; name: string; badge: string; badgeUrl?: string; colors?: string; photoUrl?: string; category?: string };

export type Player = { id: string; name: string; lastName?: string; teamId: string; clubId?: string; teamIds?: string[]; number?: number; position?: string; birthDate?: string; photoUrl?: string };

export type Matchday = { id: string; tournamentId: string; name: string };

export type MatchEvent = { id: string; matchId: string; playId?: string; playerId: string; teamId: string; type: EventType; minute: number };

export type Match = {
  id: string;
  tournamentId: string;
  matchdayId: string;
  matchdayName?: string;
  date: string;
  day?: string;
  time: string;
  court: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  publicationStatus?: SharedPublicationStatus;
  events: MatchEvent[];
  starters: Record<string, string[]>;
  substitutes: Record<string, string[]>;
};

export type StandingRow = {
  teamId: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  form: string[];
};

export type PlayerStats = {
  playerId: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  mvps: number;
};

type AsyncMutation = Promise<void>;
type SyncStatus = "loading" | "ready" | "stale" | "error";

type AdminState = {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matchdays: Matchday[];
  matches: Match[];
  syncStatus: SyncStatus;
  isReadOnly: boolean;
  readOnlyReason?: string;
  /* crud */
  addTournament: (data: Pick<Tournament, "name" | "startDate"> & Partial<Pick<Tournament, "category" | "season" | "rules" | "type">>) => Promise<Tournament>;
  updateTournament: (tournamentId: string, data: Partial<Tournament>) => AsyncMutation;
  deleteTournament: (tournamentId: string) => AsyncMutation;
  addTeam: (data: Pick<Team, "tournamentId" | "name" | "badge"> & Partial<Pick<Team, "clubId" | "badgeUrl" | "photoUrl" | "category" | "colors">> & { sourceTeamId?: string; sourcePlayerIds?: string[] }) => Promise<Team>;
  updateTeam: (teamId: string, data: Partial<Team>) => AsyncMutation;
  deleteTeam: (teamId: string) => AsyncMutation;
  addPlayer: (data: Pick<Player, "name" | "teamId"> & Partial<Pick<Player, "lastName" | "number" | "position" | "birthDate" | "photoUrl">>) => AsyncMutation;
  updatePlayer: (playerId: string, data: Partial<Player>) => AsyncMutation;
  deletePlayer: (playerId: string) => AsyncMutation;
  addMatchday: (data: Pick<Matchday, "tournamentId" | "name">) => AsyncMutation;
  deleteMatchday: (matchdayId: string) => AsyncMutation;
  addMatch: (data: Pick<Match, "tournamentId" | "matchdayId" | "date" | "time" | "homeTeamId" | "awayTeamId"> & { court?: string; day?: string }) => AsyncMutation;
  updateMatch: (matchId: string, data: Partial<Pick<Match, "tournamentId" | "matchdayId" | "date" | "day" | "time" | "court" | "homeTeamId" | "awayTeamId" | "status">>) => AsyncMutation;
  deleteMatch: (matchId: string) => AsyncMutation;
  rescheduleMatch: (matchId: string, data: Pick<Match, "date" | "time" | "court">) => AsyncMutation;
  updateMatchStatus: (matchId: string, status: MatchStatus) => AsyncMutation;
  publishMatch: (matchId: string) => AsyncMutation;
  addMatchEvent: (matchId: string, playerId: string, teamId: string, type: EventType, minute?: number, playId?: string) => AsyncMutation;
  updateMatchEvent: (matchId: string, eventId: string, data: Partial<Pick<MatchEvent, "playerId" | "teamId" | "type" | "minute" | "playId">>) => AsyncMutation;
  removeMatchEvent: (matchId: string, eventId: string) => AsyncMutation;
  removeMatchPlay: (matchId: string, playId: string) => AsyncMutation;
  updateTournamentLogo: (tournamentId: string, logo: string) => AsyncMutation;
  updateTeamMedia: (teamId: string, data: Pick<Team, "badgeUrl" | "photoUrl">) => AsyncMutation;
  updatePlayerPhoto: (playerId: string, photoUrl: string) => AsyncMutation;
  /* lookups */
  getTeam: (id: string) => Team | undefined;
  getPlayer: (id: string) => Player | undefined;
  getTournament: (id: string) => Tournament | undefined;
  getMatchday: (id: string) => Matchday | undefined;
  /* filtered helpers */
  teamsByTournament: (tournamentId: string) => Team[];
  playersByTeam: (teamId: string) => Player[];
  matchdaysByTournament: (tournamentId: string) => Matchday[];
  matchesByMatchday: (matchdayId: string) => Match[];
  getMatchScore: (match: Match) => { home: number; away: number };
  isPlayerExpelled: (matchId: string, playerId: string) => boolean;
  standingsByTournament: (tournamentId: string) => StandingRow[];
  statsByPlayer: (playerId: string) => PlayerStats;
  topScorers: (tournamentId?: string) => PlayerStats[];
};

const AdminContext = createContext<AdminState | null>(null);
const STORAGE_KEY = "baires-admin-state-v2";

/* -------- Empty initial state -------- */

const seedTournaments: Tournament[] = [];
const seedTeams: Team[] = [];
const seedPlayers: Player[] = [];
const seedMatchdays: Matchday[] = [];
const seedMatches: Match[] = [];

/* -------- Helpers -------- */

function computeScore(events: MatchEvent[], homeTeamId: string, awayTeamId: string) {
  let home = 0, away = 0;
  for (const e of events) {
    if (e.type !== "goal") continue;
    if (e.teamId === homeTeamId) home++;
    else if (e.teamId === awayTeamId) away++;
  }
  return { home, away };
}

function emptyStanding(teamId: string): StandingRow {
  return { teamId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, form: [] };
}

function emptyStats(playerId: string): PlayerStats {
  return { playerId, appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, mvps: 0 };
}

function normalizeText(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function argentinaDateTime(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}

function dateOnly(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
}

async function apiRequest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  if (typeof window === "undefined") throw new Error("La API solo puede invocarse desde el navegador.");
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let message = raw.trim();
    try {
      const parsed = raw ? JSON.parse(raw) as { message?: string | string[] } : undefined;
      if (Array.isArray(parsed?.message)) message = parsed.message.join(". ");
      else if (parsed?.message) message = parsed.message;
    } catch {
      // noop
    }
    if (response.status === 401) window.location.href = "/admin/login";
    throw new Error(message || `La API respondió ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type PersistedAdminState = {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matchdays: Matchday[];
  matches: Match[];
};

function loadPersistedState(): PersistedAdminState {
  if (typeof window === "undefined") {
    return { tournaments: seedTournaments, teams: seedTeams, players: seedPlayers, matchdays: seedMatchdays, matches: seedMatches };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tournaments: seedTournaments, teams: seedTeams, players: seedPlayers, matchdays: seedMatchdays, matches: seedMatches };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedAdminState>;
    return {
      tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : seedTournaments,
      teams: Array.isArray(parsed.teams) ? parsed.teams : seedTeams,
      players: Array.isArray(parsed.players) ? parsed.players : seedPlayers,
      matchdays: Array.isArray(parsed.matchdays) ? parsed.matchdays : seedMatchdays,
      matches: Array.isArray(parsed.matches) ? parsed.matches : seedMatches,
    };
  } catch {
    return { tournaments: seedTournaments, teams: seedTeams, players: seedPlayers, matchdays: seedMatchdays, matches: seedMatches };
  }
}

/* -------- Provider -------- */

export function AdminProvider({ children }: { children: ReactNode }) {
  const initialState = useMemo(loadPersistedState, []);
  const hasPersistedSnapshot = useMemo(
    () => [initialState.tournaments, initialState.teams, initialState.players, initialState.matchdays, initialState.matches]
      .some((collection) => collection.length > 0),
    [initialState],
  );
  const [tournaments, setTournaments] = useState(initialState.tournaments);
  const [teams, setTeams] = useState(initialState.teams);
  const [players, setPlayers] = useState(initialState.players);
  const [matchdays, setMatchdays] = useState(initialState.matchdays);
  const [matches, setMatches] = useState(initialState.matches);
  const [loadedRemote, setLoadedRemote] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [readOnlyReason, setReadOnlyReason] = useState<string | undefined>();
  const [hasRemoteSnapshot, setHasRemoteSnapshot] = useState(false);

  useEffect(() => {
    if (loadedRemote) return;
    fetch("/api/snapshot", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: SnapshotPayload | null) => {
        if (!payload) {
          throw new Error("La API no devolvio snapshot.");
        }
        setTournaments(Array.isArray(payload.tournaments) ? payload.tournaments : seedTournaments);
        setTeams(Array.isArray(payload.teams) ? payload.teams : seedTeams);
        setPlayers(Array.isArray(payload.players) ? payload.players : seedPlayers);
        setMatchdays(Array.isArray(payload.matchdays) ? payload.matchdays : seedMatchdays);
        setMatches(Array.isArray(payload.matches) ? payload.matches.map((match) => ({
          ...match,
          matchdayId: match.matchdayId ?? "",
          events: match.events.map((event) => ({
            ...event,
            playerId: event.playerId ?? "",
          })),
        })) : seedMatches);
        setSyncStatus("ready");
        setReadOnlyReason(undefined);
        setHasRemoteSnapshot(true);
        setLoadedRemote(true);
      })
      .catch(() => {
        setSyncStatus(hasPersistedSnapshot ? "stale" : "error");
        setReadOnlyReason(
          hasPersistedSnapshot
            ? "No se pudo sincronizar con la API. Estas viendo una copia local en modo solo lectura hasta recuperar conexion."
            : "No se pudo conectar con la API. El panel queda bloqueado hasta recuperar la sincronizacion.",
        );
        setLoadedRemote(true);
      });
  }, [hasPersistedSnapshot, loadedRemote]);

  useEffect(() => {
    if (!hasRemoteSnapshot) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tournaments, teams, players, matchdays, matches }));
  }, [hasRemoteSnapshot, tournaments, teams, players, matchdays, matches]);

  const value = useMemo<AdminState>(() => {
    const isReadOnly = syncStatus === "stale" || syncStatus === "error";
    const assertWritable = () => {
      if (!isReadOnly) return;
      throw new Error(readOnlyReason ?? "El panel esta en modo solo lectura hasta recuperar la API.");
    };
    const assertUniqueTeam = (tournamentId: string, name: string, currentTeamId?: string) => {
      const normalized = normalizeText(name);
      if (!normalized) return;
      const duplicated = teams.some((team) => team.id !== currentTeamId && team.tournamentId === tournamentId && normalizeText(team.name) === normalized);
      if (duplicated) throw new Error("Ya existe un equipo con ese nombre en el torneo.");
    };
    const assertUniquePlayer = (teamId: string, name: string, lastName?: string, number?: number, currentPlayerId?: string) => {
      const normalizedName = normalizeText(`${name} ${lastName ?? ""}`);
      const duplicatedName = players.some((player) => player.id !== currentPlayerId && (player.teamId === teamId || player.teamIds?.includes(teamId)) && normalizeText(`${player.name} ${player.lastName ?? ""}`) === normalizedName);
      if (duplicatedName) throw new Error("Ya existe un jugador con ese nombre en el equipo.");
      if (number !== undefined) {
        const duplicatedNumber = players.some((player) => player.id !== currentPlayerId && (player.teamId === teamId || player.teamIds?.includes(teamId)) && player.number === number);
        if (duplicatedNumber) throw new Error("Ese dorsal ya esta asignado a otro jugador del equipo.");
      }
    };
    const assertUniqueMatchday = (tournamentId: string, name: string, currentMatchdayId?: string) => {
      const normalized = normalizeText(name);
      const duplicated = matchdays.some((matchday) => matchday.id !== currentMatchdayId && matchday.tournamentId === tournamentId && normalizeText(matchday.name) === normalized);
      if (duplicated) throw new Error("Ya existe una fecha con ese nombre en el torneo.");
    };
    const assertSchedulableMatch = (
      data: { id?: string; tournamentId: string; date: string; time: string; homeTeamId: string; awayTeamId: string },
    ) => {
      if (data.homeTeamId === data.awayTeamId) throw new Error("El equipo local y visitante no pueden ser el mismo.");
      const clash = matches.find((match) => {
        if (match.id === data.id) return false;
        if (match.date !== data.date || match.time !== data.time) return false;
        return [match.homeTeamId, match.awayTeamId].some((teamId) => teamId === data.homeTeamId || teamId === data.awayTeamId);
      });
      if (clash) throw new Error("Uno de los equipos ya tiene un partido programado en ese mismo horario.");
    };
    const getTeam = (id: string) => teams.find((t) => t.id === id);
    const getPlayer = (id: string) => players.find((p) => p.id === id);
    const getTournament = (id: string) => tournaments.find((t) => t.id === id);
    const getMatchday = (id: string) => matchdays.find((m) => m.id === id);
    const getMatchScore = (m: Match) => computeScore(m.events, m.homeTeamId, m.awayTeamId);
    const isPlayerExpelled = (matchId: string, playerId: string) => {
      const m = matches.find((x) => x.id === matchId);
      return m ? m.events.some((e) => e.playerId === playerId && e.type === "red") : false;
    };

    return {
      tournaments, teams, players, matchdays, matches,
      syncStatus,
      isReadOnly,
      readOnlyReason,
      getTeam, getPlayer, getTournament, getMatchday, getMatchScore, isPlayerExpelled,

      teamsByTournament: (tid: string) => teams.filter((t) => t.tournamentId === tid),
      playersByTeam: (tid: string) => players.filter((p) => p.teamId === tid || p.teamIds?.includes(tid)),
      matchdaysByTournament: (tid: string) => matchdays.filter((m) => m.tournamentId === tid),
      matchesByMatchday: (mid: string) => matches.filter((m) => m.matchdayId === mid),

      standingsByTournament: (tournamentId) => {
        const tournamentTeams = teams.filter((team) => team.tournamentId === tournamentId);
        const rows = new Map(tournamentTeams.map((team) => [team.id, emptyStanding(team.id)]));

        matches
          .filter((match) => match.tournamentId === tournamentId && match.status === "final")
          .forEach((match) => {
            const score = computeScore(match.events, match.homeTeamId, match.awayTeamId);
            const home = rows.get(match.homeTeamId);
            const away = rows.get(match.awayTeamId);
            if (!home || !away) return;

            home.pj += 1;
            away.pj += 1;
            home.gf += score.home;
            home.gc += score.away;
            away.gf += score.away;
            away.gc += score.home;

            if (score.home > score.away) {
              home.pg += 1; home.pts += 3; home.form.push("V");
              away.pp += 1; away.form.push("D");
            } else if (score.home < score.away) {
              away.pg += 1; away.pts += 3; away.form.push("V");
              home.pp += 1; home.form.push("D");
            } else {
              home.pe += 1; away.pe += 1; home.pts += 1; away.pts += 1;
              home.form.push("E"); away.form.push("E");
            }
          });

        return Array.from(rows.values())
          .map((row) => ({ ...row, dg: row.gf - row.gc, form: row.form.slice(-5) }))
          .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
      },

      statsByPlayer: (playerId) => {
        const stats = emptyStats(playerId);
        const appearedIn = new Set<string>();
        matches.forEach((match) => {
          const playerEvents = match.events.filter((event) => event.playerId === playerId);
          if (playerEvents.length || Object.values(match.starters).some((ids) => ids.includes(playerId)) || Object.values(match.substitutes).some((ids) => ids.includes(playerId))) {
            appearedIn.add(match.id);
          }
          playerEvents.forEach((event) => {
            if (event.type === "goal") stats.goals += 1;
            if (event.type === "assist") stats.assists += 1;
            if (event.type === "yellow") stats.yellowCards += 1;
            if (event.type === "red") stats.redCards += 1;
            if (event.type === "mvp") stats.mvps += 1;
          });
        });
        stats.appearances = appearedIn.size;
        return stats;
      },

      topScorers: (tournamentId) => {
        const allowedTeams = tournamentId ? new Set(teams.filter((team) => team.tournamentId === tournamentId).map((team) => team.id)) : null;
        return players
          .filter((player) => !allowedTeams || allowedTeams.has(player.teamId) || player.teamIds?.some((teamId) => allowedTeams.has(teamId)))
          .map((player) => {
            const stats = emptyStats(player.id);
            matches.forEach((match) => match.events.forEach((event) => {
              if (event.playerId !== player.id) return;
              if (event.type === "goal") stats.goals += 1;
              if (event.type === "assist") stats.assists += 1;
              if (event.type === "yellow") stats.yellowCards += 1;
              if (event.type === "red") stats.redCards += 1;
              if (event.type === "mvp") stats.mvps += 1;
            }));
            return stats;
          })
          .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
          .slice(0, 10);
      },

      addTournament: async ({ name, startDate, category = "Futbol 5", season = "2026", rules, type = "league" }) => {
        assertWritable();
        const created = await apiRequest<Tournament>("/tournaments", { method: "POST", body: JSON.stringify({ name, startDate, category, season, rules, type }) });
        setTournaments((c) => [...c, created]);
        return created;
      },

      updateTournament: async (tournamentId, data) => {
        assertWritable();
        const { logo, ...rest } = data;
        await apiRequest(`/tournaments/${tournamentId}`, { method: "PATCH", body: JSON.stringify(logo ? { ...rest, logoUrl: logo } : rest) });
        setTournaments((c) => c.map((tournament) => tournament.id === tournamentId ? { ...tournament, ...data } : tournament));
      },

      deleteTournament: async (tournamentId) => {
        assertWritable();
        await apiRequest(`/tournaments/${tournamentId}`, { method: "DELETE" });
        const teamIds = new Set(teams.filter((team) => team.tournamentId === tournamentId).map((team) => team.id));
        const matchdayIds = new Set(matchdays.filter((matchday) => matchday.tournamentId === tournamentId).map((matchday) => matchday.id));
        setTournaments((c) => c.filter((tournament) => tournament.id !== tournamentId));
        setTeams((c) => c.filter((team) => team.tournamentId !== tournamentId));
        setPlayers((c) => c
          .map((player) => {
            const teamIdsLeft = player.teamIds?.filter((id) => !teamIds.has(id));
            return { ...player, teamId: teamIds.has(player.teamId) ? teamIdsLeft?.[0] ?? player.teamId : player.teamId, teamIds: teamIdsLeft };
          })
          .filter((player) => !teamIds.has(player.teamId) || (player.teamIds?.length ?? 0) > 0));
        setMatchdays((c) => c.filter((matchday) => matchday.tournamentId !== tournamentId));
        setMatches((c) => c.filter((match) => match.tournamentId !== tournamentId && !matchdayIds.has(match.matchdayId)));
      },

      addTeam: async ({ tournamentId, clubId, sourceTeamId, sourcePlayerIds, name, badge, badgeUrl, photoUrl, category, colors }) => {
        assertWritable();
        assertUniqueTeam(tournamentId, name);
        const created = await apiRequest<Team>("/teams", { method: "POST", body: JSON.stringify({ tournamentId, clubId, sourceTeamId, sourcePlayerIds, name, badgeUrl, photoUrl, category, colors }) });
        setTeams((c) => [...c, { ...created, badge: badge || name.slice(0, 2).toUpperCase() }]);
        if (sourceTeamId) {
          const selectedPlayerIds = sourcePlayerIds?.length ? new Set(sourcePlayerIds) : null;
          setPlayers((c) => c.map((player) => (player.teamId === sourceTeamId || player.teamIds?.includes(sourceTeamId)) && (!selectedPlayerIds || selectedPlayerIds.has(player.id))
            ? { ...player, teamIds: Array.from(new Set([...(player.teamIds ?? [player.teamId]), created.id])) }
            : player));
        }
        return created;
      },

      updateTeam: async (teamId, data) => {
        assertWritable();
        const current = teams.find((team) => team.id === teamId);
        assertUniqueTeam(data.tournamentId ?? current?.tournamentId ?? "", data.name ?? current?.name ?? "", teamId);
        await apiRequest(`/teams/${teamId}`, { method: "PATCH", body: JSON.stringify(data) });
        setTeams((c) => c.map((team) => team.id === teamId ? { ...team, ...data } : team));
      },

      deleteTeam: async (teamId) => {
        assertWritable();
        await apiRequest(`/teams/${teamId}`, { method: "DELETE" });
        setTeams((c) => c.filter((team) => team.id !== teamId));
        setPlayers((c) => c
          .map((player) => {
            const teamIdsLeft = player.teamIds?.filter((id) => id !== teamId);
            return { ...player, teamId: player.teamId === teamId ? teamIdsLeft?.[0] ?? player.teamId : player.teamId, teamIds: teamIdsLeft };
          })
          .filter((player) => player.teamId !== teamId || (player.teamIds?.length ?? 0) > 0));
        setMatches((c) => c.filter((match) => match.homeTeamId !== teamId && match.awayTeamId !== teamId));
      },

      addPlayer: async ({ name, teamId, lastName, number, position, birthDate, photoUrl }) => {
        assertWritable();
        assertUniquePlayer(teamId, name, lastName, number);
        const created = await apiRequest<Player & { firstName?: string }>("/players", { method: "POST", body: JSON.stringify({ teamId, firstName: name, lastName: lastName ?? "", number, position, birthDate, photoUrl }) });
        setPlayers((c) => [...c, {
          id: created.id,
          name: created.firstName ?? created.name ?? name,
          lastName: created.lastName ?? lastName,
          teamId,
          clubId: created.clubId,
          teamIds: created.teamIds ?? [teamId],
          number: created.number ?? number,
          position: created.position ?? position ?? "Jugador",
          birthDate: dateOnly(created.birthDate) ?? birthDate,
          photoUrl: created.photoUrl ?? photoUrl,
        }]);
      },

      updatePlayer: async (playerId, data) => {
        assertWritable();
        const { name, ...rest } = data;
        const current = players.find((player) => player.id === playerId);
        assertUniquePlayer(rest.teamId ?? current?.teamId ?? "", name ?? current?.name ?? "", rest.lastName ?? current?.lastName, rest.number ?? current?.number, playerId);
        const updated = await apiRequest<Player & { firstName?: string }>(`/players/${playerId}`, { method: "PATCH", body: JSON.stringify(name ? { ...rest, firstName: name } : rest) });
        setPlayers((c) => c.map((player) => player.id === playerId ? {
          ...player,
          ...data,
          clubId: updated.clubId ?? player.clubId,
          teamIds: updated.teamIds ?? (data.teamId ? Array.from(new Set([...(player.teamIds ?? [player.teamId]), data.teamId])) : player.teamIds),
          birthDate: dateOnly(updated.birthDate) ?? data.birthDate,
        } : player));
      },

      deletePlayer: async (playerId) => {
        assertWritable();
        await apiRequest(`/players/${playerId}`, { method: "DELETE" });
        setPlayers((c) => c.filter((player) => player.id !== playerId));
        setMatches((c) => c.map((match) => ({
          ...match,
          events: match.events.filter((event) => event.playerId !== playerId),
          starters: Object.fromEntries(Object.entries(match.starters).map(([teamId, ids]) => [teamId, ids.filter((id) => id !== playerId)])),
          substitutes: Object.fromEntries(Object.entries(match.substitutes).map(([teamId, ids]) => [teamId, ids.filter((id) => id !== playerId)])),
        })));
      },

      addMatchday: async ({ tournamentId, name }) => {
        assertWritable();
        assertUniqueMatchday(tournamentId, name);
        const created = await apiRequest<Matchday>("/matchdays", { method: "POST", body: JSON.stringify({ tournamentId, name }) });
        setMatchdays((c) => [...c, created]);
      },

      deleteMatchday: async (matchdayId) => {
        assertWritable();
        await apiRequest(`/matchdays/${matchdayId}`, { method: "DELETE" });
        setMatchdays((c) => c.filter((matchday) => matchday.id !== matchdayId));
        setMatches((c) => c.filter((match) => match.matchdayId !== matchdayId));
      },

      addMatch: async ({ tournamentId, matchdayId, date, time, homeTeamId, awayTeamId, court, day }) => {
        assertWritable();
        assertSchedulableMatch({ tournamentId, date, time, homeTeamId, awayTeamId });
        const created = await apiRequest<{ id: string }>("/matches", { method: "POST", body: JSON.stringify({ tournamentId, matchdayId, homeTeamId, awayTeamId, startsAt: argentinaDateTime(date, time), court: court || "Cancha 1", day }) });
        setMatches((c) => [...c, { id: created.id, tournamentId, matchdayId, date, day, time, court: court || "Cancha 1", homeTeamId, awayTeamId, status: "pending", publicationStatus: "draft", events: [], starters: { [homeTeamId]: [], [awayTeamId]: [] }, substitutes: { [homeTeamId]: [], [awayTeamId]: [] } }]);
      },

      updateMatch: async (matchId, data) => {
        assertWritable();
        const current = matches.find((match) => match.id === matchId);
        assertSchedulableMatch({
          id: matchId,
          tournamentId: data.tournamentId ?? current?.tournamentId ?? "",
          date: data.date ?? current?.date ?? "",
          time: data.time ?? current?.time ?? "",
          homeTeamId: data.homeTeamId ?? current?.homeTeamId ?? "",
          awayTeamId: data.awayTeamId ?? current?.awayTeamId ?? "",
        });
        const apiStatus = data.status === "pending" ? "scheduled" : data.status === "final" ? "finished" : data.status;
        await apiRequest(`/matches/${matchId}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...data,
            status: apiStatus,
            startsAt: data.date && data.time ? argentinaDateTime(data.date, data.time) : undefined,
          }),
        });
        setMatches((c) => c.map((match) => match.id === matchId ? { ...match, ...data } : match));
      },

      deleteMatch: async (matchId) => {
        assertWritable();
        await apiRequest(`/matches/${matchId}`, { method: "DELETE" });
        setMatches((c) => c.filter((match) => match.id !== matchId));
      },

      rescheduleMatch: async (matchId, data) => {
        assertWritable();
        await apiRequest(`/matches/${matchId}`, { method: "PATCH", body: JSON.stringify({ startsAt: argentinaDateTime(data.date, data.time), court: data.court }) });
        setMatches((c) => c.map((m) => m.id === matchId ? { ...m, ...data } : m));
      },

      updateMatchStatus: async (matchId, status) => {
        assertWritable();
        const apiStatus = status === "pending" ? "scheduled" : status === "final" ? "finished" : status;
        await apiRequest(`/matches/${matchId}`, { method: "PATCH", body: JSON.stringify({ status: apiStatus }) });
        setMatches((c) => c.map((m) => (m.id === matchId ? { ...m, status } : m)));
      },

      publishMatch: async (matchId) => {
        assertWritable();
        await apiRequest(`/matches/${matchId}/publish`, { method: "POST" });
        setMatches((c) => c.map((m) => (m.id === matchId ? { ...m, status: "final", publicationStatus: "published" } : m)));
      },

      addMatchEvent: async (matchId, playerId, teamId, type, minute = 1, playId) => {
        assertWritable();
        const created = await apiRequest<MatchEvent>(`/matches/${matchId}/events`, { method: "POST", body: JSON.stringify({ playerId, teamId, type, minute, playId }) });
        setMatches((c) => c.map((m) => {
          if (m.id !== matchId) return m;
          const events = type === "mvp" ? m.events.filter((event) => event.type !== "mvp") : m.events;
          return { ...m, events: [...events, created] };
        }));
      },

      updateMatchEvent: async (matchId, eventId, data) => {
        assertWritable();
        await apiRequest(`/matches/${matchId}/events/${eventId}`, { method: "PATCH", body: JSON.stringify(data) });
        setMatches((c) => c.map((m) => {
          if (m.id !== matchId) return m;
          const nextEvents = data.type === "mvp"
            ? m.events.filter((event) => event.id === eventId || event.type !== "mvp")
            : m.events;
          return { ...m, events: nextEvents.map((event) => event.id === eventId ? { ...event, ...data } : event) };
        }));
      },

      removeMatchEvent: async (matchId, eventId) => {
        assertWritable();
        await apiRequest(`/matches/${matchId}/events/${eventId}`, { method: "DELETE" });
        setMatches((c) => c.map((m) => m.id === matchId ? { ...m, events: m.events.filter((e) => e.id !== eventId) } : m));
      },

      removeMatchPlay: async (matchId, playId) => {
        assertWritable();
        await apiRequest(`/matches/${matchId}/plays/${playId}`, { method: "DELETE" });
        setMatches((c) => c.map((m) => m.id === matchId ? { ...m, events: m.events.filter((e) => e.playId !== playId) } : m));
      },

      updateTournamentLogo: async (tournamentId, logo) => {
        assertWritable();
        await apiRequest(`/tournaments/${tournamentId}`, { method: "PATCH", body: JSON.stringify({ logoUrl: logo }) });
        setTournaments((c) => c.map((tournament) => tournament.id === tournamentId ? { ...tournament, logo } : tournament));
      },

      updateTeamMedia: async (teamId, data) => {
        assertWritable();
        await apiRequest(`/teams/${teamId}`, { method: "PATCH", body: JSON.stringify(data) });
        setTeams((c) => c.map((team) => team.id === teamId ? { ...team, ...data } : team));
      },

      updatePlayerPhoto: async (playerId, photoUrl) => {
        assertWritable();
        await apiRequest(`/players/${playerId}`, { method: "PATCH", body: JSON.stringify({ photoUrl }) });
        setPlayers((c) => c.map((player) => player.id === playerId ? { ...player, photoUrl } : player));
      },
    };
  }, [matchdays, matches, players, readOnlyReason, syncStatus, teams, tournaments]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
