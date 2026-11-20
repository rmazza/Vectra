import React from 'react';
import { HudSnapshot } from '../sim/types';
import { Pause, Play, Plus, Timer, X } from 'lucide-react';

interface WaveCountdownOverlayProps {
  hud: HudSnapshot;
  remaining: number;
  total: number;
  held: boolean;
  autoPausedReason: string | null;
  hideMobileBar?: boolean;
  onToggleHold: () => void;
  onExtend: (seconds: number) => void;
  onStartNow: () => void;
  onDisableAutoWave: () => void;
}

export const WaveCountdownOverlay: React.FC<WaveCountdownOverlayProps> = ({
  hud,
  remaining,
  total,
  held,
  autoPausedReason,
  hideMobileBar = false,
  onToggleHold,
  onExtend,
  onStartNow,
  onDisableAutoWave,
}) => {
  const wave = hud.nextWaveSummary;
  if (!wave) return null;

  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const isPaused = held || Boolean(autoPausedReason);
  const isCritical = !isPaused && remaining <= 3.05;
  const isWarning = !isPaused && !isCritical && remaining <= 5.5;

  const barColorClass = isPaused
    ? 'bg-[var(--text-muted)]'
    : isCritical
    ? 'bg-[var(--signal-danger)]'
    : isWarning
    ? 'bg-[var(--signal-gold)]'
    : 'bg-[var(--accent)]';

  const timeColorClass = isPaused
    ? 'text-[var(--text-secondary)]'
    : isCritical
    ? 'text-[var(--signal-danger)]'
    : isWarning
    ? 'text-[var(--signal-gold)]'
    : 'text-[var(--accent-text)]';

  const borderColorClass = isCritical
    ? 'border-[var(--signal-danger)]/75'
    : isWarning
    ? 'border-[var(--signal-gold)]/75'
    : 'border-[var(--border-strong)]';

  const formattedTime = remaining < 10 ? `${remaining.toFixed(1)}s` : `${Math.ceil(remaining)}s`;
  const totalEnemies = wave.counts.SWARM + wave.counts.ARMOR + wave.counts.SHIELDED;

  return (
    <>
      {/* Desktop Tactical Prep Card — anchored cleanly in top-left gutter beside vertical grid */}
      <div
        role="status"
        aria-live="off"
        className={`pointer-events-auto hidden lg:flex absolute top-3 left-3 z-20 w-[232px] flex-col overflow-hidden rounded-lg border bg-[var(--bg-panel)]/95 shadow-xl backdrop-blur-sm transition-colors duration-150 ${borderColorClass}`}
      >
        <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <Timer className={`h-3.5 w-3.5 shrink-0 ${timeColorClass}`} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Next Wave · W{wave.waveNumber}
              </span>
            </div>
            <span className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
              {wave.name}
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
              {autoPausedReason
                ? `Paused · ${autoPausedReason}`
                : held
                ? 'Timer held · optimize maze'
                : `${totalEnemies} hostiles · prep window`}
            </span>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span
              className={`font-mono text-lg font-bold leading-none tabular-nums ${timeColorClass}`}
            >
              {formattedTime}
            </span>
            <button
              type="button"
              onClick={onDisableAutoWave}
              className="mt-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Disable auto-wave countdown (Key A)"
              aria-label="Disable auto-wave countdown"
            >
              <X className="h-3 w-3" />
              <span>Off</span>
            </button>
          </div>
        </div>

        {/* Visual Depleting Progress Bar */}
        <div className="mx-3 mb-2.5 h-1.5 overflow-hidden rounded-sm bg-[var(--bg-inset)] border border-[var(--border-subtle)]">
          <div
            className={`h-full transition-[background-color] duration-150 ${barColorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-3 gap-1 border-t border-[var(--border-subtle)] bg-[var(--bg-inset)]/75 p-1.5">
          <button
            type="button"
            onClick={onToggleHold}
            disabled={Boolean(autoPausedReason)}
            className={`inline-flex h-7 items-center justify-center gap-1 rounded border text-[11px] font-semibold transition-colors disabled:opacity-40 cursor-pointer ${
              held
                ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            title={held ? 'Resume countdown' : 'Hold countdown while optimizing'}
          >
            {held ? (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Go</span>
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                <span>Hold</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onExtend(10)}
            disabled={remaining >= 59.5}
            className="inline-flex h-7 items-center justify-center gap-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] font-mono text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
            title="Add 10 seconds to prep window"
          >
            <Plus className="h-3 w-3" />
            <span>10s</span>
          </button>

          <button
            type="button"
            onClick={onStartNow}
            className="inline-flex h-7 items-center justify-center gap-1 rounded bg-[var(--accent)] px-1.5 text-[11px] font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.98] cursor-pointer"
            title="Launch next wave immediately (Space)"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Now</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Compact Bottom Countdown Strip (< lg, hidden when placement confirm bar is active) */}
      {!hideMobileBar && (
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex justify-center lg:hidden">
          <div
            role="status"
            aria-live="off"
            className={`pointer-events-auto relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-lg border bg-[var(--bg-panel)]/95 shadow-xl backdrop-blur-sm ${borderColorClass}`}
          >
            {/* Top-edge depleting progress bar */}
            <div className="h-1 w-full bg-[var(--bg-inset)]">
              <div
                className={`h-full transition-[background-color] duration-150 ${barColorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Timer className={`h-4 w-4 shrink-0 ${timeColorClass}`} />
                <div className="flex min-w-0 flex-col leading-tight">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      Wave {wave.waveNumber}
                    </span>
                    <span className={`font-mono text-xs font-bold tabular-nums ${timeColorClass}`}>
                      {formattedTime}
                    </span>
                  </div>
                  <span className="truncate text-[10px] text-[var(--text-muted)]">
                    {autoPausedReason
                      ? `Paused (${autoPausedReason})`
                      : held
                      ? 'Held · tap Go to resume'
                      : `${wave.name} · prep window`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onToggleHold}
                  disabled={Boolean(autoPausedReason)}
                  className={`flex h-8 items-center justify-center rounded-md border px-2 text-[11px] font-semibold disabled:opacity-40 cursor-pointer ${
                    held
                      ? 'border-[var(--signal-gold)] bg-[var(--signal-gold-soft)] text-[var(--signal-gold)]'
                      : 'border-[var(--border-strong)] bg-[var(--bg-inset)] text-[var(--text-primary)]'
                  }`}
                  aria-label={held ? 'Resume countdown' : 'Hold countdown'}
                >
                  {held ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => onExtend(10)}
                  disabled={remaining >= 59.5}
                  className="flex h-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] px-2 font-mono text-[11px] font-semibold text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                  aria-label="Add 10 seconds"
                >
                  +10s
                </button>

                <button
                  type="button"
                  onClick={onDisableAutoWave}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Disable auto-wave countdown"
                  title="Turn off Auto-Wave"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
