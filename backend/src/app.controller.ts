import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { AdminRole, EventType, MatchPublicationStatus, MatchStatus, MediaType, PermissionModule, TournamentStatus, TournamentType } from "@prisma/client";
import {
  AdminPermissionDto,
  CreateAdminUserDto,
  CreateMatchdayDto,
  CreateMatchDto,
  CreateMediaDto,
  CreatePlayerDto,
  CreateTeamDto,
  CreateTournamentDto,
  CreateVenueDto,
  EventDto,
  LoginDto,
  SaveLineupDto,
  UpdateAdminUserDto,
  UpdateEventDto,
  UpdateMatchDto,
  UpdateMediaDto,
  UpdatePlayerDto,
  UpdateTeamDto,
  UpdateTournamentDto,
  UpdateVenueDto,
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
type AuthRequest = { user?: { userId: string; email: string; role?: AdminRole } };

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
    const user = await this.prisma.adminUser.findUnique({
      where: { email: body.email.trim().toLowerCase() },
      include: { permissions: true },
    });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return { ok: false, message: "Credenciales invalidas" };
    }
    if (!user.isActive) {
      return { ok: false, message: "Usuario desactivado" };
    }

    await this.prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      ok: true,
      accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        permissions: user.permissions.map(toPermissionPayload),
      },
    };
  }

  @Get("auth/me")
  async me(@Req() request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      permissions: user.permissions.map(toPermissionPayload),
    };
  }

  @Get("admin-users")
  async adminUsers(@Req() request: AuthRequest) {
    await this.requireSuperuser(request);
    const users = await this.prisma.adminUser.findMany({
      include: { permissions: { include: { tournament: true, venue: true } }, createdBy: true },
      orderBy: { createdAt: "asc" },
    });
    return users.map(toAdminUserPayload);
  }

  @Post("admin-users")
  async createAdminUser(@Req() request: AuthRequest, @Body() body: CreateAdminUserDto) {
    const current = await this.requireSuperuser(request);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await this.prisma.adminUser.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name?.trim() || undefined,
        passwordHash,
        role: body.role ?? AdminRole.organizer,
        isActive: body.isActive ?? true,
        mustChangePassword: body.mustChangePassword ?? true,
        createdById: current.id,
        permissions: { create: normalizePermissionInput(body.permissions ?? []) },
      },
      include: { permissions: { include: { tournament: true, venue: true } }, createdBy: true },
    });
    return toAdminUserPayload(user);
  }

  @Patch("admin-users/:id")
  async updateAdminUser(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateAdminUserDto) {
    await this.requireSuperuser(request);
    const data: Record<string, unknown> = {
      email: body.email ? body.email.trim().toLowerCase() : undefined,
      name: body.name !== undefined ? body.name.trim() || null : undefined,
      role: body.role,
      isActive: body.isActive,
      mustChangePassword: body.mustChangePassword,
    };
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id },
        data: Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      });
      if (body.permissions) {
        await tx.adminPermission.deleteMany({ where: { userId: id } });
        if (body.permissions.length) {
          await tx.adminPermission.createMany({
            data: normalizePermissionInput(body.permissions).map((permission) => ({ ...permission, userId: id })),
          });
        }
      }
    });

    const user = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id },
      include: { permissions: { include: { tournament: true, venue: true } }, createdBy: true },
    });
    return toAdminUserPayload(user);
  }

  @Get("venues")
  async venues(@Req() request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    const venues = await this.prisma.venue.findMany({ orderBy: { createdAt: "asc" } });
    if (user.role === AdminRole.superuser) return venues;
    const allowedVenueIds = this.allowedVenueIds(user, PermissionModule.matches, false);
    return venues.filter((venue) => allowedVenueIds === "all" || allowedVenueIds.has(venue.id));
  }

  @Post("venues")
  async createVenue(@Req() request: AuthRequest, @Body() body: CreateVenueDto) {
    await this.requireSuperuser(request);
    return this.prisma.venue.create({
      data: {
        name: body.name.trim(),
        address: body.address?.trim() || undefined,
        city: body.city?.trim() || undefined,
        notes: body.notes?.trim() || undefined,
      },
    });
  }

  @Patch("venues/:id")
  async updateVenue(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateVenueDto) {
    await this.requireSuperuser(request);
    return this.prisma.venue.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        address: body.address !== undefined ? body.address.trim() || null : undefined,
        city: body.city !== undefined ? body.city.trim() || null : undefined,
        notes: body.notes !== undefined ? body.notes.trim() || null : undefined,
        isActive: body.isActive,
      },
    });
  }

  @Public()
  @Get("snapshot")
  async snapshot(): Promise<SnapshotPayload> {
    const [tournaments, clubs, teams, players, matchdays, matches, rankings] = await Promise.all([
      this.prisma.tournament.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.club.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.team.findMany({ include: { club: true }, orderBy: { createdAt: "asc" } }),
      this.prisma.player.findMany({ include: { rosters: true }, orderBy: { createdAt: "asc" } }),
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
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        badgeUrl: club.badgeUrl ?? undefined,
        colors: club.colors ?? undefined,
        photoUrl: club.photoUrl ?? undefined,
        category: club.category ?? undefined,
      })),
      teams: teams.map((team) => ({
        id: team.id,
        tournamentId: team.tournamentId,
        clubId: team.clubId,
        name: team.club.name,
        badge: initials(team.club.name),
        badgeUrl: team.club.badgeUrl ?? team.badgeUrl ?? undefined,
        colors: team.club.colors ?? team.colors ?? undefined,
        photoUrl: team.club.photoUrl ?? team.photoUrl ?? undefined,
        category: team.category ?? team.club.category ?? undefined,
      })),
      players: players.map((player) => ({
        id: player.id,
        teamId: player.teamId,
        clubId: player.clubId,
        teamIds: Array.from(new Set([player.teamId, ...player.rosters.map((roster) => roster.teamId)])),
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
        venueId: match.venueId ?? undefined,
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
  async tournaments(@Req() request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    const tournaments = await this.prisma.tournament.findMany({ include: { teams: true, matchdays: true }, orderBy: { createdAt: "asc" } });
    if (user.role === AdminRole.superuser) return tournaments;
    const allowed = this.allowedTournamentIds(user, PermissionModule.tournaments, false);
    return tournaments.filter((tournament) => allowed === "all" || allowed.has(tournament.id));
  }

  @Post("tournaments")
  async createTournament(@Req() request: AuthRequest, @Body() body: CreateTournamentDto) {
    await this.requireModuleAccess(request, PermissionModule.tournaments, { write: true });
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
  async updateTournament(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateTournamentDto) {
    await this.requireModuleAccess(request, PermissionModule.tournaments, { tournamentId: id, write: true });
    return this.prisma.tournament.update({ where: { id }, data: body });
  }

  @Delete("tournaments/:id")
  async deleteTournament(@Req() request: AuthRequest, @Param("id") id: string) {
    await this.requireModuleAccess(request, PermissionModule.tournaments, { tournamentId: id, write: true });
    const tournamentTeams = await this.prisma.team.findMany({ where: { tournamentId: id }, select: { id: true } });
    const teamIds = tournamentTeams.map((team) => team.id);
    const primaryPlayers = await this.prisma.player.findMany({
      where: { teamId: { in: teamIds } },
      include: { rosters: { where: { teamId: { notIn: teamIds } }, include: { team: true } } },
    });
    await Promise.all(primaryPlayers.map((player) => {
      const nextRoster = player.rosters[0];
      if (!nextRoster) return Promise.resolve();
      return this.prisma.player.update({
        where: { id: player.id },
        data: { teamId: nextRoster.teamId, clubId: nextRoster.team.clubId },
      });
    }));
    return this.prisma.tournament.delete({ where: { id } });
  }

  @Get("teams")
  async teams(@Req() request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    const teams = await this.prisma.team.findMany({ include: { club: true, roster: { include: { player: true } }, tournament: true }, orderBy: { createdAt: "asc" } });
    if (user.role === AdminRole.superuser) return teams;
    const allowed = this.allowedTournamentIds(user, PermissionModule.teams, false);
    return teams.filter((team) => allowed === "all" || allowed.has(team.tournamentId));
  }

  @Post("teams")
  async createTeam(@Req() request: AuthRequest, @Body() body: CreateTeamDto) {
    await this.requireModuleAccess(request, PermissionModule.teams, { tournamentId: body.tournamentId, write: true });
    if (body.sourceTeamId) {
      const sourceTeam = await this.prisma.team.findUnique({ where: { id: body.sourceTeamId }, select: { tournamentId: true } });
      if (sourceTeam) await this.requireModuleAccess(request, PermissionModule.teams, { tournamentId: sourceTeam.tournamentId, write: true });
    }
    const club = body.clubId
      ? await this.prisma.club.findUnique({ where: { id: body.clubId } })
      : await this.prisma.club.create({
          data: {
            name: body.name,
            badgeUrl: body.badgeUrl,
            colors: body.colors,
            photoUrl: body.photoUrl,
            category: body.category,
          },
        });
    if (!club) throw new BadRequestException("Club no encontrado");
    const team = await this.prisma.team.create({
      data: {
        tournamentId: body.tournamentId,
        clubId: club.id,
        name: body.name,
        badgeUrl: body.badgeUrl,
        colors: body.colors,
        photoUrl: body.photoUrl,
        category: body.category,
      },
    });
    if (body.sourceTeamId) {
      const sourceRoster = await this.prisma.rosterPlayer.findMany({
        where: {
          teamId: body.sourceTeamId,
          ...(Array.isArray(body.sourcePlayerIds) ? { playerId: { in: body.sourcePlayerIds } } : {}),
        },
      });
      if (sourceRoster.length) {
        await this.prisma.rosterPlayer.createMany({
          data: sourceRoster.map((roster) => ({
            teamId: team.id,
            playerId: roster.playerId,
            number: roster.number,
            position: roster.position,
          })),
          skipDuplicates: true,
        });
      }
    }
    return team;
  }

  @Patch("teams/:id")
  async updateTeam(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateTeamDto) {
    const current = await this.prisma.team.findUnique({ where: { id }, select: { tournamentId: true } });
    if (!current) throw new BadRequestException("Equipo no encontrado");
    await this.requireModuleAccess(request, PermissionModule.teams, { tournamentId: current.tournamentId, write: true });
    if (body.tournamentId && body.tournamentId !== current.tournamentId) {
      await this.requireModuleAccess(request, PermissionModule.teams, { tournamentId: body.tournamentId, write: true });
    }
    const team = await this.prisma.team.update({ where: { id }, data: body });
    const clubFields = {
      name: body.name,
      badgeUrl: body.badgeUrl,
      colors: body.colors,
      photoUrl: body.photoUrl,
      category: body.category,
    };
    if (Object.values(clubFields).some((value) => value !== undefined)) {
      await this.prisma.club.update({
        where: { id: team.clubId },
        data: Object.fromEntries(Object.entries(clubFields).filter(([, value]) => value !== undefined)),
      });
    }
    return team;
  }

  @Delete("teams/:id")
  async deleteTeam(@Req() request: AuthRequest, @Param("id") id: string) {
    const team = await this.prisma.team.findUnique({ where: { id }, select: { tournamentId: true } });
    if (!team) throw new BadRequestException("Equipo no encontrado");
    await this.requireModuleAccess(request, PermissionModule.teams, { tournamentId: team.tournamentId, write: true });
    const matches = await this.prisma.match.findMany({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
      select: { id: true },
    });
    const primaryPlayers = await this.prisma.player.findMany({
      where: { teamId: id },
      include: { rosters: { where: { teamId: { not: id } }, include: { team: true } } },
    });
    await Promise.all(primaryPlayers.map((player) => {
      const nextRoster = player.rosters[0];
      if (!nextRoster) return Promise.resolve();
      return this.prisma.player.update({
        where: { id: player.id },
        data: { teamId: nextRoster.teamId, clubId: nextRoster.team.clubId },
      });
    }));
    await this.prisma.match.deleteMany({ where: { id: { in: matches.map((match) => match.id) } } });
    await this.prisma.rosterPlayer.deleteMany({ where: { teamId: id } });
    return this.prisma.team.delete({ where: { id } });
  }

  @Get("players")
  async players(@Req() request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    const players = await this.prisma.player.findMany({ include: { club: true, rosters: { include: { team: true } }, team: true }, orderBy: { createdAt: "asc" } });
    if (user.role === AdminRole.superuser) return players;
    const allowed = this.allowedTournamentIds(user, PermissionModule.players, false);
    return players.filter((player) => allowed === "all" || player.rosters.some((roster) => allowed.has(roster.team.tournamentId)) || allowed.has(player.team.tournamentId));
  }

  @Post("players")
  async createPlayer(@Req() request: AuthRequest, @Body() body: CreatePlayerDto) {
    const team = await this.prisma.team.findUnique({ where: { id: body.teamId } });
    if (!team) throw new BadRequestException("Equipo no encontrado");
    await this.requireModuleAccess(request, PermissionModule.players, { tournamentId: team.tournamentId, write: true });
    const player = await this.prisma.player.create({
      data: {
        teamId: body.teamId,
        clubId: team.clubId,
        firstName: body.firstName,
        lastName: body.lastName ?? "",
        number: body.number,
        position: normalizePlayerPosition(body.position),
        birthDate: parseDateOnly(body.birthDate),
        photoUrl: body.photoUrl,
      },
    });
    await this.prisma.rosterPlayer.create({
      data: {
        teamId: body.teamId,
        playerId: player.id,
        number: body.number,
        position: normalizePlayerPosition(body.position),
      },
    });
    return player;
  }

  @Patch("players/:id")
  async updatePlayer(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdatePlayerDto) {
    const current = await this.prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!current) throw new BadRequestException("Jugador no encontrado");
    await this.requireModuleAccess(request, PermissionModule.players, { tournamentId: current.team.tournamentId, write: true });
    const targetTeam = body.teamId ? await this.prisma.team.findUnique({ where: { id: body.teamId } }) : null;
    if (body.teamId && !targetTeam) throw new BadRequestException("Equipo no encontrado");
    if (targetTeam && targetTeam.tournamentId !== current.team.tournamentId) {
      await this.requireModuleAccess(request, PermissionModule.players, { tournamentId: targetTeam.tournamentId, write: true });
    }
    const player = await this.prisma.player.update({
      where: { id },
      data: {
        ...body,
        clubId: body.clubId ?? targetTeam?.clubId,
        position: body.position !== undefined ? normalizePlayerPosition(body.position) : undefined,
        birthDate: parseDateOnly(body.birthDate),
      },
    });
    if (body.teamId) {
      await this.prisma.rosterPlayer.upsert({
        where: { teamId_playerId: { teamId: body.teamId, playerId: id } },
        create: { teamId: body.teamId, playerId: id, number: body.number, position: body.position !== undefined ? normalizePlayerPosition(body.position) : undefined },
        update: { number: body.number, position: body.position !== undefined ? normalizePlayerPosition(body.position) : undefined },
      });
    }
    return player;
  }

  @Delete("players/:id")
  async deletePlayer(@Req() request: AuthRequest, @Param("id") id: string) {
    const player = await this.prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) throw new BadRequestException("Jugador no encontrado");
    await this.requireModuleAccess(request, PermissionModule.players, { tournamentId: player.team.tournamentId, write: true });
    await this.prisma.match.updateMany({ where: { mvpPlayerId: id }, data: { mvpPlayerId: null } });
    await this.prisma.lineupPlayer.deleteMany({ where: { playerId: id } });
    await this.prisma.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: null } });
    return this.prisma.player.delete({ where: { id } });
  }

  @Post("matchdays")
  async createMatchday(@Req() request: AuthRequest, @Body() body: CreateMatchdayDto) {
    await this.requireModuleAccess(request, PermissionModule.matchdays, { tournamentId: body.tournamentId, write: true });
    return this.prisma.matchday.create({ data: { tournamentId: body.tournamentId, name: body.name, sortOrder: body.sortOrder ?? 0 } });
  }

  @Delete("matchdays/:id")
  async deleteMatchday(@Req() request: AuthRequest, @Param("id") id: string) {
    const matchday = await this.prisma.matchday.findUnique({ where: { id }, select: { tournamentId: true } });
    if (!matchday) throw new BadRequestException("Fecha no encontrada");
    await this.requireModuleAccess(request, PermissionModule.matchdays, { tournamentId: matchday.tournamentId, write: true });
    await this.prisma.match.deleteMany({ where: { matchdayId: id } });
    return this.prisma.matchday.delete({ where: { id } });
  }

  @Get("matches")
  async matches(@Req() request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    const matches = await this.prisma.match.findMany({ include: { homeTeam: true, awayTeam: true, events: true, lineup: true, matchday: true, venue: true }, orderBy: { startsAt: "asc" } });
    if (user.role === AdminRole.superuser) return matches;
    const allowed = this.allowedTournamentIds(user, PermissionModule.matches, false);
    const allowedVenues = this.allowedVenueIds(user, PermissionModule.matches, false);
    return matches.filter((match) => (
      (allowed === "all" || allowed.has(match.tournamentId))
      && (allowedVenues === "all" || (match.venueId ? allowedVenues.has(match.venueId) : false))
    ));
  }

  @Post("matches")
  async createMatch(@Req() request: AuthRequest, @Body() body: CreateMatchDto) {
    await this.requireModuleAccess(request, PermissionModule.matches, { tournamentId: body.tournamentId, venueId: body.venueId, write: true });
    return this.prisma.match.create({
      data: {
        tournamentId: body.tournamentId,
        matchdayId: body.matchdayId,
        venueId: body.venueId,
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        startsAt: parseDateTimeInAppTimeZone(body.startsAt),
        court: body.court,
      },
    });
  }

  @Patch("matches/:id")
  async updateMatch(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateMatchDto) {
    const current = await this.prisma.match.findUnique({ where: { id }, select: { tournamentId: true, venueId: true } });
    if (!current) throw new BadRequestException("Partido no encontrado");
    await this.requireModuleAccess(request, PermissionModule.matches, { tournamentId: current.tournamentId, venueId: current.venueId ?? undefined, write: true });
    const nextTournamentId = body.tournamentId ?? current.tournamentId;
    const nextVenueId = body.venueId ?? current.venueId ?? undefined;
    if (nextTournamentId !== current.tournamentId || nextVenueId !== (current.venueId ?? undefined)) {
      await this.requireModuleAccess(request, PermissionModule.matches, { tournamentId: nextTournamentId, venueId: nextVenueId, write: true });
    }
    return this.prisma.match.update({
      where: { id },
      data: {
        tournamentId: body.tournamentId,
        matchdayId: body.matchdayId,
        venueId: body.venueId,
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
  async deleteMatch(@Req() request: AuthRequest, @Param("id") id: string) {
    await this.requireMatchModuleAccess(request, id, PermissionModule.matches, true);
    return this.prisma.match.delete({ where: { id } });
  }

  @Post("matches/:id/events")
  async addEvent(@Req() request: AuthRequest, @Param("id") matchId: string, @Body() body: EventDto) {
    await this.requireMatchModuleAccess(request, matchId, PermissionModule.matches, true);
    await this.assertEventAllowed(matchId, body.teamId, body.playerId);
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
  async updateEvent(@Req() request: AuthRequest, @Param("matchId") matchId: string, @Param("eventId") eventId: string, @Body() body: UpdateEventDto) {
    await this.requireMatchModuleAccess(request, matchId, PermissionModule.matches, true);
    if (body.teamId || body.playerId) {
      const current = await this.prisma.matchEvent.findUnique({ where: { id: eventId } });
      await this.assertEventAllowed(matchId, body.teamId ?? current?.teamId ?? "", body.playerId ?? current?.playerId ?? undefined);
    }
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
  async deleteEvent(@Req() request: AuthRequest, @Param("matchId") matchId: string, @Param("eventId") eventId: string) {
    await this.requireMatchModuleAccess(request, matchId, PermissionModule.matches, true);
    const deleted = await this.prisma.matchEvent.delete({ where: { id: eventId } });
    await this.recalculateMatch(matchId);
    return deleted;
  }

  @Delete("matches/:matchId/plays/:playId")
  async deletePlay(@Req() request: AuthRequest, @Param("matchId") matchId: string, @Param("playId") playId: string) {
    await this.requireMatchModuleAccess(request, matchId, PermissionModule.matches, true);
    const deleted = await this.prisma.matchEvent.deleteMany({ where: { matchId, playId } });
    await this.recalculateMatch(matchId);
    return { deleted: deleted.count };
  }

  @Post("matches/:id/publish")
  async publishMatch(@Req() request: AuthRequest, @Param("id") matchId: string) {
    await this.requireMatchModuleAccess(request, matchId, PermissionModule.matches, true);
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
        venueId: match.venueId ?? undefined,
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
  async saveLineup(@Req() request: AuthRequest, @Param("id") matchId: string, @Body() body: SaveLineupDto) {
    await this.requireMatchModuleAccess(request, matchId, PermissionModule.matches, true);
    await this.prisma.lineupPlayer.deleteMany({ where: { matchId } });
    if (!body.players.length) return [];
    await Promise.all(body.players.map((player) => this.assertEventAllowed(matchId, player.teamId, player.playerId)));
    return this.prisma.lineupPlayer.createMany({ data: body.players.map((player) => ({ ...player, matchId })) });
  }

  @Get("media")
  async media(@Req() request: AuthRequest) {
    await this.requireModuleAccess(request, PermissionModule.media, { write: false });
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
  async uploadMedia(@Req() request: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: { type?: MediaType; alt?: string }) {
    await this.requireModuleAccess(request, PermissionModule.media, { write: true });
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
  async createMedia(@Req() request: AuthRequest, @Body() body: CreateMediaDto) {
    await this.requireModuleAccess(request, PermissionModule.media, { write: true });
    return this.prisma.mediaAsset.create({ data: body });
  }

  @Patch("media/:id")
  async updateMedia(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateMediaDto) {
    await this.requireModuleAccess(request, PermissionModule.media, { write: true });
    return this.prisma.mediaAsset.update({ where: { id }, data: body });
  }

  @Delete("media/:id")
  async deleteMedia(@Req() request: AuthRequest, @Param("id") id: string) {
    await this.requireModuleAccess(request, PermissionModule.media, { write: true });
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

  private async assertEventAllowed(matchId: string, teamId: string, playerId?: string | null) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, select: { homeTeamId: true, awayTeamId: true } });
    if (!match) throw new BadRequestException("Partido no encontrado");
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      throw new BadRequestException("El equipo no pertenece a este partido");
    }
    if (!playerId) return;
    const roster = await this.prisma.rosterPlayer.findUnique({ where: { teamId_playerId: { teamId, playerId } } });
    if (!roster) {
      throw new BadRequestException("El jugador no esta habilitado en el plantel de esta competicion");
    }
  }

  private async requireCurrentUser(request: AuthRequest) {
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException("Sesion invalida");
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });
    if (!user || !user.isActive) throw new ForbiddenException("Usuario sin acceso");
    return user;
  }

  private async requireSuperuser(request: AuthRequest) {
    const user = await this.requireCurrentUser(request);
    if (user.role !== AdminRole.superuser) {
      throw new ForbiddenException("Solo un superusuario puede realizar esta accion");
    }
    return user;
  }

  private async requireModuleAccess(
    request: AuthRequest,
    module: PermissionModule,
    options: { tournamentId?: string; venueId?: string; write: boolean },
  ) {
    const user = await this.requireCurrentUser(request);
    if (user.role === AdminRole.superuser) return user;

    const permission = user.permissions.find((item) => {
      if (item.module !== module) return false;
      if (options.write && !item.canWrite) return false;
      if (!options.write && !item.canRead) return false;
      if (options.tournamentId && item.tournamentId && item.tournamentId !== options.tournamentId) return false;
      if (options.venueId && item.venueId && item.venueId !== options.venueId) return false;
      return true;
    });

    if (!permission) {
      throw new ForbiddenException("No tenes permisos para esta operacion");
    }
    return user;
  }

  private async requireMatchModuleAccess(request: AuthRequest, matchId: string, module: PermissionModule, write: boolean) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, select: { tournamentId: true, venueId: true } });
    if (!match) throw new BadRequestException("Partido no encontrado");
    return this.requireModuleAccess(request, module, { tournamentId: match.tournamentId, venueId: match.venueId ?? undefined, write });
  }

  private allowedTournamentIds(user: Awaited<ReturnType<AppController["requireCurrentUser"]>>, module: PermissionModule, write: boolean) {
    const modulePermissions = user.permissions.filter((permission) => (
      permission.module === module
      && (write ? permission.canWrite : permission.canRead)
    ));
    if (modulePermissions.some((permission) => !permission.tournamentId)) return "all" as const;
    return new Set(modulePermissions.map((permission) => permission.tournamentId).filter(Boolean) as string[]);
  }

  private allowedVenueIds(user: Awaited<ReturnType<AppController["requireCurrentUser"]>>, module: PermissionModule, write: boolean) {
    const modulePermissions = user.permissions.filter((permission) => (
      permission.module === module
      && (write ? permission.canWrite : permission.canRead)
    ));
    if (modulePermissions.some((permission) => !permission.venueId)) return "all" as const;
    return new Set(modulePermissions.map((permission) => permission.venueId).filter(Boolean) as string[]);
  }
}

function normalizePermissionInput(permissions: AdminPermissionDto[]) {
  return permissions.map((permission) => ({
    module: permission.module,
    tournamentId: permission.tournamentId || undefined,
    venueId: permission.venueId || undefined,
    canRead: permission.canRead ?? true,
    canWrite: permission.canWrite ?? true,
  }));
}

function toPermissionPayload(permission: {
  id: string;
  module: PermissionModule;
  tournamentId?: string | null;
  venueId?: string | null;
  canRead: boolean;
  canWrite: boolean;
  tournament?: { id: string; name: string } | null;
  venue?: { id: string; name: string } | null;
}) {
  return {
    id: permission.id,
    module: permission.module,
    tournamentId: permission.tournamentId ?? undefined,
    tournamentName: permission.tournament?.name,
    venueId: permission.venueId ?? undefined,
    venueName: permission.venue?.name,
    canRead: permission.canRead,
    canWrite: permission.canWrite,
  };
}

function toAdminUserPayload(user: {
  id: string;
  email: string;
  name?: string | null;
  role: AdminRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  createdBy?: { id: string; email: string; name?: string | null } | null;
  permissions: Array<Parameters<typeof toPermissionPayload>[0]>;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    createdBy: user.createdBy ? {
      id: user.createdBy.id,
      email: user.createdBy.email,
      name: user.createdBy.name ?? undefined,
    } : undefined,
    permissions: user.permissions.map(toPermissionPayload),
  };
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

function parseDateOnly(value?: string | null) {
  if (value === null) return null;
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const dayMonthYear = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00${APP_TIME_ZONE_OFFSET}`);
  }
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
