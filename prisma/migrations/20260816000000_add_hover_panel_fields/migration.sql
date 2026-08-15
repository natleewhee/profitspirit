-- AlterTable
ALTER TABLE "Scorecard" ADD COLUMN     "analystTargetPrice" DOUBLE PRECISION,
ADD COLUMN     "dividendYield" DOUBLE PRECISION,
ADD COLUMN     "earningsGrowth" DOUBLE PRECISION,
ADD COLUMN     "forwardPE" DOUBLE PRECISION,
ADD COLUMN     "trailingPE" DOUBLE PRECISION;
