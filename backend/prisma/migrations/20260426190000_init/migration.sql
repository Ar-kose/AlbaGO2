CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "guestToken" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_guestToken_key" ON "User"("guestToken");

CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "installId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "pushToken" TEXT,
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Device_userId_idx" ON "Device"("userId");

CREATE TABLE "GameDefinition" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "minAppVersion" TEXT NOT NULL,
    "segmentRuleJson" JSONB NOT NULL,
    "supportedMotions" JSONB NOT NULL,
    "assets" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameDefinition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameDefinition_gameKey_idx" ON "GameDefinition"("gameKey");
CREATE INDEX "GameDefinition_status_idx" ON "GameDefinition"("status");

CREATE TABLE "GameLevel" (
    "id" TEXT NOT NULL,
    "gameDefinitionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "targetScore" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "motionRules" JSONB NOT NULL,
    "rewardRules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameLevel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameLevel_gameDefinitionId_idx" ON "GameLevel"("gameDefinitionId");

CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "clientSessionKey" TEXT,
    "userId" TEXT,
    "motionType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "totalScore" INTEGER,
    "status" TEXT NOT NULL,
    "motionSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutSession_clientSessionKey_key" ON "WorkoutSession"("clientSessionKey");

CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "clientSessionKey" TEXT,
    "userId" TEXT,
    "gameDefinitionId" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "score" INTEGER,
    "gameVersion" INTEGER,
    "result" TEXT,
    "clientIntegrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameSession_clientSessionKey_key" ON "GameSession"("clientSessionKey");

CREATE TABLE "RewardGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RewardGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RewardGrant_idempotencyKey_key" ON "RewardGrant"("idempotencyKey");

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameLevel" ADD CONSTRAINT "GameLevel_gameDefinitionId_fkey" FOREIGN KEY ("gameDefinitionId") REFERENCES "GameDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
