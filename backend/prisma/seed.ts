import { Prisma, PrismaClient } from '@prisma/client';
import { seededGames } from '../src/common/contracts';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.gameDefinition.count();
  if (existing > 0) {
    return;
  }

  for (const game of seededGames) {
    await prisma.gameDefinition.create({
      data: {
        id: game.id,
        gameKey: game.gameKey,
        version: game.version,
        templateKey: game.templateKey,
        title: game.title,
        description: game.description,
        status: game.status,
        minAppVersion: game.minAppVersion,
        orientation: game.orientation,
        cameraRequirement: game.cameraRequirement,
        segmentRuleJson: game.segmentRuleJson,
        supportedMotions: game.supportedMotions,
        assets: game.assets,
        publishedAt: game.publishedAt ? new Date(game.publishedAt) : null,
        levels: {
          create: game.levels.map((level) => ({
            id: `${game.id}:${level.levelId}`,
            levelId: level.levelId,
            durationSec: level.durationSec,
            targetScore: level.targetScore,
            difficulty: level.difficulty,
            motionRules: level.motionRules,
            rewardRules: level.rewardRules,
            configJson: level.configJson,
            sceneConfig: level.sceneConfig ?? Prisma.JsonNull,
            interactionRules: level.interactionRules ?? Prisma.JsonNull,
            taskRulesJson: level.taskRulesJson ?? Prisma.JsonNull
          }))
        }
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
