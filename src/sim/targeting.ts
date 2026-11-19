import { tileIndex } from './flowField';
import {
  EnemyEntity,
  FlowFieldData,
  GRID_COLS,
  GRID_ROWS,
  SortOrder,
  TargetCondition,
  TargetMetric,
  TargetRule,
} from './types';

export const CONDITION_OPTIONS: { value: TargetCondition; label: string }[] = [
  { value: 'Any', label: 'Any Enemy' },
  { value: 'HasShield', label: 'Has Shield' },
  { value: 'NotSlowed', label: 'Not Slowed' },
  { value: 'NotShredded', label: 'Not Shredded' },
  { value: 'HpBelow30Pct', label: 'HP < 30%' },
  { value: 'HpAbove70Pct', label: 'HP > 70%' },
];

export const METRIC_OPTIONS: {
  value: TargetMetric;
  label: string;
  ascLabel: string;
  descLabel: string;
}[] = [
  { value: 'DistToGoal', label: 'Goal Dist', ascLabel: 'First (Closest)', descLabel: 'Last (Furthest)' },
  { value: 'CurrentHp', label: 'Current HP', ascLabel: 'Weakest', descLabel: 'Strongest' },
  { value: 'MoveSpeed', label: 'Move Speed', ascLabel: 'Slowest', descLabel: 'Fastest' },
];

export interface TargetingPreset {
  id: string;
  label: string;
  rules: Omit<TargetRule, 'id'>[];
}

export const TARGETING_PRESETS: TargetingPreset[] = [
  {
    id: 'front',
    label: 'Frontline',
    rules: [{ condition: 'Any', metric: 'DistToGoal', order: 'ASC' }],
  },
  {
    id: 'shield-breaker',
    label: 'Shield Breaker',
    rules: [
      { condition: 'HasShield', metric: 'DistToGoal', order: 'ASC' },
      { condition: 'Any', metric: 'DistToGoal', order: 'ASC' },
    ],
  },
  {
    id: 'cryo-spread',
    label: 'Slow Spreader',
    rules: [
      { condition: 'NotSlowed', metric: 'MoveSpeed', order: 'DESC' },
      { condition: 'Any', metric: 'DistToGoal', order: 'ASC' },
    ],
  },
  {
    id: 'armor-shred',
    label: 'Shred Heavy',
    rules: [
      { condition: 'NotShredded', metric: 'CurrentHp', order: 'DESC' },
      { condition: 'Any', metric: 'CurrentHp', order: 'DESC' },
    ],
  },
  {
    id: 'finisher',
    label: 'Finisher',
    rules: [
      { condition: 'HpBelow30Pct', metric: 'DistToGoal', order: 'ASC' },
      { condition: 'Any', metric: 'CurrentHp', order: 'ASC' },
    ],
  },
];

let ruleSeq = 1;
export function createRule(
  condition: TargetCondition = 'Any',
  metric: TargetMetric = 'DistToGoal',
  order: SortOrder = 'ASC'
): TargetRule {
  return {
    id: `rule_${ruleSeq++}`,
    condition,
    metric,
    order,
  };
}

export function getEnemyDistToGoal(enemy: EnemyEntity, flow: FlowFieldData): number {
  const gx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(enemy.x)));
  const gy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(enemy.y)));
  const idx = tileIndex(gx, gy);
  const tileDist = flow.distances[idx];
  if (tileDist < 0) return 9999;

  // Sub-tile interpolation along flow direction for crisp tie-breaking
  const dx = flow.nextX[idx];
  const dy = flow.nextY[idx];
  const targetCx = gx + 0.5 + dx * 0.5;
  const targetCy = gy + 0.5 + dy * 0.5;
  const sub = Math.hypot(targetCx - enemy.x, targetCy - enemy.y);
  return tileDist + sub;
}

export function getEnemyCurrentSpeed(enemy: EnemyEntity): number {
  return enemy.slowTimer > 0 ? enemy.baseSpeed * 0.65 : enemy.baseSpeed;
}

function matchesCondition(enemy: EnemyEntity, condition: TargetCondition): boolean {
  switch (condition) {
    case 'Any':
      return true;
    case 'HasShield':
      return enemy.shield > 0.01;
    case 'NotSlowed':
      return enemy.slowTimer <= 0.01;
    case 'NotShredded':
      return enemy.shredTimer <= 0.01;
    case 'HpBelow30Pct':
      return enemy.hp / enemy.maxHp < 0.3;
    case 'HpAbove70Pct':
      return enemy.hp / enemy.maxHp > 0.7;
  }
}

function measureMetric(enemy: EnemyEntity, metric: TargetMetric, flow: FlowFieldData): number {
  switch (metric) {
    case 'DistToGoal':
      return getEnemyDistToGoal(enemy, flow);
    case 'CurrentHp':
      return enemy.hp + enemy.shield;
    case 'MoveSpeed':
      return getEnemyCurrentSpeed(enemy);
  }
}

function selectExtremum(
  candidates: EnemyEntity[],
  metric: TargetMetric,
  order: SortOrder,
  flow: FlowFieldData
): EnemyEntity {
  let best = candidates[0];
  let bestVal = measureMetric(best, metric, flow);

  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const val = measureMetric(c, metric, flow);
    if (order === 'ASC' ? val < bestVal : val > bestVal) {
      best = c;
      bestVal = val;
    }
  }
  return best;
}

/**
 * Evaluates a tower's ordered list of up to 3 TargetRules.
 * Returns the chosen enemy plus the index of the rule that matched (-1 = fallback DistToGoal ASC).
 */
export function evaluateTargeting(
  candidates: EnemyEntity[],
  rules: TargetRule[],
  flow: FlowFieldData
): { target: EnemyEntity | null; ruleIndex: number } {
  if (candidates.length === 0) {
    return { target: null, ruleIndex: -1 };
  }

  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];
    const filtered: EnemyEntity[] = [];
    for (let i = 0; i < candidates.length; i++) {
      if (matchesCondition(candidates[i], rule.condition)) {
        filtered.push(candidates[i]);
      }
    }
    if (filtered.length > 0) {
      return {
        target: selectExtremum(filtered, rule.metric, rule.order, flow),
        ruleIndex: r,
      };
    }
  }

  // Fallback: DistToGoal ASC (closest to exit)
  return {
    target: selectExtremum(candidates, 'DistToGoal', 'ASC', flow),
    ruleIndex: -1,
  };
}
