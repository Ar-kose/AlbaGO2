import { Body, Controller, Get, Injectable, Module, Param, Post, UseGuards } from '@nestjs/common';
import { AdminTokenGuard } from '../common/admin-token.guard';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { GameDefinitionEntity } from '../common/contracts';
import { createAuditEntry } from '../common/publish-validation';
import { validateGameDefinition } from '../common/game-validation/validate-game-definition';
import { GameValidationResult } from '../common/game-validation/validation-result';
import { TEMPLATE_REGISTRY } from '../common/game-validation/game-template-registry';
import { AuditLogsRepository } from '../persistence/audit-logs.repository';
import { GameDefinitionsRepository } from '../persistence/game-definitions.repository';

class ContentPublishDto {
  @IsString()
  actorId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@Injectable()
class ContentPublishService {
  constructor(
    private readonly gameDefinitionsRepository: GameDefinitionsRepository,
    private readonly auditLogsRepository: AuditLogsRepository
  ) {}

  async publish(gameId: string, dto: ContentPublishDto) {
    const game = await this.gameDefinitionsRepository.getById(gameId);
    if (!game) return { error: 'game_not_found' };

    const validation = validateGameDefinition(game);
    if (!validation.publishable || validation.errors.length > 0) {
      return {
        published: false,
        validation: {
          valid: validation.valid,
          publishable: validation.publishable,
          errors: validation.errors,
          warnings: validation.warnings
        }
      };
    }

    const before = { status: game.status };
    const updated: GameDefinitionEntity = {
      ...game,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString()
    };
    await this.gameDefinitionsRepository.save(updated);
    await this.auditLogsRepository.record(
      createAuditEntry(dto.actorId, 'publish', 'GameDefinition', updated.id, before, {
        status: updated.status,
        note: dto.note
      })
    );

    return {
      published: true,
      game: mapGameDefinitionToResponse(updated),
      validation: {
        valid: validation.valid,
        publishable: validation.publishable,
        errors: validation.errors,
        warnings: validation.warnings
      }
    };
  }

  async rollback(gameId: string, dto: ContentPublishDto) {
    const game = await this.gameDefinitionsRepository.getById(gameId);
    if (!game) return { error: 'game_not_found' };
    const before = { status: game.status };
    const updated: GameDefinitionEntity = {
      ...game,
      status: 'REVIEW'
    };
    await this.gameDefinitionsRepository.save(updated);
    await this.auditLogsRepository.record(
      createAuditEntry(dto.actorId, 'rollback', 'GameDefinition', updated.id, before, {
        status: updated.status,
        note: dto.note
      })
    );
    return mapGameDefinitionToResponse(updated);
  }
}

@ApiTags('content-publish')
@Controller('internal/game-definitions')
@UseGuards(AdminTokenGuard)
class ContentPublishController {
  constructor(private readonly service: ContentPublishService) {}

  @Post(':gameId/publish')
  async publish(@Param('gameId') gameId: string, @Body() dto: ContentPublishDto) {
    return this.service.publish(gameId, dto);
  }

  @Post(':gameId/rollback')
  async rollback(@Param('gameId') gameId: string, @Body() dto: ContentPublishDto) {
    return this.service.rollback(gameId, dto);
  }

  @Get('templates')
  async templates() {
    const templates = Object.values(TEMPLATE_REGISTRY).map((meta) => ({
      template: meta.template,
      label: meta.label,
      supportLevel: meta.supportLevel,
      categoryCompatibility: meta.categoryCompatibility,
      mechanics: meta.mechanics,
      requiredCapabilities: meta.requiredCapabilities,
      supportedMotions: meta.supportedMotions,
      requiresCamera: meta.requiresCamera,
      allowedCameraRequirements: meta.allowedCameraRequirements,
      supportsAudio: meta.supportsAudio,
      requiredImageAssetKeys: meta.requiredImageAssetKeys,
      optionalImageAssetKeys: meta.optionalImageAssetKeys,
      minRuntimeVersion: meta.minRuntimeVersion
    }));
    return { templates };
  }

  @Post('validate')
  async validate(@Body() body: { gameDefinition: GameDefinitionEntity }) {
    const { gameDefinition } = body;
    if (!gameDefinition) return { error: 'missing gameDefinition' };

    const validation = validateGameDefinition(gameDefinition);
    return {
      valid: validation.valid,
      publishable: validation.publishable,
      errors: validation.errors,
      warnings: validation.warnings,
      summary: {
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      }
    };
  }
}

@Module({
  controllers: [ContentPublishController],
  providers: [ContentPublishService]
})
export class ContentPublishModule {}

function mapGameDefinitionToResponse(game: GameDefinitionEntity) {
  return {
    id: game.id,
    gameKey: game.gameKey,
    version: game.version,
    template: game.templateKey,
    title: game.title,
    description: game.description,
    status: game.status,
    minAppVersion: game.minAppVersion,
    orientation: game.orientation,
    cameraRequirement: game.cameraRequirement,
    supportedMotions: game.supportedMotions,
    levels: game.levels.map((level) => ({
      levelId: level.levelId,
      durationSec: level.durationSec,
      targetScore: level.targetScore,
      difficulty: level.difficulty,
      motionRules: level.motionRules,
      rewardRules: level.rewardRules,
      config: level.configJson,
      sceneConfig: level.sceneConfig ?? {},
      interactionRules: level.interactionRules ?? [],
      tasks: level.taskRulesJson ?? []
    })),
    assets: game.assets,
    publishedAt: game.publishedAt
  };
}
