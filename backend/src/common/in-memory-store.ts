import { Injectable } from '@nestjs/common';
import {
  AuditLogEntity,
  DeviceEntity,
  GameDefinitionEntity,
  GameSessionEntity,
  RewardGrantEntity,
  UserEntity,
  WorkoutSessionEntity,
  seededGames
} from './contracts';

@Injectable()
export class InMemoryStore {
  users: UserEntity[] = [];
  devices: DeviceEntity[] = [];
  workouts: WorkoutSessionEntity[] = [];
  gameSessions: GameSessionEntity[] = [];
  rewards: RewardGrantEntity[] = [];
  auditLogs: AuditLogEntity[] = [];
  gameDefinitions: GameDefinitionEntity[] = [...seededGames];

  recordAudit(entry: AuditLogEntity): void {
    this.auditLogs.unshift(entry);
  }
}
