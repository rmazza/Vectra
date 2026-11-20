import { computeFlowField, inBounds, tileIndex } from './flowField';
import { GRID_COLS, GRID_ROWS, GridPoint, MapPreset, TileKind } from './types';

export type ShuffleDensity = 'ANY' | 'SPARSE' | 'BALANCED' | 'DENSE';
export const SHUFFLE_DENSITIES: ShuffleDensity[] = ['ANY', 'SPARSE', 'BALANCED', 'DENSE'];

export const SHUFFLE_DENSITY_LABELS: Record<ShuffleDensity, string> = {
  ANY: 'Any',
  SPARSE: 'Open',
  BALANCED: 'Balanced',
  DENSE: 'Dense',
};

type ResolvedDensity = 'SPARSE' | 'BALANCED' | 'DENSE';

type SpawnTopology =
  | 'TOP_TO_BOTTOM'
  | 'BOTTOM_TO_TOP'
  | 'DIAGONAL_CORNERS'
  | 'SIDE_CROSS'
  | 'INSET_CORE'
  | 'HORSESHOE';

type BoardArchetype =
  | 'BAFFLES'
  | 'MONOLITHS'
  | 'BULKHEAD'
  | 'CHEVRON'
  | 'SPIRAL'
  | 'SPINE'
  | 'CHAMBERS'
  | 'DIAG_RIDGE'
  | 'SCATTER_FIELD'
  | 'CITADEL_RING';

const ALL_TOPOLOGIES: SpawnTopology[] = [
  'TOP_TO_BOTTOM',
  'BOTTOM_TO_TOP',
  'DIAGONAL_CORNERS',
  'SIDE_CROSS',
  'INSET_CORE',
  'HORSESHOE',
];

const ALL_ARCHETYPES: BoardArchetype[] = [
  'BAFFLES',
  'MONOLITHS',
  'BULKHEAD',
  'CHEVRON',
  'SPIRAL',
  'SPINE',
  'CHAMBERS',
  'DIAG_RIDGE',
  'SCATTER_FIELD',
  'CITADEL_RING',
];

// Bag-shuffled queues prevent immediate repeats so every shuffle feels genuinely new
let topologyBag: SpawnTopology[] = [];
let archetypeBag: BoardArchetype[] = [];
let lastArchetype: BoardArchetype | null = null;
let lastTopology: SpawnTopology | null = null;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawFromBag<T>(bag: T[], source: readonly T[], last: T | null): T {
  if (bag.length === 0) {
    bag.push(...shuffleInPlace([...source]));
    if (last !== null && bag.length > 1 && bag[bag.length - 1] === last) {
      const swapIdx = randInt(0, bag.length - 2);
      [bag[bag.length - 1], bag[swapIdx]] = [bag[swapIdx], bag[bag.length - 1]];
    }
  }
  return bag.pop()!;
}

function randomSectorCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const l = letters[randInt(0, letters.length - 1)];
  const n = randInt(1, 9);
  return `${l}${n}`;
}

function resolveDensity(requested: ShuffleDensity): ResolvedDensity {
  if (requested !== 'ANY') return requested;
  const r = Math.random();
  if (r < 0.25) return 'SPARSE';
  if (r < 0.7) return 'BALANCED';
  return 'DENSE';
}

function getDensityBounds(density: ResolvedDensity): { min: number; max: number } {
  if (density === 'SPARSE') return { min: 6, max: 13 };
  if (density === 'BALANCED') return { min: 14, max: 25 };
  return { min: 26, max: 39 };
}

function pickSpawnAndGoal(topology: SpawnTopology): {
  spawn: GridPoint;
  goal: GridPoint;
  minPath: number;
} {
  if (topology === 'TOP_TO_BOTTOM') {
    const sx = randInt(0, GRID_COLS - 1);
    let gx = randInt(0, GRID_COLS - 1);
    if (Math.abs(gx - sx) < 3 && Math.random() < 0.65) {
      gx = sx < GRID_COLS / 2 ? randInt(GRID_COLS - 4, GRID_COLS - 1) : randInt(0, 3);
    }
    const sy = Math.random() < 0.8 ? 0 : 1;
    const gy = Math.random() < 0.8 ? GRID_ROWS - 1 : GRID_ROWS - 2;
    return { spawn: { x: sx, y: sy }, goal: { x: gx, y: gy }, minPath: 19 };
  }

  if (topology === 'BOTTOM_TO_TOP') {
    const sx = randInt(0, GRID_COLS - 1);
    let gx = randInt(0, GRID_COLS - 1);
    if (Math.abs(gx - sx) < 3 && Math.random() < 0.65) {
      gx = sx < GRID_COLS / 2 ? randInt(GRID_COLS - 4, GRID_COLS - 1) : randInt(0, 3);
    }
    const sy = Math.random() < 0.8 ? GRID_ROWS - 1 : GRID_ROWS - 2;
    const gy = Math.random() < 0.8 ? 0 : 1;
    return { spawn: { x: sx, y: sy }, goal: { x: gx, y: gy }, minPath: 19 };
  }

  if (topology === 'DIAGONAL_CORNERS') {
    const leftStart = Math.random() < 0.5;
    const reverse = Math.random() < 0.5;
    const a: GridPoint = {
      x: leftStart ? randInt(0, 2) : randInt(GRID_COLS - 3, GRID_COLS - 1),
      y: randInt(0, 2),
    };
    const b: GridPoint = {
      x: leftStart ? randInt(GRID_COLS - 3, GRID_COLS - 1) : randInt(0, 2),
      y: randInt(GRID_ROWS - 3, GRID_ROWS - 1),
    };
    return reverse
      ? { spawn: b, goal: a, minPath: 21 }
      : { spawn: a, goal: b, minPath: 21 };
  }

  if (topology === 'SIDE_CROSS') {
    const leftToRight = Math.random() < 0.5;
    const topToBottom = Math.random() < 0.5;
    const spawn: GridPoint = {
      x: leftToRight ? randInt(0, 1) : randInt(GRID_COLS - 2, GRID_COLS - 1),
      y: topToBottom ? randInt(1, 5) : randInt(GRID_ROWS - 6, GRID_ROWS - 2),
    };
    const goal: GridPoint = {
      x: leftToRight ? randInt(GRID_COLS - 2, GRID_COLS - 1) : randInt(0, 1),
      y: topToBottom ? randInt(GRID_ROWS - 6, GRID_ROWS - 2) : randInt(1, 5),
    };
    return { spawn, goal, minPath: 18 };
  }

  if (topology === 'INSET_CORE') {
    const spawnAtTop = Math.random() < 0.5;
    const swapRole = Math.random() < 0.35;
    const edgePt: GridPoint = {
      x: randInt(1, GRID_COLS - 2),
      y: spawnAtTop ? 0 : GRID_ROWS - 1,
    };
    const insetPt: GridPoint = {
      x: randInt(3, GRID_COLS - 4),
      y: spawnAtTop ? randInt(13, 16) : randInt(3, 6),
    };
    return swapRole
      ? { spawn: insetPt, goal: edgePt, minPath: 16 }
      : { spawn: edgePt, goal: insetPt, minPath: 16 };
  }

  // HORSESHOE: both spawn & goal on the same flank, separated vertically
  const leftSide = Math.random() < 0.5;
  const reverse = Math.random() < 0.5;
  const a: GridPoint = {
    x: leftSide ? randInt(0, 2) : randInt(GRID_COLS - 3, GRID_COLS - 1),
    y: randInt(1, 4),
  };
  const b: GridPoint = {
    x: leftSide ? randInt(0, 2) : randInt(GRID_COLS - 3, GRID_COLS - 1),
    y: randInt(GRID_ROWS - 5, GRID_ROWS - 2),
  };
  return reverse
    ? { spawn: b, goal: a, minPath: 16 }
    : { spawn: a, goal: b, minPath: 16 };
}

function manhattan(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function buildArchetypeObstacles(
  archetype: BoardArchetype,
  density: ResolvedDensity,
  spawn: GridPoint,
  goal: GridPoint,
  topology: SpawnTopology
): Set<number> {
  const occupied = new Set<number>();

  const canPlace = (x: number, y: number): boolean => {
    if (!inBounds(x, y)) return false;
    // Maintain clean 1-tile breathing clearance around Spawn and Goal
    if (manhattan({ x, y }, spawn) <= 1) return false;
    if (manhattan({ x, y }, goal) <= 1) return false;
    return true;
  };

  const addWall = (x: number, y: number) => {
    if (canPlace(x, y)) {
      occupied.add(tileIndex(x, y));
    }
  };

  const densityScale = density === 'SPARSE' ? 0.65 : density === 'DENSE' ? 1.45 : 1.0;

  if (archetype === 'BAFFLES') {
    const ribCount = Math.max(2, Math.min(7, Math.round(randInt(3, 5) * densityScale)));
    const startLeft = Math.random() < 0.5;
    const addHooks = Math.random() < 0.45;
    for (let i = 0; i < ribCount; i++) {
      const t = ribCount === 1 ? 0.5 : i / (ribCount - 1);
      const row = Math.round(2 + t * 15) + randInt(-1, 1);
      const len = randInt(density === 'SPARSE' ? 2 : 3, density === 'DENSE' ? 6 : 5);
      const leftSide = i % 2 === 0 ? startLeft : !startLeft;
      const anchorEdge = Math.random() < 0.4;
      const startX = leftSide
        ? anchorEdge
          ? 0
          : randInt(1, 3)
        : anchorEdge
        ? GRID_COLS - len
        : randInt(Math.max(3, GRID_COLS - len - 3), GRID_COLS - len - 1);
      for (let dx = 0; dx < len; dx++) {
        addWall(startX + dx, row);
      }
      if (addHooks && Math.random() < 0.6) {
        const hookX = leftSide ? startX + len - 1 : startX;
        const hookDir = Math.random() < 0.5 ? 1 : -1;
        addWall(hookX, row + hookDir);
      }
    }
  } else if (archetype === 'MONOLITHS') {
    const symRoll = Math.random();
    const symmetry: 'NONE' | 'MIRROR_X' | 'ROT180' =
      symRoll < 0.3 ? 'MIRROR_X' : symRoll < 0.58 ? 'ROT180' : 'NONE';
    const shapes: GridPoint[][] = [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ],
    ];
    const targetClusters =
      symmetry === 'NONE'
        ? Math.round(randInt(4, 7) * densityScale)
        : Math.round(randInt(3, 5) * densityScale);

    for (let i = 0; i < targetClusters * 2 && i < 24; i++) {
      const shape = pick(shapes);
      const bx = randInt(1, symmetry === 'MIRROR_X' ? 4 : GRID_COLS - 3);
      const by = randInt(2, GRID_ROWS - 4);

      const cells: GridPoint[] = [];
      for (const p of shape) {
        cells.push({ x: bx + p.x, y: by + p.y });
        if (symmetry === 'MIRROR_X') {
          cells.push({ x: GRID_COLS - 1 - (bx + p.x), y: by + p.y });
        } else if (symmetry === 'ROT180') {
          cells.push({ x: GRID_COLS - 1 - (bx + p.x), y: GRID_ROWS - 1 - (by + p.y) });
        }
      }

      // Check 1-tile spacing from existing blocks to keep crisp navigable alleys
      let blocked = false;
      for (const c of cells) {
        if (!canPlace(c.x, c.y)) {
          blocked = true;
          break;
        }
        for (let dy = -1; dy <= 1 && !blocked; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = c.x + dx;
            const ny = c.y + dy;
            if (inBounds(nx, ny) && occupied.has(tileIndex(nx, ny))) {
              blocked = true;
              break;
            }
          }
        }
      }
      if (blocked) continue;
      for (const c of cells) addWall(c.x, c.y);
      if (occupied.size >= getDensityBounds(density).max - 2) break;
    }
  } else if (archetype === 'BULKHEAD') {
    const bulkheadCount = density === 'SPARSE' ? 1 : density === 'DENSE' ? randInt(2, 3) : randInt(1, 2);
    const rows =
      bulkheadCount === 1
        ? [randInt(7, 12)]
        : bulkheadCount === 2
        ? [randInt(5, 7), randInt(12, 14)]
        : [randInt(4, 5), randInt(9, 10), randInt(14, 15)];

    for (const row of rows) {
      const gateCount = randInt(2, 3);
      const openCols = new Set<number>();
      for (let g = 0; g < gateCount; g++) {
        const bandStart = Math.floor((g * GRID_COLS) / gateCount);
        const bandEnd = Math.floor(((g + 1) * GRID_COLS) / gateCount) - 1;
        const gx = randInt(bandStart, Math.max(bandStart, bandEnd - 1));
        const width = randInt(2, 3);
        for (let w = 0; w < width; w++) {
          if (gx + w < GRID_COLS) openCols.add(gx + w);
        }
      }
      const slant = Math.random() < 0.35 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      for (let x = 0; x < GRID_COLS; x++) {
        if (!openCols.has(x)) {
          const yOff = slant !== 0 && x >= GRID_COLS / 2 ? slant : 0;
          addWall(x, row + yOff);
        }
      }
    }
    if (bulkheadCount === 1) {
      // Flanking guard pillars above & below single bulkhead
      const spots = [
        { x: randInt(2, 4), y: randInt(3, 5) },
        { x: randInt(7, 9), y: randInt(14, 16) },
      ];
      for (const s of spots) {
        addWall(s.x, s.y);
        addWall(s.x + 1, s.y);
      }
    }
  } else if (archetype === 'CHEVRON') {
    const count = density === 'SPARSE' ? 3 : density === 'DENSE' ? 5 : 4;
    const flip = Math.random() < 0.5;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const ay = Math.round(3 + t * 13) + randInt(-1, 1);
      const rightFacing = (i % 2 === 0) !== flip;
      const ax = rightFacing ? randInt(2, 5) : randInt(6, 9);
      const dirX = rightFacing ? 1 : -1;
      const dirY = Math.random() < 0.5 ? 1 : -1;
      const armX = randInt(2, density === 'DENSE' ? 4 : 3);
      const armY = randInt(1, 2);

      for (let dx = 0; dx < armX; dx++) {
        addWall(ax + dx * dirX, ay);
      }
      for (let dy = 1; dy <= armY; dy++) {
        addWall(ax, ay + dy * dirY);
      }
      // Occasional Z-hook tail
      if (density === 'DENSE' && Math.random() < 0.5) {
        addWall(ax + (armX - 1) * dirX, ay - dirY);
      }
    }
  } else if (archetype === 'SPIRAL') {
    const cx = randInt(5, 6);
    const cy = randInt(8, 11);
    const cw = Math.random() < 0.5;
    const innerR = 2;
    const outerR = density === 'SPARSE' ? 3 : 4;

    // Inner broken U-coil around center
    const openSide = randInt(0, 3);
    for (let dx = -innerR; dx <= innerR; dx++) {
      if (openSide !== 0) addWall(cx + dx, cy - innerR);
      if (openSide !== 1) addWall(cx + dx, cy + innerR);
    }
    for (let dy = -innerR + 1; dy <= innerR - 1; dy++) {
      if (openSide !== 2) addWall(cx - innerR, cy + dy);
      if (openSide !== 3) addWall(cx + innerR, cy + dy);
    }
    // Always carve a secondary breach on the opposite corner so the coil flows smoothly
    const bx = cw ? cx + innerR : cx - innerR;
    occupied.delete(tileIndex(bx, cy));

    // Outer opposing spiral ribs
    if (density !== 'SPARSE') {
      const topY = Math.max(2, cy - outerR - 2);
      const botY = Math.min(GRID_ROWS - 3, cy + outerR + 2);
      const startTopX = cw ? randInt(1, 3) : randInt(5, 7);
      const startBotX = cw ? randInt(5, 7) : randInt(1, 3);
      const len = randInt(3, 5);
      for (let i = 0; i < len; i++) {
        addWall(startTopX + i, topY);
        addWall(startBotX + i, botY);
      }
      if (density === 'DENSE') {
        addWall(cw ? 1 : GRID_COLS - 2, cy - 1);
        addWall(cw ? 1 : GRID_COLS - 2, cy);
        addWall(cw ? 1 : GRID_COLS - 2, cy + 1);
        addWall(cw ? GRID_COLS - 2 : 1, cy - 1);
        addWall(cw ? GRID_COLS - 2 : 1, cy);
        addWall(cw ? GRID_COLS - 2 : 1, cy + 1);
      }
    }
  } else if (archetype === 'SPINE') {
    const spineX =
      topology === 'HORSESHOE'
        ? spawn.x < GRID_COLS / 2
          ? randInt(4, 6)
          : randInt(5, 7)
        : randInt(4, 7);
    const gapRows = new Set<number>([randInt(5, 7), randInt(12, 14)]);
    if (density === 'SPARSE') gapRows.add(randInt(9, 10));

    const yStart = randInt(3, 4);
    const yEnd = randInt(15, 16);
    for (let y = yStart; y <= yEnd; y++) {
      if (gapRows.has(y) || gapRows.has(y - 1)) continue;
      addWall(spineX, y);
    }

    // Alternating lateral ribs branching off the spine
    const ribRows =
      density === 'SPARSE'
        ? [randInt(5, 7), randInt(12, 14)]
        : density === 'DENSE'
        ? [4, 8, 12, 16]
        : [5, 10, 15];
    const startLeft = Math.random() < 0.5;
    ribRows.forEach((ry, i) => {
      const goLeft = i % 2 === 0 ? startLeft : !startLeft;
      const len = randInt(2, density === 'DENSE' ? 3 : 2);
      const dir = goLeft ? -1 : 1;
      for (let step = 1; step <= len; step++) {
        addWall(spineX + dir * step, ry);
      }
    });
  } else if (archetype === 'CHAMBERS') {
    const chamberCount = density === 'SPARSE' ? 1 : density === 'DENSE' ? 3 : 2;
    const bands =
      chamberCount === 1
        ? [{ yMin: 6, yMax: 13 }]
        : chamberCount === 2
        ? [
            { yMin: 3, yMax: 8 },
            { yMin: 11, yMax: 16 },
          ]
        : [
            { yMin: 2, yMax: 6 },
            { yMin: 8, yMax: 12 },
            { yMin: 14, yMax: 17 },
          ];

    for (const band of bands) {
      const w = randInt(4, 6);
      const h = Math.min(band.yMax - band.yMin, randInt(3, 4));
      const x0 = randInt(1, GRID_COLS - w - 2);
      const y0 = randInt(band.yMin, Math.max(band.yMin, band.yMax - h));
      const doorTopX = randInt(x0 + 1, x0 + w - 2);
      const doorBotX = randInt(x0 + 1, x0 + w - 2);
      const sideDoorY = randInt(y0 + 1, Math.max(y0 + 1, y0 + h - 1));
      const openLeft = Math.random() < 0.5;

      for (let x = x0; x <= x0 + w; x++) {
        if (x !== doorTopX && x !== doorTopX + 1) addWall(x, y0);
        if (x !== doorBotX && x !== doorBotX + 1) addWall(x, y0 + h);
      }
      for (let y = y0 + 1; y < y0 + h; y++) {
        if (!(openLeft && y === sideDoorY)) addWall(x0, y);
        if (!(!openLeft && y === sideDoorY)) addWall(x0 + w, y);
      }
    }
  } else if (archetype === 'DIAG_RIDGE') {
    const ridgeCount = density === 'SPARSE' ? 2 : density === 'DENSE' ? 4 : 3;
    const slope = Math.random() < 0.5 ? 1 : -1;
    for (let r = 0; r < ridgeCount; r++) {
      const baseRow = Math.round(3 + (r * 13) / Math.max(1, ridgeCount - 1));
      const len = randInt(density === 'SPARSE' ? 4 : 5, density === 'DENSE' ? 8 : 7);
      const startX =
        slope > 0 ? randInt(0, Math.max(1, GRID_COLS - len - 1)) : randInt(len, GRID_COLS - 1);
      const breachAt = randInt(1, Math.max(1, len - 2));
      for (let step = 0; step < len; step++) {
        if (step === breachAt || (len >= 7 && step === breachAt + 1)) continue;
        const x = startX + step * slope;
        const y = baseRow + Math.floor(step * 0.65);
        addWall(x, y);
      }
    }
  } else if (archetype === 'SCATTER_FIELD') {
    const bounds = getDensityBounds(density);
    const target = randInt(bounds.min, bounds.max);
    const clusterCenters = [
      { x: randInt(2, 9), y: randInt(3, 7) },
      { x: randInt(2, 9), y: randInt(8, 12) },
      { x: randInt(2, 9), y: randInt(13, 17) },
    ];

    for (let attempt = 0; attempt < 160 && occupied.size < target; attempt++) {
      // Blend clustered focal zones with uniform random coverage
      let x: number;
      let y: number;
      if (Math.random() < 0.55) {
        const c = pick(clusterCenters);
        x = Math.max(0, Math.min(GRID_COLS - 1, c.x + randInt(-3, 3)));
        y = Math.max(1, Math.min(GRID_ROWS - 2, c.y + randInt(-2, 2)));
      } else {
        x = randInt(0, GRID_COLS - 1);
        y = randInt(1, GRID_ROWS - 2);
      }
      if (!canPlace(x, y) || occupied.has(tileIndex(x, y))) continue;

      // Avoid clumping into massive solid rectangles (> 3 ortho neighbors)
      let neighbors = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (inBounds(x + dx, y + dy) && occupied.has(tileIndex(x + dx, y + dy))) neighbors++;
      }
      if (neighbors >= 2) continue;

      addWall(x, y);
      // 45% chance to extend into a crisp 2-tile shard
      if (occupied.size < target && Math.random() < 0.45) {
        const [dx, dy] = pick([
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]);
        if (canPlace(x + dx, y + dy)) {
          addWall(x + dx, y + dy);
        }
      }
    }
  } else {
    // CITADEL_RING: Fortified broken ring around mid-arena or inset goal
    const anchor =
      topology === 'INSET_CORE' && goal.y >= 3 && goal.y <= GRID_ROWS - 4
        ? { x: goal.x, y: goal.y }
        : { x: randInt(4, 7), y: randInt(8, 11) };
    const rx = randInt(2, 3);
    const ry = randInt(2, 4);
    const gates = new Set<string>([
      `${anchor.x},${anchor.y - ry}`,
      `${anchor.x},${anchor.y + ry}`,
      `${anchor.x - rx},${anchor.y}`,
      `${anchor.x + rx},${anchor.y}`,
    ]);
    // Widen 2 random gates by 1 tile for smoother multi-angle routing
    const widenAxis = Math.random() < 0.5;
    if (widenAxis) {
      gates.add(`${anchor.x + 1},${anchor.y - ry}`);
      gates.add(`${anchor.x - 1},${anchor.y + ry}`);
    } else {
      gates.add(`${anchor.x - rx},${anchor.y + 1}`);
      gates.add(`${anchor.x + rx},${anchor.y - 1}`);
    }

    for (let x = anchor.x - rx; x <= anchor.x + rx; x++) {
      if (!gates.has(`${x},${anchor.y - ry}`)) addWall(x, anchor.y - ry);
      if (!gates.has(`${x},${anchor.y + ry}`)) addWall(x, anchor.y + ry);
    }
    for (let y = anchor.y - ry + 1; y <= anchor.y + ry - 1; y++) {
      if (!gates.has(`${anchor.x - rx},${y}`)) addWall(anchor.x - rx, y);
      if (!gates.has(`${anchor.x + rx},${y}`)) addWall(anchor.x + rx, y);
    }

    // Outer flanking cover blocks
    const flankCount = density === 'SPARSE' ? 2 : density === 'DENSE' ? 6 : 4;
    for (let f = 0; f < flankCount; f++) {
      const fx = f % 2 === 0 ? randInt(1, 3) : randInt(GRID_COLS - 4, GRID_COLS - 2);
      const fy = f < flankCount / 2 ? randInt(2, 6) : randInt(GRID_ROWS - 7, GRID_ROWS - 3);
      if (Math.abs(fx - anchor.x) > rx || Math.abs(fy - anchor.y) > ry) {
        addWall(fx, fy);
        if (density !== 'SPARSE') addWall(fx + (fx < 6 ? 1 : -1), fy);
      }
    }
  }

  // Lightly tune obstacle count toward the selected density band
  const bounds = getDensityBounds(density);
  if (occupied.size > bounds.max) {
    const list = shuffleInPlace(Array.from(occupied));
    while (occupied.size > bounds.max && list.length > 0) {
      occupied.delete(list.pop()!);
    }
  } else if (occupied.size < bounds.min) {
    for (let tries = 0; tries < 60 && occupied.size < bounds.min; tries++) {
      const x = randInt(1, GRID_COLS - 2);
      const y = randInt(2, GRID_ROWS - 3);
      if (!canPlace(x, y) || occupied.has(tileIndex(x, y))) continue;
      addWall(x, y);
      if (occupied.size < bounds.min && Math.random() < 0.5) {
        addWall(x + (Math.random() < 0.5 ? 1 : 0), y + (Math.random() < 0.5 ? 0 : 1));
      }
    }
  }

  return occupied;
}

const ARCHETYPE_META: Record<BoardArchetype, { prefix: string; detail: string }> = {
  BAFFLES: { prefix: 'Baffle Sector', detail: 'staggered wall ribs for serpentine switchbacks' },
  MONOLITHS: { prefix: 'Monolith Grid', detail: 'geometric monolith clusters and killbox pockets' },
  BULKHEAD: { prefix: 'Bulkhead Wing', detail: 'perforated barrier bulkheads and choke gates' },
  CHEVRON: { prefix: 'Chevron Vault', detail: 'angled L-brackets and deflecting pocket lanes' },
  SPIRAL: { prefix: 'Coil Conduit', detail: 'broken vortex coil wrapping the central floor' },
  SPINE: { prefix: 'Spine Corridor', detail: 'segmented central spine with alternating wing ribs' },
  CHAMBERS: { prefix: 'Vault Chambers', detail: 'breached enclosures for tactical killboxes' },
  DIAG_RIDGE: { prefix: 'Fault Ridge', detail: 'stepped oblique ridges with Prism sightlines' },
  SCATTER_FIELD: { prefix: 'Debris Field', detail: 'organic pillar scatter with open routing' },
  CITADEL_RING: { prefix: 'Citadel Bastion', detail: 'fortified ring perimeter with multi-gate breaches' },
};

const TOPOLOGY_LABELS: Record<SpawnTopology, string> = {
  TOP_TO_BOTTOM: 'North-to-South',
  BOTTOM_TO_TOP: 'Inverted South-to-North',
  DIAGONAL_CORNERS: 'Corner-to-Corner diagonal',
  SIDE_CROSS: 'Cross-flank edge sweep',
  INSET_CORE: 'Inset Core perimeter',
  HORSESHOE: 'Same-flank horseshoe',
};

/**
 * Generates a fresh, high-variety, guaranteed-playable procedural arena with:
 * - 6 distinct Spawn/Goal topologies (including inverted, corner diagonal, cross-flank, inset core & horseshoe)
 * - 10 distinct architectural obstacle archetypes with varied density profiles
 * - Full Dijkstra flow-field verification ensuring zero trapped deadzones and healthy path lengths
 */
export function generateShuffledLayout(densityPref: ShuffleDensity = 'ANY'): MapPreset {
  const archetype = drawFromBag(archetypeBag, ALL_ARCHETYPES, lastArchetype);
  lastArchetype = archetype;

  const topology = drawFromBag(topologyBag, ALL_TOPOLOGIES, lastTopology);
  lastTopology = topology;

  const density = resolveDensity(densityPref);
  const bounds = getDensityBounds(density);

  for (let attempt = 0; attempt < 42; attempt++) {
    // Slightly relax topology on late retries if a dense archetype clashes with a tricky spawn layout
    const activeTopology = attempt < 30 ? topology : pick(ALL_TOPOLOGIES);
    const { spawn, goal, minPath } = pickSpawnAndGoal(activeTopology);
    const occupied = buildArchetypeObstacles(archetype, density, spawn, goal, activeTopology);

    const testGrid: TileKind[] = new Array(GRID_COLS * GRID_ROWS).fill('EMPTY');
    testGrid[tileIndex(spawn.x, spawn.y)] = 'SPAWN';
    testGrid[tileIndex(goal.x, goal.y)] = 'GOAL';

    const obstacles: GridPoint[] = [];
    for (const idx of occupied) {
      if (testGrid[idx] === 'EMPTY') {
        testGrid[idx] = 'OBSTACLE';
        obstacles.push({ x: idx % GRID_COLS, y: Math.floor(idx / GRID_COLS) });
      }
    }

    if (obstacles.length < Math.max(5, bounds.min - 2) || obstacles.length > bounds.max + 4) {
      continue;
    }

    // Ensure at least 185 passable tiles remain so players always have ample mazing space
    if (GRID_COLS * GRID_ROWS - obstacles.length < 185) continue;

    const flow = computeFlowField(testGrid, spawn, goal);
    if (flow.spawnDist < minPath) continue;

    // Verify ZERO unreachable empty pockets (every single open tile must connect to the Goal)
    let unreachableEmpty = 0;
    for (let i = 0; i < testGrid.length; i++) {
      if (testGrid[i] === 'EMPTY' && flow.distances[i] === -1) {
        unreachableEmpty++;
      }
    }
    if (unreachableEmpty > 0) continue;

    // Verify Spawn & Goal each have at least 2 open orthogonal neighbors
    let spawnExits = 0;
    let goalExits = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (inBounds(spawn.x + dx, spawn.y + dy) && testGrid[tileIndex(spawn.x + dx, spawn.y + dy)] === 'EMPTY') {
        spawnExits++;
      }
      if (inBounds(goal.x + dx, goal.y + dy) && testGrid[tileIndex(goal.x + dx, goal.y + dy)] === 'EMPTY') {
        goalExits++;
      }
    }
    if (spawnExits < 2 || goalExits < 2) continue;

    const code = randomSectorCode();
    const meta = ARCHETYPE_META[archetype];
    const densityTag =
      density === 'SPARSE' ? 'Open' : density === 'DENSE' ? 'Dense' : 'Balanced';

    return {
      id: `shuffled-${Date.now().toString(36)}-${code.toLowerCase()}`,
      name: `${meta.prefix} ${code}`,
      description: `${TOPOLOGY_LABELS[activeTopology]} · ${densityTag} ${meta.detail} (${flow.spawnDist}t base path).`,
      spawn,
      goal,
      obstacles,
    };
  }

  // Guaranteed playable randomized fallback
  const fallbackSpawn: GridPoint = { x: randInt(1, 4), y: 0 };
  const fallbackGoal: GridPoint = { x: randInt(7, 10), y: GRID_ROWS - 1 };
  const code = randomSectorCode();
  return {
    id: `shuffled-fallback-${Date.now().toString(36)}-${code.toLowerCase()}`,
    name: `Vector Sector ${code}`,
    description: 'Diagonal procedural arena with staggered architectural pillars.',
    spawn: fallbackSpawn,
    goal: fallbackGoal,
    obstacles: [
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 7, y: 10 },
      { x: 8, y: 10 },
      { x: 9, y: 10 },
      { x: 3, y: 15 },
      { x: 4, y: 15 },
      { x: 5, y: 15 },
    ],
  };
}
