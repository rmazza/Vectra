import { ThemePalette } from '../theme/palettes';
import { EnemyType, ModifierType, PayloadType, TriggerType } from './types';

export type VectorParticleKind = 'SPARK' | 'DEBRIS';

export type VectorParticleShape =
  | 'NEEDLE'
  | 'CHEVRON'
  | 'SHARD'
  | 'TRIANGLE'
  | 'DIAMOND'
  | 'SQUARE'
  | 'HEX';

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
}

const DEFAULT_MAX_PARTICLES = 420;

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
}
