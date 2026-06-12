import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { AdminRole, EventType, MatchPublicationStatus, MatchStatus, MediaType, PermissionModule, TournamentStatus, TournamentType } from "@prisma/client";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class AdminPermissionDto {
  @IsEnum(PermissionModule)
  module!: PermissionModule;

  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;
}

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminPermissionDto)
  permissions?: AdminPermissionDto[];
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminPermissionDto)
  permissions?: AdminPermissionDto[];
}

export class CreateVenueDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTournamentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;

  @IsOptional()
  @IsISO8601()
  startDate?: string;
}

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  tournamentId!: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  sourceTeamId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  sourcePlayerIds?: string[];

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @IsOptional()
  @IsString()
  colors?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @IsOptional()
  @IsString()
  colors?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsString()
  clubId?: string;
}

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  number?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  number?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CreateMatchdayDto {
  @IsString()
  @IsNotEmpty()
  tournamentId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateMatchDto {
  @IsString()
  @IsNotEmpty()
  tournamentId!: string;

  @IsOptional()
  @IsString()
  matchdayId?: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsString()
  @IsNotEmpty()
  homeTeamId!: string;

  @IsString()
  @IsNotEmpty()
  awayTeamId!: string;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsString()
  court?: string;
}

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsString()
  matchdayId?: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  homeTeamId?: string;

  @IsOptional()
  @IsString()
  awayTeamId?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsString()
  court?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsEnum(MatchPublicationStatus)
  publicationStatus?: MatchPublicationStatus;

  @IsOptional()
  @IsString()
  mvpPlayerId?: string;
}

export class EventDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsEnum(EventType)
  type!: EventType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  minute!: number;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  playId?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  minute?: number;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  playId?: string;
}

export class LineupPlayerDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @Type(() => Boolean)
  @IsBoolean()
  isStarter!: boolean;
}

export class SaveLineupDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LineupPlayerDto)
  players!: LineupPlayerDto[];
}

export class CreateMediaDto {
  @IsEnum(MediaType)
  type!: MediaType;

  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsString()
  alt?: string;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsString()
  alt?: string;
}
