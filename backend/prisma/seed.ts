import { Prisma, PrismaClient } from '@prisma/client';
import { seededGames } from '../src/common/contracts';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.gameDefinition.count();
  if (existing > 0) {
    console.log('Database already seeded, skipping.');
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
        segmentRuleJson: game.segmentRuleJson as Prisma.InputJsonValue,
        supportedMotions: game.supportedMotions as unknown as Prisma.InputJsonValue,
        assets: game.assets as unknown as Prisma.InputJsonValue,
        publishedAt: game.publishedAt ? new Date(game.publishedAt) : null,
        levels: {
          create: game.levels.map((level) => ({
            id: `${game.id}:${level.levelId}`,
            levelId: level.levelId,
            durationSec: level.durationSec,
            targetScore: level.targetScore,
            difficulty: level.difficulty,
            motionRules: level.motionRules as unknown as Prisma.InputJsonValue,
            rewardRules: level.rewardRules as unknown as Prisma.InputJsonValue,
            configJson: level.configJson as Prisma.InputJsonValue,
            sceneConfig: (level.sceneConfig ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            interactionRules: (level.interactionRules ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
            taskRulesJson: (level.taskRulesJson ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue
          }))
        }
      }
    });
  }
  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
