import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly isEnabled: boolean;
  readonly client: PrismaClient | null;
  readonly mode: 'prisma' | 'memory';

  constructor() {
    const persistenceMode = process.env.PERSISTENCE_MODE ?? 'prisma';
    const allowFallback = process.env.ALLOW_IN_MEMORY_FALLBACK === 'true';
    const databaseUrl = process.env.DATABASE_URL;

    if (persistenceMode === 'prisma' && !databaseUrl) {
      if (allowFallback) {
        this.logger.warn(
          'PERSISTENCE_MODE=prisma but DATABASE_URL is missing. Falling back to in-memory storage because ALLOW_IN_MEMORY_FALLBACK=true.'
        );
        this.mode = 'memory';
        this.isEnabled = false;
        this.client = null;
        return;
      }
      throw new Error(
        'Persistent database is required (PERSISTENCE_MODE=prisma) but DATABASE_URL is missing. ' +
        'Set DATABASE_URL in backend/.env or set ALLOW_IN_MEMORY_FALLBACK=true for development.'
      );
    }

    if (persistenceMode === 'memory') {
      this.logger.warn('PERSISTENCE_MODE=memory. Running with in-memory storage. Data will NOT survive restart.');
      this.mode = 'memory';
      this.isEnabled = false;
      this.client = null;
      return;
    }

    this.mode = 'prisma';
    this.isEnabled = true;
    this.client = new PrismaClient();
    this.logger.log('Persistence mode: prisma. Database connected.');
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }
}
