-- CreateEnum
CREATE TYPE "DataQuality" AS ENUM ('THIN', 'ADEQUATE', 'RICH');

-- AlterTable
ALTER TABLE "Scorecard" ADD COLUMN     "currentPrice" DOUBLE PRECISION,
ADD COLUMN     "dataQuality" "DataQuality" NOT NULL DEFAULT 'ADEQUATE',
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "sector" TEXT;

