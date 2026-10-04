-- AlterTable
ALTER TABLE "Ministry" ADD COLUMN "repertoireEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Song" (
    "id" UUID NOT NULL,
    "ministryId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongVersion" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT,
    "bpm" INTEGER,
    "durationSec" INTEGER,
    "notes" TEXT,
    "lyricsUrl" TEXT,
    "chordsUrl" TEXT,
    "audioUrl" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccurrenceSong" (
    "id" UUID NOT NULL,
    "occurrenceId" UUID NOT NULL,
    "songVersionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrenceSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Song_ministryId_title_idx" ON "Song"("ministryId", "title");

-- CreateIndex
CREATE INDEX "SongVersion_songId_idx" ON "SongVersion"("songId");

-- CreateIndex
CREATE INDEX "OccurrenceSong_occurrenceId_position_idx" ON "OccurrenceSong"("occurrenceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "OccurrenceSong_occurrenceId_songVersionId_key" ON "OccurrenceSong"("occurrenceId", "songVersionId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongVersion" ADD CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceSong" ADD CONSTRAINT "OccurrenceSong_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceSong" ADD CONSTRAINT "OccurrenceSong_songVersionId_fkey" FOREIGN KEY ("songVersionId") REFERENCES "SongVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

