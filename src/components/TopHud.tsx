import React, { useState } from 'react';
import { HudSnapshot } from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import {
  ChevronDown,
  Compass,
  Flame,
  Home,
  MoreHorizontal,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Share2,
  Shuffle,
  Timer,
  TimerOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

export type AutoWaveDuration = 10 | 15 | 20 | 30;
export const AUTO_WAVE_DURATIONS: AutoWaveDuration[] = [10, 15, 20, 30];

interface TopHudProps {
  hud: HudSnapshot;
  palette: ThemePalette;
  showFlowField: boolean;
  showHeatmap: boolean;
  muted: boolean;
  autoWaveEnabled: boolean;
  autoWaveDuration: AutoWaveDuration;
  autoStartWave1: boolean;
  countdownRemaining: number | null;
  countdownTotal: number;
  countdownHeld: boolean;
  onStartWave: () => void;
  onTogglePause: () => void;
  onSetSpeed: (speed: 1 | 2 | 4) => void;
  onToggleAutoWave: () => void;
  onSetAutoWaveDuration: (duration: AutoWaveDuration) => void;
  onToggleAutoStartWave1: () => void;
  onStartCountdownNow: () => void;
  onToggleCountdownHold: () => void;
  onExtendCountdown: (seconds: number) => void;
  onToggleFlowField: () => void;
  onToggleHeatmap: () => void;
  onCycleTheme: () => void;
  onShuffleBoard: () => void;
  onOpenSeedModal: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  hud,
  palette,
  showFlowField,
  showHeatmap,
  muted,
  autoWaveEnabled,
  autoWaveDuration,
  autoStartWave1,
  countdownRemaining,
  countdownTotal,
  countdownHeld,
  onStartWave,
  onTogglePause,
  onSetSpeed,
  onToggleAutoWave,
  onSetAutoWaveDuration,
  onToggleAutoStartWave1,
  onStartCountdownNow,
  onToggleCountdownHold,
  onExtendCountdown,
  onToggleFlowField,
  onToggleHeatmap,
  onCycleTheme,
  onShuffleBoard,
  onOpenSeedModal,
  onToggleMute,
  onRestart,
  onReturnTitle,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const displayWave = Math.min(hud.waveIndex + 1, hud.totalWaves);

  const cycleSpeed = () => {
    const next: 1 | 2 | 4 = hud.simSpeed === 1 ? 2 : hud.simSpeed === 2 ? 4 : 1;
    onSetSpeed(next);
  };

  const cycleDuration = () => {
    const idx = AUTO_WAVE_DURATIONS.indexOf(autoWaveDuration);
    const next = AUTO_WAVE_DURATIONS[(idx + 1) % AUTO_WAVE_DURATIONS.length];
    onSetAutoWaveDuration(next);
  };

  const countdownActive =
    countdownRemaining !== null &&
    !hud.waveActive &&
    hud.gameOutcome === 'RUNNING' &&
    Boolean(hud.nextWaveSummary);

  const countdownPct =
    countdownActive && countdownTotal > 0
      ? Math.max(0, Math.min(100, (countdownRemaining / countdownTotal) * 100))
      : 0;

  const countdownBarColor = countdownHeld
    ? 'bg-[var(--text-muted)]'
    : countdownRemaining !== null && countdownRemaining <= 3.05
    ? 'bg-[var(--signal-danger)]'
    : countdownRemaining !== null && countdownRemaining <= 5.5
    ? 'bg-[var(--signal-gold)]'
    : 'bg-[var(--accent)]';

  const shortCountdownLabel =
    countdownRemaining !== null
      ? countdownHeld
        ? 'HOLD'
        : `${Math.ceil(countdownRemaining)}s`
      : null;

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

      {/* Right: Wave Control, Auto-Wave Timer, Speed & Utilities */}
      <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
        {!hud.waveActive && hud.gameOutcome === 'RUNNING' && hud.nextWaveSummary ? (
          <button
            type="button"
            onClick={onStartWave}
            className="inline-flex min-h-[36px] md:min-h-[32px] items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 md:px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)] transition-colors duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Send Wave {hud.nextWaveSummary.waveNumber}</span>
            <span className="sm:hidden">W{hud.nextWaveSummary.waveNumber}</span>
            {shortCountdownLabel && (
              <span className="ml-0.5 rounded bg-black/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
                {shortCountdownLabel}
              </span>
            )}
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

        {/* Auto-Wave Countdown Timer Control & Popover (sm+) */}
        <div className="relative hidden sm:block shrink-0">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setTimerMenuOpen((v) => !v);
            }}
            className={`inline-flex min-h-[36px] md:min-h-[32px] items-center gap-1.5 rounded-md border px-2 md:px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              countdownActive
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                : autoWaveEnabled
                ? 'border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            title={`Auto-Wave countdown timer (Hotkey A) — ${
              autoWaveEnabled ? `Enabled (${autoWaveDuration}s prep window)` : 'Disabled (Manual)'
            }`}
            aria-expanded={timerMenuOpen}
            aria-haspopup="dialog"
          >
            {autoWaveEnabled ? (
              <Timer className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            ) : (
              <TimerOff className="h-3.5 w-3.5" />
            )}
            <span className="font-mono text-[11px] font-semibold tabular-nums">
              {autoWaveEnabled ? `${autoWaveDuration}s` : 'Off'}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-[var(--text-muted)] transition-transform ${
                timerMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {timerMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setTimerMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="Next Wave Countdown Settings"
                className="absolute top-full right-0 z-40 mt-2 flex w-64 flex-col gap-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-3 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span
                      className="text-xs font-bold text-[var(--text-primary)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Auto-Wave Timer
                    </span>
                    <span className="text-[11px] leading-snug text-[var(--text-muted)]">
                      Prep window before the next wave starts automatically.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAutoWave}
                    className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                      autoWaveEnabled
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {autoWaveEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Prep Window Duration Selector */}
                <div className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Prep Window Duration
                  </span>
                  <div className="grid grid-cols-4 gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-0.5">
                    {AUTO_WAVE_DURATIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => onSetAutoWaveDuration(sec)}
                        className={`rounded py-1 font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                          autoWaveDuration === sec
                            ? 'bg-[var(--bg-elevated)] text-[var(--accent-text)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Include Wave 1 toggle */}
                <button
                  type="button"
                  onClick={onToggleAutoStartWave1}
                  className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2.5 py-2 text-left text-xs transition-colors hover:border-[var(--border-strong)] cursor-pointer"
                >
                  <span className="text-[var(--text-secondary)]">Countdown before Wave 1</span>
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      autoStartWave1 ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {autoStartWave1 ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Active or Ready Controls */}
                {!hud.waveActive && hud.gameOutcome === 'RUNNING' && hud.nextWaveSummary && (
                  <div className="flex items-center gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                    {countdownActive ? (
                      <>
                        <button
                          type="button"
                          onClick={onToggleCountdownHold}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-xs font-semibold cursor-pointer ${
                            countdownHeld
                              ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)]'
                              : 'border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                          }`}
                        >
                          {countdownHeld ? (
                            <>
                              <Play className="h-3.5 w-3.5 fill-current" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              Hold
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onExtendCountdown(10)}
                          className="flex items-center justify-center gap-0.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] px-2.5 py-1.5 font-mono text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          10s
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onStartCountdownNow();
                          setTimerMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] py-1.5 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
                      >
                        <Timer className="h-3.5 w-3.5" />
                        Start {autoWaveDuration}s Timer for Wave {hud.nextWaveSummary.waveNumber}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Hotkey A toggles timer</span>
                  <span>Real-time seconds</span>
                </div>
              </div>
            </>
          )}
        </div>

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
            onClick={onToggleHeatmap}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              showHeatmap
                ? 'border-[var(--pay-kinetic)] bg-[var(--signal-danger-soft)] text-[var(--pay-kinetic)]'
                : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Damage Heatmap diagnostic view (Key H)"
            aria-pressed={showHeatmap}
          >
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Heat</span>
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
            onClick={onShuffleBoard}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--text-primary)] active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer"
            title="Shuffle board layout (starts a fresh randomized arena — Key S before Wave 1)"
          >
            <Shuffle className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span className="hidden xl:inline">Shuffle</span>
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
          onClick={() => {
            setTimerMenuOpen(false);
            setMenuOpen((v) => !v);
          }}
          className="flex md:hidden min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-primary)] cursor-pointer"
          aria-label="Arena options"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
        </button>
      </div>

      {/* Bottom-edge razor countdown progress bar across TopHud */}
      {countdownActive && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--bg-inset)]"
          aria-hidden="true"
        >
          <div
            className={`h-full transition-[background-color] duration-150 ${countdownBarColor}`}
            style={{ width: `${countdownPct}%` }}
          />
        </div>
      )}

      {/* Mobile Overflow Menu Popover */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-12 right-2.5 z-40 flex w-60 flex-col rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-1.5 shadow-xl md:hidden">
            <div className="flex items-center justify-between px-3 py-2 text-[11px] font-mono text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
              <span>{hud.mapName}</span>
              <span className="text-[var(--accent-text)] tabular-nums">{hud.pathLength} tiles</span>
            </div>

            <button
              type="button"
              onClick={onToggleAutoWave}
              className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {autoWaveEnabled ? (
                  <Timer className="h-4 w-4 text-[var(--accent-text)]" />
                ) : (
                  <TimerOff className="h-4 w-4 text-[var(--text-muted)]" />
                )}
                Auto-Wave Timer
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  autoWaveEnabled ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {autoWaveEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={cycleDuration}
              className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <span className="pl-6.5 text-[var(--text-secondary)]">Prep Window</span>
              <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)] tabular-nums">
                {autoWaveDuration}s
              </span>
            </button>

            {!hud.waveActive &&
              hud.gameOutcome === 'RUNNING' &&
              hud.nextWaveSummary &&
              !countdownActive && (
                <button
                  type="button"
                  onClick={() => {
                    onStartCountdownNow();
                    setMenuOpen(false);
                  }}
                  className="mx-2 my-1 flex min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-xs font-semibold text-[var(--accent-text)] cursor-pointer"
                >
                  <Timer className="h-3.5 w-3.5" />
                  Start {autoWaveDuration}s Countdown
                </button>
              )}

            <div className="my-1 border-t border-[var(--border-subtle)]" />

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
                onToggleHeatmap();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Flame
                  className={`h-4 w-4 ${
                    showHeatmap ? 'text-[var(--pay-kinetic)]' : 'text-[var(--text-secondary)]'
                  }`}
                />
                Damage Heatmap
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  showHeatmap ? 'text-[var(--pay-kinetic)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {showHeatmap ? 'ON' : 'OFF'}
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
                onShuffleBoard();
                setMenuOpen(false);
              }}
              className="flex min-h-[44px] items-center gap-2.5 rounded-md px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <Shuffle className="h-4 w-4 text-[var(--accent-text)]" />
              Shuffle Board
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

