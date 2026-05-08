import { Global, Module } from '@nestjs/common';
import { InMemoryStore } from '../common/in-memory-store';
import { AuditLogsRepository } from './audit-logs.repository';
import { GameDefinitionsRepository } from './game-definitions.repository';
import { GameSessionsRepository } from './game-sessions.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [InMemoryStore, PrismaService, GameDefinitionsRepository, GameSessionsRepository, AuditLogsRepository],
  exports: [InMemoryStore, PrismaService, GameDefinitionsRepository, GameSessionsRepository, AuditLogsRepository]
})
export class PersistenceModule {}
