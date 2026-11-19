import React, { useState } from 'react';
import { HudSnapshot } from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import {
  Compass,
  Home,
  MoreHorizontal,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface TopHudProps {
  hud: HudSnapshot;
  palette: ThemePalette;
  showFlowField: boolean;
  muted: boolean;
  onStartWave: () => void;
  onTogglePause: () => void;
  onSetSpeed: (speed: 1 | 2 | 4) => void;
  onToggleFlowField: () => void;
  onCycleTheme: () => void;
  onOpenSeedModal: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  hud,
  palette,
  showFlowField,
  muted,
  onStartWave,
  onTogglePause,
  onSetSpeed,
  onToggleFlowField,
  onCycleTheme,
  onOpenSeedModal,
  onToggleMute,
  onRestart,
  onReturnTitle,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayWave = Math.min(hud.waveIndex + 1, hud.totalWaves);

  const cycleSpeed = () => {
    const next: 1 | 2 | 4 = hud.simSpeed === 1 ? 2 : hud.simSpeed === 2 ? 4 : 1;
    onSetSpeed(next);
  };

  return (
    <header className="relative z-30 flex h-12 md:h-13 shrink-0 items-center justify-between gap-2 md:gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 md:px-4 select-none">
      {/* Left: Brand (md+) & Core Readouts */}
      <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <button
          type="button"
          onClick={onReturnTitle}
          className="hidden md:flex items-center gap-2 text-base font-bold tracking-wider text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          style={{ fontFamily: 'var(--font-display)' }}
          title="Return to Title Screen"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
            <polygon
              points="12,2 21,7 21,17 12,22 3,17 3,7"
              fill="none"
              stroke={palette.boardCorner}
              strokeWidth="2"
            />
            <polygon points="12,6 17,15 7,15" fill={palette.triggers.BEAM} />
          </svg>
          VECTRA
        </button>

        <div
          className="hidden md:block h-5 w-px bg-[var(--border-subtle)] shrink-0"
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 text-xs sm:text-sm font-mono tabular-nums whitespace-nowrap">
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] font-sans text-[var(--text-muted)]">W</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {displayWave}/{hud.totalWaves}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[11px] font-sans text-[var(--text-muted)]">Core</span>
            <span
              className={`font-semibold ${
                hud.lives <= 5 ? 'text-[var(--signal-danger)]' : 'text-[var(--signal-danger-text)]'
              }`}
            >
              {hud.lives}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="font-semibold text-[var(--signal-gold)]">{hud.gold}g</span>
          </div>

          <div className="hidden lg:flex items-baseline gap-1.5">
            <span className="text-xs font-sans text-[var(--text-muted)]">Path</span>
            <span className="font-medium text-[var(--accent-text)]">{hud.pathLength} tiles</span>
          </div>
        </div>
      </div>

      {/* Right: Wave Control, Speed & Utilities */}
      <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
        {!hud.waveActive && hud.gameOutcome === 'RUNNING' && hud.nextWaveSummary ? (
          <button
            type="button"
            onClick={onStartWave}
            className="inline-flex min-h-[36px] md:min-h-[32px] items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 md:px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)] transition-colors duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Send Wave {hud.nextWaveSummary.waveNumber}</span>
            <span className="sm:hidden">Wave {hud.nextWaveSummary.waveNumber}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onTogglePause}
            className={`inline-flex min-h-[36px] md:min-h-[32px] items-center gap-1.5 rounded-md border px-2.5 md:px-3 py-1.5 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              hud.paused
                ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)] hover:bg-[var(--bg-elevated)]'
                : 'border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {hud.paused ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            )}
            <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
              {hud.enemiesRemaining}
            </span>
          </button>
        )}

        {/* Mobile single-tap speed cycler */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="flex md:hidden min-h-[36px] min-w-[38px] items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] px-2 font-mono text-xs font-semibold text-[var(--accent-text)] active:bg-[var(--bg-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
          aria-label={`Simulation speed ${hud.simSpeed}x, tap to change`}
        >
          {hud.simSpeed}x
        </button>

        {/* Desktop 3-way speed segmented control */}
        <div
          className="hidden md:flex items-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-0.5"
          role="group"
          aria-label="Simulation speed"
        >
          {([1, 2, 4] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onSetSpeed(spd)}
              className={`rounded px-2 py-1 font-mono text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                hud.simSpeed === spd
                  ? 'bg-[var(--bg-elevated)] text-[var(--accent-text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div
          className="hidden md:block h-5 w-px bg-[var(--border-subtle)] shrink-0"
          aria-hidden="true"
        />

        {/* Desktop Utility Buttons */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCycleTheme}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
            title={`Switch color palette (T) — Current: ${palette.label}`}
          >
            <Palette className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span className="hidden xl:inline">{palette.shortLabel}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFlowField}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              showFlowField
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Flow Field direction overlay"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Flow</span>
          </button>

          <button
            type="button"
            onClick={onOpenSeedModal}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
            title="Import / Export Map & Wave Seed"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Seed</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
            title={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5 text-[var(--signal-danger)]" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
            title="Reset Arena"
            aria-label="Reset Arena"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile Overflow Menu Trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex md:hidden min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-primary)] cursor-pointer"
          aria-label="Arena options"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Overflow Menu Popover */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-12 right-2.5 z-40 flex w-56 flex-col rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-1.5 shadow-xl md:hidden">
            <div className="flex items-center justify-between px-3 py-2 text-[11px] font-mono text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
              <span>{hud.mapName}</span>
              <span className="text-[var(--accent-text)] tabular-nums">{hud.pathLength} tiles</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onCycleTheme();
              }}
              className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Palette className="h-4 w-4 text-[var(--accent-text)]" />
                Palette
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {palette.shortLabel}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleFlowField();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Compass className="h-4 w-4 text-[var(--accent-text)]" />
                Flow Arrows
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {showFlowField ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleMute();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {muted ? (
                  <VolumeX className="h-4 w-4 text-[var(--signal-danger)]" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[var(--text-secondary)]" />
                )}
                Sound FX
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {muted ? 'MUTED' : 'ON'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenSeedModal();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center gap-2.5 rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-[var(--text-secondary)]" />
              Share / Load Seed
            </button>

            <button
              type="button"
              onClick={() => {
                onRestart();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center gap-2.5 rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-[var(--signal-gold)]" />
              Reset Arena
            </button>

            <button
              type="button"
              onClick={() => {
                onReturnTitle();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center gap-2.5 rounded-md px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <Home className="h-4 w-4 text-[var(--text-muted)]" />
              Title Screen
            </button>
          </div>
        </>
      )}
    </header>
  );
};
