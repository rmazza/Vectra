import { soundEngine, SoundEvent } from '../audio/synth';
import { getActivePalette } from '../theme/palettes';
import { computeFlowField, inBounds, tileIndex, validatePlacement } from './flowField';
import {
  BASE_TOWER,
  BEAM_RAMP_CAP,
  BEAM_RAMP_PER_SEC,
  BEAM_TICK_HZ,
  COSTS,
  ENEMY_ARCHETYPES,
  PRISM_RADIUS,
  PRISM_SPLIT_DMG_MULT,
  TRIGGERS,
  computeTowerStats,
} from './stats';
import { createRule, evaluateTargeting, getEnemyCurrentSpeed } from './targeting';
import { VectorParticleSystem } from './particles';
import {
  ActiveBeam,
  ChainArcFx,
  EnemyEntity,
  EnemyType,
  FIXED_DT,
  FloatingTextFx,
  FlowFieldData,
  GRID_COLS,
  GRID_ROWS,
  GridEntity,
  GridPoint,
  HudSnapshot,
  ImpactFlashFx,
  MapPreset,
  ModifierType,
  NovaRingFx,
  PayloadType,
  PlacementCheckResult,
  ProjectileEntity,
  SeedPayload,
  SplashRingFx,
  TargetRule,
  TileKind,
  TowerEntity,
  TowerPreset,
  TriggerType,
  UtilityNodeEntity,
  WaveDefinition,
} from './types';
import { DEFAULT_WAVES, MAP_PRESETS, summarizeWave, waveHpMultiplier } from './waves';

interface PendingSpawn {
  tickOffset: number;
  enemyType: EnemyType;
}

const STARTING_GOLD = 210;
const STARTING_LIVES = 20;

export class VectraEngine {
  public grid: TileKind[] = new Array(GRID_COLS * GRID_ROWS).fill('EMPTY');
  public spawn: GridPoint = { x: 5, y: 0 };
  public goal: GridPoint = { x: 6, y: 19 };
  public obstacles: GridPoint[] = [];
  public waves: WaveDefinition[] = DEFAULT_WAVES;
  public mapName = MAP_PRESETS[0].name;

  public flowField: FlowFieldData;
  public entities = new Map<string, GridEntity>();
  public enemies: EnemyEntity[] = [];
  public projectiles: ProjectileEntity[] = [];
  public activeBeams: ActiveBeam[] = [];

  // Visual transient FX (strictly read by renderer)
  public novaRings: NovaRingFx[] = [];
  public chainArcs: ChainArcFx[] = [];
  public splashRings: SplashRingFx[] = [];
  public impactFlashes: ImpactFlashFx[] = [];
  public readonly particleSystem = new VectorParticleSystem();
  public floatingTexts: FloatingTextFx[] = [];

  // Juice
  public shakeTime = 0;
  public shakeIntensity = 0;
  public hitstopTimer = 0;

  // Game state
  public tick = 0;
  public waveIndex = 0;
  public waveActive = false;
  public waveStartTick = 0;
  private spawnQueue: PendingSpawn[] = [];
  public gold = STARTING_GOLD;
  public lives = STARTING_LIVES;
  public maxLives = STARTING_LIVES;
  public simSpeed: 1 | 2 | 4 = 1;
  public paused = false;
  public gameOutcome: 'RUNNING' | 'VICTORY' | 'GAME_OVER' = 'RUNNING';
  public totalKills = 0;
  public totalDamage = 0;

  public selectedEntityId: string | null = null;
  public demoMode = false;

  private entitySeq = 1;
  private enemySeq = 1;
  private projSeq = 1;
  private onStateChanged?: () => void;

  constructor(onStateChanged?: () => void) {
    this.onStateChanged = onStateChanged;
    this.flowField = computeFlowField(this.grid, this.spawn, this.goal);
    this.loadPreset(MAP_PRESETS[0]);
  }

  private emitSound(ev: SoundEvent, vol = 1): void {
    if (this.demoMode) return;
    soundEngine.play(ev, vol);
  }

  private notify(): void {
    this.onStateChanged?.();
  }

  public loadPreset(preset: MapPreset, waves: WaveDefinition[] = DEFAULT_WAVES): void {
    this.demoMode = false;
    this.mapName = preset.name;
    this.spawn = { ...preset.spawn };
    this.goal = { ...preset.goal };
    this.obstacles = preset.obstacles.map((o) => ({ ...o }));
    this.waves = waves;
    this.resetSimulationState();
  }

  public loadSeed(seed: SeedPayload): void {
    this.demoMode = false;
    this.mapName = seed.name || 'Custom Seed';
    this.spawn = { ...seed.spawn };
    this.goal = { ...seed.goal };
    this.obstacles = seed.gridObstacles.map((o) => ({ ...o }));
    this.waves = seed.waves;
    this.resetSimulationState();
  }

  public exportSeedPayload(): SeedPayload {
    return {
      v: 1,
      name: this.mapName,
      spawn: { ...this.spawn },
      goal: { ...this.goal },
      gridObstacles: this.obstacles.map((o) => ({ ...o })),
      waves: this.waves,
    };
  }

  public resetSimulationState(): void {
    this.grid = new Array(GRID_COLS * GRID_ROWS).fill('EMPTY');
    this.grid[tileIndex(this.spawn.x, this.spawn.y)] = 'SPAWN';
    this.grid[tileIndex(this.goal.x, this.goal.y)] = 'GOAL';
    for (const obs of this.obstacles) {
      if (inBounds(obs.x, obs.y)) {
        const idx = tileIndex(obs.x, obs.y);
        if (this.grid[idx] === 'EMPTY') {
          this.grid[idx] = 'OBSTACLE';
        }
      }
    }

    this.entities.clear();
    this.enemies = [];
    this.projectiles = [];
    this.activeBeams = [];
    this.novaRings = [];
    this.chainArcs = [];
    this.splashRings = [];
    this.impactFlashes = [];
    this.particleSystem.clear();
    this.floatingTexts = [];

    this.tick = 0;
    this.waveIndex = 0;
    this.waveActive = false;
    this.waveStartTick = 0;
    this.spawnQueue = [];
    this.gold = STARTING_GOLD;
    this.lives = STARTING_LIVES;
    this.simSpeed = 1;
    this.paused = false;
    this.gameOutcome = 'RUNNING';
    this.totalKills = 0;
    this.totalDamage = 0;
    this.selectedEntityId = null;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.hitstopTimer = 0;

    this.flowField = computeFlowField(this.grid, this.spawn, this.goal);
    this.notify();
  }

  /** Sets up a live autonomous vector battle for the atmospheric Title Screen */
  public loadDemoBattle(preset: MapPreset = MAP_PRESETS[0]): void {
    this.loadPreset(preset);
    this.demoMode = true;
    this.gold = 9999;

    // Build an illustrative maze showcasing Pulse+Chain, Cryo+Nova, Beam+Prism+Corrode, and Overclock
    const demoBuilds: Array<{
      x: number;
      y: number;
      kind: 'TOWER' | 'OVERCLOCK' | 'PRISM';
      trigger?: TriggerType;
      payload?: PayloadType;
      modifier?: ModifierType;
    }> = [
      { x: 4, y: 4, kind: 'TOWER', trigger: 'PULSE', payload: 'KINETIC', modifier: 'CHAIN' },
      { x: 5, y: 4, kind: 'OVERCLOCK' },
      { x: 6, y: 4, kind: 'TOWER', trigger: 'NOVA', payload: 'CRYO', modifier: 'SPLASH' },
      { x: 6, y: 8, kind: 'TOWER', trigger: 'BEAM', payload: 'CORRODE', modifier: 'NONE' },
      { x: 5, y: 10, kind: 'PRISM' },
      { x: 8, y: 11, kind: 'TOWER', trigger: 'PULSE', payload: 'KINETIC', modifier: 'PIERCE' },
      { x: 5, y: 14, kind: 'TOWER', trigger: 'BEAM', payload: 'KINETIC', modifier: 'CHAIN' },
      { x: 4, y: 14, kind: 'OVERCLOCK' },
      { x: 7, y: 15, kind: 'TOWER', trigger: 'NOVA', payload: 'CRYO', modifier: 'NONE' },
    ];

    for (const b of demoBuilds) {
      const check = this.checkPlacement(b.x, b.y);
      if (!check.valid) continue;
      if (b.kind === 'TOWER') {
        const id = this.placeEntity(b.x, b.y, 'TOWER');
        if (id) {
          const t = this.entities.get(id) as TowerEntity;
          if (b.trigger) t.trigger = b.trigger;
          if (b.payload) t.payload = b.payload;
          if (b.modifier) t.modifier = b.modifier;
        }
      } else {
        this.placeEntity(b.x, b.y, b.kind);
      }
    }

    this.selectedEntityId = null;
    this.waveIndex = 4; // Start on an exciting mixed wave
    this.startNextWave();
  }

  public toggleObstacle(x: number, y: number): boolean {
    if (this.waveActive || this.entities.size > 0) return false;
    if (!inBounds(x, y)) return false;
    if ((x === this.spawn.x && y === this.spawn.y) || (x === this.goal.x && y === this.goal.y)) {
      return false;
    }
    const idx = tileIndex(x, y);
    if (this.grid[idx] === 'OBSTACLE') {
      this.grid[idx] = 'EMPTY';
      this.obstacles = this.obstacles.filter((o) => !(o.x === x && o.y === y));
      this.flowField = computeFlowField(this.grid, this.spawn, this.goal);
      this.notify();
      return true;
    } else if (this.grid[idx] === 'EMPTY') {
      const check = validatePlacement(this.grid, this.spawn, this.goal, [], x, y);
      if (!check.valid) return false;
      this.grid[idx] = 'OBSTACLE';
      this.obstacles.push({ x, y });
      this.flowField = computeFlowField(this.grid, this.spawn, this.goal);
      this.notify();
      return true;
    }
    return false;
  }

  public checkPlacement(x: number, y: number, cost = 0): PlacementCheckResult {
    const base = validatePlacement(this.grid, this.spawn, this.goal, this.enemies, x, y);
    if (!base.valid) return base;
    if (!this.demoMode && cost > this.gold) {
      return { valid: false, reason: `Need ${cost}g`, previewPath: base.previewPath };
    }
    return base;
  }

  public placeEntity(
    x: number,
    y: number,
    kind: 'TOWER' | 'OVERCLOCK' | 'PRISM',
    preset?: TowerPreset | null
  ): string | null {
    if (this.gameOutcome !== 'RUNNING') return null;
    const activePreset = kind === 'TOWER' ? preset ?? null : null;
    const cost = activePreset ? activePreset.cost : COSTS[kind];
    const check = this.checkPlacement(x, y, cost);
    if (!check.valid) {
      this.emitSound('INVALID');
      return null;
    }

    if (!this.demoMode) {
      this.gold -= cost;
    }
    const id = `ent_${this.entitySeq++}`;
    this.grid[tileIndex(x, y)] = kind;

    if (kind === 'TOWER') {
      const tower: TowerEntity = {
        id,
        kind: 'TOWER',
        x,
        y,
        trigger: activePreset ? activePreset.trigger : 'PULSE',
        payload: activePreset ? activePreset.payload : 'KINETIC',
        modifier: activePreset ? activePreset.modifier : 'NONE',
        rules: [createRule('Any', 'DistToGoal', 'ASC')],
        investedGold: cost,
        placedInWave: this.waveActive ? this.waveIndex : -1,
        cooldown: 0,
        angle: -Math.PI / 2,
        beamTargetId: null,
        beamPrismId: null,
        beamRampTime: 0,
        beamTickAccum: 0,
        lastRuleIndex: -1,
        totalDamage: 0,
        kills: 0,
        recoil: 0,
      };
      this.entities.set(id, tower);
    } else {
      const node: UtilityNodeEntity = {
        id,
        kind,
        x,
        y,
        investedGold: cost,
        placedInWave: this.waveActive ? this.waveIndex : -1,
        activePulse: 0.8,
        prismBeamTargets: [],
      };
      this.entities.set(id, node);
    }

    const pal = getActivePalette();
    this.flowField = computeFlowField(this.grid, this.spawn, this.goal);
    this.selectedEntityId = this.demoMode ? null : id;
    const burstColor = activePreset
      ? pal.payloads[activePreset.payload]
      : kind === 'OVERCLOCK'
      ? pal.overclock
      : kind === 'PRISM'
      ? pal.prism
      : pal.triggers.PULSE;
    this.particleSystem.emitConstructBurst(x + 0.5, y + 0.5, burstColor, activePreset ? 13 : 9, pal);
    this.emitSound('BUILD');
    this.notify();
    return id;
  }

  public sellEntity(id: string): boolean {
    const ent = this.entities.get(id);
    if (!ent) return false;

    // 100% refund if placed while wave inactive & still before wave starts, else 80%
    const fullRefund = !this.waveActive && ent.placedInWave === -1;
    const refund = fullRefund ? ent.investedGold : Math.round(ent.investedGold * 0.8);

    this.gold += refund;
    this.grid[tileIndex(ent.x, ent.y)] = 'EMPTY';
    this.entities.delete(id);
    this.activeBeams = this.activeBeams.filter((b) => b.towerId !== id);
    if (this.selectedEntityId === id) {
      this.selectedEntityId = null;
    }

    const pal = getActivePalette();
    this.flowField = computeFlowField(this.grid, this.spawn, this.goal);
    this.floatingTexts.push({
      x: ent.x + 0.5,
      y: ent.y + 0.3,
      text: `+${refund}g`,
      color: pal.goldText,
      age: 0,
      duration: 0.75,
    });
    this.particleSystem.emitConstructBurst(ent.x + 0.5, ent.y + 0.5, pal.sellBurst, 9, pal);
    this.emitSound('SELL');
    this.notify();
    return true;
  }

  public getEntityAt(x: number, y: number): GridEntity | null {
    for (const ent of this.entities.values()) {
      if (ent.x === x && ent.y === y) return ent;
    }
    return null;
  }

  public selectEntity(id: string | null): void {
    this.selectedEntityId = id;
    this.notify();
  }

  public updateTowerModule(
    towerId: string,
    slot: 'trigger' | 'payload' | 'modifier',
    value: TriggerType | PayloadType | ModifierType
  ): boolean {
    const ent = this.entities.get(towerId);
    if (!ent || ent.kind !== 'TOWER') return false;
    if (ent[slot] === value) return true;

    const pal = getActivePalette();
    const fee = this.waveActive ? COSTS.MID_WAVE_SWAP : 0;
    if (fee > 0 && this.gold < fee) {
      this.floatingTexts.push({
        x: ent.x + 0.5,
        y: ent.y + 0.25,
        text: `Need ${fee}g`,
        color: pal.breachText,
        age: 0,
        duration: 0.75,
      });
      this.emitSound('INVALID');
      return false;
    }

    if (fee > 0) {
      this.gold -= fee;
      this.floatingTexts.push({
        x: ent.x + 0.5,
        y: ent.y + 0.3,
        text: `-${fee}g`,
        color: pal.goldText,
        age: 0,
        duration: 0.65,
      });
    }

    if (slot === 'trigger') {
      ent.trigger = value as TriggerType;
      ent.beamTargetId = null;
      ent.beamPrismId = null;
      ent.beamRampTime = 0;
      ent.beamTickAccum = 0;
      ent.cooldown = 0;
      ent.recoil = 0;
      ent.lastRuleIndex = -1;
      // Immediately clear any beams originating from this tower (important if swapped while paused)
      this.activeBeams = this.activeBeams.filter((b) => b.towerId !== ent.id);
    } else if (slot === 'payload') {
      ent.payload = value as PayloadType;
    } else {
      ent.modifier = value as ModifierType;
    }

    this.emitSound('SWAP');
    this.notify();
    return true;
  }

  public setTowerRules(towerId: string, rules: TargetRule[]): void {
    const ent = this.entities.get(towerId);
    if (!ent || ent.kind !== 'TOWER') return;
    ent.rules = rules.slice(0, 3);
    this.notify();
  }

  public startNextWave(): boolean {
    if (this.gameOutcome !== 'RUNNING') return false;
    if (this.waveActive) return false;
    if (this.waveIndex >= this.waves.length) return false;

    const waveDef = this.waves[this.waveIndex];
    this.spawnQueue = [];
    for (const group of waveDef.groups) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          tickOffset: group.startTick + i * group.intervalTicks,
          enemyType: group.enemyType,
        });
      }
    }
    this.spawnQueue.sort((a, b) => a.tickOffset - b.tickOffset);

    // Mark existing towers as committed to a wave so selling later yields 80%
    for (const ent of this.entities.values()) {
      if (ent.placedInWave === -1) {
        ent.placedInWave = this.waveIndex;
      }
    }

    this.waveStartTick = this.tick;
    this.waveActive = true;
    this.paused = false;
    this.emitSound('WAVE_START');
    this.notify();
    return true;
  }

  public setSimSpeed(speed: 1 | 2 | 4): void {
    this.simSpeed = speed;
    this.notify();
  }

  public togglePause(): void {
    if (this.gameOutcome !== 'RUNNING') return;
    this.paused = !this.paused;
    this.notify();
  }

  /** Runs a single deterministic 60Hz simulation tick */
  public stepTick(): void {
    if (this.paused || this.gameOutcome !== 'RUNNING') return;

    // Micro hitstop for tactile weight on heavy kills/breaches
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - FIXED_DT);
      this.updateTransientFx(FIXED_DT * 0.35);
      return;
    }

    this.tick++;
    this.activeBeams = [];

    // 1. Decay shake & node pulse
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - FIXED_DT);
    }
    for (const ent of this.entities.values()) {
      if (ent.kind === 'TOWER') {
        ent.recoil = Math.max(0, ent.recoil - FIXED_DT * 6.5);
      } else {
        ent.activePulse = Math.max(0, ent.activePulse - FIXED_DT * 2.5);
        ent.prismBeamTargets = [];
      }
    }

    // 2. Spawn scheduled wave enemies
    if (this.waveActive && this.spawnQueue.length > 0) {
      const elapsed = this.tick - this.waveStartTick;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].tickOffset <= elapsed) {
        const next = this.spawnQueue.shift()!;
        this.spawnEnemy(next.enemyType);
      }
    }

    // 3. Update Enemies (status timers, shield regen, flow-field steering, goal check)
    this.updateEnemies();

    // 4. Update Towers (targeting rules, Pulse / Beam + Prism / Nova)
    this.updateTowers();

    // 5. Update Projectiles
    this.updateProjectiles();

    // 6. Clean up dead enemies
    this.cullDeadEnemies();

    // 7. Update visual FX
    this.updateTransientFx(FIXED_DT);

    // 8. Check wave completion / demo loop / victory
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      const clearedWave = this.waves[this.waveIndex];
      this.waveActive = false;

      if (this.demoMode) {
        this.waveIndex = (this.waveIndex + 1) % this.waves.length;
        this.startNextWave();
        return;
      }

      if (clearedWave) {
        this.gold += clearedWave.clearBonus;
        this.floatingTexts.push({
          x: this.goal.x + 0.5,
          y: Math.max(1.2, this.goal.y - 0.3),
          text: `Wave Clear +${clearedWave.clearBonus}g`,
          color: getActivePalette().waveClearText,
          age: 0,
          duration: 1.4,
        });
      }
      this.waveIndex++;

      if (this.waveIndex >= this.waves.length) {
        this.gameOutcome = 'VICTORY';
        this.emitSound('VICTORY');
      } else {
        this.emitSound('WAVE_CLEAR');
      }
      this.notify();
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const cfg = ENEMY_ARCHETYPES[type];
    const mult = waveHpMultiplier(this.waveIndex + 1);
    const jitter = (Math.random() - 0.5) * 0.24;
    const hp = Math.round(cfg.baseHp * mult);
    const shield = Math.round(cfg.baseShield * mult);

    const enemy: EnemyEntity = {
      id: `en_${this.enemySeq++}`,
      type,
      x: this.spawn.x + 0.5 + jitter,
      y: this.spawn.y + 0.5 + jitter * 0.5,
      vx: 0,
      vy: 0,
      angle: Math.PI / 2,
      hp,
      maxHp: hp,
      displayHp: hp,
      shield,
      maxShield: shield,
      timeSinceDamage: 0,
      armorFlat: cfg.armorFlat,
      baseSpeed: cfg.speed,
      reward: cfg.reward,
      radius: cfg.radius,
      slowTimer: 0,
      shredTimer: 0,
      hitFlash: 0,
      shieldFlash: 0,
      spawnScale: 0.15,
      trail: [],
    };
    this.enemies.push(enemy);
    this.impactFlashes.push({
      x: this.spawn.x + 0.5,
      y: this.spawn.y + 0.5,
      maxRadius: 0.72,
      color: getActivePalette().spawnRing,
      age: 0,
      duration: 0.28,
      kind: 'SPAWN_RIPPLE',
    });
  }

  private updateEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) continue;

      e.spawnScale = Math.min(1, e.spawnScale + FIXED_DT * 6);
      e.hitFlash = Math.max(0, e.hitFlash - FIXED_DT * 6.5);
      e.shieldFlash = Math.max(0, e.shieldFlash - FIXED_DT * 5.5);
      if (e.displayHp > e.hp) {
        const drainRate = Math.max(e.maxHp * 1.15, (e.displayHp - e.hp) * 5.5);
        e.displayHp = Math.max(e.hp, e.displayHp - drainRate * FIXED_DT);
      } else {
        e.displayHp = e.hp;
      }
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - FIXED_DT);
      if (e.shredTimer > 0) e.shredTimer = Math.max(0, e.shredTimer - FIXED_DT);

      // Shielded enemy: regenerates after 3.0s out of combat
      if (e.maxShield > 0) {
        e.timeSinceDamage += FIXED_DT;
        if (e.timeSinceDamage >= 3.0 && e.shield < e.maxShield) {
          e.shield = Math.min(e.maxShield, e.shield + e.maxShield * 0.35 * FIXED_DT);
        }
      }

      // Flow-field steering
      const gx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(e.x)));
      const gy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(e.y)));

      // Check Goal arrival
      const goalCx = this.goal.x + 0.5;
      const goalCy = this.goal.y + 0.5;
      if (Math.hypot(goalCx - e.x, goalCy - e.y) < 0.34) {
        this.enemies.splice(i, 1);
        if (!this.demoMode) {
          const lifeCost = e.type === 'ARMOR' ? 2 : 1;
          this.lives = Math.max(0, this.lives - lifeCost);
          this.triggerShake(0.24, 6);
          this.hitstopTimer = 0.04;
          const pal = getActivePalette();
          this.particleSystem.emitConstructBurst(goalCx, goalCy, pal.goalArcLit, 20, pal);
          this.impactFlashes.push({
            x: goalCx,
            y: goalCy,
            maxRadius: 1.5,
            color: pal.goalArcLit,
            age: 0,
            duration: 0.36,
            kind: 'SHOCKWAVE',
          });
          this.floatingTexts.push({
            x: goalCx,
            y: goalCy - 0.4,
            text: `-${lifeCost} Core`,
            color: pal.breachText,
            age: 0,
            duration: 1.0,
          });
          this.emitSound('BREACH');
          if (this.lives <= 0) {
            this.gameOutcome = 'GAME_OVER';
            this.emitSound('GAME_OVER');
          }
          this.notify();
        }
        continue;
      }

      const idx = tileIndex(gx, gy);
      const fx = this.flowField.nextX[idx];
      const fy = this.flowField.nextY[idx];

      // Target the center of the next tile along the flow vector for smooth, crisp cornering
      const nextTileX = gx + fx + 0.5;
      const nextTileY = gy + fy + 0.5;
      let dx = nextTileX - e.x;
      let dy = nextTileY - e.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.0001) {
        dx /= len;
        dy /= len;
      }

      const speed = getEnemyCurrentSpeed(e);
      e.vx = dx * speed;
      e.vy = dy * speed;
      e.x += e.vx * FIXED_DT;
      e.y += e.vy * FIXED_DT;
      e.angle = Math.atan2(dy, dx);

      // Record smooth motion trail every 2 ticks
      if (this.tick % 2 === 0) {
        e.trail.push({ x: e.x, y: e.y });
        if (e.trail.length > 7) {
          e.trail.shift();
        }
      }
    }
  }

  private updateTowers(): void {
    for (const ent of this.entities.values()) {
      if (ent.kind !== 'TOWER') continue;
      const stats = computeTowerStats(ent, this.entities);

      // Pulse Overclock visuals when active
      if (stats.overclocked) {
        for (const src of stats.overclockSources) {
          const oc = this.getEntityAt(src.x, src.y);
          if (oc && oc.kind === 'OVERCLOCK') {
            oc.activePulse = Math.max(oc.activePulse, 0.45);
          }
        }
      }

      const tx = ent.x + 0.5;
      const ty = ent.y + 0.5;
      const effectiveRange =
        ent.trigger === 'NOVA' && ent.modifier === 'PIERCE' ? stats.range + 0.55 : stats.range;

      // Gather enemies in tower range
      const inRange: EnemyEntity[] = [];
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - tx, e.y - ty) <= effectiveRange + e.radius) {
          inRange.push(e);
        }
      }

      if (ent.trigger === 'BEAM') {
        this.updateBeamTower(ent, stats, inRange);
        continue;
      }

      if (ent.cooldown > 0) {
        ent.cooldown = Math.max(0, ent.cooldown - FIXED_DT);
      }

      if (inRange.length === 0) {
        ent.lastRuleIndex = -1;
        continue;
      }

      const { target, ruleIndex } = evaluateTargeting(inRange, ent.rules, this.flowField);
      ent.lastRuleIndex = ruleIndex;
      if (!target) continue;

      if (ent.trigger === 'PULSE') {
        ent.angle = Math.atan2(target.y - ty, target.x - tx);
        if (ent.cooldown <= 0) {
          this.firePulse(ent, target, stats.damage);
          ent.cooldown = 1 / stats.fireRate;
          ent.recoil = 1;
        }
      } else if (ent.trigger === 'NOVA') {
        if (ent.cooldown <= 0) {
          this.fireNova(ent, inRange, stats.damage, stats.range);
          ent.cooldown = 1 / stats.fireRate;
          ent.recoil = 1;
        }
      }
    }
  }

  private firePulse(tower: TowerEntity, target: EnemyEntity, damage: number): void {
    const tx = tower.x + 0.5;
    const ty = tower.y + 0.5;
    const dx = target.x - tx;
    const dy = target.y - ty;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 13.5;

    const muzzleX = tx + (dx / dist) * 0.36;
    const muzzleY = ty + (dy / dist) * 0.36;
    const fireAngle = Math.atan2(dy, dx);
    const pal = getActivePalette();
    const payColor = pal.payloads[tower.payload];
    const proj: ProjectileEntity = {
      id: `pr_${this.projSeq++}`,
      towerId: tower.id,
      x: muzzleX,
      y: muzzleY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      speed,
      damage,
      payload: tower.payload,
      modifier: tower.modifier,
      targetId: tower.modifier === 'PIERCE' ? null : target.id,
      pierceLeft: tower.modifier === 'PIERCE' ? 3 : 1,
      hitIds: new Set<string>(),
      life: 0.9,
      color: payColor,
    };
    this.projectiles.push(proj);
    this.impactFlashes.push({
      x: muzzleX,
      y: muzzleY,
      maxRadius: 0.32,
      color: payColor,
      age: 0,
      duration: 0.1,
      kind: 'MUZZLE',
    });
    this.particleSystem.emitTowerFire(muzzleX, muzzleY, fireAngle, 'PULSE', tower.payload, pal);
    this.emitSound('PULSE', 0.85);
  }

  private fireNova(
    tower: TowerEntity,
    inRange: EnemyEntity[],
    damage: number,
    range: number
  ): void {
    const tx = tower.x + 0.5;
    const ty = tower.y + 0.5;
    const effectiveRange = tower.modifier === 'PIERCE' ? range + 0.55 : range;
    const pal = getActivePalette();
    const color = pal.payloads[tower.payload];

    // Re-collect if Pierce extended Nova radius
    const targets =
      tower.modifier === 'PIERCE'
        ? this.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - tx, e.y - ty) <= effectiveRange + e.radius)
        : inRange;

    this.novaRings.push({
      x: tx,
      y: ty,
      maxRadius: effectiveRange,
      age: 0,
      duration: 0.32,
      color,
    });
    this.particleSystem.emitTowerFire(tx, ty, 0, 'NOVA', tower.payload, pal);

    for (const e of targets) {
      const hitShield = e.shield > 0.01;
      const hitAngle = Math.atan2(e.y - ty, e.x - tx);
      this.applyDamage(e, damage, tower.payload, tower, 1.0);
      this.particleSystem.emitProjectileHit(
        e.x,
        e.y,
        hitAngle,
        tower.payload,
        tower.modifier,
        pal.enemies[e.type],
        hitShield,
        pal
      );
      if (tower.modifier === 'SPLASH') {
        this.applySplash(e.x, e.y, damage * 0.6, tower.payload, tower, e.id);
      }
    }

    // Nova + Chain arcs from up to 2 hit targets to nearby enemies outside the ring
    if (tower.modifier === 'CHAIN' && targets.length > 0) {
      const seedCount = Math.min(2, targets.length);
      for (let s = 0; s < seedCount; s++) {
        this.applyChain(targets[s], damage, tower.payload, tower);
      }
    }

    this.emitSound('NOVA', 0.9);
  }

  private updateBeamTower(
    tower: TowerEntity,
    stats: ReturnType<typeof computeTowerStats>,
    directInRange: EnemyEntity[]
  ): void {
    const tx = tower.x + 0.5;
    const ty = tower.y + 0.5;

    // Evaluate Prism Node relay synergy:
    // Any Beam tower within 3.5 tiles of a Prism can split into 2 beams at 70% dmg inside Prism's 3.0 radius!
    let bestPrism: UtilityNodeEntity | null = null;
    let bestPrismTargets: EnemyEntity[] = [];

    for (const relayPt of stats.prismRelays) {
      const prismEnt = this.getEntityAt(relayPt.x, relayPt.y);
      if (!prismEnt || prismEnt.kind !== 'PRISM') continue;
      const px = prismEnt.x + 0.5;
      const py = prismEnt.y + 0.5;

      const prismCandidates: EnemyEntity[] = [];
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - px, e.y - py) <= PRISM_RADIUS + e.radius) {
          prismCandidates.push(e);
        }
      }
      if (prismCandidates.length > bestPrismTargets.length) {
        bestPrism = prismEnt;
        bestPrismTargets = prismCandidates;
      }
    }

    // Use Prism relay when:
    // (a) Prism can split onto 2+ enemies (2x 70% = 140% net DPS!), OR
    // (b) Tower has no direct targets in range but Prism has at least 1 enemy in its 3.0 radius (reach extension!), OR
    // (c) Direct beam to primary target would pass through the Prism tile
    let beamPassesThroughPrism = false;
    if (bestPrism && directInRange.length > 0 && bestPrismTargets.length === 1) {
      const directEval = evaluateTargeting(directInRange, tower.rules, this.flowField);
      if (directEval.target) {
        const px = bestPrism.x + 0.5;
        const py = bestPrism.y + 0.5;
        const dx = directEval.target.x - tx;
        const dy = directEval.target.y - ty;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0.001) {
          const tProj = Math.max(0, Math.min(1, ((px - tx) * dx + (py - ty) * dy) / lenSq));
          const cx = tx + tProj * dx;
          const cy = ty + tProj * dy;
          if (Math.hypot(px - cx, py - cy) <= 0.65) {
            beamPassesThroughPrism = true;
          }
        }
      }
    }

    const usePrism =
      bestPrism !== null &&
      (bestPrismTargets.length >= 2 ||
        (directInRange.length === 0 && bestPrismTargets.length >= 1) ||
        beamPassesThroughPrism);

    if (usePrism && bestPrism) {
      const px = bestPrism.x + 0.5;
      const py = bestPrism.y + 0.5;
      tower.angle = Math.atan2(py - ty, px - tx);
      bestPrism.activePulse = 1.0;

      // Pick up to 2 distinct enemies inside Prism radius using tower's own targeting rules!
      const chosen: EnemyEntity[] = [];
      const firstEval = evaluateTargeting(bestPrismTargets, tower.rules, this.flowField);
      tower.lastRuleIndex = firstEval.ruleIndex;
      if (firstEval.target) {
        chosen.push(firstEval.target);
        const remaining = bestPrismTargets.filter((e) => e.id !== firstEval.target!.id);
        if (remaining.length > 0) {
          const secondEval = evaluateTargeting(remaining, tower.rules, this.flowField);
          if (secondEval.target) chosen.push(secondEval.target);
        }
      }

      if (tower.beamPrismId === bestPrism.id) {
        tower.beamRampTime += FIXED_DT;
      } else {
        tower.beamPrismId = bestPrism.id;
        tower.beamTargetId = null;
        tower.beamRampTime = Math.max(0, tower.beamRampTime * 0.5);
      }

      const rampMult = Math.min(BEAM_RAMP_CAP, 1 + tower.beamRampTime * BEAM_RAMP_PER_SEC);
      const rampRatio = (rampMult - 1) / (BEAM_RAMP_CAP - 1);

      // Render main relay beam from tower -> Prism
      this.activeBeams.push({
        towerId: tower.id,
        fromX: tx,
        fromY: ty,
        toX: px,
        toY: py,
        payload: tower.payload,
        rampRatio,
        isSplit: false,
        isRelay: true,
        width: 2.8 + rampRatio * 2.4,
      });

      // Render split beams from Prism -> targets
      for (const c of chosen) {
        bestPrism.prismBeamTargets.push(c.id);
        this.activeBeams.push({
          towerId: tower.id,
          fromX: px,
          fromY: py,
          toX: c.x,
          toY: c.y,
          payload: tower.payload,
          rampRatio,
          isSplit: chosen.length >= 2,
          isRelay: false,
          width: (chosen.length >= 2 ? 2.1 : 2.5) + rampRatio * 1.9,
        });
      }

      const tickInterval = 1 / BEAM_TICK_HZ;
      tower.beamTickAccum = Math.min(tickInterval * 2, tower.beamTickAccum + FIXED_DT);
      if (tower.beamTickAccum >= tickInterval) {
        tower.beamTickAccum -= tickInterval;
        const baseTickDmg = (stats.dps * rampMult) / BEAM_TICK_HZ;
        // 2 split beams deal 70% each (140% total); single reach-extension beam deals 100%
        const perTargetDmg = chosen.length >= 2 ? baseTickDmg * PRISM_SPLIT_DMG_MULT : baseTickDmg;
        // Scale flat armor reduction proportionally to continuous beam tick so Beam+Corrode counters Armor properly
        const armorScale = BASE_TOWER.fireRate / BEAM_TICK_HZ;

        for (const c of chosen) {
          this.applyBeamHit(tower, c, perTargetDmg, armorScale, px, py, rampRatio);
        }
        if (this.tick % 6 === 0) {
          const pal = getActivePalette();
          this.particleSystem.emitTowerFire(px, py, tower.angle, 'BEAM', tower.payload, pal);
        }
      }
      return;
    }

    // Standard direct Beam mode
    tower.beamPrismId = null;
    if (directInRange.length === 0) {
      tower.beamTargetId = null;
      tower.beamRampTime = Math.max(0, tower.beamRampTime - FIXED_DT * 2.0);
      tower.lastRuleIndex = -1;
      return;
    }

    const { target, ruleIndex } = evaluateTargeting(directInRange, tower.rules, this.flowField);
    tower.lastRuleIndex = ruleIndex;
    if (!target) return;

    if (tower.beamTargetId === target.id) {
      tower.beamRampTime += FIXED_DT;
    } else {
      tower.beamTargetId = target.id;
      tower.beamRampTime = 0;
    }

    tower.angle = Math.atan2(target.y - ty, target.x - tx);
    const rampMult = Math.min(BEAM_RAMP_CAP, 1 + tower.beamRampTime * BEAM_RAMP_PER_SEC);
    const rampRatio = (rampMult - 1) / (BEAM_RAMP_CAP - 1);

    this.activeBeams.push({
      towerId: tower.id,
      fromX: tx,
      fromY: ty,
      toX: target.x,
      toY: target.y,
      payload: tower.payload,
      rampRatio,
      isSplit: false,
      isRelay: false,
      width: 2.2 + rampRatio * 2.8,
    });

    const tickInterval = 1 / BEAM_TICK_HZ;
    tower.beamTickAccum = Math.min(tickInterval * 2, tower.beamTickAccum + FIXED_DT);
    if (tower.beamTickAccum >= tickInterval) {
      tower.beamTickAccum -= tickInterval;
      const tickDmg = (stats.dps * rampMult) / BEAM_TICK_HZ;
      const armorScale = BASE_TOWER.fireRate / BEAM_TICK_HZ;
      this.applyBeamHit(tower, target, tickDmg, armorScale, tx, ty, rampRatio);
      if (this.tick % 8 === 0) {
        const pal = getActivePalette();
        this.particleSystem.emitTowerFire(
          tx + Math.cos(tower.angle) * 0.34,
          ty + Math.sin(tower.angle) * 0.34,
          tower.angle,
          'BEAM',
          tower.payload,
          pal
        );
      }
    }
  }

  private applyBeamHit(
    tower: TowerEntity,
    primary: EnemyEntity,
    tickDmg: number,
    armorScale: number,
    originX: number,
    originY: number,
    rampRatio: number
  ): void {
    const pal = getActivePalette();
    const hitShield = primary.shield > 0.01;
    this.applyDamage(primary, tickDmg, tower.payload, tower, armorScale);
    this.particleSystem.emitBeamContact(
      primary.x,
      primary.y,
      Math.atan2(primary.y - originY, primary.x - originX),
      tower.payload,
      hitShield ? pal.shieldColor : pal.enemies[primary.type],
      rampRatio,
      pal
    );

    if (tower.modifier === 'CHAIN') {
      this.applyChain(primary, tickDmg, tower.payload, tower, armorScale, true);
    } else if (tower.modifier === 'SPLASH') {
      this.applySplash(primary.x, primary.y, tickDmg * 0.6, tower.payload, tower, primary.id, armorScale, true);
    } else if (tower.modifier === 'PIERCE') {
      // Penetrate line behind primary target to hit up to 2 extra enemies
      const dx = primary.x - originX;
      const dy = primary.y - originY;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      let extraHits = 0;
      for (const other of this.enemies) {
        if (other.id === primary.id || other.hp <= 0) continue;
        const ox = other.x - primary.x;
        const oy = other.y - primary.y;
        const projDist = ox * ux + oy * uy;
        if (projDist > 0 && projDist < 2.2) {
          const perp = Math.abs(ox * -uy + oy * ux);
          if (perp <= other.radius + 0.35) {
            this.applyDamage(other, tickDmg * 0.85, tower.payload, tower, armorScale);
            extraHits++;
            if (extraHits >= 2) break;
          }
        }
      }
    }
  }

  private updateProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= FIXED_DT;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Gentle homing for non-piercing Pulse bolts so fast Swarm enemies don't dodge unfairly
      if (p.targetId && p.modifier !== 'PIERCE') {
        const tgt = this.enemies.find((e) => e.id === p.targetId && e.hp > 0);
        if (tgt) {
          const dx = tgt.x - p.x;
          const dy = tgt.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          p.vx = (dx / dist) * p.speed;
          p.vy = (dy / dist) * p.speed;
        }
      }

      p.x += p.vx * FIXED_DT;
      p.y += p.vy * FIXED_DT;

      if (p.x < -0.5 || p.x > GRID_COLS + 0.5 || p.y < -0.5 || p.y > GRID_ROWS + 0.5) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision
      let consumed = false;
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (e.hp <= 0 || p.hitIds.has(e.id)) continue;
        const hitDist = e.radius + 0.16;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= hitDist) {
          p.hitIds.add(e.id);
          const pal = getActivePalette();
          const hitShield = e.shield > 0.01;
          const impactAngle = Math.atan2(p.vy, p.vx);
          const srcTower = this.entities.get(p.towerId) as TowerEntity | undefined;
          this.applyDamage(e, p.damage, p.payload, srcTower, 1.0);

          this.particleSystem.emitProjectileHit(
            p.x,
            p.y,
            impactAngle,
            p.payload,
            p.modifier,
            pal.enemies[e.type],
            hitShield,
            pal
          );
          this.impactFlashes.push({
            x: p.x,
            y: p.y,
            maxRadius: p.modifier === 'SPLASH' ? 0.52 : 0.34,
            color: hitShield ? pal.shieldColor : pal.payloads[p.payload],
            age: 0,
            duration: 0.12,
            kind: 'MUZZLE',
          });

          if (p.modifier === 'CHAIN') {
            this.applyChain(e, p.damage, p.payload, srcTower);
          } else if (p.modifier === 'SPLASH') {
            this.applySplash(e.x, e.y, p.damage * 0.6, p.payload, srcTower, e.id);
          }

          p.pierceLeft--;
          if (p.pierceLeft <= 0) {
            consumed = true;
            break;
          }
        }
      }

      if (consumed) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applyChain(
    origin: EnemyEntity,
    baseDamage: number,
    payload: PayloadType,
    tower?: TowerEntity,
    armorScale = 1.0,
    quiet = false
  ): void {
    const visited = new Set<string>([origin.id]);
    const points: { x: number; y: number }[] = [{ x: origin.x, y: origin.y }];
    let current = origin;
    let jumpDmg = baseDamage;

    for (let jump = 0; jump < 2; jump++) {
      jumpDmg *= 0.7;
      let nearest: EnemyEntity | null = null;
      let bestDist = 2.6;

      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0 || visited.has(e.id)) continue;
        const d = Math.hypot(e.x - current.x, e.y - current.y);
        if (d <= bestDist) {
          bestDist = d;
          nearest = e;
        }
      }

      if (!nearest) break;
      visited.add(nearest.id);
      points.push({ x: nearest.x, y: nearest.y });
      this.applyDamage(nearest, jumpDmg, payload, tower, armorScale);
      current = nearest;
    }

    if (points.length > 1) {
      const pal = getActivePalette();
      const arcColor = pal.payloads[payload];
      this.chainArcs.push({
        points,
        age: 0,
        duration: quiet ? 0.11 : 0.18,
        color: arcColor,
      });
      if (!quiet) {
        for (let k = 1; k < points.length; k++) {
          this.particleSystem.emitChainSpark(points[k].x, points[k].y, arcColor, pal);
        }
        this.emitSound('CHAIN', 0.7);
      }
    }
  }

  private applySplash(
    cx: number,
    cy: number,
    splashDmg: number,
    payload: PayloadType,
    tower?: TowerEntity,
    excludeId?: string,
    armorScale = 1.0,
    quiet = false
  ): void {
    const radius = 1.2;
    if (!quiet || this.tick % 4 === 0) {
      this.splashRings.push({
        x: cx,
        y: cy,
        radius,
        age: 0,
        duration: quiet ? 0.15 : 0.24,
        color: getActivePalette().payloads[payload],
      });
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.hp <= 0 || e.id === excludeId) continue;
      if (Math.hypot(e.x - cx, e.y - cy) <= radius + e.radius) {
        this.applyDamage(e, splashDmg, payload, tower, armorScale);
      }
    }
  }

  private applyDamage(
    enemy: EnemyEntity,
    rawDamage: number,
    payload: PayloadType,
    tower?: TowerEntity,
    armorScale = 1.0
  ): void {
    if (enemy.hp <= 0) return;

    // Reset out-of-combat timer for shield regen
    enemy.timeSinceDamage = 0;

    // Apply payload status effects
    if (payload === 'CRYO') {
      enemy.slowTimer = Math.max(enemy.slowTimer, 2.5);
    } else if (payload === 'CORRODE') {
      enemy.shredTimer = Math.max(enemy.shredTimer, 4.0);
    }

    // Shred adds +25% damage taken
    const shredMult = enemy.shredTimer > 0 ? 1.25 : 1.0;
    const totalIncoming = rawDamage * shredMult;

    let dealt = 0;

    // Shield absorbs 100% of damage until depleted
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, totalIncoming);
      enemy.shield -= absorbed;
      enemy.shieldFlash = 1.0;
      dealt = absorbed;

      if (enemy.shield <= 0.01) {
        enemy.shield = 0;
        const pal = getActivePalette();
        const shieldCol = pal.shieldColor;
        this.particleSystem.emitShieldShatter(enemy.x, enemy.y, shieldCol, pal);
        this.impactFlashes.push({
          x: enemy.x,
          y: enemy.y,
          maxRadius: 0.85,
          color: shieldCol,
          age: 0,
          duration: 0.28,
          kind: 'SHIELD_SHATTER',
        });
        this.emitSound('SHIELD_BREAK', 0.9);
      }
    } else {
      // Armor flat -5 damage reduction (min 1 dmg per standard shot, scaled for continuous Beam ticks)
      const flatReduction = enemy.armorFlat * armorScale;
      const minFloor = Math.min(totalIncoming, 1.0 * armorScale);
      const finalDmg = Math.max(minFloor, totalIncoming - flatReduction);
      enemy.hp -= finalDmg;
      enemy.hitFlash = 1.0;
      dealt = finalDmg;
    }

    this.totalDamage += dealt;
    if (tower) {
      tower.totalDamage += dealt;
      if (enemy.hp <= 0) {
        tower.kills++;
      }
    }
  }

  private cullDeadEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) {
        this.enemies.splice(i, 1);
        this.totalKills++;
        if (!this.demoMode) {
          this.gold += e.reward;
        }

        const pal = getActivePalette();
        const enemyColor = pal.enemies[e.type];
        this.particleSystem.emitEnemyKill(e.x, e.y, e.type, enemyColor, pal);
        this.impactFlashes.push({
          x: e.x,
          y: e.y,
          maxRadius: e.type === 'ARMOR' ? 1.15 : 0.68,
          color: enemyColor,
          age: 0,
          duration: e.type === 'ARMOR' ? 0.34 : 0.22,
          kind: 'SHOCKWAVE',
        });

        if (e.type === 'ARMOR' && !this.demoMode) {
          this.triggerShake(0.1, 2.5);
        }

        if (!this.demoMode) {
          this.floatingTexts.push({
            x: e.x,
            y: e.y - 0.15,
            text: `+${e.reward}g`,
            color: pal.goldText,
            age: 0,
            duration: 0.65,
          });
        }
        this.emitSound('KILL', e.type === 'ARMOR' ? 1.0 : 0.7);
      }
    }
  }

  private triggerShake(duration: number, intensity: number): void {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private updateTransientFx(dt: number): void {
    for (let i = this.novaRings.length - 1; i >= 0; i--) {
      this.novaRings[i].age += dt;
      if (this.novaRings[i].age >= this.novaRings[i].duration) {
        this.novaRings.splice(i, 1);
      }
    }
    for (let i = this.chainArcs.length - 1; i >= 0; i--) {
      this.chainArcs[i].age += dt;
      if (this.chainArcs[i].age >= this.chainArcs[i].duration) {
        this.chainArcs.splice(i, 1);
      }
    }
    for (let i = this.splashRings.length - 1; i >= 0; i--) {
      this.splashRings[i].age += dt;
      if (this.splashRings[i].age >= this.splashRings[i].duration) {
        this.splashRings.splice(i, 1);
      }
    }
    for (let i = this.impactFlashes.length - 1; i >= 0; i--) {
      this.impactFlashes[i].age += dt;
      if (this.impactFlashes[i].age >= this.impactFlashes[i].duration) {
        this.impactFlashes.splice(i, 1);
      }
    }
    this.particleSystem.step(dt);
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.age += dt;
      ft.y -= dt * 0.75;
      if (ft.age >= ft.duration) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public getHudSnapshot(): HudSnapshot {
    const selectedEntity = this.selectedEntityId
      ? this.entities.get(this.selectedEntityId) ?? null
      : null;

    let selectedStats = null;
    let selectedPrismLinks: HudSnapshot['selectedPrismLinks'] = null;
    let selectedOverclockTargets = 0;

    if (selectedEntity) {
      if (selectedEntity.kind === 'TOWER') {
        selectedStats = computeTowerStats(selectedEntity, this.entities);
      } else if (selectedEntity.kind === 'PRISM') {
        let sourceTowers = 0;
        const nearbyNonBeamTowers: Array<{
          id: string;
          x: number;
          y: number;
          trigger: TriggerType;
        }> = [];
        for (const e of this.entities.values()) {
          if (e.kind !== 'TOWER') continue;
          const d = Math.hypot(e.x - selectedEntity.x, e.y - selectedEntity.y);
          if (d <= TRIGGERS.BEAM.range + 0.05) {
            if (e.trigger === 'BEAM') {
              sourceTowers++;
            } else {
              nearbyNonBeamTowers.push({ id: e.id, x: e.x, y: e.y, trigger: e.trigger });
            }
          }
        }
        let targetsInRadius = 0;
        const px = selectedEntity.x + 0.5;
        const py = selectedEntity.y + 0.5;
        for (const en of this.enemies) {
          if (Math.hypot(en.x - px, en.y - py) <= PRISM_RADIUS + en.radius) {
            targetsInRadius++;
          }
        }
        selectedPrismLinks = { sourceTowers, targetsInRadius, nearbyNonBeamTowers };
      } else if (selectedEntity.kind === 'OVERCLOCK') {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (const [dx, dy] of dirs) {
          const neighbor = this.getEntityAt(selectedEntity.x + dx, selectedEntity.y + dy);
          if (neighbor && neighbor.kind === 'TOWER') selectedOverclockTargets++;
        }
      }
    }

    const nextWaveDef = this.waves[this.waveIndex] ?? null;

    return {
      tick: this.tick,
      waveIndex: this.waveIndex,
      totalWaves: this.waves.length,
      waveActive: this.waveActive,
      enemiesRemaining: this.enemies.length + this.spawnQueue.length,
      gold: this.gold,
      lives: this.lives,
      maxLives: this.maxLives,
      simSpeed: this.simSpeed,
      paused: this.paused,
      gameOutcome: this.gameOutcome,
      totalKills: this.totalKills,
      totalDamage: Math.round(this.totalDamage),
      mapName: this.mapName,
      pathLength: Math.max(0, this.flowField.spawnDist),
      selectedEntityId: this.selectedEntityId,
      selectedEntity: selectedEntity ? { ...selectedEntity } : null,
      selectedStats,
      selectedPrismLinks,
      selectedOverclockTargets,
      nextWaveSummary: nextWaveDef ? summarizeWave(nextWaveDef) : null,
    };
  }
}
