-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ValuationVerdict" AS ENUM ('UNDERVALUED', 'OVERVALUED', 'FAIRLY_VALUED', 'INSUFFICIENT_DATA');

-- AlterTable
ALTER TABLE "Scorecard" ADD COLUMN     "recommendationScore" INTEGER,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "valuationVerdict" "ValuationVerdict" NOT NULL DEFAULT 'INSUFFICIENT_DATA';

