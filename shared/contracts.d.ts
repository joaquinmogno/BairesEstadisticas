export type SharedEventType = "goal" | "assist" | "yellow" | "red" | "mvp";
export type SharedAdminMatchStatus = "pending" | "live" | "suspended" | "final";
export type SharedPublicationStatus = "draft" | "published";
export type SnapshotTournament = {
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
export type SnapshotClub = {
    id: string;
    name: string;
    badgeUrl?: string;
    colors?: string;
    photoUrl?: string;
    category?: string;
};
export type SnapshotTeam = {
    id: string;
    tournamentId: string;
    clubId: string;
    name: string;
    badge: string;
    badgeUrl?: string;
    colors?: string;
    photoUrl?: string;
    category?: string;
};
export type SnapshotPlayer = {
    id: string;
    teamId: string;
    clubId: string;
    teamIds: string[];
    name: string;
    lastName?: string;
    number?: number;
    position?: string;
    birthDate?: string;
    photoUrl?: string;
};
export type SnapshotMatchday = {
    id: string;
    tournamentId: string;
    name: string;
    sortOrder?: number;
};
export type SnapshotMatchEvent = {
    id: string;
    matchId: string;
    playId?: string;
    playerId?: string;
    teamId: string;
    type: SharedEventType;
    minute: number;
    detail?: string;
};
export type SnapshotMatch = {
    id: string;
    tournamentId: string;
    matchdayId?: string;
    matchdayName?: string;
    date: string;
    time: string;
    court: string;
    homeTeamId: string;
    awayTeamId: string;
    status: SharedAdminMatchStatus;
    publicationStatus: SharedPublicationStatus;
    homeScore?: number;
    awayScore?: number;
    mvpPlayerId?: string;
    events: SnapshotMatchEvent[];
    starters: Record<string, string[]>;
    substitutes: Record<string, string[]>;
};
export type SnapshotRankingRow = {
    playerId: string;
    teamId: string;
    value: number;
};
export type SnapshotTournamentRankings = {
    tournamentId: string;
    goals: SnapshotRankingRow[];
    assists: SnapshotRankingRow[];
    yellowCards: SnapshotRankingRow[];
    redCards: SnapshotRankingRow[];
};
export type MatchSummaryPayload = {
    id: string;
    tournamentId: string;
    tournamentName: string;
    matchdayId?: string;
    matchdayName?: string;
    status: SharedAdminMatchStatus;
    publicationStatus: SharedPublicationStatus;
    homeTeamId: string;
    homeTeamName: string;
    awayTeamId: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    goals: SnapshotMatchEvent[];
    assists: SnapshotMatchEvent[];
    yellowCards: SnapshotMatchEvent[];
    redCards: SnapshotMatchEvent[];
    mvpPlayerId?: string;
};
export type MatchdayWithMatchesPayload = Array<{
    id: string;
    name: string;
    sortOrder?: number;
    matches: Array<{
        id: string;
        date: string;
        time: string;
        court: string;
        homeTeamId: string;
        awayTeamId: string;
        status: SharedAdminMatchStatus;
        publicationStatus: SharedPublicationStatus;
        homeScore: number;
        awayScore: number;
    }>;
}>;
export type SnapshotPayload = {
    tournaments: SnapshotTournament[];
    clubs: SnapshotClub[];
    teams: SnapshotTeam[];
    players: SnapshotPlayer[];
    matchdays: SnapshotMatchday[];
    matches: SnapshotMatch[];
    rankings: SnapshotTournamentRankings[];
};
