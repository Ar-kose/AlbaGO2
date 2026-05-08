import { BadRequestException } from '@nestjs/common';
import { InMemoryStore } from '../src/common/in-memory-store';
import { GameSessionsService } from '../src/game-sessions/game-sessions.module';
import { GameSessionsRepository } from '../src/persistence/game-sessions.repository';
import { PrismaService } from '../src/persistence/prisma.service';

describe('game session result submission', () => {
  let service: GameSessionsService;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    const store = new InMemoryStore();
    const prisma = new PrismaService();
    service = new GameSessionsService(new GameSessionsRepository(store, prisma));
  });

  it('stores a completed game session result', async () => {
    const result = await service.submit(validPayload());

    expect(result.status).toBe('stored');
    expect(result.clientSessionId).toBe('android-session-1');
    expect(result.id).toMatch(/^game_session_/);
    expect(result.createdAt).toBeTruthy();
  });

  it('accepts duplicate clientSessionId idempotently', async () => {
    const first = await service.submit(validPayload());
    const second = await service.submit({
      ...validPayload(),
      score: 999
    });

    expect(second.id).toBe(first.id);
    expect(second.status).toBe('duplicate_accepted');
    expect(second.clientSessionId).toBe(first.clientSessionId);
  });

  it('rejects invalid payloads', async () => {
    await expect(service.submit({ ...validPayload(), clientSessionId: '' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit({ ...validPayload(), gameKey: undefined }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit({ ...validPayload(), gameKey: '' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit({ ...validPayload(), score: 'bad' as unknown as number }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit({ ...validPayload(), durationSec: -1 }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submit({ ...validPayload(), startedAt: 'not-a-date' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts omitted optional fields', async () => {
    const result = await service.submit({
      clientSessionId: 'android-session-minimal',
      gameKey: 'fruit_slash_demo',
      score: 10,
      resultPayload: { score: 10 }
    });

    expect(result.status).toBe('stored');
    expect(result.clientSessionId).toBe('android-session-minimal');
  });

  it('persists result payload without requiring raw motion frames', async () => {
    const response = await service.submit(validPayload({
      resultPayload: {
        template: 'FRUIT_SLASH',
        motionSummary: { SQUAT: 2 },
        rawFrames: undefined
      }
    }));

    expect(response.status).toBe('stored');
  });
});

function validPayload(overrides: Record<string, unknown> = {}): any {
  return {
    clientSessionId: 'android-session-1',
    gameKey: 'fruit_slash_demo',
    gameDefinitionId: 'game_fruit_slash',
    gameDefinitionVersion: 1,
    deviceId: 'debug-install',
    startedAt: '2026-05-08T12:00:00.000Z',
    endedAt: '2026-05-08T12:01:00.000Z',
    durationSec: 60,
    score: 420,
    combo: 8,
    accuracy: 0.82,
    calories: 14,
    resultPayload: {
      template: 'FRUIT_SLASH',
      motionSummary: {
        SQUAT: 4,
        JUMPING_JACK: 18
      },
      programSteps: [],
      debugSource: 'unit_test'
    },
    ...overrides
  };
}
