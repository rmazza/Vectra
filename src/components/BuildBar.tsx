import React, { useState } from 'react';
import { COSTS, MODIFIERS, PAYLOADS, TRIGGERS } from '../sim/stats';
import { BuildTool, TowerPreset } from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import {
  Bookmark,
  ChevronUp,
  Grid3x3,
  Info,
  MousePointerClick,
  Trash2,
  X,
} from 'lucide-react';

interface BuildBarProps {
  palette: ThemePalette;
  activeTool: BuildTool;
  gold: number;
  canEditObstacles: boolean;
  obstacleEditMode: boolean;
  mobileIntelOpen: boolean;
  presets: TowerPreset[];
  activePresetId: string | null;
  onSelectTool: (tool: BuildTool) => void;
  onSelectPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onToggleObstacleEdit: () => void;
  onToggleMobileIntel: () => void;
}

export const BuildBar: React.FC<BuildBarProps> = ({
  palette,
  activeTool,
  gold,
  canEditObstacles,
  obstacleEditMode,
  mobileIntelOpen,
  presets,
  activePresetId,
  onSelectTool,
  onSelectPreset,
  onDeletePreset,
  onToggleObstacleEdit,
  onToggleMobileIntel,
}) => {
  const [presetsOpen, setPresetsOpen] = useState(false);

  const activePreset =
    activeTool === 'TOWER' && activePresetId
      ? presets.find((p) => p.id === activePresetId) ?? null
      : null;

  const tools: Array<{
    id: BuildTool;
    hotkey: string;
    label: string;
    shortLabel: string;
    cost?: number;
    hint: string;
    accent: 'accent' | 'gold' | 'prism' | 'neutral';
  }> = [
    {
      id: 'TOWER',
      hotkey: '1',
      label: 'Tower Chassis',
      shortLabel: 'Tower',
      cost: COSTS.TOWER,
      hint: 'Modular 3-slot turret',
      accent: 'accent',
    },
    {
      id: 'OVERCLOCK',
      hotkey: '2',
      label: 'Overclock Node',
      shortLabel: 'Clock',
      cost: COSTS.OVERCLOCK,
      hint: '+25% rate to 4 neighbors',
      accent: 'gold',
    },
    {
      id: 'PRISM',
      hotkey: '3',
      label: 'Prism Node',
      shortLabel: 'Prism',
      cost: COSTS.PRISM,
      hint: 'Splits Beams x2 (3.0 rng)',
      accent: 'prism',
    },
    {
      id: 'INSPECT',
      hotkey: 'Esc',
      label: 'Inspect',
      shortLabel: 'Select',
      hint: 'Select & configure',
      accent: 'neutral',
    },
  ];

  const getActiveClasses = (accent: 'accent' | 'gold' | 'prism' | 'neutral') => {
    if (accent === 'accent') {
      return 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]';
    }
    if (accent === 'gold') {
      return 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--text-primary)]';
    }
    if (accent === 'prism') {
      return 'border-[var(--signal-prism)] bg-[var(--signal-prism-soft)] text-[var(--text-primary)]';
    }
    return 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]';
  };

  return (
    <div className="relative shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] pb-safe select-none">
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

      {/* Mobile & Tablet Thumb-Zone 5-Tab Dock (< lg) */}
      <div className="grid grid-cols-5 items-stretch gap-1 px-1.5 py-1.5 lg:hidden">
        {tools.slice(0, 3).map((t) => {
          const isSelected =
            !obstacleEditMode && !mobileIntelOpen && !activePreset && activeTool === t.id;
          const canAfford = t.cost === undefined || gold >= t.cost;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setPresetsOpen(false);
                onSelectTool(t.id);
              }}
              className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
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
                  t.cost === undefined
                    ? 'text-[var(--text-muted)]'
                    : canAfford
                    ? 'text-[var(--signal-gold)]'
                    : 'text-[var(--signal-danger)]'
                }`}
              >
                {t.cost !== undefined ? `${t.cost}g` : 'Tap'}
              </span>
            </button>
          );
        })}

        {/* 4th Tab: Quick-Buy Presets Drawer */}
        <button
          type="button"
          onClick={() => setPresetsOpen((v) => !v)}
          className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
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
            {activePreset ? `${activePreset.cost}g` : `${presets.length} saved`}
          </span>
        </button>

        {/* 5th Tab: Wave Intel / Counterplay Drawer */}
        <button
          type="button"
          onClick={() => {
            setPresetsOpen(false);
            onToggleMobileIntel();
          }}
          className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 transition-colors active:scale-[0.97] cursor-pointer ${
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
      <div className="hidden lg:flex h-14 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2 min-w-0">
          {tools.map((t) => {
            const isSelected = !obstacleEditMode && !activePreset && activeTool === t.id;
            const canAfford = t.cost === undefined || gold >= t.cost;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setPresetsOpen(false);
                  onSelectTool(t.id);
                }}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? getActiveClasses(t.accent)
                    : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                } ${!canAfford ? 'opacity-55' : ''}`}
              >
                <ToolVectorGlyph tool={t.id} palette={palette} />

                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">{t.label}</span>
                    {t.cost !== undefined && (
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums ${
                          canAfford ? 'text-[var(--signal-gold)]' : 'text-[var(--signal-danger)]'
                        }`}
                      >
                        {t.cost}g
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline text-[11px] text-[var(--text-muted)]">
                    {t.hint}
                  </span>
                </div>

                <kbd className="ml-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {t.hotkey}
                </kbd>
              </button>
            );
          })}

          {/* Desktop Quick-Buy Presets Button */}
          <button
            type="button"
            onClick={() => setPresetsOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              activePreset || presetsOpen
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            title="Quick-buy saved tower loadouts (Hotkey 4)"
          >
            {activePreset ? (
              <PresetVectorGlyph preset={activePreset} palette={palette} />
            ) : (
              <Bookmark className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
            )}

            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="max-w-[104px] truncate text-xs font-semibold">
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
              <span className="hidden xl:inline text-[11px] text-[var(--text-muted)]">
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
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {canEditObstacles && (
            <button
              type="button"
              onClick={() => {
                setPresetsOpen(false);
                onToggleObstacleEdit();
              }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                obstacleEditMode
                  ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              title="Click grid tiles to add/remove static obstacles before Wave 1"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              <span>{obstacleEditMode ? 'Done Editing' : 'Edit Walls'}</span>
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

const ToolVectorGlyph: React.FC<{ tool: BuildTool; palette: ThemePalette }> = ({
  tool,
  palette,
}) => {
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
};
