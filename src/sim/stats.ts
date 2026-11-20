import {
  BuildTool,
  CardinalDir,
  ComputedTowerStats,
  EnemyType,
  FloorKind,
  GridEntity,
  GridPoint,
  ModifierType,
  PayloadType,
  TowerEntity,
  TriggerType,
} from './types';

export const COSTS = {
  TOWER: 50,
  PRESET_TOWER: 65, // +15g quick-buy convenience premium over blank 50g chassis
  PRESET_PREMIUM: 15,
  OVERCLOCK: 45,
  PRISM: 55,
  STASIS: 35,
  CONVEYOR: 30,
  MINE: 40,
  MID_WAVE_SWAP: 5, // 10% fee during active wave; free between waves
} as const;

export const FLOOR_STATS = {
  STASIS_RADIUS: 1.45,
  STASIS_SLOW_MULT: 0.55, // -45% speed while inside well
  STASIS_PULL_SPEED: 0.45, // tiles/sec gentle gravity pull toward well center
  CONVEYOR_PUSH_SPEED: 3.3, // tiles/sec impulse burst
  CONVEYOR_PUSH_DURATION: 0.28, // seconds (~0.92 tiles shove)
  CONVEYOR_DRIFT_SPEED: 0.48, // gentle ongoing belt force
  CONVEYOR_ENEMY_COOLDOWN: 2.35, // prevents infinite push-loops
  MINE_TRIGGER_RADIUS: 0.58,
  MINE_BLAST_RADIUS: 1.55,
  MINE_BASE_DAMAGE: 48,
  MINE_RECHARGE_SEC: 5.5,
} as const;

export function isFloorKind(kind: BuildTool | string): kind is FloorKind {
  return kind === 'STASIS' || kind === 'CONVEYOR' || kind === 'MINE';
}

export function dirToVector(dir: CardinalDir): { dx: number; dy: number; angle: number } {
  switch (dir) {
    case 'N':
      return { dx: 0, dy: -1, angle: -Math.PI / 2 };
    case 'E':
      return { dx: 1, dy: 0, angle: 0 };
    case 'S':
      return { dx: 0, dy: 1, angle: Math.PI / 2 };
    case 'W':
      return { dx: -1, dy: 0, angle: Math.PI };
  }
}

export function rotateDirCW(dir: CardinalDir): CardinalDir {
  switch (dir) {
    case 'N':
      return 'E';
    case 'E':
      return 'S';
    case 'S':
      return 'W';
    case 'W':
      return 'N';
  }
}

export const BASE_TOWER = {
  damage: 18,
  fireRate: 1.5, // shots per second (for Beam, base DPS = damage * fireRate)
} as const;

export const PRISM_RADIUS = 3.0;
export const PRISM_SPLIT_DMG_MULT = 0.7;
export const OVERCLOCK_RATE_MULT = 1.25; // +25% non-stacking per node type

export const BEAM_RAMP_PER_SEC = 0.15; // +15%/sec
export const BEAM_RAMP_CAP = 3.0; // cap 3x
export const BEAM_TICK_HZ = 10; // smooth 10 ticks/sec damage application

export interface TriggerMeta {
  id: TriggerType;
  label: string;
  shortDesc: string;
  dmgMult: number;
  rateMult: number;
  range: number;
  accent: string;
}

export interface PayloadMeta {
  id: PayloadType;
  label: string;
  shortDesc: string;
  dmgMult: number;
  color: string;
}

export interface ModifierMeta {
  id: ModifierType;
  label: string;
  shortDesc: string;
  dmgMult: number;
  rateMult: number;
}

export const TRIGGERS: Record<TriggerType, TriggerMeta> = {
  PULSE: {
    id: 'PULSE',
    label: 'Pulse',
    shortDesc: 'Fast bolt · 1.0x dmg · 1.0x rate · 4.0 rng',
    dmgMult: 1.0,
    rateMult: 1.0,
    range: 4.0,
    accent: '#D4FF2A',
  },
  BEAM: {
    id: 'BEAM',
    label: 'Beam',
    shortDesc: 'Hitscan lock · ramps +15%/s (3x cap) · 3.5 rng',
    dmgMult: 1.0,
    rateMult: 1.0,
    range: 3.5,
    accent: '#FF4D2E',
  },
  NOVA: {
    id: 'NOVA',
    label: 'Nova',
    shortDesc: '360° AoE ring · 0.7x dmg · 0.4x rate · 2.2 rng',
    dmgMult: 0.7,
    rateMult: 0.4,
    range: 2.2,
    accent: '#F5B841',
  },
};

export const PAYLOADS: Record<PayloadType, PayloadMeta> = {
  KINETIC: {
    id: 'KINETIC',
    label: 'Kinetic',
    shortDesc: 'Pure impact · 1.2x dmg',
    dmgMult: 1.2,
    color: '#FF6B35',
  },
  CRYO: {
    id: 'CRYO',
    label: 'Cryo',
    shortDesc: '0.6x dmg · Slow -35% speed (2.5s)',
    dmgMult: 0.6,
    color: '#6BA3FF',
  },
  CORRODE: {
    id: 'CORRODE',
    label: 'Corrode',
    shortDesc: '0.8x dmg · Shred +25% dmg taken (4s)',
    dmgMult: 0.8,
    color: '#C8FF2E',
  },
};

export const MODIFIERS: Record<ModifierType, ModifierMeta> = {
  NONE: {
    id: 'NONE',
    label: 'Direct',
    shortDesc: 'No penalty · focused single-target output',
    dmgMult: 1.0,
    rateMult: 1.0,
  },
  CHAIN: {
    id: 'CHAIN',
    label: 'Chain',
    shortDesc: 'Jumps to 2 nearby (70% dmg/jump) · -15% dmg',
    dmgMult: 0.85,
    rateMult: 1.0,
  },
  PIERCE: {
    id: 'PIERCE',
    label: 'Pierce',
    shortDesc: 'Passes through up to 3 in line · -10% rate',
    dmgMult: 1.0,
    rateMult: 0.9,
  },
  SPLASH: {
    id: 'SPLASH',
    label: 'Splash',
    shortDesc: '1.2-tile blast (60% splash dmg) · -20% rate',
    dmgMult: 1.0,
    rateMult: 0.8,
  },
};

export interface EnemyArchetypeConfig {
  type: EnemyType;
  label: string;
  baseHp: number;
  baseShield: number;
  armorFlat: number;
  speed: number;
  reward: number;
  radius: number;
  color: string;
  counterHint: string;
}

export const ENEMY_ARCHETYPES: Record<EnemyType, EnemyArchetypeConfig> = {
  SWARM: {
    type: 'SWARM',
    label: 'Swarm',
    baseHp: 34,
    baseShield: 0,
    armorFlat: 0,
    speed: 2.35,
    reward: 6,
    radius: 0.22,
    color: '#45E6A6',
    counterHint: 'Nova or Splash + Cryo',
  },
  ARMOR: {
    type: 'ARMOR',
    label: 'Armor',
    baseHp: 135,
    baseShield: 0,
    armorFlat: 5,
    speed: 1.15,
    reward: 16,
    radius: 0.34,
    color: '#FF5733',
    counterHint: 'Beam ramp + Corrode (-5 flat armor)',
  },
  SHIELDED: {
    type: 'SHIELDED',
    label: 'Shielded',
    baseHp: 68,
    baseShield: 58,
    armorFlat: 0,
    speed: 1.65,
    reward: 14,
    radius: 0.29,
    color: '#C084FC',
    counterHint: 'Rule: HasShield + fast Pulse/Chain',
  },
};

export function getOrthogonalOverclocks(
  x: number,
  y: number,
  entities: Map<string, GridEntity>
): GridPoint[] {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const sources: GridPoint[] = [];
  for (const entity of entities.values()) {
    if (entity.kind !== 'OVERCLOCK') continue;
    for (const [dx, dy] of dirs) {
      if (entity.x === x + dx && entity.y === y + dy) {
        sources.push({ x: entity.x, y: entity.y });
      }
    }
  }
  return sources;
}

export function getReachablePrisms(
  tower: TowerEntity,
  entities: Map<string, GridEntity>
): GridPoint[] {
  if (tower.trigger !== 'BEAM') return [];
  const range = TRIGGERS.BEAM.range;
  const relays: GridPoint[] = [];
  for (const entity of entities.values()) {
    if (entity.kind !== 'PRISM') continue;
    const dist = Math.hypot(entity.x - tower.x, entity.y - tower.y);
    if (dist <= range + 0.05) {
      relays.push({ x: entity.x, y: entity.y });
    }
  }
  return relays;
}

export function computeTowerStats(
  tower: TowerEntity,
  entities: Map<string, GridEntity>
): ComputedTowerStats {
  const trig = TRIGGERS[tower.trigger];
  const pay = PAYLOADS[tower.payload];
  const mod = MODIFIERS[tower.modifier];

  const overclockSources = getOrthogonalOverclocks(tower.x, tower.y, entities);
  const overclocked = overclockSources.length > 0;
  const overclockMult = overclocked ? OVERCLOCK_RATE_MULT : 1.0;
  const prismRelays = getReachablePrisms(tower, entities);

  const damage = BASE_TOWER.damage * trig.dmgMult * pay.dmgMult * mod.dmgMult;
  const fireRate = BASE_TOWER.fireRate * trig.rateMult * mod.rateMult * overclockMult;
  const range = trig.range;
  const dps = damage * fireRate;
  const maxRampDps = tower.trigger === 'BEAM' ? dps * BEAM_RAMP_CAP : dps;

  return {
    damage,
    fireRate,
    range,
    dps,
    maxRampDps,
    overclocked,
    overclockSources,
    prismRelays,
  };
}
