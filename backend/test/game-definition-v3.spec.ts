import { validateGameDefinitionV3 } from '../src/common/game-definition-v3';

describe('GameDefinition v3 validation', () => {
  it('accepts a valid Scene Play definition', () => {
    const result = validateGameDefinitionV3(validScenePlayDefinition());

    expect(result).toEqual({
      status: 'passed',
      errors: [],
      warnings: []
    });
  });

  it('fails closed for unknown actions', () => {
    const definition = validScenePlayDefinition();
    definition.levels[0].rules[0].then[0].type = 'TELEPORT_PLAYER';

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'UNKNOWN_ACTION',
        path: '$.levels[0].rules[0].then[0].type'
      })
    );
  });

  it('rejects capabilities unsupported by the current runtime', () => {
    const definition = validScenePlayDefinition();
    definition.capabilities.push('SCRIPTING');

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_CAPABILITY',
        path: '$.capabilities[5]'
      })
    );
  });

  it('rejects scene rules that target missing objects', () => {
    const definition = validScenePlayDefinition();
    definition.levels[0].rules[0].when.targetObjectId = 'missing_prompt';

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'UNKNOWN_TARGET_OBJECT',
        path: '$.levels[0].rules[0].when.targetObjectId'
      })
    );
  });

  it('rejects duplicate program step ids', () => {
    const definition = validScenePlayDefinition();
    definition.levels[0].programSteps[1].stepId = 'intro';

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_STEP_ID',
        path: '$.levels[0].programSteps[1].stepId'
      })
    );
  });

  it('rejects MOTION_REPS without targetCount', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'reps', type: 'MOTION_REPS', title: 'Squat', motion: 'SQUAT' }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_STEP_TARGET',
        path: '$.levels[0].programSteps[0].targetCount'
      })
    );
  });

  it('rejects MOTION_REPS without motion', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'reps', type: 'MOTION_REPS', title: 'Squat', targetCount: 10 }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_STEP_MOTION',
        path: '$.levels[0].programSteps[0].motion'
      })
    );
  });

  it('rejects HOLD_POSE without holdSec', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'hold', type: 'HOLD_POSE', title: 'Plank' }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_HOLD_DURATION',
        path: '$.levels[0].programSteps[0].holdSec'
      })
    );
  });

  it('rejects REST without durationSec', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'rest', type: 'REST', title: 'Dinlenme' }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_STEP_DURATION',
        path: '$.levels[0].programSteps[0].durationSec'
      })
    );
  });

  it('warns when INSTRUCTION has no durationSec', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'instr', type: 'INSTRUCTION', title: 'Oku' }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('passed');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'INSTRUCTION_NO_DURATION',
        path: '$.levels[0].programSteps[0].durationSec'
      })
    );
  });

  it('accepts HOLD_POSE with valid holdSec', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'hold', type: 'HOLD_POSE', title: 'Plank', holdSec: 30 }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('passed');
  });

  it('accepts MOTION_REPS with motion and targetCount', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'reps', type: 'MOTION_REPS', title: 'Squat', motion: 'SQUAT', targetCount: 10 }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('passed');
  });

  it('preserves successMessage in program steps', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'hold', type: 'HOLD_POSE', title: 'Plank', holdSec: 30, successMessage: 'Mukemmel durus!' }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('passed');
  });

  // ── P3 Scene Play publish acceptance tests ──

  it('rejects scene object with unsupported required motion', () => {
    const definition = validScenePlayDefinition();
    definition.levels[0].scene.objects[0].requiredMotion = 'SALTO';

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('failed');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MOTION_NOT_DECLARED',
        path: '$.levels[0].scene.objects[0].requiredMotion'
      })
    );
  });

  it('accepts PLAY_GAME step with successMessage', () => {
    const definition = validScenePlayDefinition() as any;
    definition.levels[0].programSteps = [
      { stepId: 'play', type: 'PLAY_GAME', title: 'Play', durationSec: 60, successMessage: 'Great job!' }
    ];

    const result = validateGameDefinitionV3(definition);

    expect(result.status).toBe('passed');
  });
});

function validScenePlayDefinition() {
  return {
    schemaVersion: '3.0',
    gameKey: 'deve_cuce_001',
    version: 1,
    title: 'Deve Cuce',
    description: 'Komuta gore hareket et.',
    category: 'education',
    tags: ['kids', 'reaction', 'motion'],
    minAppVersion: '0.2.0',
    minRuntimeVersion: '2.0.0',
    orientation: 'landscape',
    cameraRequirement: 'full_body',
    capabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'PROGRAM_STEPS', 'AUDIO', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK'],
    assetManifest: {
      items: [
        {
          key: 'background',
          kind: 'IMAGE',
          format: 'PNG',
          uri: 'local://scene-play/background',
          sha256: 'local-scene-background',
          bytes: 102400
        },
        {
          key: 'cuceCard',
          kind: 'IMAGE',
          format: 'PNG',
          uri: 'local://scene-play/cuce',
          sha256: 'local-scene-cuce',
          bytes: 51200
        },
        {
          key: 'deveCard',
          kind: 'IMAGE',
          format: 'PNG',
          uri: 'local://scene-play/deve',
          sha256: 'local-scene-deve',
          bytes: 51200
        }
      ]
    },
    levels: [
      {
        levelId: 'level_1',
        durationSec: 60,
        targetScore: 300,
        difficulty: 'easy',
        scene: {
          type: 'PROMPT_SEQUENCE',
          maxObjects: 1,
          spawnRateMs: 1800,
          objects: [
            {
              objectId: 'cuce_prompt',
              label: 'Cuce',
              assetKey: 'cuceCard',
              requiredMotion: 'SQUAT',
              lifeMs: 2400,
              points: 10
            },
            {
              objectId: 'deve_prompt',
              label: 'Deve',
              assetKey: 'deveCard',
              requiredMotion: 'JUMPING_JACK',
              lifeMs: 2400,
              points: 12
            }
          ]
        },
        rules: [
          {
            ruleId: 'correct_cuce',
            priority: 100,
            when: {
              type: 'MOTION_EVENT',
              event: 'REP_COUNTED',
              motion: 'SQUAT',
              targetObjectId: 'cuce_prompt'
            },
            then: [
              { type: 'ADD_SCORE', amount: 10 },
              { type: 'REMOVE_OBJECT', target: 'cuce_prompt' },
              { type: 'ADD_COMBO', amount: 1 }
            ],
            cooldownMs: 500
          },
          {
            ruleId: 'bad_form',
            priority: 10,
            when: {
              type: 'MOTION_EVENT',
              event: 'BAD_FORM'
            },
            then: [
              { type: 'RESET_COMBO' },
              { type: 'ADD_SCORE', amount: -5 }
            ],
            cooldownMs: 250
          }
        ],
        programSteps: [
          {
            stepId: 'intro',
            type: 'INSTRUCTION',
            title: 'Hazir ol',
            description: 'Cuce gelirse squat, deve gelirse zipla.',
            durationSec: 5,
            nextOnComplete: true
          },
          {
            stepId: 'play',
            type: 'PLAY_GAME',
            title: 'Oyunu oyna',
            durationSec: 60,
            nextOnComplete: true
          }
        ],
        rewards: [
          {
            rewardId: 'three_star',
            type: 'STAR',
            amount: 3,
            condition: {
              minimumScore: 250
            }
          }
        ]
      }
    ]
  };
}
