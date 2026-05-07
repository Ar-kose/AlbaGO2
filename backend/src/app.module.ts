import { Module } from '@nestjs/common';
import { InMemoryStore } from './common/in-memory-store';
import { AssetsModule } from './assets/assets.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { ContentPublishModule } from './content-publish/content-publish.module';
import { DevicesConsentsModule } from './devices-consents/devices-consents.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { GamesModule } from './games/games.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { MotionsModule } from './motions/motions.module';
import { RewardsModule } from './rewards/rewards.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { PersistenceModule } from './persistence/persistence.module';

@Module({
  imports: [
    PersistenceModule,
    AuthModule,
    UsersModule,
    DevicesConsentsModule,
    MotionsModule,
    WorkoutsModule,
    GamesModule,
    GameSessionsModule,
    RewardsModule,
    LeaderboardsModule,
    ContentPublishModule,
    AssetsModule,
    AuditLogsModule
  ],
  providers: [InMemoryStore]
})
export class AppModule {}
