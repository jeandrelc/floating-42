-- Add season column with default 1 (all existing weeks become Season 1)
ALTER TABLE "Week" ADD COLUMN "season" INTEGER NOT NULL DEFAULT 1;

-- Drop the old unique constraint on number alone
DROP INDEX IF EXISTS "Week_number_key";

-- Add the new composite unique constraint
CREATE UNIQUE INDEX "Week_season_number_key" ON "Week"("season", "number");
