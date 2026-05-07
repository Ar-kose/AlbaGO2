import { Global, Module } from '@nestjs/common';
import { InMemoryStore } from '../common/in-memory-store';
import { AuditLogsRepository } from './audit-logs.repository';
import { GameDefinitionsRepository } from './game-definitions.repository';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [InMemoryStore, PrismaService, GameDefinitionsRepository, AuditLogsRepository],
  exports: [InMemoryStore, PrismaService, GameDefinitionsRepository, AuditLogsRepository]
})
export class PersistenceModule {}
