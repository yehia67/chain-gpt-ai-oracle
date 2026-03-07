-- CreateEnum
CREATE TYPE "OracleActionType" AS ENUM ('BUY', 'SELL', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "TaskValidationStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'VERIFIED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskExecutionStatus" AS ENUM ('PENDING', 'PROCESSING', 'NO_ACTION', 'EXECUTED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "OracleTask" (
    "taskId" VARCHAR(64) NOT NULL,
    "action" "OracleActionType" NOT NULL,
    "sentiment" VARCHAR(16),
    "confidence" DOUBLE PRECISION,
    "rawResponse" TEXT,
    "dataHash" VARCHAR(66),
    "validationRequestId" BIGINT,
    "validationStatus" "TaskValidationStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "executionStatus" "TaskExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" VARCHAR(66),
    "validationProofUri" TEXT,
    "feedbackUri" TEXT,
    "errorMessage" TEXT,
    "newsPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleTask_pkey" PRIMARY KEY ("taskId")
);

-- CreateIndex
CREATE INDEX "OracleTask_validationStatus_executionStatus_idx" ON "OracleTask"("validationStatus", "executionStatus");

-- CreateIndex
CREATE INDEX "OracleTask_createdAt_idx" ON "OracleTask"("createdAt");
