-- AlterTable
ALTER TABLE "Scorecard" ADD COLUMN     "councilConsensus" INTEGER,
ADD COLUMN     "councilVerdicts" JSONB,
ADD COLUMN     "pegRatio" DOUBLE PRECISION;
