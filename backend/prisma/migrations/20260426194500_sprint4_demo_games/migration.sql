ALTER TABLE "GameLevel"
ADD COLUMN "configJson" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "taskRulesJson" JSONB;

ALTER TABLE "GameSession"
ADD COLUMN "resultPayload" JSONB;
