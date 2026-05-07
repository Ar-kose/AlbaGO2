import { Body, Controller, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { MotionType, SessionSource, createId } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';

class CreateWorkoutSessionDto {
  @IsString()
  @IsNotEmpty()
  clientSessionKey!: string;

  @IsString()
  @IsIn(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'])
  motionType!: MotionType;

  @IsString()
  @IsIn(['CAMERA'])
  source!: SessionSource;

  @IsString()
  @IsNotEmpty()
  startedAt!: string;
}

class UpdateWorkoutSessionDto {
  @IsOptional()
  @IsString()
  endedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalScore?: number;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'PAUSED', 'FINISHED'])
  status?: 'ACTIVE' | 'PAUSED' | 'FINISHED';

  @IsOptional()
  motionSummary?: Record<string, unknown>;
}

@Injectable()
class WorkoutsService {
  constructor(private readonly store: InMemoryStore) {}

  create(dto: CreateWorkoutSessionDto) {
    const existing = this.store.workouts.find(
      (item) => item.clientSessionKey === dto.clientSessionKey
    );
    if (existing) {
      return existing;
    }
    const session = {
      id: createId('workout'),
      status: 'ACTIVE' as const,
      ...dto
    };
    this.store.workouts.push(session);
    return session;
  }

  update(id: string, dto: UpdateWorkoutSessionDto) {
    const session = this.store.workouts.find((item) => item.id === id);
    if (!session) {
      return { error: 'workout_not_found' };
    }
    Object.assign(session, dto);
    return session;
  }
}

@ApiTags('workouts')
@Controller('workout-sessions')
class WorkoutsController {
  constructor(private readonly service: WorkoutsService) {}

  @Post()
  create(@Body() dto: CreateWorkoutSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkoutSessionDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [WorkoutsController],
  providers: [
    {
      provide: WorkoutsService,
      useFactory: (store: InMemoryStore) => new WorkoutsService(store),
      inject: [InMemoryStore]
    }
  ]
})
export class WorkoutsModule {}
