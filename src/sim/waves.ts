import { EnemyType, MapPreset, WaveDefinition } from './types';

export const MAP_PRESETS: MapPreset[] = [
  {
    id: 'open-foundry',
    name: 'Open Foundry',
    description: 'Clean 12x20 vertical floor with twin center pillars for wide serpentine mazing.',
    spawn: { x: 5, y: 0 },
    goal: { x: 6, y: 19 },
    obstacles: [
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 7, y: 13 },
      { x: 8, y: 13 },
    ],
  },
  {
    id: 'split-choke',
    name: 'Split Choke',
    description: 'Central bulkhead forces dual-lane routing or high-density switchbacks.',
    spawn: { x: 2, y: 0 },
    goal: { x: 9, y: 19 },
    obstacles: [
      { x: 0, y: 9 },
      { x: 1, y: 9 },
      { x: 2, y: 9 },
      { x: 5, y: 9 },
      { x: 6, y: 9 },
      { x: 9, y: 9 },
      { x: 10, y: 9 },
      { x: 11, y: 9 },
    ],
  },
  {
    id: 'twin-pillars',
    name: 'Twin Pillars',
    description: 'Staggered monoliths tailor-made for Prism Beam corridors and Nova pockets.',
    spawn: { x: 6, y: 0 },
    goal: { x: 5, y: 19 },
    obstacles: [
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 5, y: 10 },
      { x: 6, y: 10 },
      { x: 2, y: 14 },
      { x: 3, y: 14 },
      { x: 8, y: 14 },
      { x: 9, y: 14 },
    ],
  },
];

export const DEFAULT_WAVES: WaveDefinition[] = [
  {
    waveNumber: 1,
    name: 'Probe Swarm',
    clearBonus: 35,
    groups: [{ startTick: 0, enemyType: 'SWARM', count: 10, intervalTicks: 34 }],
  },
  {
    waveNumber: 2,
    name: 'Tight Formation',
    clearBonus: 40,
    groups: [
      { startTick: 0, enemyType: 'SWARM', count: 8, intervalTicks: 24 },
      { startTick: 240, enemyType: 'SWARM', count: 10, intervalTicks: 20 },
    ],
  },
  {
    waveNumber: 3,
    name: 'Heavy Plating',
    clearBonus: 48,
    groups: [
      { startTick: 0, enemyType: 'ARMOR', count: 4, intervalTicks: 70 },
      { startTick: 120, enemyType: 'SWARM', count: 10, intervalTicks: 26 },
    ],
  },
  {
    waveNumber: 4,
    name: 'Aegis Scouts',
    clearBonus: 55,
    groups: [
      { startTick: 0, enemyType: 'SHIELDED', count: 5, intervalTicks: 54 },
      { startTick: 180, enemyType: 'SWARM', count: 12, intervalTicks: 20 },
    ],
  },
  {
    waveNumber: 5,
    name: 'Iron Vanguard',
    clearBonus: 65,
    groups: [
      { startTick: 0, enemyType: 'ARMOR', count: 6, intervalTicks: 58 },
      { startTick: 100, enemyType: 'SHIELDED', count: 5, intervalTicks: 52 },
    ],
  },
  {
    waveNumber: 6,
    name: 'Surge Cascade',
    clearBonus: 72,
    groups: [
      { startTick: 0, enemyType: 'SWARM', count: 22, intervalTicks: 14 },
      { startTick: 180, enemyType: 'SHIELDED', count: 7, intervalTicks: 44 },
    ],
  },
  {
    waveNumber: 7,
    name: 'Armored Phalanx',
    clearBonus: 82,
    groups: [
      { startTick: 0, enemyType: 'ARMOR', count: 9, intervalTicks: 48 },
      { startTick: 80, enemyType: 'SWARM', count: 16, intervalTicks: 18 },
      { startTick: 320, enemyType: 'SHIELDED', count: 6, intervalTicks: 40 },
    ],
  },
  {
    waveNumber: 8,
    name: 'Phase Shift',
    clearBonus: 92,
    groups: [
      { startTick: 0, enemyType: 'SHIELDED', count: 12, intervalTicks: 34 },
      { startTick: 160, enemyType: 'ARMOR', count: 6, intervalTicks: 50 },
      { startTick: 280, enemyType: 'SWARM', count: 20, intervalTicks: 13 },
    ],
  },
  {
    waveNumber: 9,
    name: 'Siege Protocol',
    clearBonus: 105,
    groups: [
      { startTick: 0, enemyType: 'ARMOR', count: 10, intervalTicks: 40 },
      { startTick: 60, enemyType: 'SHIELDED', count: 10, intervalTicks: 36 },
      { startTick: 200, enemyType: 'SWARM', count: 26, intervalTicks: 11 },
    ],
  },
  {
    waveNumber: 10,
    name: 'Apex Convergence',
    clearBonus: 150,
    groups: [
      { startTick: 0, enemyType: 'ARMOR', count: 8, intervalTicks: 36 },
      { startTick: 45, enemyType: 'SHIELDED', count: 12, intervalTicks: 32 },
      { startTick: 120, enemyType: 'SWARM', count: 32, intervalTicks: 10 },
      { startTick: 360, enemyType: 'ARMOR', count: 8, intervalTicks: 34 },
      { startTick: 420, enemyType: 'SHIELDED', count: 8, intervalTicks: 30 },
    ],
  },
];

export function summarizeWave(wave: WaveDefinition): {
  waveNumber: number;
  name: string;
  counts: Record<EnemyType, number>;
  clearBonus: number;
} {
  const counts: Record<EnemyType, number> = { SWARM: 0, ARMOR: 0, SHIELDED: 0 };
  for (const g of wave.groups) {
    counts[g.enemyType] += g.count;
  }
  return {
    waveNumber: wave.waveNumber,
    name: wave.name,
    counts,
    clearBonus: wave.clearBonus,
  };
}

/** Smooth HP scaling across the 10 waves so early waves teach mazing & later waves reward synergies */
export function waveHpMultiplier(waveNumber: number): number {
  return 1 + (waveNumber - 1) * 0.16;
}
