import { EventType, MatchStatus } from "@prisma/client";
import { StatsService } from "./stats.service";

describe("StatsService", () => {
  it("calcula posiciones desde partidos finalizados y eventos de gol", async () => {
    const prisma = {
      team: {
        findMany: jest.fn().mockResolvedValue([
          { id: "team-a", name: "A" },
          { id: "team-b", name: "B" },
        ]),
      },
      match: {
        findMany: jest.fn().mockResolvedValue([
          {
            homeTeamId: "team-a",
            awayTeamId: "team-b",
            status: MatchStatus.finished,
            startsAt: new Date("2026-01-01T20:00:00Z"),
            events: [
              { type: EventType.goal, teamId: "team-a" },
              { type: EventType.goal, teamId: "team-a" },
              { type: EventType.goal, teamId: "team-b" },
            ],
          },
        ]),
      },
    };

    const service = new StatsService(prisma as never);
    const rows = await service.standings("tournament-1");

    expect(rows[0]).toMatchObject({ team: { id: "team-a" }, pj: 1, pg: 1, gf: 2, gc: 1, pts: 3, dg: 1 });
    expect(rows[1]).toMatchObject({ team: { id: "team-b" }, pj: 1, pp: 1, gf: 1, gc: 2, pts: 0, dg: -1 });
  });

  it("calcula estadisticas de jugador desde eventos y alineaciones", async () => {
    const prisma = {
      matchEvent: {
        findMany: jest.fn().mockResolvedValue([
          { type: EventType.goal },
          { type: EventType.assist },
          { type: EventType.yellow },
          { type: EventType.red },
          { type: EventType.mvp },
        ]),
      },
      lineupPlayer: {
        count: jest.fn().mockResolvedValue(3),
      },
    };

    const service = new StatsService(prisma as never);
    await expect(service.playerStats("player-1")).resolves.toEqual({
      playerId: "player-1",
      appearances: 3,
      goals: 1,
      assists: 1,
      yellowCards: 1,
      redCards: 1,
      mvps: 1,
    });
  });
});
