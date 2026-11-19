import React, { useEffect, useRef, useState } from 'react';
import {
  BoardTransform,
  CameraView,
  clampCamera,
  renderVectraCanvas,
  screenToTile,
} from '../renderer/canvasRenderer';
import { VectraEngine } from '../sim/engine';
import { COSTS } from '../sim/stats';
import { BuildTool, FIXED_DT, GridPoint, PlacementCheckResult } from '../sim/types';
import { ThemePalette } from '../theme/palettes';
import { Check, Maximize2, Minus, Play, Plus, X } from 'lucide-react';

interface GameCanvasProps {
  engine: VectraEngine;
  palette: ThemePalette;
  activeTool: BuildTool;
  showFlowField: boolean;
  obstacleEditMode: boolean;
  interactive: boolean;
  paused?: boolean;
  onResume?: () => void;
  pendingTile: GridPoint | null;
  pendingCheck: PlacementCheckResult | null;
  onTileTap: (pt: GridPoint, isTouch: boolean) => void;
  onConfirmPending: () => void;
  onCancelPending: () => void;
  onTileRightClick: (pt: GridPoint) => void;
  onPeriodicSync: () => void;
}

interface PointerRecord {
  id: number;
  x: number;
  y: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  palette,
  activeTool,
  showFlowField,
  obstacleEditMode,
  interactive,
  paused = false,
  onResume,
  pendingTile,
  pendingCheck,
  onTileTap,
  onConfirmPending,
  onCancelPending,
  onTileRightClick,
  onPeriodicSync,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverTileRef = useRef<GridPoint | null>(null);
  const transformRef = useRef<BoardTransform | null>(null);
  const cameraRef = useRef<CameraView>({ zoom: 1, panX: 0, panY: 0 });
  const sizeRef = useRef({ w: 800, h: 500 });

  // Multi-touch pan / pinch tracking
  const activePointersRef = useRef<Map<number, PointerRecord>>(new Map());
  const gestureRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    pinchStartDist: number;
    pinchStartZoom: number;
    hadPinch: boolean;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    hadPinch: false,
  });

  const [zoomLevel, setZoomLevel] = useState(1);

  const propsRef = useRef({
    palette,
    activeTool,
    showFlowField,
    obstacleEditMode,
    interactive,
    pendingTile,
    onPeriodicSync,
  });
  propsRef.current = {
    palette,
    activeTool,
    showFlowField,
    obstacleEditMode,
    interactive,
    pendingTile,
    onPeriodicSync,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let disposed = false;
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let uiSyncAccum = 0;

    const resize = () => {
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(280, container.clientWidth);
      const cssH = Math.max(180, container.clientHeight);
      sizeRef.current = { w: cssW, h: cssH };
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cameraRef.current = clampCamera(cssW, cssH, cameraRef.current);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const frame = (now: number) => {
      if (disposed) return;
      try {
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Number.isFinite(rawDt) ? Math.min(Math.max(rawDt, 0), 0.05) : 0;

        if (!engine.paused && engine.gameOutcome === 'RUNNING') {
          const speedMult = engine.demoMode ? 1 : engine.simSpeed;
          accumulator += dt * speedMult;

          let steps = 0;
          const maxSteps = speedMult * 4;
          while (accumulator >= FIXED_DT && steps < maxSteps) {
            try {
              engine.stepTick();
            } catch (err) {
              console.error('Vectra simulation tick error:', err);
              accumulator = 0;
              break;
            }
            accumulator -= FIXED_DT;
            steps++;
          }
          if (steps === maxSteps) {
            accumulator = 0;
          }
        }

        try {
          transformRef.current = renderVectraCanvas(ctx, sizeRef.current.w, sizeRef.current.h, engine, {
            hoverTile: propsRef.current.interactive ? hoverTileRef.current : null,
            pendingTile: propsRef.current.interactive ? propsRef.current.pendingTile : null,
            activeTool: propsRef.current.activeTool,
            showFlowField: propsRef.current.showFlowField,
            obstacleEditMode: propsRef.current.obstacleEditMode,
            timeSec: now / 1000,
            camera: cameraRef.current,
            palette: propsRef.current.palette,
          });
        } catch (err) {
          console.error('Vectra canvas render error:', err);
        }

        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.085 && propsRef.current.interactive && engine.waveActive) {
          uiSyncAccum = 0;
          try {
            propsRef.current.onPeriodicSync();
          } catch (err) {
            console.error('Vectra HUD sync error:', err);
          }
        }
      } finally {
        if (!disposed) {
          rafId = requestAnimationFrame(frame);
        }
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [engine]);

  const applyZoom = (nextZoom: number) => {
    const clamped = clampCamera(sizeRef.current.w, sizeRef.current.h, {
      ...cameraRef.current,
      zoom: nextZoom,
    });
    cameraRef.current = clamped;
    setZoomLevel(Number(clamped.zoom.toFixed(2)));
  };

  const handleResetView = () => {
    cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
    setZoomLevel(1);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });

    const pts = Array.from(activePointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        isDragging: false,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: cameraRef.current.panX,
        startPanY: cameraRef.current.panY,
        pinchStartDist: 0,
        pinchStartZoom: cameraRef.current.zoom,
        hadPinch: false,
      };
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      gestureRef.current.pinchStartDist = Math.max(20, dist);
      gestureRef.current.pinchStartZoom = cameraRef.current.zoom;
      gestureRef.current.hadPinch = true;
      gestureRef.current.isDragging = true;
      hoverTileRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current || !transformRef.current) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
      const pts = Array.from(activePointersRef.current.values());

      if (pts.length === 2) {
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const ratio = dist / gestureRef.current.pinchStartDist;
        applyZoom(gestureRef.current.pinchStartZoom * ratio);
        return;
      }

      if (pts.length === 1 && !gestureRef.current.hadPinch) {
        const dx = e.clientX - gestureRef.current.startX;
        const dy = e.clientY - gestureRef.current.startY;
        if (Math.hypot(dx, dy) > 9 && cameraRef.current.zoom > 1.02) {
          gestureRef.current.isDragging = true;
          hoverTileRef.current = null;
          cameraRef.current = clampCamera(sizeRef.current.w, sizeRef.current.h, {
            zoom: cameraRef.current.zoom,
            panX: gestureRef.current.startPanX + dx,
            panY: gestureRef.current.startPanY + dy,
          });
        }
        return;
      }
    }

    // Standard desktop mouse hover preview
    if (e.pointerType === 'mouse') {
      const rect = canvasRef.current.getBoundingClientRect();
      hoverTileRef.current = screenToTile(e.clientX, e.clientY, rect, transformRef.current);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current || !transformRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const wasDragging = gestureRef.current.isDragging || gestureRef.current.hadPinch;
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      gestureRef.current.isDragging = false;
      gestureRef.current.hadPinch = false;
    }

    if (wasDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const tile = screenToTile(e.clientX, e.clientY, rect, transformRef.current);
    if (tile) {
      onTileTap(tile, e.pointerType !== 'mouse');
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      gestureRef.current.isDragging = false;
      gestureRef.current.hadPinch = false;
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse') {
      hoverTileRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    if (Math.abs(e.deltaY) < 4) return;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    applyZoom(cameraRef.current.zoom * factor);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!interactive || !canvasRef.current || !transformRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const tile = screenToTile(e.clientX, e.clientY, rect, transformRef.current);
    if (tile) onTileRightClick(tile);
  };

  const toolLabel =
    activeTool === 'TOWER'
      ? `Place Tower · ${COSTS.TOWER}g`
      : activeTool === 'OVERCLOCK'
      ? `Place Overclock · ${COSTS.OVERCLOCK}g`
      : activeTool === 'PRISM'
      ? `Place Prism · ${COSTS.PRISM}g`
      : '';

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className={`block h-full w-full touch-none ${
          !interactive
            ? 'cursor-default'
            : activeTool === 'INSPECT' && !obstacleEditMode
            ? 'cursor-pointer'
            : 'cursor-crosshair'
        }`}
      />

      {/* Clear Paused Indicator Overlay so a paused board can never look frozen */}
      {interactive && paused && onResume && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
          <button
            type="button"
            onClick={onResume}
            className="pointer-events-auto inline-flex min-h-[38px] items-center gap-2 rounded-md border border-[var(--signal-gold)] bg-[var(--bg-panel)]/95 px-4 py-1.5 text-xs font-bold tracking-wide text-[var(--signal-gold)] shadow-lg transition-colors hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>PAUSED · Click or press Space to Resume</span>
          </button>
        </div>
      )}

      {/* Compact Zoom Controls for Touch / Mobile Precision (visible on < lg or whenever zoomed) */}
      {interactive && (
        <div
          className={`pointer-events-auto absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)]/92 p-1 shadow-md ${
            zoomLevel > 1.02 ? 'flex' : 'flex lg:hidden'
          }`}
        >
          <button
            type="button"
            onClick={() => applyZoom(cameraRef.current.zoom - 0.45)}
            disabled={zoomLevel <= 1.01}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-35 cursor-pointer"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="flex h-9 min-w-[44px] items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold text-[var(--accent-text)] hover:bg-[var(--bg-elevated)] tabular-nums cursor-pointer"
            aria-label="Reset zoom"
            title="Reset view"
          >
            {zoomLevel > 1.02 ? (
              `${zoomLevel.toFixed(1)}x`
            ) : (
              <Maximize2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => applyZoom(cameraRef.current.zoom + 0.45)}
            disabled={zoomLevel >= 2.75}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-35 cursor-pointer"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Touch Tap-to-Preview Confirm Floating Action Bar */}
      {interactive && pendingTile && activeTool !== 'INSPECT' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-2.5 py-2 shadow-lg">
            <span className="hidden sm:inline font-mono text-[11px] text-[var(--text-muted)] tabular-nums px-1">
              ({pendingTile.x},{pendingTile.y})
            </span>
            {pendingCheck?.valid ? (
              <button
                type="button"
                onClick={onConfirmPending}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[var(--signal-ok)] px-4 py-2 text-xs font-bold text-[var(--signal-ok-ink)] transition-colors active:scale-[0.98] hover:opacity-90 whitespace-nowrap cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                Confirm {toolLabel}
              </button>
            ) : (
              <span className="px-2.5 py-1.5 text-xs font-semibold text-[var(--signal-danger-text)]">
                {pendingCheck?.reason || 'Cannot place here'}
              </span>
            )}
            <button
              type="button"
              onClick={onCancelPending}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label="Cancel placement preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
