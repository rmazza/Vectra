import React, { useState } from 'react';
import { COSTS, FLOOR_STATS, MODIFIERS, PAYLOADS, TRIGGERS, isFloorKind } from '../sim/stats';
import { BuildTool, CardinalDir, FloorKind, TowerPreset } from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import {
  Bookmark,
  ChevronUp,
  Grid3x3,
  Info,
  Layers,
  MousePointerClick,
  RotateCw,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';

interface BuildBarProps {
  palette: ThemePalette;
  activeTool: BuildTool;
  conveyorDir: CardinalDir;
  gold: number;
  canEditObstacles: boolean;
  canShuffleBoard: boolean;
  obstacleEditMode: boolean;
  mobileIntelOpen: boolean;
  presets: TowerPreset[];
  activePresetId: string | null;
  onSelectTool: (tool: BuildTool) => void;
  onRotateConveyor: () => void;
  onSelectPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onToggleObstacleEdit: () => void;
  onShuffleBoard: () => void;
  onToggleMobileIntel: () => void;
}

type ToolAccent = 'accent' | 'gold' | 'prism' | 'cryo' | 'ok' | 'neutral';

export const BuildBar: React.FC<BuildBarProps> = ({
  palette,
  activeTool,
  conveyorDir,
  gold,
  canEditObstacles,
  canShuffleBoard,
  obstacleEditMode,
  mobileIntelOpen,
  presets,
  activePresetId,
  onSelectTool,
  onRotateConveyor,
  onSelectPreset,
  onDeletePreset,
  onToggleObstacleEdit,
  onShuffleBoard,
  onToggleMobileIntel,
}) => {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [floorDrawerOpen, setFloorDrawerOpen] = useState(false);

  const activePreset =
    activeTool === 'TOWER' && activePresetId
      ? presets.find((p) => p.id === activePresetId) ?? null
      : null;

  const structureTools: Array<{
    id: BuildTool;
    hotkey: string;
    label: string;
    shortLabel: string;
    cost: number;
    hint: string;
    accent: ToolAccent;
  }> = [
    {
      id: 'TOWER',
      hotkey: '1',
      label: 'Tower',
      shortLabel: 'Tower',
      cost: COSTS.TOWER,
      hint: 'Modular 3-slot turret',
      accent: 'accent',
    },
    {
      id: 'OVERCLOCK',
      hotkey: '2',
      label: 'Overclock',
      shortLabel: 'Clock',
      cost: COSTS.OVERCLOCK,
      hint: '+25% rate to neighbors',
      accent: 'gold',
    },
    {
      id: 'PRISM',
      hotkey: '3',
      label: 'Prism',
      shortLabel: 'Prism',
      cost: COSTS.PRISM,
      hint: 'Splits Beams x2',
      accent: 'prism',
    },
  ];

  const floorTools: Array<{
    id: FloorKind;
    hotkey: string;
    label: string;
    shortLabel: string;
    cost: number;
    hint: string;
    accent: ToolAccent;
  }> = [
    {
      id: 'STASIS',
      hotkey: '4',
      label: 'Stasis',
      shortLabel: 'Stasis',
      cost: COSTS.STASIS,
      hint: `-${Math.round((1 - FLOOR_STATS.STASIS_SLOW_MULT) * 100)}% slow & pull`,
      accent: 'cryo',
    },
    {
      id: 'CONVEYOR',
      hotkey: '5',
      label: 'Repulsor',
      shortLabel: `Push ${conveyorDir}`,
      cost: COSTS.CONVEYOR,
      hint: `Shoves ${conveyorDir} (Q rotate)`,
      accent: 'ok',
    },
    {
      id: 'MINE',
      hotkey: '6',
      label: 'Mine',
      shortLabel: 'Mine',
      cost: COSTS.MINE,
      hint: `${FLOOR_STATS.MINE_BASE_DAMAGE} AoE · ${FLOOR_STATS.MINE_RECHARGE_SEC}s`,
      accent: 'accent',
    },
  ];

  const activeFloorTool = isFloorKind(activeTool)
    ? floorTools.find((f) => f.id === activeTool) ?? null
    : null;

  const getActiveClasses = (accent: ToolAccent) => {
    if (accent === 'accent') {
      return 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]';
    }
    if (accent === 'gold') {
      return 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--text-primary)]';
    }
    if (accent === 'prism') {
      return 'border-[var(--signal-prism)] bg-[var(--signal-prism-soft)] text-[var(--text-primary)]';
    }
    if (accent === 'cryo') {
      return 'border-[var(--pay-cryo)] bg-[var(--accent-soft)] text-[var(--text-primary)]';
    }
    if (accent === 'ok') {
      return 'border-[var(--signal-ok)] bg-[var(--bg-elevated)] text-[var(--text-primary)]';
    }
    return 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]';
  };

  return (
    <div className="relative shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] pb-safe select-none">
      {/* Walkable Floor Tiles Popover Drawer (Mobile & Tablet < lg) */}
      {floorDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-20 lg:hidden"
            onClick={() => setFloorDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Walkable Floor Tiles"
            className="absolute right-2 left-2 bottom-full z-30 mb-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-3 shadow-2xl lg:hidden"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
              <div className="flex flex-col">
                <span
                  className="text-xs font-bold text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Walkable Floor Tiles
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Enemies walk over these — never blocks the maze path
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFloorDrawerOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Close floor tiles"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {floorTools.map((ft) => {
                const isSelected = !obstacleEditMode && activeTool === ft.id;
                const canAfford = gold >= ft.cost;
                return (
                  <div
                    key={ft.id}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected
                        ? getActiveClasses(ft.accent)
                        : 'border-[var(--border-subtle)] bg-[var(--bg-inset)]'
                    } ${!canAfford ? 'opacity-60' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTool(ft.id);
                        setFloorDrawerOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
                    >
                      <ToolVectorGlyph tool={ft.id} palette={palette} conveyorDir={conveyorDir} />
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {ft.id === 'STASIS'
                              ? 'Stasis Pad'
                              : ft.id === 'CONVEYOR'
                              ? 'Vector Repulsor'
                              : 'Pulse Mine'}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-semibold tabular-nums shrink-0 ${
                              canAfford
                                ? 'text-[var(--signal-gold)]'
                                : 'text-[var(--signal-danger)]'
                            }`}
                          >
                            {ft.cost}g
                          </span>
                        </div>
                        <span className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                          {ft.hint}
                        </span>
                      </div>
                    </button>

                    {ft.id === 'CONVEYOR' && (
                      <button
                        type="button"
                        onClick={onRotateConveyor}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2 font-mono text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                        title="Rotate repulsor direction"
                      >
                        <RotateCw className="h-3 w-3 text-[var(--signal-ok)]" />
                        {conveyorDir}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
              <button
                type="button"
                onClick={() => {
                  onSelectTool('INSPECT');
                  setFloorDrawerOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] cursor-pointer"
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                Inspect Mode
              </button>
              <span className="text-[10px] text-[var(--text-muted)]">
                Tap placed tiles to rotate or swap payload
              </span>
            </div>
          </div>
        </>
      )}
      {/* Quick-Buy Tower Presets Popover (Anchored above BuildBar) */}
      {presetsOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setPresetsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Quick-Buy Tower Presets"
            className="absolute right-2 left-2 bottom-full z-30 mb-2 lg:left-4 lg:right-auto lg:w-[440px] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-3 shadow-2xl"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
              <div className="flex flex-col">
                <span
                  className="text-xs font-bold text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Saved Tower Presets
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Instant pre-configured deploy · {COSTS.PRESET_TOWER}g (+{COSTS.PRESET_PREMIUM}g
                  premium)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPresetsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Close presets"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {presets.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                No saved presets yet. Tap any placed Tower and click{' '}
                <span className="font-semibold text-[var(--text-primary)]">Save Preset</span> to
                store its loadout.
              </p>
            ) : (
              <div className="vectra-scroll flex max-h-[240px] flex-col gap-1.5 overflow-y-auto pr-0.5">
                {presets.map((pr) => {
                  const isSelected = activePreset?.id === pr.id && !obstacleEditMode;
                  const canAfford = gold >= pr.cost;
                  return (
                    <div
                      key={pr.id}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] hover:border-[var(--border-strong)]'
                      } ${!canAfford ? 'opacity-60' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPreset(pr.id);
                          setPresetsOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
                      >
                        <PresetVectorGlyph preset={pr} palette={palette} />
                        <div className="flex min-w-0 flex-1 flex-col leading-tight">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                              {pr.name}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold tabular-nums shrink-0 ${
                                canAfford
                                  ? 'text-[var(--signal-gold)]'
                                  : 'text-[var(--signal-danger)]'
                              }`}
                            >
                              {pr.cost}g
                            </span>
                          </div>
                          <span className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                            {TRIGGERS[pr.trigger].label} · {PAYLOADS[pr.payload].label} ·{' '}
                            {MODIFIERS[pr.modifier].label}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeletePreset(pr.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--signal-danger)] cursor-pointer"
                        title={`Delete preset ${pr.name}`}
                        aria-label={`Delete preset ${pr.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile quick-escape to Inspect mode inside drawer */}
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  onSelectTool('INSPECT');
                  setPresetsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] cursor-pointer"
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                Inspect Mode
              </button>
              <span className="text-[10px] text-[var(--text-muted)]">
                Save custom loadouts in Tower Inspector
              </span>
            </div>
          </div>
        </>
      )}

      {/* Mobile & Tablet Thumb-Zone 6-Tab Dock (< lg) */}
      <div className="grid grid-cols-6 items-stretch gap-1 px-1.5 py-1.5 lg:hidden">
        {structureTools.map((t) => {
          const isSelected =
            !obstacleEditMode && !mobileIntelOpen && !activePreset && activeTool === t.id;
          const canAfford = gold >= t.cost;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setPresetsOpen(false);
                setFloorDrawerOpen(false);
                onSelectTool(t.id);
              }}
              className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
                isSelected
                  ? getActiveClasses(t.accent)
                  : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)]'
              } ${!canAfford ? 'opacity-50' : ''}`}
            >
              <ToolVectorGlyph tool={t.id} palette={palette} />
              <span className="text-[10px] font-semibold leading-none whitespace-nowrap">
                {t.shortLabel}
              </span>
              <span
                className={`font-mono text-[10px] leading-none tabular-nums ${
                  canAfford ? 'text-[var(--signal-gold)]' : 'text-[var(--signal-danger)]'
                }`}
              >
                {t.cost}g
              </span>
            </button>
          );
        })}

        {/* 4th Tab: Walkable Floor Tiles Drawer */}
        <button
          type="button"
          onClick={() => {
            setPresetsOpen(false);
            setFloorDrawerOpen((v) => !v);
          }}
          className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
            activeFloorTool || floorDrawerOpen
              ? getActiveClasses(activeFloorTool ? activeFloorTool.accent : 'cryo')
              : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)]'
          }`}
        >
          {activeFloorTool ? (
            <ToolVectorGlyph
              tool={activeFloorTool.id}
              palette={palette}
              conveyorDir={conveyorDir}
            />
          ) : (
            <Layers className="h-4 w-4 text-[var(--pay-cryo)] shrink-0" />
          )}
          <span className="max-w-full truncate text-[10px] font-semibold leading-none">
            {activeFloorTool ? activeFloorTool.shortLabel : 'Floor'}
          </span>
          <span
            className={`font-mono text-[10px] leading-none tabular-nums ${
              activeFloorTool
                ? gold >= activeFloorTool.cost
                  ? 'text-[var(--signal-gold)]'
                  : 'text-[var(--signal-danger)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {activeFloorTool ? `${activeFloorTool.cost}g` : '3 tiles'}
          </span>
        </button>

        {/* 5th Tab: Quick-Buy Presets Drawer */}
        <button
          type="button"
          onClick={() => {
            setFloorDrawerOpen(false);
            setPresetsOpen((v) => !v);
          }}
          className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
            activePreset || presetsOpen
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)]'
          }`}
        >
          {activePreset ? (
            <PresetVectorGlyph preset={activePreset} palette={palette} />
          ) : (
            <Bookmark className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
          )}
          <span className="max-w-full truncate text-[10px] font-semibold leading-none">
            {activePreset ? activePreset.name : 'Presets'}
          </span>
          <span
            className={`font-mono text-[10px] leading-none tabular-nums ${
              activePreset
                ? gold >= activePreset.cost
                  ? 'text-[var(--signal-gold)]'
                  : 'text-[var(--signal-danger)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {activePreset ? `${activePreset.cost}g` : `${presets.length}`}
          </span>
        </button>

        {/* 6th Tab: Wave Intel / Counterplay Drawer */}
        <button
          type="button"
          onClick={() => {
            setPresetsOpen(false);
            setFloorDrawerOpen(false);
            onToggleMobileIntel();
          }}
          className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
            mobileIntelOpen
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)]'
          }`}
        >
          <Info className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
          <span className="text-[10px] font-semibold leading-none whitespace-nowrap">Intel</span>
          <span className="font-mono text-[10px] leading-none text-[var(--text-muted)]">Wave</span>
        </button>
      </div>

      {/* Desktop Full Build Bar (lg+) */}
      <div className="hidden lg:flex h-14 items-center justify-between gap-2 px-3">
        <div className="vectra-scroll flex items-center gap-1.5 min-w-0 overflow-x-auto py-0.5">
          {/* Blocking Maze Structures (1-3) */}
          {structureTools.map((t) => {
            const isSelected = !obstacleEditMode && !activePreset && activeTool === t.id;
            const canAfford = gold >= t.cost;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setPresetsOpen(false);
                  onSelectTool(t.id);
                }}
                title={`${t.label} (${t.cost}g) — ${t.hint} [Key ${t.hotkey}]`}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? getActiveClasses(t.accent)
                    : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                } ${!canAfford ? 'opacity-55' : ''}`}
              >
                <ToolVectorGlyph tool={t.id} palette={palette} />

                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">{t.label}</span>
                    <span
                      className={`font-mono text-[11px] font-semibold tabular-nums ${
                        canAfford ? 'text-[var(--signal-gold)]' : 'text-[var(--signal-danger)]'
                      }`}
                    >
                      {t.cost}g
                    </span>
                  </div>
                  <span className="hidden 2xl:inline text-[10px] text-[var(--text-muted)]">
                    {t.hint}
                  </span>
                </div>

                <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {t.hotkey}
                </kbd>
              </button>
            );
          })}

          <div className="mx-0.5 h-7 w-px shrink-0 bg-[var(--border-subtle)]" aria-hidden="true" />

          {/* Walkable Tactical Floor Tiles (4-6) */}
          {floorTools.map((ft) => {
            const isSelected = !obstacleEditMode && !activePreset && activeTool === ft.id;
            const canAfford = gold >= ft.cost;

            return (
              <div key={ft.id} className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPresetsOpen(false);
                    onSelectTool(ft.id);
                  }}
                  title={`Walkable Floor: ${ft.label} (${ft.cost}g) — ${ft.hint} [Key ${ft.hotkey}]`}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? getActiveClasses(ft.accent)
                      : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  } ${!canAfford ? 'opacity-55' : ''}`}
                >
                  <ToolVectorGlyph tool={ft.id} palette={palette} conveyorDir={conveyorDir} />

                  <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{ft.label}</span>
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums ${
                          canAfford ? 'text-[var(--signal-gold)]' : 'text-[var(--signal-danger)]'
                        }`}
                      >
                        {ft.cost}g
                      </span>
                    </div>
                    <span className="hidden 2xl:inline text-[10px] text-[var(--text-muted)]">
                      {ft.hint}
                    </span>
                  </div>

                  <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                    {ft.hotkey}
                  </kbd>
                </button>

                {ft.id === 'CONVEYOR' && isSelected && (
                  <button
                    type="button"
                    onClick={onRotateConveyor}
                    title="Rotate Vector Repulsor direction (Key Q)"
                    className="flex h-[34px] items-center gap-1 rounded-md border border-[var(--signal-ok)]/60 bg-[var(--bg-elevated)] px-1.5 font-mono text-[11px] font-semibold text-[var(--text-primary)] hover:border-[var(--signal-ok)] cursor-pointer"
                  >
                    <RotateCw className="h-3 w-3 text-[var(--signal-ok)]" />
                    <span>{conveyorDir}</span>
                    <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1 py-0.25 text-[9px] text-[var(--text-muted)]">
                      Q
                    </kbd>
                  </button>
                )}
              </div>
            );
          })}

          <div className="mx-0.5 h-7 w-px shrink-0 bg-[var(--border-subtle)]" aria-hidden="true" />

          {/* Desktop Quick-Buy Presets Button */}
          <button
            type="button"
            onClick={() => setPresetsOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              activePreset || presetsOpen
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            title="Quick-buy saved tower loadouts (Hotkey 7)"
          >
            {activePreset ? (
              <PresetVectorGlyph preset={activePreset} palette={palette} />
            ) : (
              <Bookmark className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
            )}

            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1">
                <span className="max-w-[92px] truncate text-xs font-semibold">
                  {activePreset ? activePreset.name : 'Presets'}
                </span>
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    activePreset
                      ? gold >= activePreset.cost
                        ? 'text-[var(--signal-gold)]'
                        : 'text-[var(--signal-danger)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {activePreset ? `${activePreset.cost}g` : `(${presets.length})`}
                </span>
              </div>
              <span className="hidden 2xl:inline text-[10px] text-[var(--text-muted)]">
                {activePreset
                  ? `${TRIGGERS[activePreset.trigger].label} · ${PAYLOADS[activePreset.payload].label}`
                  : `Quick-buy · ${COSTS.PRESET_TOWER}g`}
              </span>
            </div>

            <ChevronUp
              className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${
                presetsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Inspect Mode */}
          <button
            type="button"
            onClick={() => {
              setPresetsOpen(false);
              onSelectTool('INSPECT');
            }}
            title="Inspect & configure placed structures (Esc)"
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              !obstacleEditMode && !activePreset && activeTool === 'INSPECT'
                ? getActiveClasses('neutral')
                : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ToolVectorGlyph tool="INSPECT" palette={palette} />
            <span className="text-xs font-semibold">Inspect</span>
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
              Esc
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canShuffleBoard && (
            <button
              type="button"
              onClick={() => {
                setPresetsOpen(false);
                onShuffleBoard();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--text-primary)] active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer"
              title="Randomize obstacles, spawn, and goal before Wave 1 (Key S)"
            >
              <Shuffle className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              <span className="hidden xl:inline">Shuffle</span>
            </button>
          )}
          {canEditObstacles && (
            <button
              type="button"
              onClick={() => {
                setPresetsOpen(false);
                onToggleObstacleEdit();
              }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                obstacleEditMode
                  ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              title="Click grid tiles to add/remove static obstacles before Wave 1"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              <span>{obstacleEditMode ? 'Done' : 'Edit Walls'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PresetVectorGlyph: React.FC<{ preset: TowerPreset; palette: ThemePalette }> = ({
  preset,
  palette,
}) => {
  const trigColor = palette.triggers[preset.trigger];
  const payColor = palette.payloads[preset.payload];
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
      <polygon
        points="5,3 19,3 21,5 21,19 19,21 5,21 3,19 3,5"
        fill={palette.towerBodyMid}
        stroke={trigColor}
        strokeWidth="1.7"
      />
      {preset.trigger === 'NOVA' ? (
        <circle cx="12" cy="12" r="5.5" fill="none" stroke={trigColor} strokeWidth="1.5" />
      ) : preset.trigger === 'BEAM' ? (
        <polygon
          points="20,12 10,8.5 12,12 10,15.5"
          fill={palette.towerBarrelFill}
          stroke={trigColor}
          strokeWidth="1.3"
        />
      ) : (
        <rect
          x="11"
          y="10"
          width="9"
          height="4"
          fill={palette.towerBarrelFill}
          stroke={trigColor}
          strokeWidth="1.3"
        />
      )}
      {preset.payload === 'CRYO' ? (
        <polygon points="12,8 15.5,10 15.5,14 12,16 8.5,14 8.5,10" fill={payColor} />
      ) : preset.payload === 'CORRODE' ? (
        <polygon points="12,8 16,15 8,15" fill={payColor} />
      ) : (
        <polygon points="12,8 16,12 12,16 8,12" fill={payColor} />
      )}
    </svg>
  );
};

const ToolVectorGlyph: React.FC<{
  tool: BuildTool;
  palette: ThemePalette;
  conveyorDir?: CardinalDir;
}> = ({ tool, palette, conveyorDir = 'N' }) => {
  if (tool === 'INSPECT') {
    return <MousePointerClick className="h-4 w-4 text-[var(--text-muted)] shrink-0" />;
  }
  if (tool === 'TOWER') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
        <polygon
          points="5,3 19,3 21,5 21,19 19,21 5,21 3,19 3,5"
          fill={palette.towerBodyMid}
          stroke={palette.triggers.PULSE}
          strokeWidth="1.6"
        />
        <rect
          x="11"
          y="10"
          width="9"
          height="4"
          fill={palette.towerBarrelFill}
          stroke={palette.triggers.PULSE}
          strokeWidth="1.4"
        />
        <polygon points="12,8 16,12 12,16 8,12" fill={palette.payloads.KINETIC} />
      </svg>
    );
  }
  if (tool === 'OVERCLOCK') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
        <polygon
          points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8"
          fill={palette.overclockBodyTop}
          stroke={palette.overclock}
          strokeWidth="1.6"
        />
        <line x1="7" y1="12" x2="17" y2="12" stroke={palette.overclockLight} strokeWidth="1.8" />
        <line x1="12" y1="7" x2="12" y2="17" stroke={palette.overclockLight} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.2" fill={palette.overclock} />
      </svg>
    );
  }
  if (tool === 'PRISM') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
        <polygon
          points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"
          fill={palette.prismBodyTop}
          stroke={palette.prism}
          strokeWidth="1.6"
        />
        <polygon
          points="12,6.5 17,15.5 7,15.5"
          fill={`rgba(${palette.prismFloorRgb}, 0.28)`}
          stroke={palette.prismLight}
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12.5" r="1.6" fill={palette.prismCore} />
      </svg>
    );
  }
  if (tool === 'STASIS') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
        <polygon
          points="6,3 18,3 21,6 21,18 18,21 6,21 3,18 3,6"
          fill={palette.towerSocketFill}
          stroke={palette.payloads.CRYO}
          strokeWidth="1.5"
        />
        <circle
          cx="12"
          cy="12"
          r="6.2"
          fill="none"
          stroke={palette.payloads.CRYO}
          strokeWidth="1.5"
          strokeDasharray="3 2.5"
        />
        <circle
          cx="12"
          cy="12"
          r="3.2"
          fill="none"
          stroke={palette.prism}
          strokeWidth="1.3"
        />
        <circle cx="12" cy="12" r="1.6" fill={palette.payloads.CRYO} />
      </svg>
    );
  }
  if (tool === 'CONVEYOR') {
    const rot =
      conveyorDir === 'N' ? -90 : conveyorDir === 'S' ? 90 : conveyorDir === 'W' ? 180 : 0;
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          fill={palette.towerSocketFill}
          stroke={palette.validColor}
          strokeWidth="1.5"
        />
        <g transform={`rotate(${rot} 12 12)`}>
          <polyline
            points="7.5,7.5 11.5,12 7.5,16.5"
            fill="none"
            stroke={palette.validColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="13,7.5 17,12 13,16.5"
            fill="none"
            stroke={palette.validColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }
  // MINE
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" aria-hidden="true">
      <polygon
        points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8"
        fill={palette.towerSocketFill}
        stroke={palette.payloads.KINETIC}
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="6.2"
        fill="none"
        stroke={palette.payloads.KINETIC}
        strokeWidth="1.2"
        strokeDasharray="2.5 2.5"
      />
      <polygon points="12,7.5 16.5,12 12,16.5 7.5,12" fill={palette.payloads.KINETIC} />
    </svg>
  );
};
