import React, { useState } from 'react';
import {
  COSTS,
  ENEMY_ARCHETYPES,
  MODIFIERS,
  PAYLOADS,
  PRISM_RADIUS,
  TRIGGERS,
} from '../sim/stats';
import {
  CONDITION_OPTIONS,
  METRIC_OPTIONS,
  TARGETING_PRESETS,
  createRule,
} from '../sim/targeting';
import {
  HudSnapshot,
  ModifierType,
  PayloadType,
  SortOrder,
  TargetCondition,
  TargetMetric,
  TargetRule,
  TowerEntity,
  TriggerType,
} from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import { ArrowDown, ArrowUp, BookmarkPlus, Check, Plus, Trash2, X } from 'lucide-react';

interface InspectorPanelProps {
  hud: HudSnapshot;
  palette: ThemePalette;
  mobileSheetOpen: boolean;
  onUpdateModule: (
    towerId: string,
    slot: 'trigger' | 'payload' | 'modifier',
    val: TriggerType | PayloadType | ModifierType
  ) => void;
  onSetRules: (towerId: string, rules: TargetRule[]) => void;
  onSell: (entityId: string) => void;
  onSavePreset: (input: {
    name: string;
    trigger: TriggerType;
    payload: PayloadType;
    modifier: ModifierType;
  }) => Promise<void>;
  onCloseSelection: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  hud,
  palette,
  mobileSheetOpen,
  onUpdateModule,
  onSetRules,
  onSell,
  onSavePreset,
  onCloseSelection,
}) => {
  const content = (
    <InspectorBody
      hud={hud}
      palette={palette}
      onUpdateModule={onUpdateModule}
      onSetRules={onSetRules}
      onSell={onSell}
      onSavePreset={onSavePreset}
      onCloseSelection={onCloseSelection}
    />
  );

  return (
    <>
      {/* Desktop Fixed Right Dock (lg+) */}
      <aside className="vectra-scroll hidden lg:flex w-[336px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
        {content}
      </aside>

      {/* Mobile / Tablet Slide-Up Bottom Sheet (< lg) */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden">
          <div
            className="absolute inset-0 bg-[var(--bg-scrim)]"
            onClick={onCloseSelection}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-label="Inspector"
            className="relative z-10 flex max-h-[76dvh] w-full flex-col rounded-t-2xl border-t border-[var(--border-strong)] bg-[var(--bg-panel)] pb-safe shadow-2xl"
          >
            {/* Drag Handle */}
            <div className="flex shrink-0 items-center justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
            </div>

            <div className="vectra-scroll flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-2 pb-6">
              {content}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

interface InspectorBodyProps {
  hud: HudSnapshot;
  palette: ThemePalette;
  onUpdateModule: InspectorPanelProps['onUpdateModule'];
  onSetRules: InspectorPanelProps['onSetRules'];
  onSell: InspectorPanelProps['onSell'];
  onSavePreset: InspectorPanelProps['onSavePreset'];
  onCloseSelection: InspectorPanelProps['onCloseSelection'];
}

const InspectorBody: React.FC<InspectorBodyProps> = ({
  hud,
  palette,
  onUpdateModule,
  onSetRules,
  onSell,
  onSavePreset,
  onCloseSelection,
}) => {
  const [savingOpen, setSavingOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetSavedFlash, setPresetSavedFlash] = useState(false);
  const ent = hud.selectedEntity;

  if (!ent) {
    return (
      <>
        <section className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2
                className="text-sm font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {hud.nextWaveSummary
                  ? `Wave ${hud.nextWaveSummary.waveNumber}: ${hud.nextWaveSummary.name}`
                  : 'All Waves Complete'}
              </h2>
              {hud.nextWaveSummary && (
                <span className="font-mono text-xs text-[var(--signal-ok)] tabular-nums">
                  +{hud.nextWaveSummary.clearBonus}g clear bonus
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onCloseSelection}
              className="flex lg:hidden h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Close intel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hud.nextWaveSummary && (
            <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
              {(['SWARM', 'ARMOR', 'SHIELDED'] as const).map((type) => {
                const count = hud.nextWaveSummary!.counts[type];
                if (count === 0) return null;
                const cfg = ENEMY_ARCHETYPES[type];
                return (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <EnemyMiniGlyph type={type} palette={palette} />
                      <span className="font-medium text-[var(--text-secondary)]">{cfg.label}</span>
                    </div>
                    <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                      x{count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5">
          <h3 className="text-xs font-semibold text-[var(--text-muted)]">Enemy Archetypes</h3>
          <div className="flex flex-col gap-3.5">
            {(['SWARM', 'ARMOR', 'SHIELDED'] as const).map((type) => {
              const cfg = ENEMY_ARCHETYPES[type];
              return (
                <div key={type} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <EnemyMiniGlyph type={type} palette={palette} />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">·</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                      {type === 'SWARM'
                        ? 'Fast pack'
                        : type === 'ARMOR'
                        ? '-5 flat armor'
                        : '100% shield · 3s regen'}
                    </span>
                  </div>
                  <p className="pl-6 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Counter: {cfg.counterHint}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-[var(--border-subtle)] pt-5">
          <h3 className="text-xs font-semibold text-[var(--text-muted)]">Adjacency Nodes</h3>
          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            <p>
              <span className="font-semibold text-[var(--signal-gold)]">Overclock:</span> Grants
              +25% fire rate to all 4 orthogonal neighbors (non-stacking).
            </p>
            <p>
              <span className="font-semibold text-[var(--signal-prism-text)]">Prism:</span> Any
              Beam tower in range relays through Prism, splitting into 2 beams at 70% dmg inside a{' '}
              {PRISM_RADIUS.toFixed(1)}-tile radius.
            </p>
          </div>
        </section>

        <div className="mt-auto border-t border-[var(--border-subtle)] pt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
          Tap any placed Tower or Node on the grid to hot-swap modules (free between waves) and
          edit targeting rules.
        </div>
      </>
    );
  }

  // Utility Node Inspector
  if (ent.kind === 'OVERCLOCK' || ent.kind === 'PRISM') {
    const fullRefund = !hud.waveActive && ent.placedInWave === -1;
    const refund = fullRefund ? ent.investedGold : Math.round(ent.investedGold * 0.8);
    const isPrism = ent.kind === 'PRISM';

    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              className={`text-base font-bold ${
                isPrism ? 'text-[var(--signal-prism-text)]' : 'text-[var(--signal-gold)]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isPrism ? 'Prism Node' : 'Overclock Node'}
            </h2>
            <p className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
              Grid ({ent.x}, {ent.y}) · Maze Wall
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseSelection}
            className="flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Close inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {isPrism
            ? `Pairs with Beam Trigger towers within 3.5 tiles. Refracts incoming Beams into 2 synchronized beams at 70% damage each (140% net DPS) inside a ${PRISM_RADIUS.toFixed(1)}-tile radius, or extends single-target reach around corners.`
            : 'Accelerates all 4 orthogonally adjacent towers by +25% fire rate (non-stacking per node type).'}
        </p>

        <div className="grid grid-cols-2 gap-3 border-y border-[var(--border-subtle)] py-4 font-mono tabular-nums">
          {isPrism ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-[11px] text-[var(--text-muted)]">Linked Beams</span>
                <span
                  className={`text-base font-semibold ${
                    (hud.selectedPrismLinks?.sourceTowers ?? 0) > 0
                      ? 'text-[var(--signal-prism-text)]'
                      : 'text-[var(--signal-gold)]'
                  }`}
                >
                  {hud.selectedPrismLinks?.sourceTowers ?? 0}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-[11px] text-[var(--text-muted)]">Split Radius</span>
                <span className="text-base font-semibold text-[var(--text-primary)]">
                  {PRISM_RADIUS.toFixed(1)} tiles
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-[11px] text-[var(--text-muted)]">
                  Boosted Towers
                </span>
                <span className="text-base font-semibold text-[var(--signal-gold)]">
                  {hud.selectedOverclockTargets} / 4
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-[11px] text-[var(--text-muted)]">Rate Bonus</span>
                <span className="text-base font-semibold text-[var(--text-primary)]">+25%</span>
              </div>
            </>
          )}
        </div>

        {/* Actionable guidance when a Prism has no Beam towers linked yet */}
        {isPrism && (hud.selectedPrismLinks?.sourceTowers ?? 0) === 0 && (
          <div className="flex flex-col gap-2.5 rounded-md border border-[var(--signal-prism)]/40 bg-[var(--signal-prism-soft)] p-3">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              No Beam towers linked yet. Prisms only refract towers using the{' '}
              <span className="font-semibold text-[var(--text-primary)]">Beam</span> Trigger within
              3.5 tiles (towers start as Pulse).
            </p>
            {hud.selectedPrismLinks && hud.selectedPrismLinks.nearbyNonBeamTowers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  Quick-convert a nearby tower
                  {hud.waveActive ? ` (${COSTS.MID_WAVE_SWAP}g)` : ' (free)'}:
                </span>
                {hud.selectedPrismLinks.nearbyNonBeamTowers.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateModule(t.id, 'trigger', 'BEAM')}
                    className="flex min-h-[38px] items-center justify-between rounded border border-[var(--signal-prism)]/55 bg-[var(--bg-inset)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--signal-prism)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                  >
                    <span className="font-mono">
                      Tower ({t.x}, {t.y}) · {TRIGGERS[t.trigger].label}
                    </span>
                    <span className="text-[var(--signal-prism-text)]">Set Beam →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onSell(ent.id)}
          className="mt-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[var(--signal-danger)]/45 bg-[var(--signal-danger-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--signal-danger-text)] transition-colors duration-150 hover:border-[var(--signal-danger)] cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Sell Node (+{refund}g{fullRefund ? ' · 100%' : ''})
        </button>
      </>
    );
  }

  // Modular Tower Inspector
  const tower = ent as TowerEntity;
  const stats = hud.selectedStats;
  const fullRefund = !hud.waveActive && tower.placedInWave === -1;
  const refund = fullRefund ? tower.investedGold : Math.round(tower.investedGold * 0.8);
  const swapFee = hud.waveActive ? COSTS.MID_WAVE_SWAP : 0;

  const handleAddRule = () => {
    if (tower.rules.length >= 3) return;
    onSetRules(tower.id, [...tower.rules, createRule('HasShield', 'DistToGoal', 'ASC')]);
  };

  const handleUpdateRule = (index: number, patch: Partial<TargetRule>) => {
    const next = tower.rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onSetRules(tower.id, next);
  };

  const handleMoveRule = (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= tower.rules.length) return;
    const next = [...tower.rules];
    const tmp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = tmp;
    onSetRules(tower.id, next);
  };

  const handleDeleteRule = (index: number) => {
    onSetRules(
      tower.id,
      tower.rules.filter((_, i) => i !== index)
    );
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = TARGETING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onSetRules(
      tower.id,
      preset.rules.map((r) => createRule(r.condition, r.metric, r.order))
    );
  };

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2
            className="text-base font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tower ({tower.x}, {tower.y})
          </h2>
          <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
            <span>{tower.kills} kills</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round(tower.totalDamage)} dmg</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseSelection}
          className="flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Close inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {stats && (
        <div className="flex flex-col gap-2 border-y border-[var(--border-subtle)] py-3">
          <div className="grid grid-cols-4 gap-2 font-mono tabular-nums">
            <div className="flex flex-col">
              <span className="font-sans text-[11px] text-[var(--text-muted)]">DMG</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {stats.damage.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-[11px] text-[var(--text-muted)]">Rate</span>
              <span
                className={`text-sm font-semibold ${
                  stats.overclocked ? 'text-[var(--signal-gold)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {stats.fireRate.toFixed(2)}/s
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-[11px] text-[var(--text-muted)]">Range</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {(tower.trigger === 'NOVA' && tower.modifier === 'PIERCE'
                  ? stats.range + 0.55
                  : stats.range
                ).toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-[11px] text-[var(--text-muted)]">DPS</span>
              <span className="text-sm font-semibold text-[var(--accent-text)]">
                {stats.dps.toFixed(1)}
              </span>
            </div>
          </div>

          {(tower.trigger === 'BEAM' || stats.overclocked || stats.prismRelays.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono">
              {tower.trigger === 'BEAM' && (
                <span className="text-[var(--signal-danger-text)] tabular-nums">
                  3x Ramp: {stats.maxRampDps.toFixed(0)} DPS
                </span>
              )}
              {stats.overclocked && (
                <span className="text-[var(--signal-gold)]">Overclock +25%</span>
              )}
              {stats.prismRelays.length > 0 && (
                <span className="text-[var(--signal-prism-text)]">
                  Prism Relay ({stats.prismRelays.length})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modular Slots */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Modular Loadout</h3>
          <span
            className={`font-mono text-[11px] ${
              swapFee > 0 && hud.gold < swapFee
                ? 'font-semibold text-[var(--signal-danger)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {swapFee === 0
              ? 'Free swap'
              : hud.gold < swapFee
              ? `Need ${swapFee}g to swap`
              : `${swapFee}g mid-wave swap`}
          </span>
        </div>

        {/* Trigger */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Trigger</span>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-1">
            {(['PULSE', 'BEAM', 'NOVA'] as const).map((t) => {
              const active = tower.trigger === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdateModule(tower.id, 'trigger', t)}
                  className={`min-h-[40px] lg:min-h-0 rounded px-2 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[var(--bg-elevated)] text-[var(--accent-text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {TRIGGERS[t].label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            {TRIGGERS[tower.trigger].shortDesc}
          </span>
        </div>

        {/* Payload */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Payload</span>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-1">
            {(['KINETIC', 'CRYO', 'CORRODE'] as const).map((p) => {
              const active = tower.payload === p;
              const activeText =
                p === 'KINETIC'
                  ? 'text-[var(--pay-kinetic)]'
                  : p === 'CRYO'
                  ? 'text-[var(--pay-cryo)]'
                  : 'text-[var(--pay-corrode)]';
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdateModule(tower.id, 'payload', p)}
                  className={`min-h-[40px] lg:min-h-0 rounded px-2 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                    active
                      ? `bg-[var(--bg-elevated)] ${activeText}`
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {PAYLOADS[p].label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            {PAYLOADS[tower.payload].shortDesc}
          </span>
        </div>

        {/* Modifier */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Modifier</span>
          <div className="grid grid-cols-4 gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-1">
            {(['NONE', 'CHAIN', 'PIERCE', 'SPLASH'] as const).map((m) => {
              const active = tower.modifier === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdateModule(tower.id, 'modifier', m)}
                  className={`min-h-[40px] lg:min-h-0 rounded px-1.5 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {MODIFIERS[m].label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            {MODIFIERS[tower.modifier].shortDesc}
          </span>
        </div>

        {/* Save Tower Loadout as Quick-Buy Preset (SQLite) */}
        <div className="pt-1">
          {!savingOpen ? (
            <button
              type="button"
              onClick={() => {
                const defaultName = `${TRIGGERS[tower.trigger].label} ${PAYLOADS[tower.payload].label}`;
                setPresetName(defaultName);
                setSavingOpen(true);
              }}
              className="flex min-h-[36px] w-full items-center justify-between rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                {presetSavedFlash ? (
                  <Check className="h-3.5 w-3.5 text-[var(--signal-ok)]" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5 text-[var(--accent-text)]" />
                )}
                {presetSavedFlash ? 'Saved to Quick-Buy Presets' : 'Save Loadout Preset'}
              </span>
              <span className="font-mono text-[11px] text-[var(--signal-gold)] tabular-nums">
                {COSTS.PRESET_TOWER}g
              </span>
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = presetName.trim();
                if (!trimmed) return;
                await onSavePreset({
                  name: trimmed,
                  trigger: tower.trigger,
                  payload: tower.payload,
                  modifier: tower.modifier,
                });
                setSavingOpen(false);
                setPresetSavedFlash(true);
                setTimeout(() => setPresetSavedFlash(false), 2000);
              }}
              className="flex flex-col gap-2 rounded-md border border-[var(--accent)]/60 bg-[var(--bg-inset)] p-2.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-[var(--text-secondary)]">Preset Name</span>
                <span className="font-mono text-[var(--signal-gold)]">
                  Quick-buy: {COSTS.PRESET_TOWER}g (+{COSTS.PRESET_PREMIUM}g)
                </span>
              </div>
              <input
                type="text"
                maxLength={28}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Armor Melter"
                autoFocus
                className="min-h-[34px] w-full rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setSavingOpen(false)}
                  className="rounded border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!presetName.trim()}
                  className="rounded bg-[var(--accent)] px-3 py-1 text-[11px] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-40 cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Targeting Logic Stack */}
      <section className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Targeting Rules</h3>
          <button
            type="button"
            onClick={handleAddRule}
            disabled={tower.rules.length >= 3}
            className="inline-flex min-h-[34px] items-center gap-1 rounded border border-[var(--border-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add ({tower.rules.length}/3)
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TARGETING_PRESETS.map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => handleApplyPreset(pr.id)}
              className="min-h-[34px] lg:min-h-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {tower.rules.map((rule, idx) => {
            const isFiring = hud.waveActive && tower.lastRuleIndex === idx;
            const metricInfo = METRIC_OPTIONS.find((m) => m.value === rule.metric)!;
            return (
              <div
                key={rule.id}
                className={`flex flex-col gap-2 rounded-md border p-2.5 transition-colors ${
                  isFiring
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-inset)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)]">
                    {idx + 1}. IF
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveRule(idx, -1)}
                      disabled={idx === 0}
                      className="flex h-8 w-8 lg:h-6 lg:w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                      aria-label="Move rule up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveRule(idx, 1)}
                      disabled={idx === tower.rules.length - 1}
                      className="flex h-8 w-8 lg:h-6 lg:w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                      aria-label="Move rule down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(idx)}
                      className="flex h-8 w-8 lg:h-6 lg:w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--signal-danger)] cursor-pointer"
                      aria-label="Remove rule"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <select
                  value={rule.condition}
                  onChange={(e) =>
                    handleUpdateRule(idx, { condition: e.target.value as TargetCondition })
                  }
                  className="min-h-[38px] lg:min-h-0 w-full rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={rule.metric}
                    onChange={(e) =>
                      handleUpdateRule(idx, { metric: e.target.value as TargetMetric })
                    }
                    className="min-h-[38px] lg:min-h-0 rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {METRIC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.order}
                    onChange={(e) =>
                      handleUpdateRule(idx, { order: e.target.value as SortOrder })
                    }
                    className="min-h-[38px] lg:min-h-0 rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2 py-1.5 text-xs text-[var(--accent-text)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="ASC">{metricInfo.ascLabel}</option>
                    <option value="DESC">{metricInfo.descLabel}</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <p className="font-mono text-[11px] text-[var(--text-muted)]">
          Fallback: Closest to Goal (DistToGoal ASC)
        </p>
      </section>

      <button
        type="button"
        onClick={() => onSell(tower.id)}
        className="mt-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[var(--signal-danger)]/45 bg-[var(--signal-danger-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--signal-danger-text)] transition-colors duration-150 hover:border-[var(--signal-danger)] cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Sell Tower (+{refund}g{fullRefund ? ' · 100%' : ''})
      </button>
    </>
  );
};

const EnemyMiniGlyph: React.FC<{
  type: 'SWARM' | 'ARMOR' | 'SHIELDED';
  palette: ThemePalette;
}> = ({ type, palette }) => {
  if (type === 'SWARM') {
    return (
      <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden="true">
        <polygon points="15,9 4,3 7,9 4,15" fill={palette.enemies.SWARM} />
      </svg>
    );
  }
  if (type === 'ARMOR') {
    return (
      <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden="true">
        <polygon
          points="9,2 15,5.5 15,12.5 9,16 3,12.5 3,5.5"
          fill={palette.enemyArmorFill}
          stroke={palette.enemies.ARMOR}
          strokeWidth="2"
        />
        <circle cx="9" cy="9" r="2.5" fill={palette.enemyArmorCore} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle
        cx="9"
        cy="9"
        r="7.2"
        fill={palette.shieldGlow}
        stroke={palette.shieldColor}
        strokeWidth="1.4"
      />
      <polygon
        points="9,4 14,9 9,14 4,9"
        fill={palette.enemyShieldedFill}
        stroke={palette.enemies.SHIELDED}
        strokeWidth="1.5"
      />
    </svg>
  );
};
