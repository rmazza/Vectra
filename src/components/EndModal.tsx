import React from 'react';
import { HudSnapshot } from '../sim/types';
import { RotateCcw, Share2, Shuffle } from 'lucide-react';

interface EndModalProps {
  hud: HudSnapshot;
  onPlayAgain: () => void;
  onShuffleNew: () => void;
  onReturnTitle: () => void;
  onShareSeed: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({
  hud,
  onPlayAgain,
  onShuffleNew,
  onReturnTitle,
  onShareSeed,
}) => {
  const isVictory = hud.gameOutcome === 'VICTORY';
  const wavesCleared = isVictory ? hud.totalWaves : hud.waveIndex;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--bg-scrim)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isVictory ? 'Victory' : 'Core Breached'}
    >
      <div className="flex w-full max-w-md flex-col gap-6 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-7 shadow-2xl">
        <div className="flex flex-col gap-1.5">
          <span
            className={`font-mono text-xs font-semibold ${
              isVictory ? 'text-[var(--signal-ok)]' : 'text-[var(--signal-danger-text)]'
            }`}
          >
            {hud.mapName}
          </span>
          <h2
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {isVictory ? 'Sector Secured' : 'Core Breached'}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {isVictory
              ? 'All 10 waves neutralized. Your modular maze held the line.'
              : 'Enemy forces overwhelmed the exit core. Reconfigure your maze or targeting stack and try again.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-[var(--border-subtle)] py-4 font-mono tabular-nums">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-xs text-[var(--text-muted)]">Waves Cleared</span>
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {wavesCleared}/{hud.totalWaves}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-xs text-[var(--text-muted)]">Core Remaining</span>
            <span className="text-lg font-semibold text-[var(--signal-danger-text)]">
              {hud.lives}/{hud.maxLives}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-xs text-[var(--text-muted)]">Enemies Defeated</span>
            <span className="text-lg font-semibold text-[var(--accent-text)]">
              {hud.totalKills}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-xs text-[var(--text-muted)]">Total Damage</span>
            <span className="text-lg font-semibold text-[var(--signal-gold)]">
              {hud.totalDamage.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Play Again
          </button>

          <button
            type="button"
            onClick={onShuffleNew}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)] whitespace-nowrap cursor-pointer"
            title="Start a new run on a freshly shuffled board"
          >
            <Shuffle className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            Shuffle
          </button>

          <button
            type="button"
            onClick={onShareSeed}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] whitespace-nowrap cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            Seed
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] whitespace-nowrap cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};
