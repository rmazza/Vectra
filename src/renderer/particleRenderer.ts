import { VectorParticle, VectorParticleSystem } from '../sim/particles';
import { ThemePalette } from '../theme/palettes';

function traceRegularPolygon(
  ctx: CanvasRenderingContext2D,
  r: number,
  sides: number
): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawDebrisParticle(
  ctx: CanvasRenderingContext2D,
  pt: VectorParticle,
  ts: number,
  scale: number,
  pal: ThemePalette
): void {
  const life = 1 - Math.max(0, Math.min(1, pt.age / Math.max(0.001, pt.duration)));
  const alpha = Math.pow(life, 0.75);
  const s = Math.max(0.8, pt.size * (0.35 + 0.65 * life) * scale);

  ctx.save();
  ctx.translate(pt.x * ts, pt.y * ts);
  ctx.rotate(pt.rotation);
  ctx.globalAlpha = alpha * (pal.isLight ? 0.92 : 0.9);
  ctx.fillStyle = pt.color;
  ctx.strokeStyle = pt.color;
  ctx.lineWidth = Math.max(1.1, 1.4 * scale);

  switch (pt.shape) {
    case 'SQUARE': {
      const half = s * 0.65;
      if (pt.outlined) {
        ctx.strokeRect(-half, -half, half * 2, half * 2);
      } else {
        ctx.fillRect(-half, -half, half * 2, half * 2);
        ctx.strokeStyle = pal.isLight ? 'rgba(24, 23, 21, 0.35)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-half, -half, half * 2, half * 2);
      }
      break;
    }
    case 'TRIANGLE': {
      ctx.beginPath();
      ctx.moveTo(s * 0.95, 0);
      ctx.lineTo(-s * 0.72, -s * 0.68);
      ctx.lineTo(-s * 0.72, s * 0.68);
      ctx.closePath();
      if (pt.outlined) ctx.stroke();
      else ctx.fill();
      break;
    }
    case 'DIAMOND': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.lineTo(s * 0.68, 0);
      ctx.lineTo(0, s * 0.95);
      ctx.lineTo(-s * 0.68, 0);
      ctx.closePath();
      if (pt.outlined) ctx.stroke();
      else ctx.fill();
      break;
    }
    case 'HEX': {
      traceRegularPolygon(ctx, s * 0.82, 6);
      if (pt.outlined) ctx.stroke();
      else ctx.fill();
      break;
    }
    case 'CHEVRON': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.65, -s * 0.65);
      ctx.lineTo(s * 0.65, 0);
      ctx.lineTo(-s * 0.65, s * 0.65);
      ctx.stroke();
      break;
    }
    case 'SHARD':
    default: {
      // Sharp asymmetric triangular metal/crystal splinter
      ctx.beginPath();
      ctx.moveTo(s * 1.25, 0);
      ctx.lineTo(-s * 0.4, -s * 0.5);
      ctx.lineTo(-s * 0.95, s * 0.25);
      ctx.lineTo(-s * 0.15, s * 0.55);
      ctx.closePath();
      if (pt.outlined) ctx.stroke();
      else ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawSparkParticle(
  ctx: CanvasRenderingContext2D,
  pt: VectorParticle,
  ts: number,
  scale: number,
  pal: ThemePalette
): void {
  const life = 1 - Math.max(0, Math.min(1, pt.age / Math.max(0.001, pt.duration)));
  const alpha = Math.pow(life, 0.65);
  const px = pt.x * ts;
  const py = pt.y * ts;
  const s = Math.max(0.7, pt.size * (0.4 + 0.6 * life) * scale);

  ctx.save();

  if (pt.shape === 'CHEVRON') {
    ctx.translate(px, py);
    ctx.rotate(pt.rotation);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    ctx.strokeStyle = pt.color;
    ctx.globalAlpha = alpha * 0.92;
    ctx.lineWidth = Math.max(1.5, s * 0.85);
    ctx.beginPath();
    ctx.moveTo(-s * 1.35, -s * 1.15);
    ctx.lineTo(s * 1.1, 0);
    ctx.lineTo(-s * 1.35, s * 1.15);
    ctx.stroke();

    if (pt.coreColor && !pal.isLight) {
      ctx.strokeStyle = pt.coreColor;
      ctx.globalAlpha = alpha * 0.88;
      ctx.lineWidth = Math.max(0.8, s * 0.35);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Velocity-stretched razor NEEDLE spark (true motion-streak vector line + hot inner core)
  const speed = Math.hypot(pt.vx, pt.vy);
  const streakLen = Math.max(
    s * 2.2,
    Math.min(ts * 0.68, (speed * 0.036 * ts + s * 1.8) * pt.length * (0.45 + 0.55 * life))
  );
  const cos = Math.cos(pt.rotation);
  const sin = Math.sin(pt.rotation);
  const tailX = px - cos * streakLen;
  const tailY = py - sin * streakLen;

  ctx.lineCap = 'round';

  // Outer energetic sheath
  ctx.strokeStyle = pt.color;
  ctx.globalAlpha = alpha * (pal.isLight ? 0.9 : 0.78);
  ctx.lineWidth = Math.max(1.4, s * 1.15);
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(px, py);
  ctx.stroke();

  // Razor-hot leading inner filament
  if (pt.coreColor) {
    const coreTailX = px - cos * streakLen * 0.58;
    const coreTailY = py - sin * streakLen * 0.58;
    ctx.strokeStyle = pal.isLight ? pt.color : pt.coreColor;
    ctx.globalAlpha = alpha * (pal.isLight ? 0.95 : 0.96);
    ctx.lineWidth = Math.max(0.8, s * 0.48);
    ctx.beginPath();
    ctx.moveTo(coreTailX, coreTailY);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders all active procedural vector debris and luminous sparks in two crisp passes.
 */
export function renderVectorParticles(
  ctx: CanvasRenderingContext2D,
  system: VectorParticleSystem,
  ts: number,
  pal: ThemePalette
): void {
  const items = system.items;
  if (items.length === 0) return;

  const scale = Math.max(0.68, Math.min(1.25, ts / 42));

  // Pass 1: Solid & Wireframe Vector Debris (crisp source-over geometry)
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < items.length; i++) {
    const pt = items[i];
    if (pt.kind === 'DEBRIS') {
      drawDebrisParticle(ctx, pt, ts, scale, pal);
    }
  }
  ctx.restore();

  // Pass 2: Velocity-Stretched Luminous Vector Sparks (additive on dark themes, crisp ink on light paper)
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
  for (let i = 0; i < items.length; i++) {
    const pt = items[i];
    if (pt.kind === 'SPARK') {
      drawSparkParticle(ctx, pt, ts, scale, pal);
    }
  }
  ctx.restore();
}
