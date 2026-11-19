import React from 'react';
import { COSTS } from '../sim/stats';
import { BuildTool } from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import { Grid3x3, Info, MousePointerClick } from 'lucide-react';

interface BuildBarProps {
  palette: ThemePalette;
  activeTool: BuildTool;
  gold: number;
  canEditObstacles: boolean;
  obstacleEditMode: boolean;
  mobileIntelOpen: boolean;
  onSelectTool: (tool: BuildTool) => void;
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
  onSelectTool,
  onToggleObstacleEdit,
  onToggleMobileIntel,
}) => {
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
    <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] pb-safe select-none">
      {/* Mobile & Tablet Thumb-Zone 5-Tab Dock (< lg) */}
      <div className="grid grid-cols-5 items-stretch gap-1 px-1.5 py-1.5 lg:hidden">
        {tools.map((t) => {
          const isSelected = !obstacleEditMode && !mobileIntelOpen && activeTool === t.id;
          const canAfford = t.cost === undefined || gold >= t.cost;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(t.id)}
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

        {/* 5th Tab: Wave Intel / Counterplay Drawer */}
        <button
          type="button"
          onClick={onToggleMobileIntel}
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
      <div className="hidden lg:flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          {tools.map((t) => {
            const isSelected = !obstacleEditMode && activeTool === t.id;
            const canAfford = t.cost === undefined || gold >= t.cost;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTool(t.id)}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-1.5 text-left transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
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
                  <span className="text-[11px] text-[var(--text-muted)]">{t.hint}</span>
                </div>

                <kbd className="ml-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {t.hotkey}
                </kbd>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canEditObstacles && (
            <button
              type="button"
              onClick={onToggleObstacleEdit}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                obstacleEditMode
                  ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              title="Click grid tiles to add/remove static obstacles before Wave 1"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              <span>{obstacleEditMode ? 'Done Editing Walls' : 'Edit Obstacles'}</span>
            </button>
          )}

          <span className="hidden xl:inline text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap">
            Right-click: Inspect / Cancel
          </span>
        </div>
      </div>
    </div>
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
