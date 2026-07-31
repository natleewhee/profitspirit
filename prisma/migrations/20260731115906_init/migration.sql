-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('AI_INFRA_SEMIS', 'NON_TECH_ASYMMETRIC', 'SGX', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NEW', 'RESEARCHED', 'ADDED_TO_WATCHLIST', 'ADDED_TO_PORTFOLIO', 'PASSED');

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "dateScanned" TIMESTAMP(3) NOT NULL,
    "theme" "Theme" NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);
