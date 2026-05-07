import { Body, Controller, Get, Injectable, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';
import {
  GameDefinitionEntity,
  CameraRequirement,
  GameAssetEntity,
  GameCategory,
  GameOrientation,
  GameTemplateKey,
  InteractionRuleEntity,
  MotionType,
  ProgramStepEntity,
  PublishStatus,
  TaskRuleEntity,
  createId
} from '../common/contracts';
import { createAuditEntry, validateGameAccess, validateGameDefinition } from '../common/publish-validation';
import { AuditLogsRepository } from '../persistence/audit-logs.repository';
import { GameDefinitionsRepository } from '../persistence/game-definitions.repository';

const supportedTemplates: GameTemplateKey[] = [
  'TARGET_HIT',
  'ENDLESS_RUNNER',
  'FRUIT_SLASH',
  'DODGE_RUN',
  'FIT_CHALLENGE',
  'SCENE_PLAY'
];

class MotionRuleDto {
  @IsString()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'])
  motion!: MotionType;

  @IsString()
  @IsIn(['REP_COUNTED', 'BAD_FORM', 'USER_OUT_OF_FRAME', 'PAUSED', 'RESUMED'])
  event!: 'REP_COUNTED' | 'BAD_FORM' | 'USER_OUT_OF_FRAME' | 'PAUSED' | 'RESUMED';

  @IsInt()
  @Min(-200)
  points!: number;

  @IsInt()
  @Min(0)
  cooldownMs!: number;
}

class RewardRuleDto {
  @IsString()
  rewardType!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsInt()
  @Min(0)
  minimumScore!: number;
}

class TaskRuleDto {
  @IsString()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'])
  motion!: TaskRuleEntity['motion'];

  @IsInt()
  @Min(1)
  targetCount!: number;

  @IsInt()
  @Min(0)
  pointsPerRep!: number;
}

class ProgramStepDto {
  @IsString()
  @IsNotEmpty()
  stepId!: string;

  @IsString()
  @IsIn(['PLAY_GAME', 'MOTION_REPS', 'HOLD_POSE', 'REST', 'INSTRUCTION'])
  type!: ProgramStepEntity['type'];

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'])
  motion?: MotionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  holdSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSec?: number;

  @IsOptional()
  @IsString()
  successMessage?: string;

  @IsOptional()
  nextOnComplete?: boolean;
}

class SceneObjectPositionDto {
  @IsInt()
  x!: number;

  @IsInt()
  y!: number;
}

class SceneObjectSizeDto {
  @IsInt()
  @Min(1)
  width!: number;

  @IsInt()
  @Min(1)
  height!: number;
}

class InteractionRuleDto {
  @IsString()
  @IsIn(['MOTION_EVENT', 'POSE_CONTACT'])
  input!: InteractionRuleEntity['input'];

  @IsOptional()
  @IsString()
  @IsIn(['REP_COUNTED', 'BAD_FORM', 'USER_OUT_OF_FRAME', 'PAUSED', 'RESUMED'])
  event?: InteractionRuleEntity['event'];

  @IsOptional()
  @IsString()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'])
  motion?: MotionType;

  @IsOptional()
  @IsString()
  targetObjectType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keypoints?: string[];

  @IsString()
  @IsIn([
    'ADD_SCORE',
    'REMOVE_OBJECT',
    'RESET_COMBO',
    'DECREASE_LIFE',
    'PROGRESS_TASK',
    'PAUSE_GAME',
    'SHOW_EFFECT',
    'COMPLETE_LEVEL'
  ])
  action!: InteractionRuleEntity['action'];

  @IsOptional()
  @IsInt()
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownMs?: number;
}

class GameLevelDto {
  @IsString()
  @IsNotEmpty()
  levelId!: string;

  @IsInt()
  @Min(1)
  durationSec!: number;

  @IsInt()
  @Min(0)
  targetScore!: number;

  @IsString()
  difficulty!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MotionRuleDto)
  motionRules!: MotionRuleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RewardRuleDto)
  rewardRules!: RewardRuleDto[];

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sceneConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractionRuleDto)
  interactionRules?: InteractionRuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRuleDto)
  tasks?: TaskRuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramStepDto)
  programSteps?: ProgramStepDto[];
}

class GameAssetDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsIn(['IMAGE', 'AUDIO'])
  kind!: GameAssetEntity['kind'];

  @IsString()
  @IsIn(['PNG', 'WEBP', 'SVG', 'MP3'])
  format!: GameAssetEntity['format'];

  @IsString()
  @IsNotEmpty()
  uri!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsString()
  sha256?: string;

  @IsOptional()
  @IsInt()
  bytes?: number;

  @IsOptional()
  @IsString()
  createdAt?: string;
}

class AssetsDto {
  @IsString()
  background!: string;

  @IsString()
  character!: string;

  @IsOptional()
  @IsString()
  soundtrack?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameAssetDto)
  items?: GameAssetDto[];
}

class CreateGameDefinitionDto {
  @IsString()
  @IsNotEmpty()
  gameKey!: string;

  @IsString()
  @IsIn(supportedTemplates)
  template!: GameTemplateKey;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  minAppVersion!: string;

  @IsOptional()
  @IsString()
  @IsIn(['SPORT', 'FUN', 'EDUCATION'])
  category?: GameCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @IsIn(['PORTRAIT', 'LANDSCAPE'])
  orientation!: GameOrientation;

  @IsString()
  @IsIn(['FULL_BODY', 'UPPER_BODY', 'HAND_TARGET'])
  cameraRequirement!: CameraRequirement;

  @IsArray()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'], { each: true })
  supportedMotions!: MotionType[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameLevelDto)
  levels!: GameLevelDto[];

  @ValidateNested()
  @Type(() => AssetsDto)
  assets!: AssetsDto;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])
  status?: PublishStatus;

  @IsOptional()
  @IsObject()
  segmentRuleJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  actorId?: string;
}

class UpdateGameDefinitionDto {
  @IsOptional()
  @IsString()
  @IsIn(supportedTemplates)
  template?: GameTemplateKey;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  minAppVersion?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SPORT', 'FUN', 'EDUCATION'])
  category?: GameCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['PORTRAIT', 'LANDSCAPE'])
  orientation?: GameOrientation;

  @IsOptional()
  @IsString()
  @IsIn(['FULL_BODY', 'UPPER_BODY', 'HAND_TARGET'])
  cameraRequirement?: CameraRequirement;

  @IsOptional()
  @IsArray()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'], { each: true })
  supportedMotions?: MotionType[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GameLevelDto)
  levels?: GameLevelDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetsDto)
  assets?: AssetsDto;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])
  status?: PublishStatus;

  @IsOptional()
  @IsObject()
  segmentRuleJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  actorId?: string;
}

@Injectable()
class GamesService {
  constructor(
    private readonly gameDefinitionsRepository: GameDefinitionsRepository,
    private readonly auditLogsRepository: AuditLogsRepository
  ) {}

  async getAll() {
    const items = await this.gameDefinitionsRepository.listAll();
    return items
      .slice()
      .sort((left, right) => sortGames(left, right))
      .map(mapGameDefinitionToResponse);
  }

  async getById(id: string) {
    const game = await this.gameDefinitionsRepository.getById(id);
    return game ? mapGameDefinitionToResponse(game) : { error: 'game_not_found' };
  }

  async getActive(appVersion: string) {
    const items = await this.gameDefinitionsRepository.listAll();
    return items
      .filter((game) => !isInternalGame(game))
      .filter((game) => validateGameAccess(game, appVersion).length === 0)
      .sort((left, right) => sortGames(left, right))
      .map(mapGameDefinitionToResponse);
  }

  async create(dto: CreateGameDefinitionDto) {
    const entity: GameDefinitionEntity = {
      id: createId('game'),
      gameKey: dto.gameKey,
      version: 1,
      templateKey: dto.template,
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'DRAFT',
      minAppVersion: dto.minAppVersion,
      orientation: dto.orientation,
      cameraRequirement: dto.cameraRequirement,
      segmentRuleJson: withCatalogMeta(dto.segmentRuleJson, dto.category, dto.tags),
      supportedMotions: dto.supportedMotions,
      levels: dto.levels.map(mapLevelDto),
      assets: dto.assets
    };
    await this.gameDefinitionsRepository.save(entity);
    await this.auditLogsRepository.record(
      createAuditEntry(
        dto.actorId ?? 'admin@local',
        'create',
        'GameDefinition',
        entity.id,
        undefined,
        mapGameDefinitionToResponse(entity)
      )
    );
    return mapGameDefinitionToResponse(entity);
  }

  async update(id: string, dto: UpdateGameDefinitionDto) {
    const game = await this.gameDefinitionsRepository.getById(id);
    if (!game) return { error: 'game_not_found' };
    const before = mapGameDefinitionToResponse(game);
    const updated: GameDefinitionEntity = {
      ...game,
      templateKey: dto.template ?? game.templateKey,
      title: dto.title ?? game.title,
      description: dto.description ?? game.description,
      minAppVersion: dto.minAppVersion ?? game.minAppVersion,
      orientation: dto.orientation ?? game.orientation,
      cameraRequirement: dto.cameraRequirement ?? game.cameraRequirement,
      supportedMotions: dto.supportedMotions ?? game.supportedMotions,
      levels: dto.levels ? dto.levels.map(mapLevelDto) : game.levels,
      assets: dto.assets ?? game.assets,
      status: dto.status ?? game.status,
      segmentRuleJson: withCatalogMeta(
        dto.segmentRuleJson ?? game.segmentRuleJson,
        dto.category ?? readCategory(game.segmentRuleJson),
        dto.tags ?? readTags(game.segmentRuleJson)
      ),
      version: game.version + 1
    };
    await this.gameDefinitionsRepository.save(updated);
    await this.auditLogsRepository.record(
      createAuditEntry(
        dto.actorId ?? 'admin@local',
        'update',
        'GameDefinition',
        updated.id,
        before,
        mapGameDefinitionToResponse(updated)
      )
    );
    return mapGameDefinitionToResponse(updated);
  }

  async validation(id: string) {
    const game = await this.gameDefinitionsRepository.getById(id);
    if (!game) return { error: 'game_not_found' };
    return {
      id,
      errors: validateGameDefinition(game)
    };
  }
}

@ApiTags('games')
@Controller('game-definitions')
class GamesController {
  constructor(private readonly service: GamesService) {}

  @Get('active')
  async active(@Query('appVersion') appVersion = '0.1.0') {
    return {
      items: await this.service.getActive(appVersion)
    };
  }
}

@ApiTags('internal-games')
@Controller('internal/game-definitions')
class InternalGamesController {
  constructor(private readonly service: GamesService) {}

  @Get()
  async list() {
    return { items: await this.service.getAll() };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':id/validation')
  async validation(@Param('id') id: string) {
    return this.service.validation(id);
  }

  @Post()
  async create(@Body() dto: CreateGameDefinitionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGameDefinitionDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [GamesController, InternalGamesController],
  providers: [GamesService],
  exports: [GamesService]
})
export class GamesModule {}

function mapLevelDto(level: GameLevelDto): GameDefinitionEntity['levels'][number] {
  return {
    levelId: level.levelId,
    durationSec: level.durationSec,
    targetScore: level.targetScore,
    difficulty: level.difficulty,
    motionRules: level.motionRules,
    rewardRules: level.rewardRules,
    configJson: level.config ?? {},
    sceneConfig: level.sceneConfig ?? {},
    interactionRules: level.interactionRules ?? [],
    taskRulesJson: level.tasks ?? [],
    programSteps: level.programSteps ?? readProgramSteps(level.config)
  };
}

function isInternalGame(game: GameDefinitionEntity): boolean {
  return game.segmentRuleJson.internalOnly === true;
}

function templateRank(template: GameTemplateKey): number {
  return {
    FRUIT_SLASH: 0,
    DODGE_RUN: 1,
    FIT_CHALLENGE: 2,
    SCENE_PLAY: 3,
    TARGET_HIT: 4,
    ENDLESS_RUNNER: 5
  }[template];
}

function sortGames(left: GameDefinitionEntity, right: GameDefinitionEntity): number {
  const templateOrder = templateRank(left.templateKey) - templateRank(right.templateKey);
  if (templateOrder !== 0) {
    return templateOrder;
  }
  return right.version - left.version;
}

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
    category: readCategory(game.segmentRuleJson),
    tags: readTags(game.segmentRuleJson),
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
      tasks: level.taskRulesJson ?? [],
      programSteps: level.programSteps ?? readProgramSteps(level.configJson)
    })),
    assets: game.assets,
    publishedAt: game.publishedAt
  };
}

function withCatalogMeta(
  segmentRuleJson: Record<string, unknown> | undefined,
  category: GameCategory | undefined,
  tags: string[] | undefined
): Record<string, unknown> {
  return {
    audience: 'all',
    internalOnly: false,
    ...(segmentRuleJson ?? {}),
    category: category ?? readCategory(segmentRuleJson),
    tags: tags ?? readTags(segmentRuleJson)
  };
}

function readCategory(segmentRuleJson: Record<string, unknown> | undefined): GameCategory {
  const rawValue = segmentRuleJson?.category;
  return rawValue === 'SPORT' || rawValue === 'EDUCATION' || rawValue === 'FUN' ? rawValue : 'FUN';
}

function readTags(segmentRuleJson: Record<string, unknown> | undefined): string[] {
  const rawValue = segmentRuleJson?.tags;
  return Array.isArray(rawValue) ? rawValue.filter((item): item is string => typeof item === 'string') : [];
}

function readProgramSteps(configJson: Record<string, unknown> | undefined): ProgramStepEntity[] {
  const rawValue = configJson?.programSteps;
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item, index) => ({
      stepId: typeof item.stepId === 'string' ? item.stepId : `step_${index + 1}`,
      type: isProgramStepType(item.type) ? item.type : 'INSTRUCTION',
      title: typeof item.title === 'string' ? item.title : `Adim ${index + 1}`,
      description: typeof item.description === 'string' ? item.description : undefined,
      motion: isMotionType(item.motion) ? item.motion : undefined,
      targetCount: typeof item.targetCount === 'number' ? item.targetCount : undefined,
      holdSec: typeof item.holdSec === 'number' ? item.holdSec : undefined,
      durationSec: typeof item.durationSec === 'number' ? item.durationSec : undefined,
      successMessage: typeof item.successMessage === 'string' ? item.successMessage : undefined,
      nextOnComplete: typeof item.nextOnComplete === 'boolean' ? item.nextOnComplete : undefined
    }));
}

function isMotionType(value: unknown): value is MotionType {
  return value === 'SQUAT' || value === 'JUMPING_JACK' || value === 'JUMP_ROPE';
}

function isProgramStepType(value: unknown): value is ProgramStepEntity['type'] {
  return (
    value === 'PLAY_GAME' ||
    value === 'MOTION_REPS' ||
    value === 'HOLD_POSE' ||
    value === 'REST' ||
    value === 'INSTRUCTION'
  );
}
