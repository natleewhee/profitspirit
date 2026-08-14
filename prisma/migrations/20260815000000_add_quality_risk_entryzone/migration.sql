-- AlterTable
ALTER TABLE "Candidate" ALTER COLUMN "theme" DROP NOT NULL,
ALTER COLUMN "triggerReason" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Scorecard" ADD COLUMN     "entryZoneHigh" DOUBLE PRECISION,
ADD COLUMN     "entryZoneLow" DOUBLE PRECISION,
ADD COLUMN     "fiftyDayAverage" DOUBLE PRECISION,
ADD COLUMN     "fiftyTwoWeekHigh" DOUBLE PRECISION,
ADD COLUMN     "fiftyTwoWeekLow" DOUBLE PRECISION,
ADD COLUMN     "marketCap" DOUBLE PRECISION,
ADD COLUMN     "nextEarningsDate" TIMESTAMP(3),
ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "twoHundredDayAverage" DOUBLE PRECISION,
ADD COLUMN     "valuationScore" INTEGER;
