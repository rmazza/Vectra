import { VectraEngine } from '../sim/engine';
import { tileIndex } from '../sim/flowField';
import { COSTS, PRISM_RADIUS, TRIGGERS, computeTowerStats } from '../sim/stats';
import {
  BuildTool,
  GRID_COLS,
  GRID_ROWS,
  GridPoint,
  PlacementCheckResult,
  TowerEntity,
  TowerPreset,
  UtilityNodeEntity,
} from '../sim/types';
import { ThemePalette, getActivePalette } from '../theme/palettes';
import { renderVectorParticles } from './particleRenderer';

export interface CameraView {
  zoom: number;
  panX: number;
  panY: number;
}

export interface RenderOptions {
  hoverTile: GridPoint | null;
  pendingTile: GridPoint | null;
  activeTool: BuildTool;
  activePreset?: TowerPreset | null;
  showFlowField: boolean;
  obstacleEditMode: boolean;
  timeSec: number;
  camera: CameraView;
  palette?: ThemePalette;
}

export interface BoardTransform {
  baseTileSize: number;
  tileSize: number;
  offsetX: number;
  offsetY: number;
  boardW: number;
  boardH: number;
}

export function clampCamera(
  canvasW: number,
  canvasH: number,
  camera: CameraView
): CameraView {
  const zoom = Math.max(1, Math.min(2.8, camera.zoom));
  if (zoom <= 1.001) {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  const padX = canvasW < 640 ? 8 : 20;
  const padY = canvasW < 640 ? 6 : 12;
  const availW = Math.max(160, canvasW - padX * 2);
  const availH = Math.max(100, canvasH - padY * 2);
  const baseTile = Math.min(availW / GRID_COLS, availH / GRID_ROWS);
  const boardW = baseTile * GRID_COLS * zoom;
  const boardH = baseTile * GRID_ROWS * zoom;

  const maxPanX = Math.max(0, (boardW - canvasW) / 2 + 28);
  const maxPanY = Math.max(0, (boardH - canvasH) / 2 + 28);

  return {
    zoom,
    panX: Math.max(-maxPanX, Math.min(maxPanX, camera.panX)),
    panY: Math.max(-maxPanY, Math.min(maxPanY, camera.panY)),
  };
}

export function computeBoardTransform(
  canvasW: number,
  canvasH: number,
  camera: CameraView = { zoom: 1, panX: 0, panY: 0 }
): BoardTransform {
  const padX = canvasW < 640 ? 8 : 20;
  const padY = canvasW < 640 ? 6 : 12;
  const availW = Math.max(160, canvasW - padX * 2);
  const availH = Math.max(100, canvasH - padY * 2);
  const baseTileSize = Math.min(availW / GRID_COLS, availH / GRID_ROWS);
  const clamped = clampCamera(canvasW, canvasH, camera);
  const tileSize = baseTileSize * clamped.zoom;
  const boardW = tileSize * GRID_COLS;
  const boardH = tileSize * GRID_ROWS;
  const offsetX = Math.floor((canvasW - boardW) / 2 + clamped.panX);
  const offsetY = Math.floor((canvasH - boardH) / 2 + clamped.panY);
  return { baseTileSize, tileSize, offsetX, offsetY, boardW, boardH };
}

export function screenToTile(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  transform: BoardTransform
): GridPoint | null {
  const lx = clientX - rect.left - transform.offsetX;
  const ly = clientY - rect.top - transform.offsetY;
  const tx = Math.floor(lx / transform.tileSize);
  const ty = Math.floor(ly / transform.tileSize);
  if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) return null;
  return { x: tx, y: ty };
}

export function renderVectraCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: VectraEngine,
  opts: RenderOptions
): BoardTransform {
  const pal = opts.palette ?? getActivePalette();
  const tf = computeBoardTransform(width, height, opts.camera);
  const { tileSize: ts, offsetX: ox, offsetY: oy, boardW, boardH } = tf;

  // Outer studio backdrop with subtle radial depth
  const outerGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.1,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78
  );
  outerGrad.addColorStop(0, pal.outerBgInner);
  outerGrad.addColorStop(1, pal.outerBgOuter);
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  // Micro camera shake
  if (engine.shakeTime > 0 && !engine.demoMode) {
    const mag = engine.shakeIntensity * Math.min(1, engine.shakeTime * 5);
    const sx = (Math.random() - 0.5) * 2 * mag;
    const sy = (Math.random() - 0.5) * 2 * mag;
    ctx.translate(ox + sx, oy + sy);
  } else {
    ctx.translate(ox, oy);
  }

  // 1. Arena deck backing
  const deckGrad = ctx.createLinearGradient(0, 0, boardW, boardH);
  deckGrad.addColorStop(0, pal.deckGradStart);
  deckGrad.addColorStop(0.5, pal.deckGradMid);
  deckGrad.addColorStop(1, pal.deckGradEnd);
  ctx.fillStyle = deckGrad;
  ctx.fillRect(0, 0, boardW, boardH);

  // Subtle checkerboard surface modulation
  ctx.fillStyle = pal.checkerTile;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if ((x + y) % 2 === 1 && engine.grid[tileIndex(x, y)] !== 'OBSTACLE') {
        ctx.fillRect(x * ts, y * ts, ts, ts);
      }
    }
  }

  // Drafting grid hairlines
  ctx.strokeStyle = pal.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID_COLS; x++) {
    const gx = Math.round(x * ts) + 0.5;
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, boardH);
  }
  for (let y = 0; y <= GRID_ROWS; y++) {
    const gy = Math.round(y * ts) + 0.5;
    ctx.moveTo(0, gy);
    ctx.lineTo(boardW, gy);
  }
  ctx.stroke();

  // Architectural precision intersection crosshairs (+)
  if (ts >= 22) {
    ctx.strokeStyle = pal.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const arm = 2.5;
    for (let y = 1; y < GRID_ROWS; y++) {
      const gy = Math.round(y * ts) + 0.5;
      for (let x = 1; x < GRID_COLS; x++) {
        const gx = Math.round(x * ts) + 0.5;
        ctx.moveTo(gx - arm, gy);
        ctx.lineTo(gx + arm, gy);
        ctx.moveTo(gx, gy - arm);
        ctx.lineTo(gx, gy + arm);
      }
    }
    ctx.stroke();
  }

  // 2. Reactive ambient floor lighting pools
  drawFloorLighting(ctx, engine, ts, opts.timeSec, pal);

  // 3. Flow Field vector overlay
  if (opts.showFlowField && ts >= 16) {
    drawFlowFieldVectors(ctx, engine, ts, pal);
  }

  // 4. Main shortest path polyline + animated gliding energy motes
  const previewTile = opts.pendingTile ?? opts.hoverTile;
  const previewCheck = getPlacementCheck(engine, previewTile, opts);
  const pathToRender =
    previewCheck && previewCheck.valid && previewCheck.previewPath
      ? previewCheck.previewPath
      : engine.flowField.pathTiles;

  const isPreviewPath = Boolean(previewCheck && previewCheck.valid && previewCheck.previewPath);
  drawFlowPathLine(ctx, pathToRender, ts, opts.timeSec, isPreviewPath, pal);

  // 5. 2.5D Machined Monolith Static Obstacles
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (engine.grid[tileIndex(x, y)] === 'OBSTACLE') {
        drawObstacleTile(ctx, x * ts, y * ts, ts, pal);
      }
    }
  }

  // 6. Spawn Warp Gate & Goal Reactor Core
  const spawnIdx = tileIndex(engine.spawn.x, engine.spawn.y);
  const spawnDx = engine.flowField.nextX[spawnIdx] ?? 0;
  const spawnDy = engine.flowField.nextY[spawnIdx] ?? 1;
  const spawnAngle =
    spawnDx !== 0 || spawnDy !== 0 ? Math.atan2(spawnDy, spawnDx) : Math.PI / 2;
  drawSpawnTile(ctx, engine.spawn.x * ts, engine.spawn.y * ts, ts, opts.timeSec, pal, spawnAngle);
  drawGoalTile(
    ctx,
    engine.goal.x * ts,
    engine.goal.y * ts,
    ts,
    opts.timeSec,
    engine.lives / engine.maxLives,
    pal
  );

  // 7. Synergy tethers (Overclock conduits & Prism optical relays)
  drawSynergyConduits(ctx, engine, ts, opts.timeSec, pal);

  // 8. Selected entity range & highlight ring
  if (engine.selectedEntityId) {
    const sel = engine.entities.get(engine.selectedEntityId);
    if (sel) {
      drawSelectedRange(ctx, engine, sel, ts, opts.timeSec, pal);
    }
  }

  // 9. Towers & Utility Nodes
  for (const ent of engine.entities.values()) {
    const isSelected = ent.id === engine.selectedEntityId;
    if (ent.kind === 'TOWER') {
      drawTower(ctx, engine, ent, ts, isSelected, opts.timeSec, pal);
    } else if (ent.kind === 'OVERCLOCK') {
      drawOverclockNode(ctx, ent, ts, isSelected, opts.timeSec, pal);
    } else if (ent.kind === 'PRISM') {
      drawPrismNode(ctx, ent, ts, isSelected, opts.timeSec, pal);
    }
  }

  // 10. Expanding Nova & Splash rings
  drawAreaShockwaves(ctx, engine, ts, pal);

  // 11. Enemy Motion Trails
  drawEnemyTrails(ctx, engine, ts, pal);

  // 12. Enemies
  for (const e of engine.enemies) {
    drawEnemy(ctx, e, ts, opts.timeSec, pal);
  }

  // 13. Combat Spectacle Pass (Beams, Chain Lightning, Projectiles, Impact Flashes)
  drawAdditiveCombatFx(ctx, engine, ts, opts.timeSec, pal);

  // 13.25 Procedural Vector Particle System Pass (Geometric Debris & Velocity-Stretched Sparks)
  renderVectorParticles(ctx, engine.particleSystem, ts, pal);

  // 13.5 Procedural Vector Enemy Health & Shield Bars (drawn above combat FX for total clarity)
  drawEnemyHealthBars(ctx, engine, ts, opts.timeSec, pal);

  // 14. Crisp floating feedback text
  ctx.font = `700 ${Math.max(9, Math.min(11, Math.round(ts * 0.28)))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  for (const ft of engine.floatingTexts) {
    const alpha = Math.max(0, Math.min(1, 1 - ft.age / Math.max(0.001, ft.duration)));
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 1.45);
    ctx.fillStyle = pal.floatingTextShadow;
    ctx.fillText(ft.text, ft.x * ts + 1, ft.y * ts + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x * ts, ft.y * ts);
    ctx.restore();
  }

  // 15. Hover or locked mobile preview overlay
  if (!engine.demoMode && previewTile) {
    drawHoverOverlay(
      ctx,
      engine,
      previewTile,
      opts,
      previewCheck,
      ts,
      Boolean(opts.pendingTile),
      pal
    );
  }

  // Crisp outer architectural frame with corner accent ticks
  ctx.strokeStyle = pal.boardFrame;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, boardW - 1, boardH - 1);
  drawBoardCornerAccents(ctx, boardW, boardH, pal);

  ctx.restore();
  return tf;
}

function drawRadialGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rgbaInner: string,
  rgbaOuter = 'rgba(0,0,0,0)'
): void {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(radius) || radius <= 0.1) {
    return;
  }
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, rgbaInner);
  g.addColorStop(1, rgbaOuter);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloorLighting(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  timeSec: number,
  pal: ThemePalette
): void {
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';

  // Spawn pool
  const spPulse = 0.85 + 0.15 * Math.sin(timeSec * 3.0);
  drawRadialGlow(
    ctx,
    (engine.spawn.x + 0.5) * ts,
    (engine.spawn.y + 0.5) * ts,
    ts * 1.9 * spPulse,
    pal.spawnFloorGlow
  );

  // Goal pool
  const glPulse = 0.85 + 0.15 * Math.sin(timeSec * 2.5 + 1);
  drawRadialGlow(
    ctx,
    (engine.goal.x + 0.5) * ts,
    (engine.goal.y + 0.5) * ts,
    ts * 2.1 * glPulse,
    pal.goalFloorGlow
  );

  // Utility node & tower ambient glows
  for (const ent of engine.entities.values()) {
    const cx = (ent.x + 0.5) * ts;
    const cy = (ent.y + 0.5) * ts;
    if (ent.kind === 'OVERCLOCK') {
      drawRadialGlow(ctx, cx, cy, ts * 1.45, pal.overclockFloorGlow);
    } else if (ent.kind === 'PRISM') {
      const boost = ent.activePulse > 0.2 ? (pal.isLight ? 0.16 : 0.28) : pal.isLight ? 0.08 : 0.14;
      drawRadialGlow(
        ctx,
        cx,
        cy,
        ts * (1.5 + ent.activePulse * 0.6),
        `rgba(${pal.prismFloorRgb}, ${boost})`
      );
    } else if (ent.kind === 'TOWER') {
      drawRadialGlow(ctx, cx, cy, ts * 1.15, pal.payloadFloorGlows[ent.payload]);
    }
  }

  // Beam impact floor hotspots
  for (const b of engine.activeBeams) {
    const c = b.isRelay ? pal.beamRelayFloorGlow : pal.beamFloorGlow;
    drawRadialGlow(ctx, b.toX * ts, b.toY * ts, ts * (0.65 + b.rampRatio * 0.45), c);
  }

  ctx.restore();
}

function drawBoardCornerAccents(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pal: ThemePalette
): void {
  const len = 14;
  ctx.save();
  ctx.strokeStyle = pal.boardCorner;
  ctx.globalAlpha = pal.isLight ? 0.85 : 0.65;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, len);
  ctx.lineTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.moveTo(w - len, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, len);
  ctx.moveTo(w, h - len);
  ctx.lineTo(w, h);
  ctx.lineTo(w - len, h);
  ctx.moveTo(len, h);
  ctx.lineTo(0, h);
  ctx.lineTo(0, h - len);
  ctx.stroke();
  ctx.restore();
}

function getPlacementCheck(
  engine: VectraEngine,
  tile: GridPoint | null,
  opts: RenderOptions
): PlacementCheckResult | null {
  if (engine.demoMode || !tile) return null;
  if (opts.obstacleEditMode) {
    const kind = engine.grid[tileIndex(tile.x, tile.y)];
    if (kind === 'OBSTACLE') return { valid: true };
    return engine.checkPlacement(tile.x, tile.y, 0);
  }
  if (opts.activeTool === 'INSPECT') return null;
  const cost =
    opts.activeTool === 'TOWER' && opts.activePreset
      ? opts.activePreset.cost
      : COSTS[opts.activeTool];
  return engine.checkPlacement(tile.x, tile.y, cost);
}

/** 2.5D beveled architectural monolith obstacle */
function drawObstacleTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  ts: number,
  pal: ThemePalette
): void {
  const m = Math.max(1.5, Math.round(ts * 0.06));
  const w = ts - m * 2;
  const h = ts - m * 2;
  const c = Math.max(3, ts * 0.14);

  ctx.save();
  // Cast floor drop shadow
  ctx.fillStyle = pal.obstacleShadow;
  drawChamferRect(ctx, px + m + 2.5, py + m + 3, w, h, c);
  ctx.fill();

  // Main monolith body gradient
  const grad = ctx.createLinearGradient(px, py, px + ts, py + ts);
  grad.addColorStop(0, pal.obstacleTop);
  grad.addColorStop(0.5, pal.obstacleMid);
  grad.addColorStop(1, pal.obstacleBot);
  ctx.fillStyle = grad;
  drawChamferRect(ctx, px + m, py + m, w, h, c);
  ctx.fill();

  // Outer crisp rim
  ctx.strokeStyle = pal.obstacleRim;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Top-left specular bevel highlight
  ctx.strokeStyle = pal.obstacleHighlight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + m, py + m + h - c);
  ctx.lineTo(px + m, py + m + c);
  ctx.lineTo(px + m + c, py + m);
  ctx.lineTo(px + m + w - c, py + m);
  ctx.stroke();

  // Recessed inner armor plate
  if (ts >= 20) {
    const inset = ts * 0.22;
    ctx.fillStyle = pal.obstacleInsetFill;
    ctx.strokeStyle = pal.obstacleInsetStroke;
    ctx.lineWidth = 1;
    drawChamferRect(ctx, px + inset, py + inset, ts - inset * 2, ts - inset * 2, c * 0.5);
    ctx.fill();
    ctx.stroke();

    // Subtle diagonal structural seam
    ctx.strokeStyle = pal.obstacleSeam;
    ctx.beginPath();
    ctx.moveTo(px + inset + 3, py + ts - inset - 3);
    ctx.lineTo(px + ts - inset - 3, py + inset + 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlowFieldVectors(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  pal: ThemePalette
): void {
  const flow = engine.flowField;
  ctx.save();
  ctx.strokeStyle = pal.flowArrow;
  ctx.lineWidth = 1.1;

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = tileIndex(x, y);
      if (engine.grid[idx] !== 'EMPTY') continue;
      const d = flow.distances[idx];
      if (d <= 0) continue;
      const dx = flow.nextX[idx];
      const dy = flow.nextY[idx];
      if (dx === 0 && dy === 0) continue;

      const cx = (x + 0.5) * ts;
      const cy = (y + 0.5) * ts;
      const len = ts * 0.15;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-len * 0.6, -len * 0.72);
      ctx.lineTo(len * 0.7, 0);
      ctx.lineTo(-len * 0.6, len * 0.72);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawFlowPathLine(
  ctx: CanvasRenderingContext2D,
  pathTiles: GridPoint[],
  ts: number,
  timeSec: number,
  isPreview: boolean,
  pal: ThemePalette
): void {
  if (pathTiles.length < 2) return;
  ctx.save();

  // Wide soft underglow along path
  ctx.strokeStyle = isPreview ? pal.previewPathGlow : pal.pathGlow;
  ctx.lineWidth = isPreview ? 7 : 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < pathTiles.length; i++) {
    const px = (pathTiles[i].x + 0.5) * ts;
    const py = (pathTiles[i].y + 0.5) * ts;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Crisp animated dashed guide line
  ctx.strokeStyle = isPreview ? pal.previewPathLine : pal.pathLine;
  ctx.lineWidth = isPreview ? 2.2 : 1.6;
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -timeSec * 30;
  ctx.stroke();
  ctx.setLineDash([]);

  // Gliding luminous data motes streaming from Spawn -> Goal
  const segCount = pathTiles.length - 1;
  const moteCount = Math.max(2, Math.min(7, Math.floor(segCount / 4)));
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
  for (let m = 0; m < moteCount; m++) {
    const rawPos = (timeSec * 2.6 + (m * segCount) / moteCount) % segCount;
    const segIdx = Math.floor(rawPos);
    const frac = rawPos - segIdx;
    const a = pathTiles[segIdx];
    const b = pathTiles[segIdx + 1];
    if (!a || !b) continue;
    const mx = (a.x + (b.x - a.x) * frac + 0.5) * ts;
    const my = (a.y + (b.y - a.y) * frac + 0.5) * ts;

    drawRadialGlow(ctx, mx, my, ts * 0.28, isPreview ? pal.previewMoteGlow : pal.pathMoteGlow);
    ctx.fillStyle = isPreview ? pal.previewMoteCore : pal.pathMoteCore;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1.8, ts * 0.055), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSpawnTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  ts: number,
  timeSec: number,
  pal: ThemePalette,
  dirAngle = Math.PI / 2
): void {
  const cx = px + ts / 2;
  const cy = py + ts / 2;
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * 3.4);

  ctx.save();
  ctx.fillStyle = pal.spawnBg;
  ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

  ctx.strokeStyle = pal.spawnStroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 2.5, py + 2.5, ts - 5, ts - 5);

  ctx.translate(cx, cy);

  // Outer rotating segmented warp ring
  ctx.save();
  ctx.rotate(timeSec * 1.1);
  ctx.strokeStyle = pal.spawnRing;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    const a0 = (i * Math.PI * 2) / 3 + 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.36, a0, a0 + 1.35);
    ctx.stroke();
  }
  ctx.restore();

  // Inner counter-rotating ring
  ctx.save();
  ctx.rotate(-timeSec * 1.8);
  ctx.strokeStyle = `rgba(${pal.spawnInnerRingRgb}, ${0.45 + pulse * 0.45})`;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, ts * (0.22 + pulse * 0.04), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Core directional chevron aligned to initial flow direction (downward top-to-bottom)
  ctx.save();
  ctx.rotate(dirAngle);
  ctx.fillStyle = pal.spawnCore;
  ctx.beginPath();
  ctx.moveTo(ts * 0.16, 0);
  ctx.lineTo(-ts * 0.1, -ts * 0.13);
  ctx.lineTo(-ts * 0.04, 0);
  ctx.lineTo(-ts * 0.1, ts * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawGoalTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  ts: number,
  timeSec: number,
  healthRatio: number,
  pal: ThemePalette
): void {
  const cx = px + ts / 2;
  const cy = py + ts / 2;
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * 2.8);

  ctx.save();
  ctx.fillStyle = pal.goalBg;
  ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

  ctx.strokeStyle = pal.goalStroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 2.5, py + 2.5, ts - 5, ts - 5);

  ctx.translate(cx, cy);

  // Orbital health containment arcs
  const segments = 4;
  const litSegments = Math.ceil(healthRatio * segments);
  ctx.save();
  ctx.rotate(-timeSec * 0.6);
  for (let i = 0; i < segments; i++) {
    const a0 = (i * Math.PI * 2) / segments + 0.18;
    const a1 = ((i + 1) * Math.PI * 2) / segments - 0.18;
    ctx.strokeStyle = i < litSegments ? pal.goalArcLit : pal.goalArcDim;
    ctx.lineWidth = i < litSegments ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.37, a0, a1);
    ctx.stroke();
  }
  ctx.restore();

  // Inner rotating crystal diamond
  ctx.save();
  ctx.rotate(timeSec * 0.9);
  const r = ts * (0.23 + pulse * 0.04);
  ctx.strokeStyle = pal.goalDiamondStroke;
  ctx.fillStyle = `rgba(${pal.goalDiamondFillRgb}, ${0.25 + healthRatio * 0.35})`;
  ctx.lineWidth = 1.6;
  drawRegularPolygon(ctx, 0, 0, r, 4, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Luminous reactor nucleus
  ctx.fillStyle = pal.goalNucleus;
  ctx.beginPath();
  ctx.arc(0, 0, ts * (0.085 + pulse * 0.025), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSynergyConduits(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  timeSec: number,
  pal: ThemePalette
): void {
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';

  for (const ent of engine.entities.values()) {
    if (ent.kind === 'OVERCLOCK') {
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const x1 = (ent.x + 0.5) * ts;
      const y1 = (ent.y + 0.5) * ts;
      for (const [dx, dy] of dirs) {
        const neighbor = engine.getEntityAt(ent.x + dx, ent.y + dy);
        if (neighbor && neighbor.kind === 'TOWER') {
          const x2 = (neighbor.x + 0.5) * ts;
          const y2 = (neighbor.y + 0.5) * ts;

          ctx.strokeStyle = pal.overclockRailGlow;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.strokeStyle = pal.overclockRailDash;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -timeSec * 22;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          const t = (timeSec * 1.6) % 1;
          const px = x1 + (x2 - x1) * t;
          const py = y1 + (y2 - y1) * t;
          ctx.fillStyle = pal.overclockLight;
          ctx.beginPath();
          ctx.arc(px, py, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (ent.kind === 'TOWER' && ent.trigger === 'BEAM') {
      const stats = computeTowerStats(ent, engine.entities);
      const x1 = (ent.x + 0.5) * ts;
      const y1 = (ent.y + 0.5) * ts;
      for (const relay of stats.prismRelays) {
        const x2 = (relay.x + 0.5) * ts;
        const y2 = (relay.y + 0.5) * ts;
        ctx.strokeStyle = pal.prismRelayLine;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -timeSec * 20;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  ctx.restore();
}

function drawSelectedRange(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  sel: TowerEntity | UtilityNodeEntity,
  ts: number,
  timeSec: number,
  pal: ThemePalette
): void {
  const cx = (sel.x + 0.5) * ts;
  const cy = (sel.y + 0.5) * ts;

  ctx.save();
  if (sel.kind === 'TOWER') {
    const stats = computeTowerStats(sel, engine.entities);
    const radiusPx = Math.max(
      2,
      (sel.trigger === 'NOVA' && sel.modifier === 'PIERCE' ? stats.range + 0.55 : stats.range) * ts
    );
    const color = pal.payloads[sel.payload];

    const grad = ctx.createRadialGradient(cx, cy, radiusPx * 0.55, cx, cy, radiusPx);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, color);
    ctx.globalAlpha = pal.isLight ? 0.12 : 0.1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.globalAlpha = pal.isLight ? 0.85 : 0.72;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -timeSec * 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
  } else if (sel.kind === 'PRISM') {
    const radiusPx = Math.max(2, PRISM_RADIUS * ts);
    ctx.fillStyle = `rgba(${pal.prismFloorRgb}, ${pal.isLight ? 0.09 : 0.08})`;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = pal.prism;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -timeSec * 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
  } else if (sel.kind === 'OVERCLOCK') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    ctx.strokeStyle = pal.overclock;
    ctx.fillStyle = pal.overclockFloorGlow;
    ctx.lineWidth = 1.5;
    for (const [dx, dy] of dirs) {
      const nx = sel.x + dx;
      const ny = sel.y + dy;
      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      ctx.fillRect(nx * ts + 2, ny * ts + 2, ts - 4, ts - 4);
      ctx.strokeRect(nx * ts + 2.5, ny * ts + 2.5, ts - 5, ts - 5);
    }
  }
  ctx.restore();
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  tower: TowerEntity,
  ts: number,
  isSelected: boolean,
  timeSec: number,
  pal: ThemePalette
): void {
  const cx = (tower.x + 0.5) * ts;
  const cy = (tower.y + 0.5) * ts;
  const payColor = pal.payloads[tower.payload];
  const trigAccent = pal.triggers[tower.trigger];
  const stats = computeTowerStats(tower, engine.entities);
  const pad = ts * 0.1;
  const half = Math.max(4, ts / 2 - pad);

  ctx.save();
  ctx.translate(cx, cy);

  // Cast shadow for tangible 2.5D elevation
  ctx.fillStyle = pal.entityShadow;
  drawChamferRect(ctx, -half + 2.5, -half + 3, half * 2, half * 2, ts * 0.13);
  ctx.fill();

  // Machined chassis body
  const bodyGrad = ctx.createLinearGradient(-half, -half, half, half);
  bodyGrad.addColorStop(0, pal.towerBodyTop);
  bodyGrad.addColorStop(0.55, pal.towerBodyMid);
  bodyGrad.addColorStop(1, pal.towerBodyBot);
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = isSelected
    ? pal.towerBorderSelected
    : stats.overclocked
    ? pal.overclock
    : pal.towerBorderDefault;
  ctx.lineWidth = isSelected ? 2.2 : 1.5;
  drawChamferRect(ctx, -half, -half, half * 2, half * 2, ts * 0.13);
  ctx.fill();
  ctx.stroke();

  // Inner recessed socket ring
  ctx.fillStyle = pal.towerSocketFill;
  ctx.strokeStyle = pal.towerSocketStroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Overclock corner energy pips
  if (stats.overclocked) {
    ctx.fillStyle = pal.overclock;
    const pip = half - Math.max(2.5, ts * 0.09);
    const sz = Math.max(2.2, ts * 0.085);
    ctx.fillRect(-pip, -pip, sz, sz);
    ctx.fillRect(pip - sz, -pip, sz, sz);
    ctx.fillRect(-pip, pip - sz, sz, sz);
    ctx.fillRect(pip - sz, pip - sz, sz, sz);
  }

  // Modifier silhouette attachments
  if (tower.modifier === 'SPLASH') {
    ctx.strokeStyle = payColor;
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.86, -0.55, 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.86, Math.PI - 0.55, Math.PI + 0.55);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (tower.modifier === 'CHAIN') {
    ctx.strokeStyle = pal.chainCoilColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-half * 0.76, -half * 0.45);
    ctx.lineTo(-half * 0.42, 0);
    ctx.lineTo(-half * 0.76, half * 0.45);
    ctx.moveTo(half * 0.76, -half * 0.45);
    ctx.lineTo(half * 0.42, 0);
    ctx.lineTo(half * 0.76, half * 0.45);
    ctx.stroke();
  }

  // Trigger head geometry
  if (tower.trigger === 'NOVA') {
    ctx.save();
    ctx.rotate(timeSec * 1.5);
    ctx.strokeStyle = trigAccent;
    ctx.lineWidth = 2;
    const nr = half * (0.64 + tower.recoil * 0.16);
    for (let i = 0; i < 4; i++) {
      const a0 = (i * Math.PI) / 2 + 0.24;
      const a1 = a0 + Math.PI / 2 - 0.48;
      ctx.beginPath();
      ctx.arc(0, 0, nr, a0, a1);
      ctx.stroke();
    }
    ctx.restore();

    const charge = Math.max(0, Math.min(1, 1 - tower.cooldown * stats.fireRate));
    ctx.strokeStyle = payColor;
    ctx.globalAlpha = 0.45 + charge * 0.45;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.save();
    ctx.rotate(tower.angle);
    const kick = tower.recoil * ts * 0.09;

    if (tower.trigger === 'PULSE') {
      if (tower.modifier === 'PIERCE') {
        ctx.strokeStyle = payColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -ts * 0.15);
        ctx.lineTo(ts * 0.44 - kick, -ts * 0.085);
        ctx.moveTo(0, ts * 0.15);
        ctx.lineTo(ts * 0.44 - kick, ts * 0.085);
        ctx.stroke();
      }
      ctx.fillStyle = pal.towerBarrelFill;
      ctx.strokeStyle = trigAccent;
      ctx.lineWidth = 1.7;
      ctx.fillRect(-kick, -ts * 0.085, ts * 0.38, ts * 0.17);
      ctx.strokeRect(-kick, -ts * 0.085, ts * 0.38, ts * 0.17);

      ctx.strokeStyle = payColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ts * 0.06 - kick, 0);
      ctx.lineTo(ts * 0.35 - kick, 0);
      ctx.stroke();
    } else if (tower.trigger === 'BEAM') {
      const rampGlow = Math.min(1, tower.beamRampTime / 7);
      if (rampGlow > 0.04) {
        ctx.save();
        ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
        ctx.rotate(timeSec * (3 + rampGlow * 7));
        ctx.strokeStyle = payColor;
        ctx.globalAlpha = 0.45 + rampGlow * 0.5;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, half * (0.52 + rampGlow * 0.14), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = pal.towerBarrelFill;
      ctx.strokeStyle = rampGlow > 0.25 ? pal.goalDiamondStroke : trigAccent;
      ctx.lineWidth = 1.7 + rampGlow * 1.1;
      ctx.beginPath();
      ctx.moveTo(ts * 0.38, 0);
      ctx.lineTo(-ts * 0.11, -ts * 0.17);
      ctx.lineTo(-ts * 0.04, 0);
      ctx.lineTo(-ts * 0.11, ts * 0.17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Luminous Payload Core
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
  drawRadialGlow(ctx, 0, 0, ts * 0.25, pal.payloadCoreGlows[tower.payload]);
  ctx.restore();

  ctx.fillStyle = payColor;
  const coreR = ts * 0.14;
  if (tower.payload === 'KINETIC') {
    ctx.beginPath();
    ctx.moveTo(0, -coreR);
    ctx.lineTo(coreR, 0);
    ctx.lineTo(0, coreR);
    ctx.lineTo(-coreR, 0);
    ctx.closePath();
    ctx.fill();
  } else if (tower.payload === 'CRYO') {
    drawRegularPolygon(ctx, 0, 0, coreR, 6, 0);
    ctx.fill();
  } else {
    drawRegularPolygon(ctx, 0, 0, coreR * 1.05, 3, -Math.PI / 2);
    ctx.fill();
  }

  ctx.fillStyle = pal.towerCoreSpec;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.2, ts * 0.042), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawOverclockNode(
  ctx: CanvasRenderingContext2D,
  node: UtilityNodeEntity,
  ts: number,
  isSelected: boolean,
  timeSec: number,
  pal: ThemePalette
): void {
  const cx = (node.x + 0.5) * ts;
  const cy = (node.y + 0.5) * ts;
  const r = ts * 0.38;
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * 4.2);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = pal.entityShadow;
  drawRegularPolygon(ctx, 2.5, 3, r, 8, Math.PI / 8);
  ctx.fill();

  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, pal.overclockBodyTop);
  grad.addColorStop(1, pal.overclockBodyBot);
  ctx.fillStyle = grad;
  ctx.strokeStyle = isSelected ? pal.towerBorderSelected : pal.overclock;
  ctx.lineWidth = isSelected ? 2.2 : 1.7;
  drawRegularPolygon(ctx, 0, 0, r, 8, Math.PI / 8);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.rotate(timeSec * (node.activePulse > 0.1 ? 2.4 : 0.8));
  ctx.strokeStyle = pal.overclock;
  ctx.globalAlpha = 0.45 + pulse * 0.4;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = pal.isLight ? pal.overclock : pal.overclockLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, 0);
  ctx.lineTo(r * 0.5, 0);
  ctx.moveTo(0, -r * 0.5);
  ctx.lineTo(0, r * 0.5);
  ctx.stroke();

  ctx.fillStyle = pal.isLight ? '#FFFFFF' : pal.overclockCore;
  ctx.beginPath();
  ctx.arc(0, 0, ts * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPrismNode(
  ctx: CanvasRenderingContext2D,
  node: UtilityNodeEntity,
  ts: number,
  isSelected: boolean,
  timeSec: number,
  pal: ThemePalette
): void {
  const cx = (node.x + 0.5) * ts;
  const cy = (node.y + 0.5) * ts;
  const r = ts * 0.38;
  const isFiring = node.activePulse > 0.2;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = pal.entityShadow;
  drawRegularPolygon(ctx, 2.5, 3, r, 6, 0);
  ctx.fill();

  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, pal.prismBodyTop);
  grad.addColorStop(1, pal.prismBodyBot);
  ctx.fillStyle = grad;
  ctx.strokeStyle = isSelected ? pal.towerBorderSelected : isFiring ? pal.prismLight : pal.prism;
  ctx.lineWidth = isSelected ? 2.2 : 1.7;
  drawRegularPolygon(ctx, 0, 0, r, 6, 0);
  ctx.fill();
  ctx.stroke();

  // Chromatic twin crystal triangles
  ctx.save();
  ctx.rotate(timeSec * (isFiring ? 3.2 : 0.75));
  ctx.strokeStyle = pal.prismChromatic;
  ctx.lineWidth = 1.3;
  drawRegularPolygon(ctx, -1, 0, r * 0.6, 3, -Math.PI / 2);
  ctx.stroke();

  ctx.strokeStyle = isFiring ? (pal.isLight ? pal.prism : pal.prismLight) : pal.prism;
  ctx.fillStyle = `rgba(${pal.prismFloorRgb}, ${isFiring ? 0.42 : 0.18})`;
  ctx.lineWidth = 1.7;
  drawRegularPolygon(ctx, 1, 0, r * 0.6, 3, -Math.PI / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Starburst flare when actively refracting beams
  if (isFiring) {
    ctx.save();
    ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
    drawRadialGlow(
      ctx,
      0,
      0,
      r * 1.5,
      `rgba(${pal.prismFloorRgb}, ${pal.isLight ? 0.28 : 0.52})`
    );
    ctx.strokeStyle = pal.isLight ? pal.prism : pal.prismCore;
    ctx.lineWidth = 1.6;
    const arm = r * (0.9 + 0.25 * Math.sin(timeSec * 18));
    ctx.beginPath();
    ctx.moveTo(-arm, 0);
    ctx.lineTo(arm, 0);
    ctx.moveTo(0, -arm);
    ctx.lineTo(0, arm);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = pal.isLight ? pal.prism : pal.prismCore;
  ctx.beginPath();
  ctx.arc(0, 0, ts * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAreaShockwaves(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  pal: ThemePalette
): void {
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';

  // Dual-ring Nova waves
  for (const r of engine.novaRings) {
    const p = Math.max(0, Math.min(1, r.age / Math.max(0.001, r.duration)));
    const inv = 1 - p;
    const rad = Math.max(2, r.maxRadius * ts * (0.16 + 0.84 * easeOutCubic(p)));
    const innerRad = Math.max(1, rad * 0.78);
    const cx = r.x * ts;
    const cy = r.y * ts;

    const grad = ctx.createRadialGradient(cx, cy, innerRad * 0.7, cx, cy, rad);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, r.color);
    ctx.globalAlpha = inv * (pal.isLight ? 0.22 : 0.24);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = r.color;
    ctx.globalAlpha = inv * 0.92;
    ctx.lineWidth = Math.max(1.5, inv * 5.2);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal.isLight ? '#181715' : pal.beamCore;
    ctx.globalAlpha = inv * (pal.isLight ? 0.35 : 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Splash blast rings
  for (const s of engine.splashRings) {
    const p = Math.max(0, Math.min(1, s.age / Math.max(0.001, s.duration)));
    const inv = 1 - p;
    const rad = Math.max(1.5, s.radius * ts * (0.22 + 0.78 * easeOutCubic(p)));
    const cx = s.x * ts;
    const cy = s.y * ts;

    ctx.strokeStyle = s.color;
    ctx.globalAlpha = inv * 0.88;
    ctx.lineWidth = Math.max(1.2, inv * 3.5);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = s.color;
    ctx.globalAlpha = inv * 0.16;
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemyTrails(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  pal: ThemePalette
): void {
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const e of engine.enemies) {
    if (e.trail.length < 2) continue;
    const color = pal.enemies[e.type];
    const n = e.trail.length;
    for (let i = 1; i < n; i++) {
      const a = e.trail[i - 1];
      const b = e.trail[i];
      const frac = i / n;
      ctx.strokeStyle = color;
      ctx.globalAlpha = frac * (e.type === 'SWARM' ? 0.34 : 0.22);
      ctx.lineWidth = Math.max(1, e.radius * ts * 0.9 * frac);
      ctx.beginPath();
      ctx.moveTo(a.x * ts, a.y * ts);
      ctx.lineTo(b.x * ts, b.y * ts);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: VectraEngine['enemies'][number],
  ts: number,
  timeSec: number,
  pal: ThemePalette
): void {
  const px = enemy.x * ts;
  const py = enemy.y * ts;
  const r = Math.max(1.5, enemy.radius * ts * Math.max(0.1, enemy.spawnScale));
  const baseColor = pal.enemies[enemy.type];

  ctx.save();
  ctx.translate(px, py);

  // Subtle drop shadow
  ctx.fillStyle = pal.entityShadow;
  ctx.beginPath();
  ctx.arc(1.5, 2.5, r * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // Status auras (Slow frost / Corrode hazard brackets)
  if (enemy.slowTimer > 0) {
    ctx.save();
    ctx.rotate(-timeSec * 1.6);
    ctx.strokeStyle = pal.slowStatus;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (enemy.shredTimer > 0) {
    ctx.save();
    ctx.strokeStyle = pal.shredStatus;
    ctx.lineWidth = 1.6;
    drawRegularPolygon(ctx, 0, 0, r + 5.5, 4, timeSec * 2.8);
    ctx.stroke();
    ctx.restore();
  }

  // Main enemy silhouette
  ctx.save();
  ctx.rotate(enemy.angle);
  const fill = enemy.hitFlash > 0.22 ? pal.enemyHitFlash : baseColor;

  if (enemy.type === 'SWARM') {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(r * 1.35, 0);
    ctx.lineTo(-r * 0.95, -r * 0.88);
    ctx.lineTo(-r * 0.42, 0);
    ctx.lineTo(-r * 0.95, r * 0.88);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.enemySwarmSpec;
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'ARMOR') {
    ctx.fillStyle = enemy.hitFlash > 0.22 ? pal.enemyHitFlash : pal.enemyArmorFill;
    ctx.strokeStyle = fill;
    ctx.lineWidth = Math.max(2.2, ts * 0.068);
    drawRegularPolygon(ctx, 0, 0, r, 6, 0);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(-enemy.angle + timeSec * 0.9);
    ctx.fillStyle = enemy.hitFlash > 0.22 ? pal.enemyArmorSpec : pal.enemyArmorCore;
    drawRegularPolygon(ctx, 0, 0, r * 0.5, 6, 0);
    ctx.fill();
    ctx.fillStyle = pal.enemyArmorSpec;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = enemy.hitFlash > 0.22 ? pal.enemyHitFlash : pal.enemyShieldedFill;
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2.2;
    drawRegularPolygon(ctx, 0, 0, r * 0.96, 4, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.enemyShieldedCore;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Hexagonal Shield Force-Field Barrier
  if (enemy.shield > 0.01) {
    const shieldPct = Math.max(0, Math.min(1, enemy.shield / Math.max(1, enemy.maxShield)));
    ctx.save();
    ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';
    drawRadialGlow(ctx, 0, 0, r + 6, pal.shieldGlow);

    ctx.strokeStyle = enemy.shieldFlash > 0.18 ? pal.enemyHitFlash : pal.shieldColor;
    ctx.lineWidth = 1.6 + enemy.shieldFlash * 1.6;
    drawRegularPolygon(ctx, 0, 0, r + 4.5, 6, timeSec * 0.8);
    ctx.stroke();

    ctx.strokeStyle = pal.shieldArc;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shieldPct);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHexColor(hexA: string, hexB: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Smooth procedural Green (100%) -> Yellow (50%) -> Red (0%) health bar color */
function getHealthBarColor(hpPct: number, pal: ThemePalette): string {
  const clamped = Math.max(0, Math.min(1, hpPct));
  if (clamped >= 0.5) {
    // 1.0 -> 0.5 transitions Green -> Yellow
    const t = (1 - clamped) * 2;
    return lerpHexColor(pal.hpBarGood, pal.hpBarMid, t);
  }
  // 0.5 -> 0.0 transitions Yellow -> Red
  const t = (0.5 - clamped) * 2;
  return lerpHexColor(pal.hpBarMid, pal.hpBarLow, t);
}

/** Procedural chamfered vector health & shield bars drawn directly on canvas */
function drawEnemyHealthBars(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  timeSec: number,
  pal: ThemePalette
): void {
  const scale = Math.max(0.72, Math.min(1.25, ts / 40));

  for (const enemy of engine.enemies) {
    if (enemy.hp <= 0 || enemy.maxHp <= 0) continue;

    const spawnAlpha = Math.max(0, Math.min(1, (enemy.spawnScale - 0.2) / 0.8));
    if (spawnAlpha <= 0.02) continue;

    const px = enemy.x * ts;
    const py = enemy.y * ts;
    const r = Math.max(2, enemy.radius * ts * Math.max(0.1, enemy.spawnScale));

    const hpPct = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    const trailPct = Math.max(hpPct, Math.min(1, enemy.displayHp / enemy.maxHp));
    const hasShield = enemy.maxShield > 0 && enemy.shield > 0.01;
    const shieldPct = hasShield ? Math.max(0, Math.min(1, enemy.shield / enemy.maxShield)) : 0;

    // Archetype-tuned procedural bar geometry
    const widthMult = enemy.type === 'ARMOR' ? 2.75 : enemy.type === 'SHIELDED' ? 2.55 : 2.3;
    const bw = Math.max(18 * scale, Math.min(ts * 1.15, r * widthMult));
    const bh = (enemy.type === 'ARMOR' ? 5.2 : 4.2) * scale;
    const chamfer = Math.min(bh * 0.42, 2.2);
    const bx = px - bw / 2;
    const offsetAbove = hasShield ? r + 10.5 * scale : r + 8.5 * scale;
    const by = py - offsetAbove - bh;

    const hpColor = getHealthBarColor(hpPct, pal);
    const isCritical = hpPct <= 0.25;
    const critPulse = isCritical ? 0.5 + 0.5 * Math.sin(timeSec * 14) : 0;

    ctx.save();
    ctx.globalAlpha = spawnAlpha;

    // Subtle vector shadow for clean contrast on both dark and light boards
    ctx.fillStyle = pal.entityShadow;
    drawChamferRect(ctx, bx - 0.5, by + 0.8, bw + 1.5, bh + 1.2, chamfer);
    ctx.fill();

    // Recessed chamfered vector casing
    ctx.fillStyle = pal.hpBarBg;
    drawChamferRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, chamfer + 0.6);
    ctx.fill();

    // Clipped inner vector channel so shrinking fills respect chamfered corners cleanly
    ctx.save();
    drawChamferRect(ctx, bx, by, bw, bh, Math.max(0.8, chamfer - 0.4));
    ctx.clip();

    // Trailing damage-drain ghost bar (reveals burst chunks smoothly shrinking away)
    if (trailPct > hpPct + 0.005) {
      ctx.fillStyle = pal.hpBarTrail;
      ctx.globalAlpha = spawnAlpha * (pal.isLight ? 0.88 : 0.82);
      ctx.fillRect(bx, by, bw * trailPct, bh);
      ctx.globalAlpha = spawnAlpha;
    }

    // Active dynamic HP fill (Green -> Yellow -> Red)
    const fillW = bw * hpPct;
    if (fillW > 0.3) {
      ctx.fillStyle = hpColor;
      ctx.fillRect(bx, by, fillW, bh);

      // Crisp 1px top vector highlight bevel
      ctx.fillStyle = pal.isLight ? 'rgba(255, 255, 255, 0.34)' : 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(bx, by, fillW, Math.max(1, bh * 0.26));

      // Bright leading-edge cut line when partially depleted
      if (hpPct < 0.995) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = spawnAlpha * (pal.isLight ? 0.65 : 0.8);
        ctx.fillRect(bx + fillW - 1.1, by, 1.1, bh);
        ctx.globalAlpha = spawnAlpha;
      }
    }

    // Procedural segment notch dividers for high-HP archetypes
    const segments = enemy.type === 'ARMOR' ? 4 : enemy.type === 'SHIELDED' ? 2 : 0;
    if (segments > 1) {
      ctx.fillStyle = pal.hpBarBg;
      ctx.globalAlpha = spawnAlpha * 0.7;
      for (let s = 1; s < segments; s++) {
        const sx = bx + (bw * s) / segments;
        ctx.fillRect(sx - 0.5, by, 1, bh);
      }
      ctx.globalAlpha = spawnAlpha;
    }

    ctx.restore();

    // Vector frame stroke (pulses red on critical HP <= 25%)
    ctx.strokeStyle = isCritical
      ? pal.hpBarLow
      : enemy.hitFlash > 0.2
      ? pal.enemyHitFlash
      : pal.hpBarBorder;
    ctx.lineWidth = isCritical ? 1.15 + critPulse * 0.55 : 0.9;
    drawChamferRect(ctx, bx - 0.6, by - 0.6, bw + 1.2, bh + 1.2, chamfer + 0.3);
    ctx.stroke();

    // Stacked chamfered vector Shield bar directly above HP bar
    if (hasShield) {
      const sh = 2.6 * scale;
      const sy = by - sh - 2.1 * scale;
      const sChamfer = Math.min(sh * 0.45, 1.4);

      ctx.fillStyle = pal.hpBarBg;
      drawChamferRect(ctx, bx - 0.8, sy - 0.8, bw + 1.6, sh + 1.6, sChamfer + 0.4);
      ctx.fill();

      ctx.save();
      drawChamferRect(ctx, bx, sy, bw, sh, Math.max(0.6, sChamfer - 0.3));
      ctx.clip();
      ctx.fillStyle = enemy.shieldFlash > 0.18 ? pal.enemyHitFlash : pal.shieldColor;
      ctx.fillRect(bx, sy, bw * shieldPct, sh);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(bx, sy, bw * shieldPct, Math.max(0.8, sh * 0.3));
      ctx.restore();
    }

    ctx.restore();
  }
}

/** High-energy combat rendering pass: Beams, Forked Chain Lightning, Comet Projectiles, Impact Shockwaves, Spark Particles */
function drawAdditiveCombatFx(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ts: number,
  timeSec: number,
  pal: ThemePalette
): void {
  ctx.save();
  ctx.globalCompositeOperation = pal.isLight ? 'source-over' : 'lighter';

  // 1. Multi-pass Beams with oscillating sine plasma filament
  for (const b of engine.activeBeams) {
    const color = b.isRelay ? pal.prism : pal.payloads[b.payload];
    const x1 = b.fromX * ts;
    const y1 = b.fromY * ts;
    const x2 = b.toX * ts;
    const y2 = b.toY * ts;

    // Pass 1: Wide bloom sheath
    ctx.strokeStyle = color;
    ctx.globalAlpha = (pal.isLight ? 0.24 : 0.28) + b.rampRatio * 0.28;
    ctx.lineWidth = b.width * 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Pass 2: Oscillating energy ribbon filament
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const steps = Math.max(6, Math.min(20, Math.floor(dist / 12)));
    const amp = (1.6 + b.rampRatio * 2.8) * (b.isSplit ? 0.85 : 1);

    ctx.strokeStyle = b.isRelay ? pal.prismLight : color;
    ctx.globalAlpha = pal.isLight ? 0.88 : 0.72;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const env = Math.sin(t * Math.PI);
      const wave = Math.sin(t * 14 - timeSec * 36) * amp * env;
      const px = x1 + dx * t + nx * wave;
      const py = y1 + dy * t + ny * wave;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Pass 3: Razor-hot inner core
    ctx.strokeStyle = pal.isLight ? color : pal.beamCore;
    ctx.globalAlpha = 0.96;
    ctx.lineWidth = Math.max(1.3, b.width * 0.56);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Contact starburst at beam tip
    ctx.globalAlpha = pal.isLight ? 0.65 : 0.9;
    drawRadialGlow(ctx, x2, y2, 9 + b.rampRatio * 8, color);
    ctx.fillStyle = pal.isLight ? '#FFFFFF' : pal.beamCore;
    ctx.beginPath();
    ctx.arc(x2, y2, 2.4 + b.rampRatio * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Multi-pass Forked Chain Lightning Arcs
  for (const arc of engine.chainArcs) {
    const alpha = Math.max(0, Math.min(1, 1 - arc.age / Math.max(0.001, arc.duration)));
    const poly: { x: number; y: number }[] = [];
    for (let i = 0; i < arc.points.length; i++) {
      const pt = arc.points[i];
      if (i === 0) {
        poly.push({ x: pt.x * ts, y: pt.y * ts });
      } else {
        const prev = arc.points[i - 1];
        const x1 = prev.x * ts;
        const y1 = prev.y * ts;
        const x2 = pt.x * ts;
        const y2 = pt.y * ts;
        const mid1x = x1 + (x2 - x1) * 0.35 + (Math.random() - 0.5) * 11;
        const mid1y = y1 + (y2 - y1) * 0.35 + (Math.random() - 0.5) * 11;
        const mid2x = x1 + (x2 - x1) * 0.68 + (Math.random() - 0.5) * 11;
        const mid2y = y1 + (y2 - y1) * 0.68 + (Math.random() - 0.5) * 11;
        poly.push({ x: mid1x, y: mid1y }, { x: mid2x, y: mid2y }, { x: x2, y: y2 });
      }
    }

    ctx.strokeStyle = arc.color;
    ctx.globalAlpha = alpha * (pal.isLight ? 0.72 : 0.52);
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    poly.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    ctx.strokeStyle = pal.isLight ? '#181715' : '#FFFFFF';
    ctx.globalAlpha = alpha * (pal.isLight ? 0.85 : 0.95);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    for (const pt of arc.points) {
      drawRadialGlow(ctx, pt.x * ts, pt.y * ts, 9, arc.color);
    }
  }

  // 3. Luminous Comet-Tailed Projectiles
  for (const p of engine.projectiles) {
    const px = p.x * ts;
    const py = p.y * ts;
    const angle = Math.atan2(p.vy, p.vx);
    const scale = Math.max(0.7, Math.min(1.15, ts / 42));
    const projColor = pal.payloads[p.payload];

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    const trailLen = p.modifier === 'PIERCE' ? 18 * scale : 13 * scale;
    const trailGrad = ctx.createLinearGradient(-trailLen, 0, 0, 0);
    trailGrad.addColorStop(0, 'rgba(0,0,0,0)');
    trailGrad.addColorStop(1, projColor);
    ctx.strokeStyle = trailGrad;
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = (p.modifier === 'SPLASH' ? 5 : 3.6) * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-trailLen, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.globalAlpha = pal.isLight ? 0.45 : 0.7;
    drawRadialGlow(ctx, 0, 0, 8 * scale, projColor);

    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.isLight ? '#181715' : '#FFFFFF';
    if (p.modifier === 'PIERCE') {
      ctx.beginPath();
      ctx.moveTo(8 * scale, 0);
      ctx.lineTo(-4 * scale, -3.2 * scale);
      ctx.lineTo(-1.5 * scale, 0);
      ctx.lineTo(-4 * scale, 3.2 * scale);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, (p.modifier === 'SPLASH' ? 3.8 : 2.8) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Impact Flashes
  for (const fx of engine.impactFlashes) {
    const p = Math.max(0, Math.min(1, fx.age / Math.max(0.001, fx.duration)));
    const inv = 1 - p;
    const cx = fx.x * ts;
    const cy = fx.y * ts;
    const rad = Math.max(1.5, fx.maxRadius * ts * (0.2 + 0.8 * easeOutCubic(p)));

    if (fx.kind === 'MUZZLE') {
      ctx.globalAlpha = inv * 0.9;
      drawRadialGlow(ctx, cx, cy, rad * 1.4, fx.color);
      ctx.fillStyle = pal.isLight ? fx.color : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.5, rad * 0.35 * inv), 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.kind === 'SHIELD_SHATTER') {
      ctx.strokeStyle = fx.color;
      ctx.globalAlpha = inv * 0.95;
      ctx.lineWidth = 2.4 * inv + 0.8;
      drawRegularPolygon(ctx, cx, cy, rad, 6, p * 0.9);
      ctx.stroke();
      drawRadialGlow(ctx, cx, cy, rad * 0.8, pal.shieldGlow);
    } else {
      ctx.strokeStyle = fx.color;
      ctx.globalAlpha = inv * 0.85;
      ctx.lineWidth = Math.max(1.2, 3.2 * inv);
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();

      if (fx.kind === 'SHOCKWAVE') {
        ctx.globalAlpha = inv * (pal.isLight ? 0.25 : 0.45);
        drawRadialGlow(ctx, cx, cy, rad * 0.65, fx.color);
      }
    }
  }

  ctx.restore();
}

function drawHoverOverlay(
  ctx: CanvasRenderingContext2D,
  engine: VectraEngine,
  ht: GridPoint,
  opts: RenderOptions,
  check: PlacementCheckResult | null,
  ts: number,
  isLockedTouch: boolean,
  pal: ThemePalette
): void {
  const px = ht.x * ts;
  const py = ht.y * ts;
  const cx = px + ts / 2;
  const cy = py + ts / 2;

  ctx.save();

  if (opts.obstacleEditMode) {
    const isObs = engine.grid[tileIndex(ht.x, ht.y)] === 'OBSTACLE';
    const valid = check?.valid ?? false;
    ctx.fillStyle = isObs ? pal.overclockFloorGlow : valid ? pal.validFill : pal.invalidFill;
    ctx.strokeStyle = isObs ? pal.overclock : valid ? pal.validColor : pal.invalidColor;
    ctx.lineWidth = 2;
    ctx.fillRect(px + 1.5, py + 1.5, ts - 3, ts - 3);
    ctx.strokeRect(px + 1.5, py + 1.5, ts - 3, ts - 3);
    ctx.restore();
    return;
  }

  if (opts.activeTool === 'INSPECT') {
    const hoveredEnt = engine.getEntityAt(ht.x, ht.y);
    ctx.strokeStyle = hoveredEnt ? pal.towerBorderSelected : pal.boardFrame;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1.5, py + 1.5, ts - 3, ts - 3);
    ctx.restore();
    return;
  }

  const valid = check?.valid ?? false;
  const borderColor = valid ? pal.validColor : pal.invalidColor;

  if (valid) {
    if (opts.activeTool === 'TOWER') {
      const pr = opts.activePreset ?? null;
      const trig = pr ? pr.trigger : 'PULSE';
      const mod = pr ? pr.modifier : 'NONE';
      const baseRange = TRIGGERS[trig].range;
      const effRange = trig === 'NOVA' && mod === 'PIERCE' ? baseRange + 0.55 : baseRange;
      ctx.strokeStyle = pr ? pal.payloads[pr.payload] : pal.triggers.PULSE;
      ctx.globalAlpha = 0.68;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, effRange * ts, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else if (opts.activeTool === 'PRISM') {
      ctx.strokeStyle = pal.prism;
      ctx.fillStyle = `rgba(${pal.prismFloorRgb}, 0.08)`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, PRISM_RADIUS * ts, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      for (const e of engine.entities.values()) {
        if (e.kind === 'TOWER' && e.trigger === 'BEAM') {
          if (Math.hypot(e.x - ht.x, e.y - ht.y) <= TRIGGERS.BEAM.range + 0.05) {
            ctx.strokeStyle = pal.prism;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo((e.x + 0.5) * ts, (e.y + 0.5) * ts);
            ctx.stroke();
          }
        }
      }
    } else if (opts.activeTool === 'OVERCLOCK') {
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      ctx.fillStyle = pal.overclockFloorGlow;
      ctx.strokeStyle = pal.overclock;
      ctx.lineWidth = 1.5;
      for (const [dx, dy] of dirs) {
        const nx = ht.x + dx;
        const ny = ht.y + dy;
        if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
        ctx.fillRect(nx * ts + 2, ny * ts + 2, ts - 4, ts - 4);
        ctx.strokeRect(nx * ts + 2, ny * ts + 2, ts - 4, ts - 4);
      }
    }
  }

  // Tile fill & border
  ctx.fillStyle = valid ? pal.validFill : pal.invalidFill;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = isLockedTouch ? 2.2 : 1.8;
  ctx.fillRect(px + 1.5, py + 1.5, ts - 3, ts - 3);
  ctx.strokeRect(px + 1.5, py + 1.5, ts - 3, ts - 3);

  // Semi-transparent ghost silhouette
  drawGhostStructure(
    ctx,
    cx,
    cy,
    ts,
    opts.activeTool,
    opts.activePreset ?? null,
    opts.timeSec,
    valid,
    isLockedTouch,
    pal
  );

  // Explicit mobile first-tap pending preview
  if (isLockedTouch) {
    const wave = 0.5 + 0.5 * Math.sin(opts.timeSec * 5.5);
    const ringRadius = ts * (0.62 + wave * 0.16);
    const ringColor = valid ? pal.validColor : pal.invalidColor;

    ctx.save();
    ctx.strokeStyle = ringColor;
    ctx.globalAlpha = 0.45 + (1 - wave) * 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = ringColor;
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.56, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const bLen = Math.max(5, ts * 0.24);
    const bOff = 3;
    ctx.save();
    ctx.strokeStyle = valid ? pal.validBracket : pal.invalidBracket;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(px - bOff, py - bOff + bLen);
    ctx.lineTo(px - bOff, py - bOff);
    ctx.lineTo(px - bOff + bLen, py - bOff);
    ctx.moveTo(px + ts + bOff - bLen, py - bOff);
    ctx.lineTo(px + ts + bOff, py - bOff);
    ctx.lineTo(px + ts + bOff, py - bOff + bLen);
    ctx.moveTo(px + ts + bOff, py + ts + bOff - bLen);
    ctx.lineTo(px + ts + bOff, py + ts + bOff);
    ctx.lineTo(px + ts + bOff - bLen, py + ts + bOff);
    ctx.moveTo(px - bOff + bLen, py + ts + bOff);
    ctx.lineTo(px - bOff, py + ts + bOff);
    ctx.lineTo(px - bOff, py + ts + bOff - bLen);
    ctx.stroke();
    ctx.restore();

    const tagText = valid ? 'PREVIEW · TAP TO BUILD' : (check?.reason || 'BLOCKED').toUpperCase();
    ctx.save();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const tw = ctx.measureText(tagText).width + 12;
    const th = 18;
    const lx = Math.max(4, Math.min(GRID_COLS * ts - tw - 4, cx - tw / 2));
    const ly = py > 30 ? py - th - 7 : py + ts + 7;
    ctx.fillStyle = pal.tooltipBg;
    ctx.strokeStyle = valid ? pal.validColor : pal.invalidColor;
    ctx.lineWidth = 1.2;
    ctx.fillRect(lx, ly, tw, th);
    ctx.strokeRect(lx, ly, tw, th);
    ctx.fillStyle = valid ? pal.validText : pal.invalidText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, lx + tw / 2, ly + th / 2 + 0.5);
    ctx.restore();
  }

  if (!valid) {
    const m = ts * 0.24;
    ctx.strokeStyle = pal.invalidColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(px + m, py + m);
    ctx.lineTo(px + ts - m, py + ts - m);
    ctx.moveTo(px + ts - m, py + m);
    ctx.lineTo(px + m, py + ts - m);
    ctx.stroke();

    if (check?.reason && !isLockedTouch) {
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(check.reason).width + 14;
      const lx = Math.max(4, Math.min(GRID_COLS * ts - tw - 4, cx - tw / 2));
      const ly = py > 28 ? py - 24 : py + ts + 6;
      ctx.fillStyle = pal.tooltipBg;
      ctx.strokeStyle = pal.invalidColor;
      ctx.lineWidth = 1;
      ctx.fillRect(lx, ly, tw, 20);
      ctx.strokeRect(lx, ly, tw, 20);
      ctx.fillStyle = pal.invalidText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(check.reason, lx + tw / 2, ly + 10);
    }
  }

  ctx.restore();
}

function drawGhostStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ts: number,
  tool: BuildTool,
  activePreset: TowerPreset | null,
  timeSec: number,
  valid: boolean,
  isLockedTouch: boolean,
  pal: ThemePalette
): void {
  if (tool === 'INSPECT') return;
  const pad = ts * 0.1;
  const half = Math.max(4, ts / 2 - pad);
  const r = ts * 0.37;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = valid ? (isLockedTouch ? 0.72 : 0.52) : 0.32;

  if (tool === 'TOWER') {
    const trig = activePreset ? activePreset.trigger : 'PULSE';
    const pay = activePreset ? activePreset.payload : 'KINETIC';
    const trigColor = valid ? pal.triggers[trig] : pal.invalidColor;
    const payColor = valid ? pal.payloads[pay] : pal.invalidColor;

    ctx.fillStyle = pal.towerBodyMid;
    ctx.strokeStyle = trigColor;
    ctx.lineWidth = 1.6;
    drawChamferRect(ctx, -half, -half, half * 2, half * 2, ts * 0.12);
    ctx.fill();
    ctx.stroke();

    if (trig === 'NOVA') {
      ctx.strokeStyle = trigColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    } else if (trig === 'BEAM') {
      ctx.fillStyle = pal.towerBarrelFill;
      ctx.strokeStyle = trigColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ts * 0.36, 0);
      ctx.lineTo(-ts * 0.1, -ts * 0.15);
      ctx.lineTo(-ts * 0.04, 0);
      ctx.lineTo(-ts * 0.1, ts * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = pal.towerBarrelFill;
      ctx.strokeStyle = trigColor;
      ctx.lineWidth = 1.5;
      ctx.fillRect(0, -ts * 0.08, ts * 0.36, ts * 0.16);
      ctx.strokeRect(0, -ts * 0.08, ts * 0.36, ts * 0.16);
    }

    const coreR = ts * 0.14;
    ctx.fillStyle = payColor;
    if (pay === 'CRYO') {
      drawRegularPolygon(ctx, 0, 0, coreR, 6, 0);
      ctx.fill();
    } else if (pay === 'CORRODE') {
      drawRegularPolygon(ctx, 0, 0, coreR * 1.05, 3, -Math.PI / 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -coreR);
      ctx.lineTo(coreR, 0);
      ctx.lineTo(0, coreR);
      ctx.lineTo(-coreR, 0);
      ctx.closePath();
      ctx.fill();
    }
  } else if (tool === 'OVERCLOCK') {
    ctx.fillStyle = pal.overclockBodyTop;
    ctx.strokeStyle = valid ? pal.overclock : pal.invalidColor;
    ctx.lineWidth = 1.6;
    drawRegularPolygon(ctx, 0, 0, r, 8, Math.PI / 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = valid ? pal.overclockLight : pal.invalidColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(r * 0.55, 0);
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(0, r * 0.55);
    ctx.stroke();

    ctx.fillStyle = valid ? pal.overclock : pal.invalidColor;
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (tool === 'PRISM') {
    ctx.fillStyle = pal.prismBodyTop;
    ctx.strokeStyle = valid ? pal.prism : pal.invalidColor;
    ctx.lineWidth = 1.6;
    drawRegularPolygon(ctx, 0, 0, r, 6, 0);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(timeSec * 0.9);
    ctx.strokeStyle = valid ? pal.prismLight : pal.invalidColor;
    ctx.fillStyle = valid ? `rgba(${pal.prismFloorRgb}, 0.28)` : pal.invalidFill;
    ctx.lineWidth = 1.5;
    drawRegularPolygon(ctx, 0, 0, r * 0.62, 3, -Math.PI / 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.prismCore;
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawRegularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rot: number
): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawChamferRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
