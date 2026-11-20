export const GRID_COLS = 12;
export const GRID_ROWS = 20;
export const FIXED_HZ = 60;
export const FIXED_DT = 1 / FIXED_HZ;

export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type FloorKind = 'STASIS' | 'CONVEYOR' | 'MINE';

export type CardinalDir = 'N' | 'E' | 'S' | 'W';

export type TileKind =
  | 'EMPTY'
  | 'SPAWN'
  | 'GOAL'
  | 'OBSTACLE'
  | 'TOWER'
  | 'OVERCLOCK'
  | 'PRISM'
  | FloorKind;

export type BuildTool = 'INSPECT' | 'TOWER' | 'OVERCLOCK' | 'PRISM' | FloorKind;

export type TriggerType = 'PULSE' | 'BEAM' | 'NOVA';
export type PayloadType = 'KINETIC' | 'CRYO' | 'CORRODE';
export type ModifierType = 'NONE' | 'CHAIN' | 'PIERCE' | 'SPLASH';

export type TargetCondition =
  | 'Any'
  | 'HasShield'
  | 'NotSlowed'
  | 'NotShredded'
  | 'HpBelow30Pct'
  | 'HpAbove70Pct';

export type TargetMetric = 'DistToGoal' | 'CurrentHp' | 'MoveSpeed';
export type SortOrder = 'ASC' | 'DESC';

export interface TargetRule {
  id: string;
  condition: TargetCondition;
  metric: TargetMetric;
  order: SortOrder;
}

export interface TowerPreset {
  id: string;
  name: string;
  trigger: TriggerType;
  payload: PayloadType;
  modifier: ModifierType;
  cost: number;
  createdAt: number;
}

export type EnemyType = 'SWARM' | 'ARMOR' | 'SHIELDED';

export interface GridPoint {
  x: number;
  y: number;
}

export interface TowerEntity {
  id: string;
  kind: 'TOWER';
  x: number;
  y: number;
  trigger: TriggerType;
  payload: PayloadType;
  modifier: ModifierType;
  rules: TargetRule[];
  investedGold: number;
  placedInWave: number;
  cooldown: number;
  angle: number;
  // Beam state
  beamTargetId: string | null;
  beamPrismId: string | null;
  beamRampTime: number; // seconds locked on
  beamTickAccum: number;
  // Last fired telemetry for UI highlight
  lastRuleIndex: number; // -1 fallback, 0..2 rule index
  totalDamage: number;
  kills: number;
  recoil: number; // 0..1 visual kick
  synergyPulse: number; // 0..1 visual resonance flash from adjacent synergies
}

export interface UtilityNodeEntity {
  id: string;
  kind: 'OVERCLOCK' | 'PRISM';
  x: number;
  y: number;
  investedGold: number;
  placedInWave: number;
  activePulse: number; // 0..1 visual energy glow
  // Prism active split targets for rendering
  prismBeamTargets: string[];
}

export interface FloorEntity {
  id: string;
  kind: FloorKind;
  x: number;
  y: number;
  investedGold: number;
  placedInWave: number;
  activePulse: number; // 0..1 visual energy glow
  // Conveyor direction
  direction: CardinalDir;
  // Mine payload & recharge state
  payload: PayloadType;
  cooldown: number; // seconds until armed (0 = armed)
  maxCooldown: number;
  // Telemetry
  triggers: number;
  totalDamage: number;
  kills: number;
}

export type GridEntity = TowerEntity | UtilityNodeEntity | FloorEntity;

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  x: number; // in tile coordinates (center of tile is col + 0.5)
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  displayHp: number;
  shield: number;
  maxShield: number;
  timeSinceDamage: number; // seconds out of combat for shield regen
  armorFlat: number; // flat damage reduction
  baseSpeed: number; // tiles/sec
  reward: number;
  radius: number; // in tile units
  // Status effects (remaining seconds)
  slowTimer: number;
  shredTimer: number;
  stasisTimer: number;
  // Repulsor conveyor knockback state
  repulseCooldown: number;
  knockVx: number;
  knockVy: number;
  knockTimer: number;
  // Elemental particle FX throttles
  reactionFxCooldown: number;
  statusFxTimer: number;
  // Visual juice
  hitFlash: number;
  shieldFlash: number;
  spawnScale: number;
  trail: { x: number; y: number }[];
}

export interface ProjectileEntity {
  id: string;
  towerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  payload: PayloadType;
  modifier: ModifierType;
  targetId: string | null;
  pierceLeft: number;
  hitIds: Set<string>;
  life: number;
  color: string;
}

export interface ActiveBeam {
  towerId?: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  payload: PayloadType;
  rampRatio: number; // 0..1
  isSplit: boolean;
  isRelay: boolean;
  width: number;
}

export interface NovaRingFx {
  x: number;
  y: number;
  maxRadius: number;
  age: number;
  duration: number;
  color: string;
}

export interface ChainArcFx {
  points: { x: number; y: number }[];
  age: number;
  duration: number;
  color: string;
}

export interface SplashRingFx {
  x: number;
  y: number;
  radius: number;
  age: number;
  duration: number;
  color: string;
}

export interface ParticleFx {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  age: number;
  duration: number;
  shape: 'SQUARE' | 'TRIANGLE' | 'LINE' | 'HEX';
  rotation: number;
  vRot: number;
}

export interface ImpactFlashFx {
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  secondaryColor?: string;
  age: number;
  duration: number;
  kind:
    | 'MUZZLE'
    | 'SHOCKWAVE'
    | 'SHIELD_SHATTER'
    | 'SPAWN_RIPPLE'
    | 'SYNERGY_LINK'
    | 'ELEMENTAL_REACTION';
}

export interface FloatingTextFx {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  duration: number;
}

export interface WaveSpawnGroup {
  startTick: number;
  enemyType: EnemyType;
  count: number;
  intervalTicks: number;
}

export interface WaveDefinition {
  waveNumber: number;
  name: string;
  groups: WaveSpawnGroup[];
  clearBonus: number;
}

export interface MapPreset {
  id: string;
  name: string;
  description: string;
  spawn: GridPoint;
  goal: GridPoint;
  obstacles: GridPoint[];
}

export interface SeedPayload {
  v: 1;
  name?: string;
  spawn: GridPoint;
  goal: GridPoint;
  gridObstacles: GridPoint[];
  waves: WaveDefinition[];
}

export interface FlowFieldData {
  distances: Int32Array; // length GRID_COLS * GRID_ROWS, -1 = unreachable
  nextX: Int8Array;
  nextY: Int8Array;
  pathTiles: GridPoint[]; // shortest path from spawn to goal
  spawnDist: number;
}

export interface ComputedTowerStats {
  damage: number;
  fireRate: number; // shots/sec (or beam ticks/sec)
  range: number; // tiles
  dps: number;
  maxRampDps: number; // for beam
  overclocked: boolean;
  overclockSources: GridPoint[];
  prismRelays: GridPoint[];
}

export interface PlacementCheckResult {
  valid: boolean;
  reason?: string;
  previewPath?: GridPoint[];
}

export interface HudSnapshot {
  tick: number;
  waveIndex: number; // 0-based current/next wave
  totalWaves: number;
  waveActive: boolean;
  enemiesRemaining: number;
  gold: number;
  lives: number;
  maxLives: number;
  simSpeed: 1 | 2 | 4;
  paused: boolean;
  gameOutcome: 'RUNNING' | 'VICTORY' | 'GAME_OVER';
  totalKills: number;
  totalDamage: number;
  maxTileDamage: number;
  hotTileCount: number;
  mapName: string;
  pathLength: number;
  selectedEntityId: string | null;
  selectedEntity: GridEntity | null;
  selectedStats: ComputedTowerStats | null;
  selectedPrismLinks: {
    sourceTowers: number;
    targetsInRadius: number;
    nearbyNonBeamTowers: Array<{ id: string; x: number; y: number; trigger: TriggerType }>;
  } | null;
  selectedOverclockTargets: number;
  nextWaveSummary: {
    waveNumber: number;
    name: string;
    counts: Record<EnemyType, number>;
    clearBonus: number;
  } | null;
}
