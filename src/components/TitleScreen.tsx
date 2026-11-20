import React from 'react';
import { MapPreset } from '../sim/types';
import {
  MAP_PRESETS,
  SHUFFLE_DENSITIES,
  SHUFFLE_DENSITY_LABELS,
  ShuffleDensity,
} from '../sim/waves';
import { PALETTES, THEME_ORDER, ThemeId, ThemePalette } from '../theme/palettes';
import { Play, Shuffle, Upload } from 'lucide-react';

interface TitleScreenProps {
  selectedPreset: MapPreset;
  shuffleDensity: ShuffleDensity;
  themeId: ThemeId;
  palette: ThemePalette;
  onSelectPreset: (preset: MapPreset) => void;
  onShuffleLayout: (densityOverride?: ShuffleDensity) => void;
  onSelectShuffleDensity: (density: ShuffleDensity) => void;
  onSelectTheme: (id: ThemeId) => void;
  onStart: () => void;
  onOpenSeedImport: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedPreset,
  shuffleDensity,
  themeId,
  palette,
  onSelectPreset,
  onShuffleLayout,
  onSelectShuffleDensity,
  onSelectTheme,
  onStart,
  onOpenSeedImport,
}) => {
  const brandFill = palette.isLight ? '#F6F2E9' : palette.outerBgOuter;
  const brandWordColor = palette.isLight ? '#181715' : '#F2EFE9';
  const brandInnerFill = palette.isLight
    ? 'rgba(224, 58, 38, 0.16)'
    : `rgba(${palette.prismFloorRgb}, 0.22)`;
  const isShuffledActive = !MAP_PRESETS.some((p) => p.id === selectedPreset.id);

  return (
    <div className="title-scrim pointer-events-none absolute inset-0 z-20 flex items-end sm:items-center overflow-y-auto">
      <div className="pointer-events-auto flex w-full max-w-xl flex-col gap-5 sm:gap-6 px-5 py-6 pb-safe sm:px-10 sm:py-10 md:px-14">
        {/* Bespoke inline SVG geometric title lockup */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <svg
            viewBox="0 0 380 76"
            className="h-11 sm:h-14 w-auto max-w-[260px] sm:max-w-[340px]"
            role="img"
            aria-label="Vectra"
          >
            <polygon
              points="34,8 60,23 60,53 34,68 8,53 8,23"
              fill={brandFill}
              stroke={palette.boardCorner}
              strokeWidth="2.5"
            />
            <polygon
              points="34,19 49,47 19,47"
              fill={brandInnerFill}
              stroke={palette.triggers.BEAM}
              strokeWidth="2.2"
            />
            <circle cx="34" cy="38" r="4" fill={palette.overclock} />
            <line
              x1="60"
              y1="38"
              x2="74"
              y2="38"
              stroke={palette.boardFrame}
              strokeWidth="2"
            />
            <text
              x="86"
              y="52"
              fill={brandWordColor}
              fontFamily="Outfit, system-ui, sans-serif"
              fontWeight="800"
              fontSize="48"
              letterSpacing="6"
            >
              VECTRA
            </text>
          </svg>

          <p className="max-w-md text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)]">
            Modular vector tower defense. Sculpt live flow-field mazes, hot-swap Triggers,
            Payloads, and Modifiers, and program per-tower targeting rules across 10 waves.
          </p>
        </div>

        {/* Map Preset & Shuffle Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">Select Arena Layout</span>
            {isShuffledActive && (
              <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)]">
                {selectedPreset.name} · {selectedPreset.obstacles.length} walls
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {MAP_PRESETS.map((preset) => {
              const active = preset.id === selectedPreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className={`flex min-h-[54px] flex-col items-start justify-center gap-0.5 rounded-md border px-2.5 py-2 sm:px-3 sm:py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-panel)]/90 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="w-full truncate text-xs sm:text-[13px] font-semibold">
                    {preset.name}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] tabular-nums">
                    {preset.obstacles.length} walls
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onShuffleLayout()}
              className={`flex min-h-[54px] flex-col items-start justify-center gap-0.5 rounded-md border px-2.5 py-2 sm:px-3 sm:py-2.5 text-left transition-colors duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer ${
                isShuffledActive
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-panel)]/90 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              title="Generate a fresh shuffled board layout (Key S)"
            >
              <span className="flex w-full items-center gap-1.5 text-xs sm:text-[13px] font-semibold">
                <Shuffle className="h-3.5 w-3.5 text-[var(--accent-text)] shrink-0" />
                <span className="truncate">{isShuffledActive ? 'Re-Shuffle' : 'Shuffle'}</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] tabular-nums">
                {isShuffledActive ? `${selectedPreset.obstacles.length} walls` : '10 archetypes'}
              </span>
            </button>
          </div>

          {isShuffledActive && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-[var(--text-muted)]">Shuffle Density</span>
              <div
                className="inline-flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]/90 p-0.5"
                role="group"
                aria-label="Shuffle obstacle density"
              >
                {SHUFFLE_DENSITIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectShuffleDensity(d)}
                    className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                      shuffleDensity === d
                        ? 'bg-[var(--bg-elevated)] text-[var(--accent-text)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {SHUFFLE_DENSITY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)]">{selectedPreset.description}</p>
        </div>

        {/* Palette Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">Visual Palette</span>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {THEME_ORDER.map((id) => {
              const p = PALETTES[id];
              const active = id === themeId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTheme(id)}
                  className={`flex min-h-[46px] flex-col items-start justify-center gap-1.5 rounded-md border px-2.5 py-2 sm:px-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] cursor-pointer ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-panel)]/90 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex w-full items-center gap-1" aria-hidden="true">
                    {p.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="h-2 flex-1 rounded-[2px] border border-black/20"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <span className="w-full truncate text-[11px] sm:text-xs font-semibold leading-none">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--accent-ink)] transition-colors duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Game
          </button>

          <button
            type="button"
            onClick={onOpenSeedImport}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel)]/95 px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="h-4 w-4 text-[var(--text-muted)]" />
            Load Seed
          </button>
        </div>

        {/* Control Hint Line (Touch on mobile, Keyboard on desktop) */}
        <div className="flex sm:hidden flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)] font-mono">
          <span>Tap to Preview & Place</span>
          <span aria-hidden="true">·</span>
          <span>Pinch to Zoom</span>
          <span aria-hidden="true">·</span>
          <span>Tap Towers to Configure</span>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-muted)] font-mono">
          <span>Enter Start</span>
          <span aria-hidden="true">·</span>
          <span>S Shuffle</span>
          <span aria-hidden="true">·</span>
          <span>1–6 Build</span>
          <span aria-hidden="true">·</span>
          <span>Space Wave / Pause</span>
          <span aria-hidden="true">·</span>
          <span>T Palette</span>
        </div>
      </div>
    </div>
  );
};
