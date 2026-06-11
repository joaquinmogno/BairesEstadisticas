-- Separate team identity (Club) from tournament participation (Team) and roster membership.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badgeUrl" TEXT,
    "colors" TEXT,
    "photoUrl" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Team" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Player" ADD COLUMN "clubId" TEXT;

CREATE TEMP TABLE "_TeamClubMap" AS
SELECT "id" AS "teamId", gen_random_uuid()::text AS "clubId"
FROM "Team";

INSERT INTO "Club" ("id", "name", "badgeUrl", "colors", "photoUrl", "category", "createdAt", "updatedAt")
SELECT "_TeamClubMap"."clubId", "Team"."name", "Team"."badgeUrl", "Team"."colors", "Team"."photoUrl", "Team"."category", "Team"."createdAt", "Team"."updatedAt"
FROM "Team"
JOIN "_TeamClubMap" ON "_TeamClubMap"."teamId" = "Team"."id";

UPDATE "Team"
SET "clubId" = "_TeamClubMap"."clubId"
FROM "_TeamClubMap"
WHERE "_TeamClubMap"."teamId" = "Team"."id";

UPDATE "Player"
SET "clubId" = "Team"."clubId"
FROM "Team"
WHERE "Player"."teamId" = "Team"."id";

DROP TABLE "_TeamClubMap";

ALTER TABLE "Team" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "Player" ALTER COLUMN "clubId" SET NOT NULL;

CREATE TABLE "RosterPlayer" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "number" INTEGER,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterPlayer_pkey" PRIMARY KEY ("id")
);

INSERT INTO "RosterPlayer" ("id", "teamId", "playerId", "number", "position", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "teamId", "id", "number", "position", "createdAt", "updatedAt"
FROM "Player";

CREATE UNIQUE INDEX "Team_tournamentId_clubId_key" ON "Team"("tournamentId", "clubId");
CREATE UNIQUE INDEX "RosterPlayer_teamId_playerId_key" ON "RosterPlayer"("teamId", "playerId");

ALTER TABLE "Team" ADD CONSTRAINT "Team_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RosterPlayer" ADD CONSTRAINT "RosterPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RosterPlayer" ADD CONSTRAINT "RosterPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
