-- CreateEnum
CREATE TYPE "ConfidenceRead" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('WATCH', 'RESEARCH_FURTHER', 'PASS');

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "fundamentalsSummary" TEXT NOT NULL,
    "technicalsSummary" TEXT NOT NULL,
    "bullCase" TEXT NOT NULL,
    "bearCase" TEXT NOT NULL,
    "confidenceRead" "ConfidenceRead" NOT NULL,
    "riskFlags" TEXT[],
    "recommendation" "Recommendation" NOT NULL,
    "entryPriceEstimate" DOUBLE PRECISION,
    "fairValueEstimate" DOUBLE PRECISION,
    "targetsBasis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scorecard_candidateId_idx" ON "Scorecard"("candidateId");

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

