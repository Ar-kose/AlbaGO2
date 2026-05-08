ALTER TABLE "GameSession" ALTER COLUMN "gameDefinitionId" DROP NOT NULL;
ALTER TABLE "GameSession" ALTER COLUMN "workoutSessionId" DROP NOT NULL;
ALTER TABLE "GameSession" ADD COLUMN "gameKey" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "gameDefinitionVersion" INTEGER;
ALTER TABLE "GameSession" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "GameSession" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "GameSession" ADD COLUMN "combo" INTEGER;
ALTER TABLE "GameSession" ADD COLUMN "accuracy" DOUBLE PRECISION;
ALTER TABLE "GameSession" ADD COLUMN "calories" DOUBLE PRECISION;

CREATE INDEX "GameSession_gameKey_idx" ON "GameSession"("gameKey");
CREATE INDEX "GameSession_createdAt_idx" ON "GameSession"("createdAt");
