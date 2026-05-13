import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import {
  GameSessionEntity,
  SubmitGameSessionResultInput,
  SubmitGameSessionResultResponse,
  createId
} from '../common/contracts';
import { isScoreSubmissionSuspicious } from '../common/publish-validation';
import { GameSessionsRepository } from '../persistence/game-sessions.repository';

class CreateGameSessionDto {
  @IsOptional()
  @IsString()
  clientSessionId?: string;

  @IsOptional()
  @IsString()
  clientSessionKey?: string;

  @IsOptional()
  @IsString()
  gameKey?: string;

  @IsOptional()
  @IsString()
  gameDefinitionId?: string;

  @IsOptional()
  @IsInt()
  gameDefinitionVersion?: number;

  @IsOptional()
  @IsInt()
  gameVersion?: number;

  @IsOptional()
  @IsString()
  workoutSessionId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  endedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  @IsInt()
  @Min(0)
  score!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  combo?: number;

  @IsOptional()
  accuracy?: number;

  @IsOptional()
  calories?: number;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  clientIntegrityHash?: string;

  @IsOptional()
  @IsObject()
  resultPayload?: Record<string, unknown>;
}

class UpdateGameSessionDto {
  @IsOptional()
  @IsString()
  endedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gameVersion?: number;

  @IsOptional()
  @IsString()
  clientIntegrityHash?: string;

  @IsOptional()
  @IsObject()
  resultPayload?: Record<string, unknown>;
}

@Injectable()
export class GameSessionsService {
  constructor(private readonly repository: GameSessionsRepository) {}

  async submit(dto: CreateGameSessionDto): Promise<SubmitGameSessionResultResponse> {
    const input = normalizeSubmitDto(dto);
    const result = await this.repository.submitResult(input);
    return {
      id: result.session.id,
      clientSessionId: result.session.clientSessionKey ?? input.clientSessionId,
      status: result.duplicate ? 'duplicate_accepted' : 'stored',
      createdAt: result.session.createdAt ?? new Date().toISOString()
    };
  }

  async listByGame(gameDefinitionId: string) {
    const sessions = await this.repository.findByGameDefinitionId(gameDefinitionId);
    return sessions.map(mapSessionToResponse);
  }

  async getSummary() {
    const all = await this.repository.findAll();
    const sessions = all.map(mapSessionToResponse);
    const totalSessions = sessions.length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score ?? 0), 0);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
    const avgScore = totalSessions > 0 ? Math.round(totalScore / totalSessions) : 0;
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const completionRate = totalSessions > 0
      ? Math.round((sessions.filter(s => s.status === 'completed').length / totalSessions) * 100)
      : 0;

    // Per-game aggregation
    const byGame = new Map<string, { title: string; sessions: number; totalScore: number }>();
    for (const s of sessions) {
      const key = s.gameKey ?? 'unknown';
      const entry = byGame.get(key) ?? { title: key, sessions: 0, totalScore: 0 };
      entry.sessions += 1;
      entry.totalScore += s.score ?? 0;
      byGame.set(key, entry);
    }

    return {
      totalSessions,
      totalScore,
      totalDurationSec: totalDuration,
      avgScore,
      avgDurationSec: avgDuration,
      completionRate,
      perGame: Array.from(byGame.values()).sort((a, b) => b.sessions - a.sessions)
    };
  }

  async update(id: string, dto: UpdateGameSessionDto) {
    const existingStartedAt = undefined;
    if (dto.score !== undefined && dto.endedAt && existingStartedAt) {
      const durationMs =
        new Date(dto.endedAt).getTime() - new Date(existingStartedAt).getTime();
      if (isScoreSubmissionSuspicious(dto.score, durationMs)) {
        return {
          error: 'score_submission_flagged',
          reason: 'impossible_score_velocity'
        };
      }
    }

    const updated = await this.repository.updateLegacy(id, dto);
    return updated ?? { error: 'game_session_not_found' };
  }

  async createLegacy(dto: CreateGameSessionDto): Promise<GameSessionEntity> {
    const now = new Date().toISOString();
    const session: GameSessionEntity = {
      id: createId('game_session'),
      clientSessionKey: dto.clientSessionKey ?? dto.clientSessionId,
      gameDefinitionId: dto.gameDefinitionId,
      workoutSessionId: dto.workoutSessionId,
      gameKey: dto.gameKey ?? dto.gameDefinitionId,
      gameVersion: dto.gameVersion ?? dto.gameDefinitionVersion,
      status: 'active',
      startedAt: dto.startedAt ?? now,
      score: dto.score
    };
    return this.repository.createLegacy(session);
  }
}

@ApiTags('game-sessions')
@Controller('game-sessions')
class GameSessionsController {
  constructor(private readonly service: GameSessionsService) {}

  @Get('summary')
  async summary() {
    return this.service.getSummary();
  }

  @Get()
  async list(@Query('gameDefinitionId') gameDefinitionId?: string) {
    const items = gameDefinitionId
      ? await this.service.listByGame(gameDefinitionId)
      : [];
    return { items };
  }

  @Post()
  submit(@Body() dto: CreateGameSessionDto) {
    return this.service.submit(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameSessionDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [GameSessionsController],
  providers: [GameSessionsService]
})
export class GameSessionsModule {}

function normalizeSubmitDto(dto: CreateGameSessionDto): SubmitGameSessionResultInput {
  const clientSessionId = firstNonBlank(dto.clientSessionId, dto.clientSessionKey);
  if (!clientSessionId) {
    throw new BadRequestException('clientSessionId is required');
  }
  const gameKey = firstNonBlank(dto.gameKey);
  if (!gameKey) {
    throw new BadRequestException('gameKey is required');
  }
  if (!Number.isInteger(dto.score) || dto.score < 0) {
    throw new BadRequestException('score must be a non-negative integer');
  }
  if (dto.durationSec !== undefined && (!Number.isInteger(dto.durationSec) || dto.durationSec < 0)) {
    throw new BadRequestException('durationSec must be a non-negative integer');
  }
  if (dto.combo !== undefined && (!Number.isInteger(dto.combo) || dto.combo < 0)) {
    throw new BadRequestException('combo must be a non-negative integer');
  }
  if (dto.accuracy !== undefined && dto.accuracy !== null && !isFiniteNumber(dto.accuracy)) {
    throw new BadRequestException('accuracy must be numeric');
  }
  if (dto.calories !== undefined && dto.calories !== null && !isFiniteNumber(dto.calories)) {
    throw new BadRequestException('calories must be numeric');
  }
  assertIsoDate('startedAt', dto.startedAt);
  assertIsoDate('endedAt', dto.endedAt);

  const resultPayload = dto.resultPayload ?? {
    gameKey,
    score: dto.score,
    durationSec: dto.durationSec ?? 0
  };
  if (JSON.stringify(resultPayload).length > 32_000) {
    throw new BadRequestException('resultPayload is too large');
  }

  return {
    clientSessionId,
    gameKey,
    gameDefinitionId: dto.gameDefinitionId,
    gameDefinitionVersion: dto.gameDefinitionVersion ?? dto.gameVersion,
    deviceId: dto.deviceId,
    startedAt: dto.startedAt,
    endedAt: dto.endedAt,
    durationSec: dto.durationSec,
    score: dto.score,
    combo: dto.combo,
    accuracy: dto.accuracy,
    calories: dto.calories,
    resultPayload
  };
}

function firstNonBlank(...values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}

function assertIsoDate(field: string, value?: string) {
  if (!value) return;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`${field} must be a valid ISO timestamp`);
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mapSessionToResponse(session: GameSessionEntity) {
  return {
    id: session.id,
    clientSessionKey: session.clientSessionKey,
    gameDefinitionId: session.gameDefinitionId,
    gameKey: session.gameKey,
    gameDefinitionVersion: session.gameDefinitionVersion,
    deviceId: session.deviceId,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSec: session.durationSec,
    score: session.score,
    combo: session.combo,
    accuracy: session.accuracy,
    calories: session.calories,
    result: session.result,
    createdAt: session.createdAt
  };
}
