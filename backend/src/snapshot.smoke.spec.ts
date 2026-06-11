import { EventType, MatchStatus, TournamentStatus, TournamentType } from "@prisma/client";
import { AppController } from "./app.controller";

describe("Snapshot smoke flow", () => {
  it("interpreta los horarios de partidos sin zona como America/Argentina/Buenos_Aires", async () => {
    const prisma = {
      match: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "match-1", ...data })),
      },
    };
    const controller = new AppController(prisma as never, {} as never, {} as never);

    await controller.createMatch({
      tournamentId: "t-1",
      matchdayId: "md-1",
      homeTeamId: "team-1",
      awayTeamId: "team-2",
      startsAt: "2026-06-10T22:00:00",
      court: "Cancha 1",
    });

    expect(prisma.match.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        startsAt: new Date("2026-06-11T01:00:00.000Z"),
      }),
    }));
  });

  it("expone torneo, equipo y partido listos para renderizar en la web publica", async () => {
    const startsAt = new Date("2026-06-04T00:00:00.000Z");
    const prisma = {
      tournament: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "t-1",
            name: "Apertura",
            logoUrl: "http://localhost:4000/uploads/tournament-logos/apertura.png",
            category: "Futbol 5",
            season: "2026",
            startDate: new Date("2026-06-01T00:00:00.000Z"),
            endDate: null,
            rules: "Reglas base",
            status: TournamentStatus.live,
            type: TournamentType.league,
          },
        ]),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "team-1",
            tournamentId: "t-1",
            name: "Villa Luro",
            badgeUrl: "http://localhost:4000/uploads/team-badges/villa-luro.png",
            colors: "#16a34a,#0f172a",
            photoUrl: null,
            category: "Mayores",
          },
          {
            id: "team-2",
            tournamentId: "t-1",
            name: "Devoto",
            badgeUrl: null,
            colors: null,
            photoUrl: null,
            category: "Mayores",
          },
        ]),
      },
      player: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "player-1",
            teamId: "team-1",
            firstName: "Mateo",
            lastName: "Luna",
            number: 10,
            position: "Delantero",
            birthDate: new Date("1999-03-16T00:00:00.000Z"),
            photoUrl: null,
          },
        ]),
      },
      matchday: {
        findMany: jest.fn().mockResolvedValue([{ id: "md-1", tournamentId: "t-1", name: "Fecha 1", sortOrder: 1 }]),
      },
      match: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "match-1",
            tournamentId: "t-1",
            matchdayId: "md-1",
            startsAt,
            court: "Cancha 1",
            homeTeamId: "team-1",
            awayTeamId: "team-2",
            status: MatchStatus.finished,
            homeScore: 2,
            awayScore: 1,
            mvpPlayerId: "player-1",
            events: [
              { id: "e1", matchId: "match-1", playerId: "player-1", teamId: "team-1", type: EventType.goal, minute: 8, detail: null },
            ],
            lineup: [{ teamId: "team-1", playerId: "player-1", isStarter: true }],
          },
        ]),
      },
    };

    const stats = {
      scoreFromEvents: jest.fn().mockReturnValue({ home: 2, away: 1 }),
      tournamentRankings: jest.fn().mockResolvedValue({
        tournamentId: "t-1",
        goals: [],
        assists: [],
        yellowCards: [],
        redCards: [],
      }),
    };
    const controller = new AppController(prisma as never, stats as never, {} as never);

    const snapshot = await controller.snapshot();

    expect(snapshot.tournaments).toEqual([
      expect.objectContaining({
        id: "t-1",
        name: "Apertura",
        status: "live",
      }),
    ]);
    expect(snapshot.teams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "team-1",
          tournamentId: "t-1",
          badgeUrl: "http://localhost:4000/uploads/team-badges/villa-luro.png",
        }),
      ]),
    );
    expect(snapshot.matches).toEqual([
      expect.objectContaining({
        id: "match-1",
        date: "2026-06-03",
        time: "21:00",
        homeScore: 2,
        awayScore: 1,
        mvpPlayerId: "player-1",
        status: "final",
      }),
    ]);
    expect(snapshot.rankings).toEqual([
      expect.objectContaining({
        tournamentId: "t-1",
      }),
    ]);
  });
});
