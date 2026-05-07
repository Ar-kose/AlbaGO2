import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogEntity } from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditLogsRepository {
  constructor(
    private readonly store: InMemoryStore,
    private readonly prisma: PrismaService
  ) {}

  async list(): Promise<AuditLogEntity[]> {
    if (!this.prisma.client) {
      return this.store.auditLogs.slice();
    }
    const auditLogs = await this.prisma.client.auditLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return auditLogs.map((item) => ({
      id: item.id,
      actorId: item.actorId,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      beforeJson: item.beforeJson as Record<string, unknown> | undefined,
      afterJson: item.afterJson as Record<string, unknown> | undefined,
      createdAt: item.createdAt.toISOString()
    }));
  }

  async record(entry: AuditLogEntity): Promise<void> {
    if (!this.prisma.client) {
      this.store.recordAudit(entry);
      return;
    }
    await this.prisma.client.auditLog.create({
      data: {
        id: entry.id,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.beforeJson as Prisma.InputJsonValue | undefined,
        afterJson: entry.afterJson as Prisma.InputJsonValue | undefined,
        createdAt: new Date(entry.createdAt)
      }
    });
  }
}
