import React, { useEffect, useState } from 'react';
import { decodeSeed, encodeSeed } from '../sim/seed';
import { SeedPayload } from '../sim/types';
import { Check, Copy, Upload, X } from 'lucide-react';

interface SeedModalProps {
  currentPayload: SeedPayload;
  onLoadSeed: (seed: SeedPayload) => void;
  onClose: () => void;
}

export const SeedModal: React.FC<SeedModalProps> = ({
  currentPayload,
  onLoadSeed,
  onClose,
}) => {
  const [exportedSeed, setExportedSeed] = useState('');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    encodeSeed(currentPayload)
      .then((s) => {
        if (active) setExportedSeed(s);
      })
      .catch(() => {
        if (active) setExportedSeed('');
      });
    return () => {
      active = false;
    };
  }, [currentPayload]);

  const handleCopy = async () => {
    if (!exportedSeed) return;
    try {
      await navigator.clipboard.writeText(exportedSeed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard copy blocked by browser; select the text manually.');
    }
  };

  const handleImport = async () => {
    setError(null);
    try {
      const decoded = await decodeSeed(importText);
      onLoadSeed(decoded);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid seed string.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-scrim)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Map and Wave Seed"
    >
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-lg font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Shareable Arena Seed
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Gzip + Base64 snapshot of Spawn, Goal, Obstacles ({currentPayload.gridObstacles.length}
              ), and all {currentPayload.waves.length} waves.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Export Current Seed */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="export-seed"
              className="text-xs font-semibold text-[var(--text-secondary)]"
            >
              Current Seed ({currentPayload.name || 'Arena'})
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--accent-text)] transition-colors hover:border-[var(--accent)] cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Seed'}
            </button>
          </div>
          <textarea
            id="export-seed"
            readOnly
            rows={3}
            value={exportedSeed}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        {/* Import Seed */}
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
          <label
            htmlFor="import-seed"
            className="text-xs font-semibold text-[var(--text-secondary)]"
          >
            Import Seed String
          </label>
          <textarea
            id="import-seed"
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste VGZ1:... or raw JSON seed payload here"
            className="w-full resize-none rounded-md border border-[var(--border-strong)] bg-[var(--bg-inset)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          {error && (
            <p className="text-xs font-medium text-[var(--signal-danger-text)]">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border-strong)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!importText.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Load Arena
          </button>
        </div>
      </div>
    </div>
  );
};
