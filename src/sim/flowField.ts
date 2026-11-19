import {
  EnemyEntity,
  FlowFieldData,
  GRID_COLS,
  GRID_ROWS,
  GridPoint,
  PlacementCheckResult,
  TileKind,
} from './types';

export function tileIndex(x: number, y: number): number {
  return y * GRID_COLS + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;
}

export function isPassable(tile: TileKind): boolean {
  return tile === 'EMPTY' || tile === 'SPAWN' || tile === 'GOAL';
}

const ORTHO_DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Floods a Dijkstra / BFS distance map backward from Goal across the 20x12 grid.
 * O(GridSize) = 240 tiles. Recomputed strictly on tower/node placement or sell.
 */
export function computeFlowField(
  grid: TileKind[],
  spawn: GridPoint,
  goal: GridPoint,
  extraBlocked?: GridPoint
): FlowFieldData {
  const total = GRID_COLS * GRID_ROWS;
  const distances = new Int32Array(total).fill(-1);
  const nextX = new Int8Array(total).fill(0);
  const nextY = new Int8Array(total).fill(0);

  const blockedIdx = extraBlocked ? tileIndex(extraBlocked.x, extraBlocked.y) : -1;
  const goalIdx = tileIndex(goal.x, goal.y);

  const queueX = new Int16Array(total);
  const queueY = new Int16Array(total);
  let head = 0;
  let tail = 0;

  if (goalIdx !== blockedIdx) {
    distances[goalIdx] = 0;
    queueX[tail] = goal.x;
    queueY[tail] = goal.y;
    tail++;
  }

  while (head < tail) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;
    const cDist = distances[tileIndex(cx, cy)];

    for (let i = 0; i < 4; i++) {
      const nx = cx + ORTHO_DIRS[i][0];
      const ny = cy + ORTHO_DIRS[i][1];
      if (!inBounds(nx, ny)) continue;
      const nIdx = tileIndex(nx, ny);
      if (nIdx === blockedIdx) continue;
      if (distances[nIdx] !== -1) continue;
      if (!isPassable(grid[nIdx])) continue;

      distances[nIdx] = cDist + 1;
      queueX[tail] = nx;
      queueY[tail] = ny;
      tail++;
    }
  }

  // Assign deterministic flow vector pointing to lowest-distance neighbor (tie-break: prefer moving toward Goal axis)
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const idx = tileIndex(x, y);
      const d = distances[idx];
      if (d <= 0) continue;

      let bestDist = d;
      let bestDx = 0;
      let bestDy = 0;
      let bestHeuristic = Infinity;

      for (let i = 0; i < 4; i++) {
        const dx = ORTHO_DIRS[i][0];
        const dy = ORTHO_DIRS[i][1];
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        const nd = distances[tileIndex(nx, ny)];
        if (nd === -1) continue;

        const h = Math.abs(goal.x - nx) + Math.abs(goal.y - ny) * 1.001;
        if (nd < bestDist || (nd === bestDist && h < bestHeuristic)) {
          bestDist = nd;
          bestDx = dx;
          bestDy = dy;
          bestHeuristic = h;
        }
      }

      nextX[idx] = bestDx;
      nextY[idx] = bestDy;
    }
  }

  const spawnIdx = tileIndex(spawn.x, spawn.y);
  const spawnDist = distances[spawnIdx];
  const pathTiles: GridPoint[] = [];

  if (spawnDist >= 0) {
    let px = spawn.x;
    let py = spawn.y;
    let guard = total + 2;
    pathTiles.push({ x: px, y: py });
    while ((px !== goal.x || py !== goal.y) && guard-- > 0) {
      const idx = tileIndex(px, py);
      const dx = nextX[idx];
      const dy = nextY[idx];
      if (dx === 0 && dy === 0) break;
      px += dx;
      py += dy;
      pathTiles.push({ x: px, y: py });
    }
  }

  return {
    distances,
    nextX,
    nextY,
    pathTiles,
    spawnDist,
  };
}

/**
 * Full placement validation:
 * 1. Tile is in-bounds and EMPTY (not Spawn, Goal, Obstacle, Tower, or Node).
 * 2. No active enemy currently occupies (x, y).
 * 3. Dry-run Flow Field: Spawn remains reachable (spawnDist !== -1).
 * 4. Every active enemy still has a valid path to Goal after blocking (x, y).
 */
export function validatePlacement(
  grid: TileKind[],
  spawn: GridPoint,
  goal: GridPoint,
  enemies: EnemyEntity[],
  x: number,
  y: number
): PlacementCheckResult {
  if (!inBounds(x, y)) {
    return { valid: false, reason: 'Out of bounds' };
  }
  const idx = tileIndex(x, y);
  if (grid[idx] !== 'EMPTY') {
    if (grid[idx] === 'SPAWN') return { valid: false, reason: 'Spawn tile' };
    if (grid[idx] === 'GOAL') return { valid: false, reason: 'Goal core' };
    if (grid[idx] === 'OBSTACLE') return { valid: false, reason: 'Static obstacle' };
    return { valid: false, reason: 'Tile occupied' };
  }

  // Reject if any active enemy occupies tile (x, y)
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const ex = Math.floor(e.x);
    const ey = Math.floor(e.y);
    if (ex === x && ey === y) {
      return { valid: false, reason: 'Enemy on tile' };
    }
    // Also check radial overlap onto the tile square
    const closestX = Math.max(x, Math.min(e.x, x + 1));
    const closestY = Math.max(y, Math.min(e.y, y + 1));
    const distSq = (e.x - closestX) ** 2 + (e.y - closestY) ** 2;
    if (distSq < (e.radius * 0.7) ** 2) {
      return { valid: false, reason: 'Enemy too close' };
    }
  }

  // Dry-run Flow Field with (x, y) blocked
  const dryFlow = computeFlowField(grid, spawn, goal, { x, y });
  if (dryFlow.spawnDist === -1) {
    return { valid: false, reason: 'Blocks path to Goal' };
  }

  // Verify every active enemy still has a valid path to Goal
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const ex = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(e.x)));
    const ey = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(e.y)));
    if (dryFlow.distances[tileIndex(ex, ey)] === -1) {
      return { valid: false, reason: 'Traps active enemy' };
    }
  }

  return {
    valid: true,
    previewPath: dryFlow.pathTiles,
  };
}
