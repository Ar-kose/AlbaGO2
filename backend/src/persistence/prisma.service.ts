import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly isEnabled: boolean;
  readonly client: PrismaClient | null;

  constructor() {
    this.isEnabled = Boolean(process.env.DATABASE_URL);
    this.client = this.isEnabled ? new PrismaClient() : null;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }
}
