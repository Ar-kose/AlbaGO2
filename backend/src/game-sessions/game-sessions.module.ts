import { Body, Controller, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { createId } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';
import { isScoreSubmissionSuspicious } from '../common/publish-validation';

class CreateGameSessionDto {
  @IsString()
  @IsNotEmpty()
  clientSessionKey!: string;

  @IsString()
  @IsNotEmpty()
  gameDefinitionId!: string;

  @IsString()
  @IsNotEmpty()
  workoutSessionId!: string;

  @IsString()
  @IsNotEmpty()
  startedAt!: string;
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
class GameSessionsService {
  constructor(private readonly store: InMemoryStore) {}

  create(dto: CreateGameSessionDto) {
    const existing = this.store.gameSessions.find(
      (entry) => entry.clientSessionKey === dto.clientSessionKey
    );
    if (existing) {
      return existing;
    }
    const item = {
      id: createId('game_session'),
      ...dto
    };
    this.store.gameSessions.push(item);
    return item;
  }

  update(id: string, dto: UpdateGameSessionDto) {
    const item = this.store.gameSessions.find((entry) => entry.id === id);
    if (!item) return { error: 'game_session_not_found' };

    if (dto.score !== undefined && dto.endedAt) {
      const durationMs =
        new Date(dto.endedAt).getTime() - new Date(item.startedAt).getTime();
      if (isScoreSubmissionSuspicious(dto.score, durationMs)) {
        return {
          error: 'score_submission_flagged',
          reason: 'impossible_score_velocity'
        };
      }
    }

    Object.assign(item, dto);
    return item;
  }
}

@ApiTags('game-sessions')
@Controller('game-sessions')
class GameSessionsController {
  constructor(private readonly service: GameSessionsService) {}

  @Post()
  create(@Body() dto: CreateGameSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameSessionDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [GameSessionsController],
  providers: [
    {
      provide: GameSessionsService,
      useFactory: (store: InMemoryStore) => new GameSessionsService(store),
      inject: [InMemoryStore]
    }
  ]
})
export class GameSessionsModule {}
