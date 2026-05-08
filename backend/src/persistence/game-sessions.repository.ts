import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  GameSessionEntity,
  SubmitGameSessionResultInput,
  createId
} from '../common/contracts';
import { InMemoryStore } from '../common/in-memory-store';
import { PrismaService } from './prisma.service';

export interface StoreGameSessionResult {
  session: GameSessionEntity;
  duplicate: boolean;
}

@Injectable()
export class GameSessionsRepository {
  constructor(
    private readonly store: InMemoryStore,
    private readonly prisma: PrismaService
  ) {}

  async submitResult(input: SubmitGameSessionResultInput): Promise<StoreGameSessionResult> {
    if (!this.prisma.client) {
      const existing = this.store.gameSessions.find(
        (session) => session.clientSessionKey === input.clientSessionId
      );
      if (existing) {
        return { session: existing, duplicate: true };
      }
      const now = new Date().toISOString();
      const session: GameSessionEntity = {
        id: createId('game_session'),
        clientSessionKey: input.clientSessionId,
        gameDefinitionId: input.gameDefinitionId,
        workoutSessionId: undefined,
        gameKey: input.gameKey,
        gameDefinitionVersion: input.gameDefinitionVersion,
        deviceId: input.deviceId,
        status: 'completed',
        startedAt: input.startedAt ?? now,
        endedAt: input.endedAt,
        durationSec: input.durationSec,
        score: input.score,
        combo: input.combo,
        accuracy: input.accuracy,
        calories: input.calories,
        gameVersion: input.gameDefinitionVersion,
        result: 'completed',
        resultPayload: input.resultPayload as GameSessionEntity['resultPayload'],
        createdAt: now,
        updatedAt: now
      };
      this.store.gameSessions.push(session);
      return { session, duplicate: false };
    }

    const existing = await this.prisma.client.gameSession.findUnique({
      where: { clientSessionKey: input.clientSessionId }
    });
    if (existing) {
      return { session: mapPersistedGameSession(existing), duplicate: true };
    }

    const now = new Date();
    const created = await this.prisma.client.gameSession.create({
      data: {
        id: createId('game_session'),
        clientSessionKey: input.clientSessionId,
        gameDefinitionId: input.gameDefinitionId ?? null,
        workoutSessionId: null,
        gameKey: input.gameKey,
        gameDefinitionVersion: input.gameDefinitionVersion ?? null,
        deviceId: input.deviceId ?? null,
        status: 'completed',
        startedAt: input.startedAt ? new Date(input.startedAt) : now,
        endedAt: input.endedAt ? new Date(input.endedAt) : null,
        durationSec: input.durationSec ?? null,
        score: input.score,
        combo: input.combo ?? null,
        accuracy: input.accuracy ?? null,
        calories: input.calories ?? null,
        gameVersion: input.gameDefinitionVersion ?? null,
        result: 'completed',
        resultPayload: input.resultPayload as Prisma.InputJsonValue
      }
    });
    return { session: mapPersistedGameSession(created), duplicate: false };
  }

  async createLegacy(entity: GameSessionEntity): Promise<GameSessionEntity> {
    if (!this.prisma.client) {
      const existing = entity.clientSessionKey
        ? this.store.gameSessions.find((entry) => entry.clientSessionKey === entity.clientSessionKey)
        : undefined;
      if (existing) return existing;
      this.store.gameSessions.push(entity);
      return entity;
    }

    if (entity.clientSessionKey) {
      const existing = await this.prisma.client.gameSession.findUnique({
        where: { clientSessionKey: entity.clientSessionKey }
      });
      if (existing) return mapPersistedGameSession(existing);
    }

    const created = await this.prisma.client.gameSession.create({
      data: {
        id: entity.id,
        clientSessionKey: entity.clientSessionKey ?? null,
        userId: entity.userId ?? null,
        gameDefinitionId: entity.gameDefinitionId ?? null,
        workoutSessionId: entity.workoutSessionId ?? null,
        gameKey: entity.gameKey ?? entity.gameDefinitionId,
        gameDefinitionVersion: entity.gameDefinitionVersion ?? entity.gameVersion ?? null,
        status: entity.status ?? 'active',
        startedAt: new Date(entity.startedAt),
        endedAt: entity.endedAt ? new Date(entity.endedAt) : null,
        score: entity.score ?? null,
        gameVersion: entity.gameVersion ?? null,
        result: entity.result ?? null,
        clientIntegrityHash: entity.clientIntegrityHash ?? null,
        resultPayload: entity.resultPayload
          ? (entity.resultPayload as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull
      }
    });
    return mapPersistedGameSession(created);
  }

  async updateLegacy(id: string, patch: Partial<GameSessionEntity>): Promise<GameSessionEntity | undefined> {
    if (!this.prisma.client) {
      const item = this.store.gameSessions.find((entry) => entry.id === id);
      if (!item) return undefined;
      Object.assign(item, patch);
      item.updatedAt = new Date().toISOString();
      return item;
    }

    const updated = await this.prisma.client.gameSession.update({
      where: { id },
      data: {
        endedAt: patch.endedAt ? new Date(patch.endedAt) : undefined,
        score: patch.score,
        gameVersion: patch.gameVersion,
        result: patch.result,
        clientIntegrityHash: patch.clientIntegrityHash,
        resultPayload: patch.resultPayload
          ? (patch.resultPayload as unknown as Prisma.InputJsonValue)
          : undefined
      }
    }).catch(() => null);
    return updated ? mapPersistedGameSession(updated) : undefined;
  }
}

function mapPersistedGameSession(session: {
  id: string;
  clientSessionKey: string | null;
  userId: string | null;
  gameDefinitionId: string | null;
  workoutSessionId: string | null;
  gameKey?: string | null;
  gameDefinitionVersion?: number | null;
  deviceId?: string | null;
  status?: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSec?: number | null;
  score: number | null;
  combo?: number | null;
  accuracy?: number | null;
  calories?: number | null;
  gameVersion: number | null;
  result: string | null;
  clientIntegrityHash: string | null;
  resultPayload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): GameSessionEntity {
  return {
    id: session.id,
    clientSessionKey: session.clientSessionKey ?? undefined,
    userId: session.userId ?? undefined,
    gameDefinitionId: session.gameDefinitionId ?? undefined,
    workoutSessionId: session.workoutSessionId ?? undefined,
    gameKey: session.gameKey ?? undefined,
    gameDefinitionVersion: session.gameDefinitionVersion ?? undefined,
    deviceId: session.deviceId ?? undefined,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString(),
    durationSec: session.durationSec ?? undefined,
    score: session.score ?? undefined,
    combo: session.combo ?? undefined,
    accuracy: session.accuracy ?? undefined,
    calories: session.calories ?? undefined,
    gameVersion: session.gameVersion ?? undefined,
    result: session.result ?? undefined,
    clientIntegrityHash: session.clientIntegrityHash ?? undefined,
    resultPayload: (session.resultPayload ?? undefined) as GameSessionEntity['resultPayload'],
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}
