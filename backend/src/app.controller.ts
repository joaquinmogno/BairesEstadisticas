import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { EventType, MatchPublicationStatus, MatchStatus, MediaType, TournamentStatus, TournamentType } from "@prisma/client";
import {
  CreateMatchdayDto,
  CreateMatchDto,
  CreateMediaDto,
  CreatePlayerDto,
  CreateTeamDto,
  CreateTournamentDto,
  EventDto,
  LoginDto,
  SaveLineupDto,
  UpdateEventDto,
  UpdateMatchDto,
  UpdateMediaDto,
  UpdatePlayerDto,
  UpdateTeamDto,
  UpdateTournamentDto,
} from "./dto";
import { PrismaService } from "./prisma.service";
import { Public } from "./public.decorator";
import { StatsService } from "./stats.service";
import type { SnapshotPayload } from "./contracts";

const mediaFolders: Record<MediaType, string> = {
  team_badge: "team-badges",
  player_photo: "player-photos",
  team_photo: "team-photos",
  tournament_logo: "tournament-logos",
};
const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";
const APP_TIME_ZONE_OFFSET = "-03:00";

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Get("health")
  health() {
    return { status: "ok", service: "baires-torneos-api" };
  }

  @Public()
  @Post("auth/login")
  async login(@Body() body: LoginDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return { ok: false, message: "Credenciales invalidas" };
    }

    return {
      ok: true,
      accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      user: { id: user.id, email: user.email },
    };
  }

  @Public()
  @Get("snapshot")
  async snapshot(): Promise<SnapshotPayload> {
    const [tournaments, teams, players, matchdays, matches, rankings] = await Promise.all([
      this.prisma.tournament.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.team.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.player.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.matchday.findMany({ orderBy: { sortOrder: "asc" } }),
      this.prisma.match.findMany({ include: { events: true, lineup: true, matchday: true }, orderBy: { startsAt: "asc" } }),
      Promise.all(
        (await this.prisma.tournament.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } }))
          .map((tournament) => this.stats.tournamentRankings(tournament.id)),
      ),
    ]);

    return {
      tournaments: tournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        logo: tournament.logoUrl ?? undefined,
        category: tournament.category,
        season: tournament.season,
        startDate: toDate(tournament.startDate),
        endDate: toDate(tournament.endDate),
        rules: tournament.rules ?? undefined,
        status: tournament.status,
        type: tournament.type,
      })),
      teams: teams.map((team) => ({
        id: team.id,
        tournamentId: team.tournamentId,
        name: team.name,
        badge: initials(team.name),
        badgeUrl: team.badgeUrl ?? undefined,
        colors: team.colors ?? undefined,
        photoUrl: team.photoUrl ?? undefined,
        category: team.category ?? undefined,
      })),
      players: players.map((player) => ({
        id: player.id,
        teamId: player.teamId,
        name: player.firstName,
        lastName: player.lastName,
        number: player.number ?? undefined,
        position: player.position ?? undefined,
        birthDate: toDate(player.birthDate),
        photoUrl: player.photoUrl ?? undefined,
      })),
      matchdays: matchdays.map((matchday) => ({
        id: matchday.id,
        tournamentId: matchday.tournamentId,
        name: matchday.name,
        sortOrder: matchday.sortOrder,
      })),
      matches: matches.map((match) => ({
        id: match.id,
        tournamentId: match.tournamentId,
        matchdayId: match.matchdayId ?? undefined,
        matchdayName: match.matchday?.name ?? undefined,
        date: toDate(match.startsAt) ?? "",
        time: timeLabel(match.startsAt),
        court: match.court ?? "",
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        status: mapMatchStatus(match.status),
        publicationStatus: match.publicationStatus,
        homeScore: match.homeScore ?? this.stats.scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId).home,
        awayScore: match.awayScore ?? this.stats.scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId).away,
        mvpPlayerId: match.mvpPlayerId ?? undefined,
        events: match.events.map((event) => ({
          id: event.id,
          matchId: event.matchId,
          playId: event.playId ?? undefined,
          playerId: event.playerId ?? undefined,
          teamId: event.teamId,
          type: event.type,
          minute: event.minute,
          detail: event.detail ?? undefined,
        })),
        starters: lineupMap(match.lineup, true),
        substitutes: lineupMap(match.lineup, false),
      })),
      rankings,
    };
  }

  @Get("tournaments")
  tournaments() {
    return this.prisma.tournament.findMany({ include: { teams: true, matchdays: true }, orderBy: { createdAt: "asc" } });
  }

  @Post("tournaments")
  createTournament(@Body() body: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        name: body.name,
        category: body.category ?? "Futbol 5",
        season: body.season ?? "2026",
        type: body.type ?? TournamentType.league,
        status: TournamentStatus.scheduled,
        startDate: parseDateOnly(body.startDate),
      },
    });
  }

  @Patch("tournaments/:id")
  updateTournament(@Param("id") id: string, @Body() body: UpdateTournamentDto) {
    return this.prisma.tournament.update({ where: { id }, data: body });
  }

  @Delete("tournaments/:id")
  deleteTournament(@Param("id") id: string) {
    return this.prisma.tournament.delete({ where: { id } });
  }

  @Get("teams")
  teams() {
    return this.prisma.team.findMany({ include: { players: true, tournament: true }, orderBy: { createdAt: "asc" } });
  }

  @Post("teams")
  createTeam(@Body() body: CreateTeamDto) {
    return this.prisma.team.create({ data: body });
  }

  @Patch("teams/:id")
  updateTeam(@Param("id") id: string, @Body() body: UpdateTeamDto) {
    return this.prisma.team.update({ where: { id }, data: body });
  }

  @Delete("teams/:id")
  async deleteTeam(@Param("id") id: string) {
    const matches = await this.prisma.match.findMany({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
      select: { id: true },
    });
    await this.prisma.match.deleteMany({ where: { id: { in: matches.map((match) => match.id) } } });
    await this.prisma.player.deleteMany({ where: { teamId: id } });
    return this.prisma.team.delete({ where: { id } });
  }

  @Get("players")
  players() {
    return this.prisma.player.findMany({ include: { team: true }, orderBy: { createdAt: "asc" } });
  }

  @Post("players")
  createPlayer(@Body() body: CreatePlayerDto) {
    return this.prisma.player.create({
      data: {
        teamId: body.teamId,
        firstName: body.firstName,
        lastName: body.lastName ?? "",
        number: body.number,
        position: normalizePlayerPosition(body.position),
        birthDate: parseDateOnly(body.birthDate),
        photoUrl: body.photoUrl,
      },
    });
  }

  @Patch("players/:id")
  updatePlayer(@Param("id") id: string, @Body() body: UpdatePlayerDto) {
    return this.prisma.player.update({
      where: { id },
      data: {
        ...body,
        position: body.position !== undefined ? normalizePlayerPosition(body.position) : undefined,
        birthDate: parseDateOnly(body.birthDate),
      },
    });
  }

  @Delete("players/:id")
  async deletePlayer(@Param("id") id: string) {
    await this.prisma.match.updateMany({ where: { mvpPlayerId: id }, data: { mvpPlayerId: null } });
    await this.prisma.lineupPlayer.deleteMany({ where: { playerId: id } });
    await this.prisma.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: null } });
    return this.prisma.player.delete({ where: { id } });
  }

  @Post("matchdays")
  createMatchday(@Body() body: CreateMatchdayDto) {
    return this.prisma.matchday.create({ data: { tournamentId: body.tournamentId, name: body.name, sortOrder: body.sortOrder ?? 0 } });
  }

  @Delete("matchdays/:id")
  async deleteMatchday(@Param("id") id: string) {
    await this.prisma.match.deleteMany({ where: { matchdayId: id } });
    return this.prisma.matchday.delete({ where: { id } });
  }

  @Get("matches")
  matches() {
    return this.prisma.match.findMany({ include: { homeTeam: true, awayTeam: true, events: true, lineup: true, matchday: true }, orderBy: { startsAt: "asc" } });
  }

  @Post("matches")
  createMatch(@Body() body: CreateMatchDto) {
    return this.prisma.match.create({
      data: {
        tournamentId: body.tournamentId,
        matchdayId: body.matchdayId,
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        startsAt: parseDateTimeInAppTimeZone(body.startsAt),
        court: body.court,
      },
    });
  }

  @Patch("matches/:id")
  async updateMatch(@Param("id") id: string, @Body() body: UpdateMatchDto) {
    return this.prisma.match.update({
      where: { id },
      data: {
        tournamentId: body.tournamentId,
        matchdayId: body.matchdayId,
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        startsAt: body.startsAt ? parseDateTimeInAppTimeZone(body.startsAt) : undefined,
        court: body.court,
        status: body.status,
        publicationStatus: body.publicationStatus,
        mvpPlayerId: body.mvpPlayerId,
      },
    });
  }

  @Delete("matches/:id")
  deleteMatch(@Param("id") id: string) {
    return this.prisma.match.delete({ where: { id } });
  }

  @Post("matches/:id/events")
  async addEvent(@Param("id") matchId: string, @Body() body: EventDto) {
    if (body.type === EventType.mvp) {
      await this.prisma.matchEvent.deleteMany({ where: { matchId, type: EventType.mvp } });
    }
    const event = await this.prisma.matchEvent.create({
      data: { matchId, playId: body.playId, teamId: body.teamId, playerId: body.playerId, type: body.type, minute: body.minute, detail: body.detail },
    });
    await this.recalculateMatch(matchId);
    return event;
  }

  @Patch("matches/:matchId/events/:eventId")
  async updateEvent(@Param("matchId") matchId: string, @Param("eventId") eventId: string, @Body() body: UpdateEventDto) {
    if (body.type === EventType.mvp) {
      await this.prisma.matchEvent.deleteMany({ where: { matchId, type: EventType.mvp, id: { not: eventId } } });
    }
    const updated = await this.prisma.matchEvent.update({
      where: { id: eventId },
      data: {
        playId: body.playId,
        teamId: body.teamId,
        playerId: body.playerId,
        type: body.type,
        minute: body.minute,
        detail: body.detail,
      },
    });
    await this.recalculateMatch(matchId);
    return updated;
  }

  @Delete("matches/:matchId/events/:eventId")
  async deleteEvent(@Param("matchId") matchId: string, @Param("eventId") eventId: string) {
    const deleted = await this.prisma.matchEvent.delete({ where: { id: eventId } });
    await this.recalculateMatch(matchId);
    return deleted;
  }

  @Delete("matches/:matchId/plays/:playId")
  async deletePlay(@Param("matchId") matchId: string, @Param("playId") playId: string) {
    const deleted = await this.prisma.matchEvent.deleteMany({ where: { matchId, playId } });
    await this.recalculateMatch(matchId);
    return { deleted: deleted.count };
  }

  @Post("matches/:id/publish")
  async publishMatch(@Param("id") matchId: string) {
    await this.recalculateMatch(matchId);
    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.finished,
        publicationStatus: MatchPublicationStatus.published,
      },
    });
  }

  @Public()
  @Get("matches/:id/summary")
  async matchSummary(@Param("id") matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { events: true, homeTeam: true, awayTeam: true, matchday: true, tournament: true },
    });
    if (!match) throw new BadRequestException("Partido no encontrado");

    const goals = match.events.filter((event) => event.type === EventType.goal);
    const assists = match.events.filter((event) => event.type === EventType.assist);
    const yellowCards = match.events.filter((event) => event.type === EventType.yellow);
    const redCards = match.events.filter((event) => event.type === EventType.red);

    return {
      id: match.id,
      tournamentId: match.tournamentId,
      tournamentName: match.tournament.name,
      matchdayId: match.matchdayId ?? undefined,
      matchdayName: match.matchday?.name ?? undefined,
      status: mapMatchStatus(match.status),
      publicationStatus: match.publicationStatus,
      homeTeamId: match.homeTeamId,
      homeTeamName: match.homeTeam.name,
      awayTeamId: match.awayTeamId,
      awayTeamName: match.awayTeam.name,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      goals,
      assists,
      yellowCards,
      redCards,
      mvpPlayerId: match.mvpPlayerId ?? undefined,
    };
  }

  @Public()
  @Get("tournaments/:id/matchdays-with-matches")
  async matchdaysWithMatches(@Param("id") tournamentId: string) {
    const matchdays = await this.prisma.matchday.findMany({
      where: { tournamentId },
      include: {
        matches: {
          include: { events: true },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return matchdays.map((matchday) => ({
      id: matchday.id,
      name: matchday.name,
      sortOrder: matchday.sortOrder,
      matches: matchday.matches.map((match) => ({
        id: match.id,
        date: toDate(match.startsAt) ?? "",
        time: timeLabel(match.startsAt),
        court: match.court ?? "",
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        status: mapMatchStatus(match.status),
        publicationStatus: match.publicationStatus,
        homeScore: match.homeScore ?? this.stats.scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId).home,
        awayScore: match.awayScore ?? this.stats.scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId).away,
      })),
    }));
  }

  @Post("matches/:id/lineup")
  async saveLineup(@Param("id") matchId: string, @Body() body: SaveLineupDto) {
    await this.prisma.lineupPlayer.deleteMany({ where: { matchId } });
    if (!body.players.length) return [];
    return this.prisma.lineupPlayer.createMany({ data: body.players.map((player) => ({ ...player, matchId })) });
  }

  @Get("media")
  media() {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Post("media/upload")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: (req, _file, cb) => {
        const type = normalizeMediaType(req.body?.type);
        const folder = join(process.cwd(), "uploads", mediaFolders[type]);
        mkdirSync(folder, { recursive: true });
        cb(null, folder);
      },
      filename: (_req, file, cb) => {
        const cleanBase = file.originalname
          .replace(extname(file.originalname), "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60) || "image";
        cb(null, `${Date.now()}-${cleanBase}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        cb(new BadRequestException("Solo se permiten imagenes JPG, PNG o WEBP"), false);
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadMedia(@UploadedFile() file: Express.Multer.File, @Body() body: { type?: MediaType; alt?: string }) {
    if (!file) throw new BadRequestException("Archivo requerido");
    const type = normalizeMediaType(body.type);
    const publicUrl = `${process.env.API_PUBLIC_URL ?? "http://localhost:4000"}/uploads/${mediaFolders[type]}/${file.filename}`;
    return this.prisma.mediaAsset.create({
      data: {
        type,
        url: publicUrl,
        alt: body.alt ?? file.originalname,
      },
    });
  }

  @Post("media")
  createMedia(@Body() body: CreateMediaDto) {
    return this.prisma.mediaAsset.create({ data: body });
  }

  @Patch("media/:id")
  updateMedia(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    return this.prisma.mediaAsset.update({ where: { id }, data: body });
  }

  @Delete("media/:id")
  async deleteMedia(@Param("id") id: string) {
    const asset = await this.prisma.mediaAsset.delete({ where: { id } });
    const uploadPrefix = `${process.env.API_PUBLIC_URL ?? "http://localhost:4000"}/uploads/`;
    if (asset.url.startsWith(uploadPrefix)) {
      const filePath = join(process.cwd(), "uploads", asset.url.slice(uploadPrefix.length));
      await unlink(filePath).catch(() => undefined);
    }
    return asset;
  }

  @Public()
  @Get("tournaments/:id/standings")
  standings(@Param("id") tournamentId: string) {
    return this.stats.standings(tournamentId);
  }

  @Public()
  @Get("tournaments/:id/rankings")
  rankings(@Param("id") tournamentId: string) {
    return this.stats.tournamentRankings(tournamentId);
  }

  @Public()
  @Get("players/:id/stats")
  playerStats(@Param("id") playerId: string) {
    return this.stats.playerStats(playerId);
  }

  private async recalculateMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, include: { events: true } });
    if (!match) return;
    const score = this.stats.scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId);
    const mvpPlayerId = match.events.find((event) => event.type === EventType.mvp)?.playerId ?? null;
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: score.home,
        awayScore: score.away,
        mvpPlayerId,
      },
    });
  }
}

function toDate(value?: Date | null) {
  if (!value) return undefined;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : undefined;
}

function parseDateOnly(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00${APP_TIME_ZONE_OFFSET}`);
  }
  return new Date(trimmed);
}

function parseDateTimeInAppTimeZone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new BadRequestException("La fecha y hora del partido es obligatoria.");

  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const isLocalIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(normalized);
  const parsed = new Date(isLocalIsoDateTime && !hasExplicitZone ? `${normalized}${APP_TIME_ZONE_OFFSET}` : normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException("La fecha y hora del partido no tiene un formato valido.");
  }

  return parsed;
}

function normalizePlayerPosition(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Jugador";
  if (["arquero", "portero", "golero"].includes(normalized)) return "Arquero";
  return "Jugador";
}

function timeLabel(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function mapMatchStatus(status: MatchStatus) {
  const map: Record<MatchStatus, "pending" | "live" | "suspended" | "final"> = {
    scheduled: "pending",
    live: "live",
    suspended: "suspended",
    finished: "final",
  };
  return map[status];
}

function lineupMap(lineup: Array<{ teamId: string; playerId: string; isStarter: boolean }>, isStarter: boolean) {
  return lineup
    .filter((item) => item.isStarter === isStarter)
    .reduce<Record<string, string[]>>((acc, item) => {
      acc[item.teamId] = acc[item.teamId] ?? [];
      acc[item.teamId].push(item.playerId);
      return acc;
    }, {});
}

function normalizeMediaType(value?: string) {
  if (value === "team_badge" || value === "player_photo" || value === "team_photo" || value === "tournament_logo") return value;
  return MediaType.team_photo;
}
