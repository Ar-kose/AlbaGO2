import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GameDefinitionEntity, seededGames } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';
import { PrismaService } from './prisma.service';

type PersistedGameDefinition = Prisma.GameDefinitionGetPayload<{
  include: { levels: true };
}>;

@Injectable()
export class GameDefinitionsRepository {
  private seeded = false;

  constructor(
    private readonly store: InMemoryStore,
    private readonly prisma: PrismaService
  ) {}

  async listAll(): Promise<GameDefinitionEntity[]> {
    if (!this.prisma.client) {
      return this.store.gameDefinitions.slice();
    }
    await this.ensureSeeded();
    const definitions = await this.prisma.client.gameDefinition.findMany({
      include: { levels: true },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }]
    });
    return definitions.map(mapPersistedGameDefinition);
  }

  async getById(id: string): Promise<GameDefinitionEntity | undefined> {
    if (!this.prisma.client) {
      return this.store.gameDefinitions.find((item) => item.id === id);
    }
    await this.ensureSeeded();
    const definition = await this.prisma.client.gameDefinition.findUnique({
      where: { id },
      include: { levels: true }
    });
    return definition ? mapPersistedGameDefinition(definition) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    if (!this.prisma.client) {
      const idx = this.store.gameDefinitions.findIndex((item) => item.id === id);
      if (idx >= 0) {
        this.store.gameDefinitions.splice(idx, 1);
        return true;
      }
      return false;
    }
    await this.ensureSeeded();
    await this.prisma.client.gameDefinition.delete({ where: { id } });
    return true;
  }

  async save(entity: GameDefinitionEntity): Promise<GameDefinitionEntity> {
    if (!this.prisma.client) {
      const index = this.store.gameDefinitions.findIndex((item) => item.id === entity.id);
      if (index >= 0) {
        this.store.gameDefinitions[index] = entity;
      } else {
        this.store.gameDefinitions.unshift(entity);
      }
      return entity;
    }

    await this.ensureSeeded();
    await this.persist(entity);
    return entity;
  }

  private async persist(entity: GameDefinitionEntity) {
    if (!this.prisma.client) {
      return;
    }
    await this.prisma.client.$transaction(async (tx) => {
      await tx.gameDefinition.upsert({
        where: { id: entity.id },
        update: {
          gameKey: entity.gameKey,
          version: entity.version,
          templateKey: entity.templateKey,
          title: entity.title,
          description: entity.description,
          status: entity.status,
          minAppVersion: entity.minAppVersion,
          orientation: entity.orientation,
          cameraRequirement: entity.cameraRequirement,
          segmentRuleJson: entity.segmentRuleJson as Prisma.InputJsonValue,
          supportedMotions: entity.supportedMotions as unknown as Prisma.InputJsonValue,
          assets: entity.assets as unknown as Prisma.InputJsonValue,
          publishedAt: entity.publishedAt ? new Date(entity.publishedAt) : null
        },
        create: {
          id: entity.id,
          gameKey: entity.gameKey,
          version: entity.version,
          templateKey: entity.templateKey,
          title: entity.title,
          description: entity.description,
          status: entity.status,
          minAppVersion: entity.minAppVersion,
          orientation: entity.orientation,
          cameraRequirement: entity.cameraRequirement,
          segmentRuleJson: entity.segmentRuleJson as Prisma.InputJsonValue,
          supportedMotions: entity.supportedMotions as unknown as Prisma.InputJsonValue,
          assets: entity.assets as unknown as Prisma.InputJsonValue,
          publishedAt: entity.publishedAt ? new Date(entity.publishedAt) : null
        }
      });
      await tx.gameLevel.deleteMany({
        where: { gameDefinitionId: entity.id }
      });
      if (entity.levels.length > 0) {
        await tx.gameLevel.createMany({
          data: entity.levels.map((level) => ({
            id: `${entity.id}:${level.levelId}`,
            gameDefinitionId: entity.id,
            levelId: level.levelId,
            durationSec: level.durationSec,
            targetScore: level.targetScore,
            difficulty: level.difficulty,
            motionRules: level.motionRules as unknown as Prisma.InputJsonValue,
            rewardRules: level.rewardRules as unknown as Prisma.InputJsonValue,
            configJson: withProgramSteps(level.configJson, level.programSteps) as Prisma.InputJsonValue,
            sceneConfig: level.sceneConfig
              ? (level.sceneConfig as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            interactionRules: level.interactionRules
              ? (level.interactionRules as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            taskRulesJson: level.taskRulesJson
              ? (level.taskRulesJson as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull
          }))
        });
      }
    });
  }

  private async ensureSeeded() {
    if (!this.prisma.client || this.seeded) {
      return;
    }
    if (process.env.AUTO_SEED_DEMO_GAMES !== 'true') {
      this.seeded = true;
      return;
    }
    const count = await this.prisma.client.gameDefinition.count();
    if (count === 0) {
      this.seeded = true;
      for (const game of seededGames) {
        await this.persist(game);
      }
      return;
    }
    this.seeded = true;
  }
}

function mapPersistedGameDefinition(definition: PersistedGameDefinition): GameDefinitionEntity {
  return {
    id: definition.id,
    gameKey: definition.gameKey,
    version: definition.version,
    templateKey: definition.templateKey as GameDefinitionEntity['templateKey'],
    title: definition.title,
    description: definition.description,
    status: definition.status as GameDefinitionEntity['status'],
    minAppVersion: definition.minAppVersion,
    orientation: (definition.orientation as GameDefinitionEntity['orientation']) ?? 'PORTRAIT',
    cameraRequirement: (definition.cameraRequirement as GameDefinitionEntity['cameraRequirement']) ?? 'FULL_BODY',
    segmentRuleJson: definition.segmentRuleJson as Record<string, unknown>,
    supportedMotions: definition.supportedMotions as GameDefinitionEntity['supportedMotions'],
    levels: definition.levels.map((level) => ({
      levelId: level.levelId,
      durationSec: level.durationSec,
      targetScore: level.targetScore,
      difficulty: level.difficulty,
      motionRules: level.motionRules as unknown as GameDefinitionEntity['levels'][number]['motionRules'],
      rewardRules: level.rewardRules as unknown as GameDefinitionEntity['levels'][number]['rewardRules'],
      configJson: (level as { configJson?: Record<string, unknown> }).configJson ?? {},
      sceneConfig: ((level as unknown) as { sceneConfig?: Record<string, unknown> }).sceneConfig ?? {},
      interactionRules: ((level as unknown) as {
        interactionRules?: GameDefinitionEntity['levels'][number]['interactionRules'];
      }).interactionRules ?? [],
      taskRulesJson: ((level as unknown) as { taskRulesJson?: GameDefinitionEntity['levels'][number]['taskRulesJson'] })
        .taskRulesJson,
      programSteps: readProgramSteps((level as { configJson?: Record<string, unknown> }).configJson)
    })),
    assets: definition.assets as unknown as GameDefinitionEntity['assets'],
    publishedAt: definition.publishedAt?.toISOString()
  };
}

function withProgramSteps(
  configJson: Record<string, unknown>,
  programSteps: GameDefinitionEntity['levels'][number]['programSteps']
): Record<string, unknown> {
  return programSteps && programSteps.length > 0 ? { ...configJson, programSteps } : configJson;
}

function readProgramSteps(configJson?: Record<string, unknown>): GameDefinitionEntity['levels'][number]['programSteps'] {
  const rawValue = configJson?.programSteps;
  return Array.isArray(rawValue)
    ? (rawValue.filter((item) => typeof item === 'object' && item !== null) as NonNullable<
        GameDefinitionEntity['levels'][number]['programSteps']
      >)
    : [];
}
