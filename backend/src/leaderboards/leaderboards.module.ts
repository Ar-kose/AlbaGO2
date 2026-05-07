import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InMemoryStore } from '../common/in-memory-store';

@Injectable()
class LeaderboardsService {
  constructor(private readonly store: InMemoryStore) {}

  list(scope = 'GLOBAL', period = 'WEEKLY') {
    const items = this.store.gameSessions
      .filter((session) => typeof session.score === 'number')
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .map((session, index) => ({
        rank: index + 1,
        userId: session.userId ?? 'guest',
        score: session.score ?? 0,
        scope,
        period
      }));
    return { items };
  }
}

@ApiTags('leaderboards')
@Controller('leaderboards')
class LeaderboardsController {
  constructor(private readonly service: LeaderboardsService) {}

  @Get()
  get(
    @Query('scope') scope = 'GLOBAL',
    @Query('period') period = 'WEEKLY'
  ) {
    return this.service.list(scope, period);
  }
}

@Module({
  controllers: [LeaderboardsController],
  providers: [
    {
      provide: LeaderboardsService,
      useFactory: (store: InMemoryStore) => new LeaderboardsService(store),
      inject: [InMemoryStore]
    }
  ]
})
export class LeaderboardsModule {}
