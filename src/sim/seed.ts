import { inBounds } from './flowField';
import { EnemyType, GridPoint, SeedPayload, WaveDefinition } from './types';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64.trim());
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes { gridObstacles, spawn, goal, waves } using Gzip (CompressionStream) -> Base64.
 * Falls back cleanly with a 'VRAW1:' prefix if CompressionStream is unavailable.
 */
export async function encodeSeed(payload: SeedPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const inputBytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    return `VGZ1:${bytesToBase64(new Uint8Array(compressedBuffer))}`;
  }

  return `VRAW1:${bytesToBase64(inputBytes)}`;
}

const VALID_ENEMY_TYPES = new Set<EnemyType>(['SWARM', 'ARMOR', 'SHIELDED']);

function validateSeedObject(obj: unknown): SeedPayload {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Seed payload must be a JSON object.');
  }
  const data = obj as Partial<SeedPayload>;
  if (!data.spawn || !inBounds(data.spawn.x, data.spawn.y)) {
    throw new Error('Invalid spawn coordinates in seed.');
  }
  if (!data.goal || !inBounds(data.goal.x, data.goal.y)) {
    throw new Error('Invalid goal coordinates in seed.');
  }
  if (data.spawn.x === data.goal.x && data.spawn.y === data.goal.y) {
    throw new Error('Spawn and Goal cannot occupy the same tile.');
  }
  if (!Array.isArray(data.gridObstacles)) {
    throw new Error('Missing gridObstacles array.');
  }
  const obstacles: GridPoint[] = [];
  for (const pt of data.gridObstacles) {
    if (
      pt &&
      typeof pt.x === 'number' &&
      typeof pt.y === 'number' &&
      inBounds(pt.x, pt.y) &&
      !(pt.x === data.spawn.x && pt.y === data.spawn.y) &&
      !(pt.x === data.goal.x && pt.y === data.goal.y)
    ) {
      obstacles.push({ x: Math.floor(pt.x), y: Math.floor(pt.y) });
    }
  }
  if (!Array.isArray(data.waves) || data.waves.length === 0) {
    throw new Error('Seed must include at least one wave.');
  }

  const waves: WaveDefinition[] = data.waves.map((w, idx) => {
    if (!w || !Array.isArray(w.groups)) {
      throw new Error(`Wave ${idx + 1} is malformed.`);
    }
    return {
      waveNumber: typeof w.waveNumber === 'number' ? w.waveNumber : idx + 1,
      name: typeof w.name === 'string' && w.name.trim() ? w.name.trim() : `Wave ${idx + 1}`,
      clearBonus: typeof w.clearBonus === 'number' ? Math.max(0, Math.round(w.clearBonus)) : 40,
      groups: w.groups.map((g) => {
        if (!VALID_ENEMY_TYPES.has(g.enemyType)) {
          throw new Error(`Invalid enemyType "${String(g.enemyType)}".`);
        }
        return {
          startTick: Math.max(0, Math.round(g.startTick || 0)),
          enemyType: g.enemyType,
          count: Math.max(1, Math.min(200, Math.round(g.count || 1))),
          intervalTicks: Math.max(4, Math.round(g.intervalTicks || 24)),
        };
      }),
    };
  });

  return {
    v: 1,
    name: typeof data.name === 'string' ? data.name.slice(0, 32) : 'Custom Seed',
    spawn: { x: Math.floor(data.spawn.x), y: Math.floor(data.spawn.y) },
    goal: { x: Math.floor(data.goal.x), y: Math.floor(data.goal.y) },
    gridObstacles: obstacles,
    waves,
  };
}

export async function decodeSeed(seedStr: string): Promise<SeedPayload> {
  const trimmed = seedStr.trim();
  if (!trimmed) {
    throw new Error('Seed string is empty.');
  }

  let jsonText: string;

  if (trimmed.startsWith('VGZ1:')) {
    const raw = base64ToBytes(trimmed.slice(5));
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser does not support Gzip decompression.');
    }
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
    const decompressedBuffer = await new Response(stream).arrayBuffer();
    jsonText = new TextDecoder().decode(decompressedBuffer);
  } else if (trimmed.startsWith('VRAW1:')) {
    const raw = base64ToBytes(trimmed.slice(6));
    jsonText = new TextDecoder().decode(raw);
  } else if (trimmed.startsWith('{')) {
    jsonText = trimmed;
  } else {
    // Attempt raw gzipped base64 without prefix
    const raw = base64ToBytes(trimmed);
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
        const buf = await new Response(stream).arrayBuffer();
        jsonText = new TextDecoder().decode(buf);
      } catch {
        jsonText = new TextDecoder().decode(raw);
      }
    } else {
      jsonText = new TextDecoder().decode(raw);
    }
  }

  const parsed = JSON.parse(jsonText);
  return validateSeedObject(parsed);
}
