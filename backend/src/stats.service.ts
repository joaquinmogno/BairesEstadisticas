import { Injectable } from "@nestjs/common";
import { EventType, MatchStatus, Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import type { SnapshotRankingRow, SnapshotTournamentRankings } from "./contracts";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async standings(tournamentId: string) {
    const [teams, matches] = await Promise.all([
      this.prisma.team.findMany({ where: { tournamentId } }),
      this.prisma.match.findMany({
        where: { tournamentId, status: MatchStatus.finished },
        include: { events: true },
        orderBy: { startsAt: "asc" },
      }),
    ]);

    const rows = new Map(teams.map((team) => [team.id, { team, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, form: [] as string[] }]));

    for (const match of matches) {
      const home = rows.get(match.homeTeamId);
      const away = rows.get(match.awayTeamId);
      if (!home || !away) continue;
      const score = this.scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId);

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
    }

    return Array.from(rows.values())
      .map((row) => ({ ...row, dg: row.gf - row.gc, form: row.form.slice(-5) }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
  }

  async playerStats(playerId: string) {
    const [events, appearances] = await Promise.all([
      this.prisma.matchEvent.findMany({ where: { playerId } }),
      this.prisma.lineupPlayer.count({ where: { playerId } }),
    ]);

    return {
      playerId,
      appearances,
      goals: events.filter((event) => event.type === EventType.goal).length,
      assists: events.filter((event) => event.type === EventType.assist).length,
      yellowCards: events.filter((event) => event.type === EventType.yellow).length,
      redCards: events.filter((event) => event.type === EventType.red).length,
      mvps: events.filter((event) => event.type === EventType.mvp).length,
    };
  }

  async tournamentRankings(tournamentId: string): Promise<SnapshotTournamentRankings> {
    const [players, matches] = await Promise.all([
      this.prisma.player.findMany({
        where: { team: { tournamentId } },
        select: { id: true, teamId: true },
      }),
      this.prisma.match.findMany({
        where: { tournamentId },
        include: { events: true },
      }),
    ]);

    const seed = new Map<string, { playerId: string; teamId: string; goals: number; assists: number; yellowCards: number; redCards: number }>();
    for (const player of players) {
      seed.set(player.id, { playerId: player.id, teamId: player.teamId, goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    }

    for (const match of matches) {
      for (const event of match.events) {
        if (!event.playerId) continue;
        const row = seed.get(event.playerId);
        if (!row) continue;
        if (event.type === EventType.goal) row.goals += 1;
        if (event.type === EventType.assist) row.assists += 1;
        if (event.type === EventType.yellow) row.yellowCards += 1;
        if (event.type === EventType.red) row.redCards += 1;
      }
    }

    const rows = Array.from(seed.values());
    return {
      tournamentId,
      goals: this.sortRanking(rows, "goals"),
      assists: this.sortRanking(rows, "assists"),
      yellowCards: this.sortRanking(rows, "yellowCards"),
      redCards: this.sortRanking(rows, "redCards"),
    };
  }

  private sortRanking(
    rows: Array<{ playerId: string; teamId: string; goals: number; assists: number; yellowCards: number; redCards: number }>,
    metric: "goals" | "assists" | "yellowCards" | "redCards",
  ): SnapshotRankingRow[] {
    return rows
      .filter((row) => row[metric] > 0)
      .sort((a, b) => b[metric] - a[metric] || b.goals - a.goals || b.assists - a.assists || a.playerId.localeCompare(b.playerId))
      .slice(0, 8)
      .map((row) => ({ playerId: row.playerId, teamId: row.teamId, value: row[metric] }));
  }

  scoreFromEvents(events: Prisma.MatchEventGetPayload<Record<string, never>>[], homeTeamId: string, awayTeamId: string) {
    return events.reduce(
      (score, event) => {
        if (event.type !== EventType.goal) return score;
        if (event.teamId === homeTeamId) score.home += 1;
        if (event.teamId === awayTeamId) score.away += 1;
        return score;
      },
      { home: 0, away: 0 },
    );
  }
}
