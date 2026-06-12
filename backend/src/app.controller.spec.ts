import { EventType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AppController } from "./app.controller";
import { StatsService } from "./stats.service";

jest.mock("bcryptjs");

describe("AppController", () => {
  it("autentica admin y devuelve JWT", async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ id: "admin-1", email: "admin@bairestorneos.com", name: null, passwordHash: "hash", role: "superuser", isActive: true, mustChangePassword: false, permissions: [] }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue("token") };
    const controller = new AppController(prisma as never, {} as never, jwt as never);

    await expect(controller.login({ email: "admin@bairestorneos.com", password: "admin123" })).resolves.toEqual({
      ok: true,
      accessToken: "token",
      user: { id: "admin-1", email: "admin@bairestorneos.com", name: null, role: "superuser", mustChangePassword: false, permissions: [] },
    });
  });

  it("rechaza credenciales invalidas", async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ id: "admin-1", email: "admin@bairestorneos.com", passwordHash: "hash" }),
      },
    };
    const controller = new AppController(prisma as never, {} as never, { signAsync: jest.fn() } as never);

    await expect(controller.login({ email: "admin@bairestorneos.com", password: "wrong" })).resolves.toEqual({
      ok: false,
      message: "Credenciales invalidas",
    });
  });

  it("rechaza usuarios desactivados", async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ id: "admin-1", email: "admin@bairestorneos.com", passwordHash: "hash", isActive: false, permissions: [] }),
        update: jest.fn(),
      },
    };
    const controller = new AppController(prisma as never, {} as never, { signAsync: jest.fn() } as never);

    await expect(controller.login({ email: "admin@bairestorneos.com", password: "admin123" })).resolves.toEqual({
      ok: false,
      message: "Usuario desactivado",
    });
  });

  it("agrega evento de partido y recalcula marcador", async () => {
    const createdEvent = { id: "event-1", matchId: "match-1", teamId: "team-a", playerId: "player-1", type: EventType.goal, minute: 9 };
    const prisma = {
      matchEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue(createdEvent),
      },
      rosterPlayer: {
        findUnique: jest.fn().mockResolvedValue({ teamId: "team-a", playerId: "player-1" }),
      },
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: "match-1",
          tournamentId: "t-1",
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          events: [
            { type: EventType.goal, teamId: "team-a" },
            { type: EventType.goal, teamId: "team-b" },
            { type: EventType.goal, teamId: "team-a" },
          ],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ id: "admin-1", role: "superuser", isActive: true, permissions: [] }),
      },
    };
    const stats = new StatsService({} as never);
    const controller = new AppController(prisma as never, stats, { signAsync: jest.fn() } as never);

    await expect(controller.addEvent({ user: { userId: "admin-1", email: "admin@bairestorneos.com", role: "superuser" } }, "match-1", { teamId: "team-a", playerId: "player-1", type: EventType.goal, minute: 9 })).resolves.toEqual(createdEvent);
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" },
      data: { homeScore: 2, awayScore: 1, mvpPlayerId: null },
    });
  });

  it("reemplaza el MVP anterior cuando se marca uno nuevo", async () => {
    const createdEvent = { id: "event-2", matchId: "match-1", teamId: "team-a", playerId: "player-2", type: EventType.mvp, minute: 20 };
    const prisma = {
      matchEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(createdEvent),
      },
      rosterPlayer: {
        findUnique: jest.fn().mockResolvedValue({ teamId: "team-a", playerId: "player-2" }),
      },
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: "match-1",
          tournamentId: "t-1",
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          events: [
            { type: EventType.goal, teamId: "team-a", playerId: "player-1" },
            { type: EventType.mvp, teamId: "team-a", playerId: "player-2" },
          ],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ id: "admin-1", role: "superuser", isActive: true, permissions: [] }),
      },
    };
    const controller = new AppController(
      prisma as never,
      new StatsService({} as never),
      { signAsync: jest.fn() } as never,
    );

    await expect(controller.addEvent({ user: { userId: "admin-1", email: "admin@bairestorneos.com", role: "superuser" } }, "match-1", { teamId: "team-a", playerId: "player-2", type: EventType.mvp, minute: 20 })).resolves.toEqual(createdEvent);
    expect(prisma.matchEvent.deleteMany).toHaveBeenCalledWith({ where: { matchId: "match-1", type: EventType.mvp } });
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: "match-1" },
      data: { homeScore: 1, awayScore: 0, mvpPlayerId: "player-2" },
    });
  });

  it("bloquea escritura fuera del alcance del organizador", async () => {
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: "organizer-1",
          role: "organizer",
          isActive: true,
          permissions: [{ module: "teams", tournamentId: "allowed-tournament", canRead: true, canWrite: true }],
        }),
      },
      club: {
        create: jest.fn(),
      },
      team: {
        create: jest.fn(),
      },
    };
    const controller = new AppController(prisma as never, new StatsService({} as never), { signAsync: jest.fn() } as never);

    await expect(controller.createTeam(
      { user: { userId: "organizer-1", email: "org@bairestorneos.com", role: "organizer" } },
      { tournamentId: "blocked-tournament", name: "Equipo bloqueado" },
    )).rejects.toThrow("No tenes permisos para esta operacion");
    expect(prisma.team.create).not.toHaveBeenCalled();
  });
});
