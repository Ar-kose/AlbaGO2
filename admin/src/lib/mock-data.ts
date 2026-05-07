export const dashboardMetrics = [
  { label: 'Published Games', value: '2', detail: 'Target Hit and Endless Runner templates live' },
  { label: 'Draft Variants', value: '3', detail: 'Waiting for art or min version review' },
  { label: 'Audit Events', value: '14', detail: 'Publish and rollback actions in the last 7 days' },
  { label: 'Motion Coverage', value: '3', detail: 'Squat, Jumping Jack, Jump Rope' }
];

export const gameDefinitions = [
  {
    id: 'dragon_jump_001',
    title: 'Ejderhayi Durdur',
    template: 'TARGET_HIT',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    motions: ['SQUAT', 'JUMPING_JACK'],
    publishHealth: 'Ready'
  },
  {
    id: 'runner_boost_001',
    title: 'Kosucu Enerji',
    template: 'ENDLESS_RUNNER',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    motions: ['JUMP_ROPE'],
    publishHealth: 'Ready'
  },
  {
    id: 'boss_burst_001',
    title: 'Boss Patlamasi',
    template: 'TARGET_HIT',
    status: 'REVIEW',
    minAppVersion: '0.2.0',
    motions: ['SQUAT'],
    publishHealth: 'Missing soundtrack'
  }
];

export const publishQueue = [
  {
    id: 'boss_burst_001',
    scheduledFor: '2026-05-02 10:00',
    status: 'REVIEW',
    blocker: 'Asset completeness check failed'
  },
  {
    id: 'runner_boost_002',
    scheduledFor: '2026-05-05 18:00',
    status: 'SCHEDULED',
    blocker: 'None'
  }
];

export const auditEvents = [
  {
    actor: 'admin@albago.local',
    action: 'publish',
    entity: 'GameDefinition',
    entityId: 'dragon_jump_001',
    timestamp: '2026-04-25T12:40:00Z'
  },
  {
    actor: 'producer@albago.local',
    action: 'rollback',
    entity: 'GameDefinition',
    entityId: 'boss_burst_001',
    timestamp: '2026-04-26T09:20:00Z'
  }
];
