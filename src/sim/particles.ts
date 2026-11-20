import { ThemePalette } from '../theme/palettes';
import { EnemyType, ModifierType, PayloadType, TriggerType } from './types';

export type VectorParticleKind = 'SPARK' | 'DEBRIS' | 'MOTE';

export type VectorParticleShape =
  | 'NEEDLE'
  | 'CHEVRON'
  | 'SHARD'
  | 'TRIANGLE'
  | 'DIAMOND'
  | 'SQUARE'
  | 'HEX'
  | 'CRYSTAL'
  | 'RING';

export type ElementalReactionKind =
  | 'FROST_SHATTER'
  | 'ARMOR_MELT'
  | 'BRITTLE_FLUX'
  | 'TRI_BREACH';

export interface VectorParticle {
  kind: VectorParticleKind;
  shape: VectorParticleShape;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  drag: number; // per-tick velocity retention (at 60Hz)
  size: number; // base pixel scale at 42px tile size
  length: number; // streak elongation factor for sparks
  color: string;
  coreColor: string | null;
  rotation: number;
  vRot: number;
  alignToVelocity: boolean;
  outlined: boolean;
  age: number;
  duration: number;
  // Optional guided conduit trajectory (interpolates smoothly between two grid points)
  startX?: number;
  startY?: number;
  targetX?: number;
  targetY?: number;
  curveAmp?: number;
}

const DEFAULT_MAX_PARTICLES = 640;

export class VectorParticleSystem {
  public readonly items: VectorParticle[] = [];
  private readonly maxParticles: number;

  constructor(maxParticles = DEFAULT_MAX_PARTICLES) {
    this.maxParticles = maxParticles;
  }

  public get count(): number {
    return this.items.length;
  }

  public clear(): void {
    this.items.length = 0;
  }

  public step(dt: number): void {
    const dampingPow = dt * 60;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      if (p.age >= p.duration) {
        // O(1) swap-and-pop removal
        const last = this.items.length - 1;
        if (i !== last) {
          this.items[i] = this.items[last];
        }
        this.items.pop();
        continue;
      }

      p.prevX = p.x;
      p.prevY = p.y;

      if (
        p.startX !== undefined &&
        p.startY !== undefined &&
        p.targetX !== undefined &&
        p.targetY !== undefined
      ) {
        const t = Math.max(0, Math.min(1, p.age / Math.max(0.001, p.duration)));
        // Smooth ease-in-out glide along conduit vector with optional lateral arc
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const dx = p.targetX - p.startX;
        const dy = p.targetY - p.startY;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const arc = Math.sin(t * Math.PI) * (p.curveAmp ?? 0);
        const nextX = p.startX + dx * eased + nx * arc;
        const nextY = p.startY + dy * eased + ny * arc;
        const invDt = dt > 0.0001 ? 1 / dt : 60;
        p.vx = (nextX - p.x) * invDt;
        p.vy = (nextY - p.y) * invDt;
        p.x = nextX;
        p.y = nextY;
        if (p.alignToVelocity) {
          const speedSq = p.vx * p.vx + p.vy * p.vy;
          if (speedSq > 0.002) {
            p.rotation = Math.atan2(p.vy, p.vx);
          }
        } else {
          p.rotation += p.vRot * dt;
        }
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const damp = Math.pow(p.drag, dampingPow);
      p.vx *= damp;
      p.vy *= damp;

      if (p.alignToVelocity) {
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        if (speedSq > 0.002) {
          p.rotation = Math.atan2(p.vy, p.vx);
        }
      } else {
        p.rotation += p.vRot * dt;
      }
    }
  }

  private push(p: VectorParticle): void {
    if (this.items.length >= this.maxParticles) {
      // Overwrite oldest entry in-place by rotating slot 0 out
      const replaceIdx = Math.floor(Math.random() * Math.min(24, this.items.length));
      this.items[replaceIdx] = p;
      return;
    }
    this.items.push(p);
  }

  /**
   * Emits directional muzzle sparks and ejected vector shell debris when a tower fires.
   */
  public emitTowerFire(
    x: number,
    y: number,
    angle: number,
    trigger: TriggerType,
    payload: PayloadType,
    pal: ThemePalette
  ): void {
    const payColor = pal.payloads[payload];
    const trigColor = pal.triggers[trigger];
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;

    if (trigger === 'PULSE') {
      // Forward high-velocity razor sparks in tight muzzle cone
      const sparkCount = 5;
      for (let i = 0; i < sparkCount; i++) {
        const spread = (Math.random() - 0.5) * 0.72;
        const a = angle + spread;
        const speed = 3.2 + Math.random() * 4.6;
        this.push({
          kind: 'SPARK',
          shape: i === 0 ? 'CHEVRON' : 'NEEDLE',
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.84,
          size: 1.9 + Math.random() * 1.4,
          length: 1.7 + Math.random() * 1.1,
          color: i % 2 === 0 ? payColor : trigColor,
          coreColor: hotCore,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.14 + Math.random() * 0.12,
        });
      }

      // Ejected angular micro-debris (spent vector casings kicking sideways off breech)
      const side = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 2; i++) {
        const ejectAngle = angle + side * (Math.PI * 0.62 + (Math.random() - 0.5) * 0.4);
        const speed = 1.4 + Math.random() * 1.8;
        this.push({
          kind: 'DEBRIS',
          shape: i === 0 ? 'SQUARE' : 'SHARD',
          x: x - Math.cos(angle) * 0.14,
          y: y - Math.sin(angle) * 0.14,
          prevX: x,
          prevY: y,
          vx: Math.cos(ejectAngle) * speed,
          vy: Math.sin(ejectAngle) * speed,
          drag: 0.89,
          size: 2.0 + Math.random() * 1.2,
          length: 1,
          color: trigColor,
          coreColor: null,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 18,
          alignToVelocity: false,
          outlined: i === 1,
          age: 0,
          duration: 0.22 + Math.random() * 0.14,
        });
      }
      return;
    }

    if (trigger === 'NOVA') {
      // 360-degree radial vector spark & shard burst around the emitter ring
      const spokes = 12;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
        const ox = x + Math.cos(a) * 0.22;
        const oy = y + Math.sin(a) * 0.22;
        const speed = 3.6 + Math.random() * 4.2;
        this.push({
          kind: 'SPARK',
          shape: i % 3 === 0 ? 'CHEVRON' : 'NEEDLE',
          x: ox,
          y: oy,
          prevX: ox,
          prevY: oy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.87,
          size: 2.1 + Math.random() * 1.4,
          length: 1.8 + Math.random() * 1.1,
          color: i % 2 === 0 ? payColor : trigColor,
          coreColor: hotCore,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.2 + Math.random() * 0.14,
        });

        if (i % 3 === 0) {
          const dSpeed = 2.0 + Math.random() * 2.2;
          this.push({
            kind: 'DEBRIS',
            shape: 'DIAMOND',
            x: ox,
            y: oy,
            prevX: ox,
            prevY: oy,
            vx: Math.cos(a + 0.15) * dSpeed,
            vy: Math.sin(a + 0.15) * dSpeed,
            drag: 0.9,
            size: 2.5 + Math.random() * 1.3,
            length: 1,
            color: payColor,
            coreColor: null,
            rotation: a,
            vRot: (Math.random() - 0.5) * 14,
            alignToVelocity: false,
            outlined: true,
            age: 0,
            duration: 0.28 + Math.random() * 0.16,
          });
        }
      }
      return;
    }

    // BEAM muzzle focus sparks (lightweight emitter crackle)
    for (let i = 0; i < 2; i++) {
      const a = angle + (Math.random() - 0.5) * 0.95;
      const speed = 2.2 + Math.random() * 3.0;
      this.push({
        kind: 'SPARK',
        shape: 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.82,
        size: 1.6 + Math.random() * 1.0,
        length: 1.5,
        color: payColor,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.12 + Math.random() * 0.09,
      });
    }
  }

  /**
   * Emits directional ricochet sparks and chipped geometric debris when a projectile hits an enemy.
   */
  public emitProjectileHit(
    x: number,
    y: number,
    impactAngle: number,
    payload: PayloadType,
    modifier: ModifierType,
    enemyColor: string,
    hitShield: boolean,
    pal: ThemePalette
  ): void {
    const payColor = pal.payloads[payload];
    const debrisColor = hitShield ? pal.shieldColor : enemyColor;
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    const bounceAngle = impactAngle + Math.PI;

    // 1. Directional ricochet sparks spraying off impact surface
    const sparkCount = modifier === 'SPLASH' ? 9 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const spread =
        modifier === 'SPLASH'
          ? (Math.random() - 0.5) * Math.PI * 2
          : (Math.random() - 0.5) * 2.1;
      const a = bounceAngle + spread;
      const speed = 2.8 + Math.random() * 5.2;
      this.push({
        kind: 'SPARK',
        shape: i === 0 ? 'CHEVRON' : 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.85,
        size: 2.0 + Math.random() * 1.5,
        length: 1.8 + Math.random() * 1.2,
        color: i % 3 === 0 ? debrisColor : payColor,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.16 + Math.random() * 0.16,
      });
    }

    // 2. Chipped vector debris shards knocked loose from enemy hull / shield
    const debrisCount = modifier === 'SPLASH' ? 5 : 3;
    const debrisShapes: VectorParticleShape[] = hitShield
      ? ['HEX', 'SHARD', 'DIAMOND']
      : ['TRIANGLE', 'SHARD', 'SQUARE'];
    for (let i = 0; i < debrisCount; i++) {
      const a = bounceAngle + (Math.random() - 0.5) * 2.4;
      const speed = 1.6 + Math.random() * 3.4;
      this.push({
        kind: 'DEBRIS',
        shape: debrisShapes[i % debrisShapes.length],
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.9,
        size: 2.3 + Math.random() * 1.9,
        length: 1,
        color: i === 0 ? payColor : debrisColor,
        coreColor: null,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        alignToVelocity: false,
        outlined: hitShield || i % 2 === 1,
        age: 0,
        duration: 0.24 + Math.random() * 0.22,
      });
    }

    // 3. Pierce modifier: forward exit punch-through sparks!
    if (modifier === 'PIERCE') {
      for (let i = 0; i < 4; i++) {
        const a = impactAngle + (Math.random() - 0.5) * 0.45;
        const speed = 4.6 + Math.random() * 4.4;
        this.push({
          kind: 'SPARK',
          shape: 'NEEDLE',
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.86,
          size: 2.1 + Math.random() * 1.0,
          length: 2.2,
          color: payColor,
          coreColor: hotCore,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.16 + Math.random() * 0.1,
        });
      }
    }
  }

  /**
   * Emits continuous welding-style contact sparks when a Beam cuts into an enemy.
   */
  public emitBeamContact(
    x: number,
    y: number,
    beamAngle: number,
    payload: PayloadType,
    enemyColor: string,
    rampRatio: number,
    pal: ThemePalette
  ): void {
    const payColor = pal.payloads[payload];
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    const count = rampRatio > 0.55 ? 3 : 2;
    const reflectBase = beamAngle + Math.PI;

    for (let i = 0; i < count; i++) {
      const a = reflectBase + (Math.random() - 0.5) * 2.2;
      const speed = 2.4 + Math.random() * (3.2 + rampRatio * 2.8);
      this.push({
        kind: 'SPARK',
        shape: 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.83,
        size: 1.7 + Math.random() * (1.1 + rampRatio * 0.9),
        length: 1.6 + rampRatio * 0.8,
        color: i === 0 ? payColor : enemyColor,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.13 + Math.random() * 0.12,
      });
    }

    // Occasional molten vector fleck at higher beam ramp
    if (rampRatio > 0.25 && Math.random() < 0.45) {
      const a = reflectBase + (Math.random() - 0.5) * 2.4;
      const speed = 1.6 + Math.random() * 2.4;
      this.push({
        kind: 'DEBRIS',
        shape: 'SHARD',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.89,
        size: 2.0 + Math.random() * 1.4,
        length: 1,
        color: enemyColor,
        coreColor: null,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 16,
        alignToVelocity: false,
        outlined: false,
        age: 0,
        duration: 0.2 + Math.random() * 0.16,
      });
    }
  }

  /**
   * Emits crisp electric sparks at Chain Lightning contact points.
   */
  public emitChainSpark(x: number, y: number, color: string, pal: ThemePalette): void {
    const hotCore = pal.isLight ? '#181715' : '#FFFFFF';
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 3.2 + Math.random() * 3.8;
      this.push({
        kind: 'SPARK',
        shape: 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.82,
        size: 1.8 + Math.random() * 1.1,
        length: 1.9,
        color,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.13 + Math.random() * 0.11,
      });
    }
  }

  /**
   * Emits hexagonal crystalline barrier splinters when an enemy shield shatters.
   */
  public emitShieldShatter(x: number, y: number, shieldColor: string, pal: ThemePalette): void {
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const speed = 2.4 + Math.random() * 3.6;
      this.push({
        kind: 'DEBRIS',
        shape: i % 2 === 0 ? 'HEX' : 'SHARD',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.9,
        size: 3.0 + Math.random() * 2.2,
        length: 1,
        color: shieldColor,
        coreColor: null,
        rotation: a,
        vRot: (Math.random() - 0.5) * 16,
        alignToVelocity: false,
        outlined: i % 3 !== 0,
        age: 0,
        duration: 0.3 + Math.random() * 0.24,
      });
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 3.8 + Math.random() * 4.2;
      this.push({
        kind: 'SPARK',
        shape: 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.85,
        size: 2.0 + Math.random() * 1.2,
        length: 2.0,
        color: shieldColor,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.18 + Math.random() * 0.14,
      });
    }
  }

  /**
   * Emits archetype-styled hull destruction debris and bright sparks when an enemy is neutralized.
   */
  public emitEnemyKill(
    x: number,
    y: number,
    enemyType: EnemyType,
    enemyColor: string,
    pal: ThemePalette
  ): void {
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    const isHeavy = enemyType === 'ARMOR';
    const debrisCount = isHeavy ? 12 : enemyType === 'SHIELDED' ? 9 : 6;
    const sparkCount = isHeavy ? 12 : 7;

    const shapes: VectorParticleShape[] =
      enemyType === 'ARMOR'
        ? ['HEX', 'SQUARE', 'SHARD']
        : enemyType === 'SHIELDED'
        ? ['DIAMOND', 'HEX', 'SHARD']
        : ['TRIANGLE', 'SHARD', 'CHEVRON'];

    for (let i = 0; i < debrisCount; i++) {
      const a = (i / debrisCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = (isHeavy ? 1.9 : 2.2) + Math.random() * (isHeavy ? 4.4 : 3.6);
      this.push({
        kind: 'DEBRIS',
        shape: shapes[i % shapes.length],
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: isHeavy ? 0.92 : 0.9,
        size: (isHeavy ? 3.2 : 2.4) + Math.random() * (isHeavy ? 3.0 : 2.2),
        length: 1,
        color: enemyColor,
        coreColor: null,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        alignToVelocity: false,
        outlined: i % 3 === 0,
        age: 0,
        duration: (isHeavy ? 0.38 : 0.28) + Math.random() * 0.26,
      });
    }

    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 3.4 + Math.random() * (isHeavy ? 6.0 : 4.8);
      this.push({
        kind: 'SPARK',
        shape: i % 4 === 0 ? 'CHEVRON' : 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.85,
        size: 2.0 + Math.random() * 1.5,
        length: 1.9 + Math.random() * 1.1,
        color: enemyColor,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.18 + Math.random() * 0.18,
      });
    }
  }

  /**
   * Emits clean architectural geometric bursts for build, sell, and core breach events.
   */
  public emitConstructBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    pal: ThemePalette
  ): void {
    const shapes: VectorParticleShape[] = ['SQUARE', 'TRIANGLE', 'DIAMOND', 'HEX'];
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;

    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.6 + Math.random() * 3.8;
      const isSpark = i % 3 === 0;
      this.push({
        kind: isSpark ? 'SPARK' : 'DEBRIS',
        shape: isSpark ? 'NEEDLE' : shapes[i % shapes.length],
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: isSpark ? 0.86 : 0.9,
        size: 2.2 + Math.random() * 2.6,
        length: isSpark ? 1.8 : 1,
        color,
        coreColor: isSpark ? hotCore : null,
        rotation: isSpark ? a : Math.random() * Math.PI * 2,
        vRot: isSpark ? 0 : (Math.random() - 0.5) * 14,
        alignToVelocity: isSpark,
        outlined: !isSpark && i % 2 === 1,
        age: 0,
        duration: 0.24 + Math.random() * 0.24,
      });
    }
  }

  /**
   * Emits guided golden energy chevrons/motes flowing from an Overclock node into an orthogonally adjacent tower.
   */
  public emitOverclockFlow(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    energized: boolean,
    pal: ThemePalette
  ): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const core = pal.isLight ? '#181715' : pal.overclockCore;
    const count = energized ? 3 : 1;

    for (let i = 0; i < count; i++) {
      const side = (Math.random() - 0.5) * (energized ? 0.24 : 0.14);
      const isSpark = energized && i === 0;
      this.push({
        kind: isSpark ? 'SPARK' : 'MOTE',
        shape: i === 0 ? 'CHEVRON' : 'DIAMOND',
        x: fromX,
        y: fromY,
        prevX: fromX,
        prevY: fromY,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        drag: 1,
        size: (energized ? 2.2 : 1.7) + Math.random() * 0.8,
        length: 1.5,
        color: i % 2 === 0 ? pal.overclock : pal.overclockLight,
        coreColor: core,
        rotation: angle,
        vRot: isSpark ? 0 : (Math.random() - 0.5) * 6,
        alignToVelocity: i === 0,
        outlined: !energized && i > 0,
        age: 0,
        duration: (energized ? 0.22 : 0.36) + Math.random() * 0.08,
        startX: fromX + (Math.random() - 0.5) * 0.08,
        startY: fromY + (Math.random() - 0.5) * 0.08,
        targetX: toX + (Math.random() - 0.5) * 0.1,
        targetY: toY + (Math.random() - 0.5) * 0.1,
        curveAmp: side,
      });
    }

    // Crisp reception spark at the overclocked tower when firing
    if (energized) {
      for (let i = 0; i < 2; i++) {
        const a = angle + (Math.random() - 0.5) * 1.4;
        const speed = 2.0 + Math.random() * 2.4;
        this.push({
          kind: 'SPARK',
          shape: 'NEEDLE',
          x: toX,
          y: toY,
          prevX: toX,
          prevY: toY,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.84,
          size: 1.6 + Math.random() * 0.8,
          length: 1.5,
          color: pal.overclockLight,
          coreColor: core,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.14 + Math.random() * 0.08,
        });
      }
    }
  }

  /**
   * Emits chromatic optical dispersion shards & photonic sparks when a Prism actively relays or splits a Beam.
   */
  public emitPrismRefraction(
    prismX: number,
    prismY: number,
    payload: PayloadType,
    splitAngles: number[],
    rampRatio: number,
    pal: ThemePalette
  ): void {
    const payColor = pal.payloads[payload];
    const hotCore = pal.isLight ? '#181715' : pal.prismCore;
    const isSplit = splitAngles.length >= 2;

    // 1. Directional photonic dispersion sparks spraying along each exit beam vector
    for (let s = 0; s < splitAngles.length; s++) {
      const baseAngle = splitAngles[s];
      const count = isSplit ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (Math.random() - 0.5) * 0.65;
        const speed = 2.4 + Math.random() * (2.6 + rampRatio * 2.2);
        this.push({
          kind: 'SPARK',
          shape: i === 0 ? 'NEEDLE' : 'CHEVRON',
          x: prismX,
          y: prismY,
          prevX: prismX,
          prevY: prismY,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.84,
          size: 1.7 + Math.random() * (0.9 + rampRatio * 0.6),
          length: 1.6 + rampRatio * 0.6,
          color: i % 2 === 0 ? pal.prismLight : payColor,
          coreColor: hotCore,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.15 + Math.random() * 0.11,
        });
      }
    }

    // 2. Orbiting chromatic prism crystal motes flaring radially off the facets
    const crystalCount = isSplit ? 2 : 1;
    for (let i = 0; i < crystalCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.1 + Math.random() * 1.9;
      this.push({
        kind: 'MOTE',
        shape: i === 0 ? 'DIAMOND' : 'HEX',
        x: prismX + Math.cos(a) * 0.12,
        y: prismY + Math.sin(a) * 0.12,
        prevX: prismX,
        prevY: prismY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.89,
        size: 2.1 + Math.random() * 1.1,
        length: 1,
        color: i === 0 ? pal.prism : payColor,
        coreColor: hotCore,
        rotation: a,
        vRot: (Math.random() - 0.5) * 10,
        alignToVelocity: false,
        outlined: i === 1,
        age: 0,
        duration: 0.24 + Math.random() * 0.16,
      });
    }
  }

  /**
   * Emits a celebratory link lock-in burst along a newly formed adjacency or optical relay connection.
   */
  public emitSynergyLinkLock(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    colorA: string,
    colorB: string,
    pal: ThemePalette
  ): void {
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Guided stream particles racing in both directions to lock the link visually
    for (let i = 0; i < 6; i++) {
      const forward = i % 2 === 0;
      const sx = forward ? fromX : toX;
      const sy = forward ? fromY : toY;
      const tx = forward ? toX : fromX;
      const ty = forward ? toY : fromY;
      const curve = ((i % 3) - 1) * 0.18;
      this.push({
        kind: i < 2 ? 'SPARK' : 'MOTE',
        shape: i % 2 === 0 ? 'CHEVRON' : 'DIAMOND',
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        vx: Math.cos(forward ? angle : angle + Math.PI) * 3,
        vy: Math.sin(forward ? angle : angle + Math.PI) * 3,
        drag: 1,
        size: 2.2 + Math.random() * 1.0,
        length: 1.7,
        color: forward ? colorA : colorB,
        coreColor: hotCore,
        rotation: forward ? angle : angle + Math.PI,
        vRot: (Math.random() - 0.5) * 8,
        alignToVelocity: i % 2 === 0,
        outlined: i >= 4,
        age: 0,
        duration: 0.28 + i * 0.035,
        startX: sx,
        startY: sy,
        targetX: tx,
        targetY: ty,
        curveAmp: curve,
      });
    }

    // Midpoint harmonic resonance ring
    const mx = (fromX + toX) * 0.5;
    const my = (fromY + toY) * 0.5;
    this.push({
      kind: 'MOTE',
      shape: 'RING',
      x: mx,
      y: my,
      prevX: mx,
      prevY: my,
      vx: 0,
      vy: 0,
      drag: 1,
      size: 4.8,
      length: 1,
      color: colorA,
      coreColor: colorB,
      rotation: 0,
      vRot: 0,
      alignToVelocity: false,
      outlined: true,
      age: 0,
      duration: 0.34,
    });
  }

  /**
   * Emits subtle harmonic sparks across the shared border of two orthogonally adjacent complementary-payload towers.
   */
  public emitTowerAdjacencyPulse(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    colorA: string,
    colorB: string,
    intense: boolean,
    pal: ThemePalette
  ): void {
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const count = intense ? 3 : 1;

    for (let i = 0; i < count; i++) {
      const forward = i % 2 === 0;
      const sx = forward ? fromX : toX;
      const sy = forward ? fromY : toY;
      const tx = forward ? toX : fromX;
      const ty = forward ? toY : fromY;
      this.push({
        kind: intense && i === 0 ? 'SPARK' : 'MOTE',
        shape: i === 0 ? 'CHEVRON' : 'DIAMOND',
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        drag: 1,
        size: (intense ? 2.1 : 1.5) + Math.random() * 0.7,
        length: 1.5,
        color: forward ? colorA : colorB,
        coreColor: hotCore,
        rotation: forward ? angle : angle + Math.PI,
        vRot: (Math.random() - 0.5) * 7,
        alignToVelocity: i === 0,
        outlined: !intense,
        age: 0,
        duration: (intense ? 0.24 : 0.38) + Math.random() * 0.08,
        startX: sx,
        startY: sy,
        targetX: tx,
        targetY: ty,
        curveAmp: (Math.random() - 0.5) * 0.22,
      });
    }
  }

  /**
   * Emits delicate crystalline frost flecks trailing off a Cryo-slowed enemy.
   */
  public emitCryoAmbient(x: number, y: number, pal: ThemePalette): void {
    const a = Math.random() * Math.PI * 2;
    const speed = 0.45 + Math.random() * 0.85;
    const ox = x + (Math.random() - 0.5) * 0.24;
    const oy = y + (Math.random() - 0.5) * 0.24;
    this.push({
      kind: 'MOTE',
      shape: Math.random() < 0.65 ? 'CRYSTAL' : 'HEX',
      x: ox,
      y: oy,
      prevX: ox,
      prevY: oy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      drag: 0.93,
      size: 2.0 + Math.random() * 1.1,
      length: 1,
      color: pal.payloads.CRYO,
      coreColor: pal.isLight ? null : '#E0F2FE',
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 5,
      alignToVelocity: false,
      outlined: true,
      age: 0,
      duration: 0.34 + Math.random() * 0.22,
    });
  }

  /**
   * Emits rising acidic corrosive vapor rings and armor-etch flecks off a Corrode-shredded enemy.
   */
  public emitCorrodeAmbient(x: number, y: number, pal: ThemePalette): void {
    const ox = x + (Math.random() - 0.5) * 0.26;
    const oy = y + (Math.random() - 0.5) * 0.26;
    const isRing = Math.random() < 0.55;
    this.push({
      kind: isRing ? 'MOTE' : 'DEBRIS',
      shape: isRing ? 'RING' : 'TRIANGLE',
      x: ox,
      y: oy,
      prevX: ox,
      prevY: oy,
      vx: (Math.random() - 0.5) * 0.75,
      vy: -0.55 - Math.random() * 0.75,
      drag: 0.94,
      size: (isRing ? 2.3 : 1.7) + Math.random() * 0.9,
      length: 1,
      color: pal.payloads.CORRODE,
      coreColor: null,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 10,
      alignToVelocity: false,
      outlined: isRing,
      age: 0,
      duration: 0.3 + Math.random() * 0.2,
    });
  }

  /**
   * Emits volatile dual-element interference motes around an enemy afflicted by both Cryo and Corrode.
   */
  public emitDualDebuffAmbient(x: number, y: number, pal: ThemePalette): void {
    const a = Math.random() * Math.PI * 2;
    const ox = x + Math.cos(a) * 0.16;
    const oy = y + Math.sin(a) * 0.16;
    const useCryo = Math.random() < 0.5;
    this.push({
      kind: 'MOTE',
      shape: useCryo ? 'CRYSTAL' : 'RING',
      x: ox,
      y: oy,
      prevX: ox,
      prevY: oy,
      vx: Math.cos(a + 0.9) * 1.15,
      vy: Math.sin(a + 0.9) * 1.15,
      drag: 0.92,
      size: 2.3 + Math.random() * 1.0,
      length: 1,
      color: useCryo ? pal.payloads.CRYO : pal.payloads.CORRODE,
      coreColor: useCryo ? pal.payloads.CORRODE : pal.payloads.CRYO,
      rotation: a,
      vRot: (Math.random() - 0.5) * 9,
      alignToVelocity: false,
      outlined: true,
      age: 0,
      duration: 0.32 + Math.random() * 0.16,
    });
  }

  /**
   * Emits distinct elemental cross-payload reaction bursts on the canvas when payloads interact on an enemy:
   * - FROST_SHATTER: Kinetic hitting Cryo-slowed enemy -> explosive ice crystals + hot impact sparks
   * - ARMOR_MELT: Kinetic hitting Corrode-shredded enemy -> molten slag streaks + acid vapor rings
   * - BRITTLE_FLUX: Cryo hitting Corrode or Corrode hitting Cryo -> swirling cryo-acid crystalline vortex
   * - TRI_BREACH: Kinetic hitting Cryo+Corrode enemy -> high-energy tri-element vector burst
   */
  public emitElementalReaction(
    x: number,
    y: number,
    reaction: ElementalReactionKind,
    impactAngle: number,
    pal: ThemePalette
  ): void {
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    const cryoCol = pal.payloads.CRYO;
    const corrodeCol = pal.payloads.CORRODE;
    const kineticCol = pal.payloads.KINETIC;

    if (reaction === 'FROST_SHATTER') {
      // Radial crystalline ice splinters snapping outward
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const speed = 2.6 + Math.random() * 3.4;
        this.push({
          kind: i % 2 === 0 ? 'MOTE' : 'DEBRIS',
          shape: i % 2 === 0 ? 'CRYSTAL' : 'SHARD',
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.89,
          size: 2.7 + Math.random() * 1.4,
          length: 1,
          color: cryoCol,
          coreColor: hotCore,
          rotation: a,
          vRot: (Math.random() - 0.5) * 14,
          alignToVelocity: false,
          outlined: i % 3 === 0,
          age: 0,
          duration: 0.28 + Math.random() * 0.16,
        });
      }
      // Hot kinetic shatter needles
      for (let i = 0; i < 4; i++) {
        const a = impactAngle + Math.PI + (Math.random() - 0.5) * 2.2;
        const speed = 3.8 + Math.random() * 4.2;
        this.push({
          kind: 'SPARK',
          shape: i === 0 ? 'CHEVRON' : 'NEEDLE',
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.85,
          size: 2.0 + Math.random() * 1.1,
          length: 2.0,
          color: i % 2 === 0 ? kineticCol : cryoCol,
          coreColor: hotCore,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.18 + Math.random() * 0.12,
        });
      }
      return;
    }

    if (reaction === 'ARMOR_MELT') {
      // Incandescent molten slag & corrosive needles ripping off the hull
      for (let i = 0; i < 6; i++) {
        const a = impactAngle + Math.PI + (Math.random() - 0.5) * 1.8;
        const speed = 3.2 + Math.random() * 4.4;
        this.push({
          kind: 'SPARK',
          shape: i < 2 ? 'CHEVRON' : 'NEEDLE',
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          drag: 0.84,
          size: 2.1 + Math.random() * 1.2,
          length: 2.1,
          color: i % 2 === 0 ? corrodeCol : kineticCol,
          coreColor: hotCore,
          rotation: a,
          vRot: 0,
          alignToVelocity: true,
          outlined: false,
          age: 0,
          duration: 0.18 + Math.random() * 0.14,
        });
      }
      // Acid vapor rings & corroded slag flakes
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 1.4 + Math.random() * 2.1;
        const isRing = i < 2;
        this.push({
          kind: isRing ? 'MOTE' : 'DEBRIS',
          shape: isRing ? 'RING' : 'TRIANGLE',
          x,
          y,
          prevX: x,
          prevY: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 0.4,
          drag: 0.91,
          size: (isRing ? 3.2 : 2.3) + Math.random() * 1.1,
          length: 1,
          color: isRing ? corrodeCol : kineticCol,
          coreColor: null,
          rotation: a,
          vRot: (Math.random() - 0.5) * 14,
          alignToVelocity: false,
          outlined: isRing,
          age: 0,
          duration: 0.28 + Math.random() * 0.16,
        });
      }
      return;
    }

    if (reaction === 'BRITTLE_FLUX') {
      // Swirling interlocking Cryo + Corrode priming vortex
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
        const speed = 1.8 + Math.random() * 2.2;
        const useCryo = i % 2 === 0;
        this.push({
          kind: 'MOTE',
          shape: useCryo ? 'CRYSTAL' : 'RING',
          x: x + Math.cos(a) * 0.08,
          y: y + Math.sin(a) * 0.08,
          prevX: x,
          prevY: y,
          vx: Math.cos(a + 0.55) * speed,
          vy: Math.sin(a + 0.55) * speed,
          drag: 0.9,
          size: 2.6 + Math.random() * 1.2,
          length: 1,
          color: useCryo ? cryoCol : corrodeCol,
          coreColor: useCryo ? corrodeCol : cryoCol,
          rotation: a,
          vRot: (useCryo ? 1 : -1) * 9,
          alignToVelocity: false,
          outlined: true,
          age: 0,
          duration: 0.32 + Math.random() * 0.16,
        });
      }
      return;
    }

    // TRI_BREACH: Full 3-Payload Synergy (Kinetic hitting Cryo + Corrode)
    const triColors = [kineticCol, cryoCol, corrodeCol];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const speed = 2.8 + Math.random() * 4.2;
      const col = triColors[i % 3];
      const shape: VectorParticleShape =
        i % 3 === 0 ? 'CHEVRON' : i % 3 === 1 ? 'CRYSTAL' : 'RING';
      const isSpark = i % 3 === 0;
      this.push({
        kind: isSpark ? 'SPARK' : 'MOTE',
        shape,
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: isSpark ? 0.85 : 0.89,
        size: (isSpark ? 2.4 : 3.0) + Math.random() * 1.3,
        length: 2.2,
        color: col,
        coreColor: hotCore,
        rotation: a,
        vRot: isSpark ? 0 : (Math.random() - 0.5) * 14,
        alignToVelocity: isSpark,
        outlined: !isSpark,
        age: 0,
        duration: (isSpark ? 0.22 : 0.34) + Math.random() * 0.14,
      });
    }
  }

  /**
   * Emits inward-spiraling gravity well motes pulling from a trapped enemy toward a Stasis Pad center.
   */
  public emitStasisPull(
    enemyX: number,
    enemyY: number,
    padX: number,
    padY: number,
    pal: ThemePalette
  ): void {
    const angle = Math.atan2(padY - enemyY, padX - enemyX);
    const core = pal.isLight ? '#181715' : pal.prismCore;
    this.push({
      kind: 'MOTE',
      shape: Math.random() < 0.5 ? 'DIAMOND' : 'HEX',
      x: enemyX,
      y: enemyY,
      prevX: enemyX,
      prevY: enemyY,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      drag: 1,
      size: 1.9 + Math.random() * 0.8,
      length: 1,
      color: Math.random() < 0.55 ? pal.payloads.CRYO : pal.prism,
      coreColor: core,
      rotation: angle,
      vRot: 8,
      alignToVelocity: false,
      outlined: true,
      age: 0,
      duration: 0.32 + Math.random() * 0.1,
      startX: enemyX + (Math.random() - 0.5) * 0.12,
      startY: enemyY + (Math.random() - 0.5) * 0.12,
      targetX: padX,
      targetY: padY,
      curveAmp: (Math.random() < 0.5 ? 1 : -1) * (0.14 + Math.random() * 0.14),
    });
  }

  /**
   * Emits high-velocity directional slipstream chevrons when a Vector Repulsor shoves an enemy.
   */
  public emitConveyorRepulse(
    x: number,
    y: number,
    dirAngle: number,
    pal: ThemePalette
  ): void {
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;
    for (let i = 0; i < 6; i++) {
      const a = dirAngle + (Math.random() - 0.5) * 0.55;
      const speed = 3.6 + Math.random() * 4.0;
      this.push({
        kind: i < 4 ? 'SPARK' : 'MOTE',
        shape: i % 2 === 0 ? 'CHEVRON' : 'NEEDLE',
        x: x + (Math.random() - 0.5) * 0.18,
        y: y + (Math.random() - 0.5) * 0.18,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.85,
        size: 2.1 + Math.random() * 1.1,
        length: 2.0,
        color: i % 2 === 0 ? pal.validColor : pal.triggers.PULSE,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.18 + Math.random() * 0.12,
      });
    }
  }

  /**
   * Emits a punchy radial vector detonation when a rechargeable Pulse Mine triggers.
   */
  public emitMineDetonate(
    x: number,
    y: number,
    payload: PayloadType,
    pal: ThemePalette
  ): void {
    const payColor = pal.payloads[payload];
    const hotCore = pal.isLight ? '#181715' : pal.beamCore;

    // 1. High-velocity radial blast needles & chevrons
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      const speed = 3.8 + Math.random() * 5.4;
      this.push({
        kind: 'SPARK',
        shape: i % 3 === 0 ? 'CHEVRON' : 'NEEDLE',
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.86,
        size: 2.3 + Math.random() * 1.4,
        length: 2.1,
        color: payColor,
        coreColor: hotCore,
        rotation: a,
        vRot: 0,
        alignToVelocity: true,
        outlined: false,
        age: 0,
        duration: 0.2 + Math.random() * 0.14,
      });
    }

    // 2. Payload-styled geometric shrapnel & elemental motes
    const moteShape: VectorParticleShape =
      payload === 'CRYO' ? 'CRYSTAL' : payload === 'CORRODE' ? 'RING' : 'SHARD';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.0 + Math.random() * 3.2;
      this.push({
        kind: payload === 'KINETIC' ? 'DEBRIS' : 'MOTE',
        shape: moteShape,
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        drag: 0.9,
        size: 2.8 + Math.random() * 1.4,
        length: 1,
        color: payColor,
        coreColor: hotCore,
        rotation: a,
        vRot: (Math.random() - 0.5) * 16,
        alignToVelocity: false,
        outlined: payload !== 'KINETIC' || i % 2 === 0,
        age: 0,
        duration: 0.3 + Math.random() * 0.18,
      });
    }
  }
}
