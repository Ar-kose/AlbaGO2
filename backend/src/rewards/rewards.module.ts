import { Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { createId } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';

class RewardClaimDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  sourceType!: string;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsString()
  @IsNotEmpty()
  rewardType!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}

@Injectable()
class RewardsService {
  constructor(private readonly store: InMemoryStore) {}

  claim(dto: RewardClaimDto) {
    const existing = this.store.rewards.find(
      (reward) => reward.idempotencyKey === dto.idempotencyKey
    );
    if (existing) {
      return existing;
    }
    const reward = {
      id: createId('reward'),
      createdAt: new Date().toISOString(),
      ...dto
    };
    this.store.rewards.push(reward);
    return reward;
  }
}

@ApiTags('rewards')
@Controller('reward-claims')
class RewardsController {
  constructor(private readonly service: RewardsService) {}

  @Post()
  claim(@Body() dto: RewardClaimDto) {
    return this.service.claim(dto);
  }
}

@Module({
  controllers: [RewardsController],
  providers: [
    {
      provide: RewardsService,
      useFactory: (store: InMemoryStore) => new RewardsService(store),
      inject: [InMemoryStore]
    }
  ]
})
export class RewardsModule {}
