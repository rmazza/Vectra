import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/synth';
import { BuildBar } from './components/BuildBar';
import { EndModal } from './components/EndModal';
import { GameCanvas } from './components/GameCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { SeedModal } from './components/SeedModal';
import { TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';
import { VectraEngine } from './sim/engine';
import { COSTS } from './sim/stats';
import { createTowerPreset, deleteTowerPreset, fetchTowerPresets } from './api/presets';
import {
  BuildTool,
  GamePhase,
  GridPoint,
  HudSnapshot,
  MapPreset,
  ModifierType,
  PayloadType,
  SeedPayload,
  TargetRule,
  TowerPreset,
  TriggerType,
} from './sim/types';
import { MAP_PRESETS } from './sim/waves';
import { PALETTES, THEME_ORDER, ThemeId, setActiveTheme } from './theme/palettes';

function readInitialTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem('vectra-theme') as ThemeId | null;
    if (saved && THEME_ORDER.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors in sandboxed iframes
  }
  return 'foundry';
}

export default function App() {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const initial = readInitialTheme();
    setActiveTheme(initial);
    return initial;
  });
  const palette = PALETTES[themeId];

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [selectedPreset, setSelectedPreset] = useState<MapPreset>(MAP_PRESETS[0]);
  const [activeTool, setActiveTool] = useState<BuildTool>('TOWER');
  const [towerPresets, setTowerPresets] = useState<TowerPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showFlowField, setShowFlowField] = useState(true);
  const [obstacleEditMode, setObstacleEditMode] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Mobile-specific ergonomic state: tap-to-preview before placing & Intel bottom sheet
  const [pendingTile, setPendingTile] = useState<GridPoint | null>(null);
  const [mobileIntelOpen, setMobileIntelOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchTowerPresets()
      .then((list) => {
        if (mounted) setTowerPresets(list);
      })
      .catch((err) => {
        console.error('Failed to load saved tower presets:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeTowerPreset = useMemo(
    () =>
      activeTool === 'TOWER' && activePresetId
        ? towerPresets.find((p) => p.id === activePresetId) ?? null
        : null,
    [activeTool, activePresetId, towerPresets]
  );

  const engineRef = useRef<VectraEngine | null>(null);
  const syncHudRef = useRef<() => void>(() => {});

  if (!engineRef.current) {
    const engine = new VectraEngine(() => syncHudRef.current());
    engine.loadDemoBattle(MAP_PRESETS[0]);
    engineRef.current = engine;
  }

  const engine = engineRef.current;
  const [hud, setHud] = useState<HudSnapshot>(() => engine.getHudSnapshot());

  const syncHud = useCallback(() => {
    setHud(engine.getHudSnapshot());
  }, [engine]);

  syncHudRef.current = syncHud;

  useEffect(() => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      window.localStorage.setItem('vectra-theme', themeId);
    } catch {
      // Ignore storage write errors
    }
  }, [themeId]);

  const handleSelectTheme = useCallback((next: ThemeId) => {
    setThemeId(next);
  }, []);

  const handleCycleTheme = useCallback(() => {
    setThemeId((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  const handleSelectPreset = useCallback(
    (preset: MapPreset) => {
      setSelectedPreset(preset);
      engine.loadDemoBattle(preset);
      syncHud();
    },
    [engine, syncHud]
  );

  const handleStartGame = useCallback(() => {
    engine.loadPreset(selectedPreset);
    setActiveTool('TOWER');
    setActivePresetId(null);
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setPhase('PLAYING');
    syncHud();
  }, [engine, selectedPreset, syncHud]);

  const handleLoadSeed = useCallback(
    (seed: SeedPayload) => {
      engine.loadSeed(seed);
      setActiveTool('TOWER');
      setActivePresetId(null);
      setObstacleEditMode(false);
      setPendingTile(null);
      setMobileIntelOpen(false);
      setPhase('PLAYING');
      syncHud();
    },
    [engine, syncHud]
  );

  const handleReturnTitle = useCallback(() => {
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setActivePresetId(null);
    setPhase('TITLE_MENU');
    engine.loadDemoBattle(selectedPreset);
    syncHud();
  }, [engine, selectedPreset, syncHud]);

  const handleRestart = useCallback(() => {
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setActivePresetId(null);
    engine.resetSimulationState();
    setActiveTool('TOWER');
    syncHud();
  }, [engine, syncHud]);

  const handleSaveTowerPreset = useCallback(
    async (input: {
      name: string;
      trigger: TriggerType;
      payload: PayloadType;
      modifier: ModifierType;
    }) => {
      const created = await createTowerPreset(input);
      setTowerPresets((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
    },
    []
  );

  const handleDeleteTowerPreset = useCallback(async (id: string) => {
    await deleteTowerPreset(id);
    setTowerPresets((prev) => prev.filter((p) => p.id !== id));
    setActivePresetId((curr) => (curr === id ? null : curr));
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleTileTap = useCallback(
    (pt: GridPoint, isTouch: boolean) => {
      if (phase !== 'PLAYING' || engine.gameOutcome !== 'RUNNING') return;

      if (obstacleEditMode) {
        engine.toggleObstacle(pt.x, pt.y);
        setPendingTile(null);
        return;
      }

      // Clicking/tapping an existing entity selects it immediately for inspection/config
      const existing = engine.getEntityAt(pt.x, pt.y);
      if (existing) {
        setPendingTile(null);
        setMobileIntelOpen(false);
        engine.selectEntity(existing.id);
        return;
      }

      if (activeTool === 'INSPECT') {
        setPendingTile(null);
        setMobileIntelOpen(false);
        engine.selectEntity(null);
        return;
      }

      if (isTouch) {
        // Touch ergonomics: first tap previews path & range; tapping same tile again places immediately
        if (pendingTile && pendingTile.x === pt.x && pendingTile.y === pt.y) {
          const placed = engine.placeEntity(pt.x, pt.y, activeTool, activeTowerPreset);
          if (placed) {
            setPendingTile(null);
            // Keep board clear on mobile after placing so players can quickly chain-build their maze
            engine.selectEntity(null);
          }
        } else {
          engine.selectEntity(null);
          setMobileIntelOpen(false);
          setPendingTile(pt);
        }
        return;
      }

      // Desktop mouse click places immediately (hover already showed live preview)
      setPendingTile(null);
      engine.placeEntity(pt.x, pt.y, activeTool, activeTowerPreset);
    },
    [phase, engine, obstacleEditMode, activeTool, activeTowerPreset, pendingTile]
  );

  const handleConfirmPending = useCallback(() => {
    if (!pendingTile || activeTool === 'INSPECT') return;
    const placed = engine.placeEntity(pendingTile.x, pendingTile.y, activeTool, activeTowerPreset);
    if (placed) {
      setPendingTile(null);
      // Deselect immediately after touch build so the mobile bottom sheet doesn't pop up during mazing
      engine.selectEntity(null);
    }
  }, [engine, pendingTile, activeTool, activeTowerPreset]);

  const handleTileRightClick = useCallback(
    (pt: GridPoint) => {
      if (phase !== 'PLAYING') return;
      setPendingTile(null);
      if (obstacleEditMode) {
        setObstacleEditMode(false);
        return;
      }
      const existing = engine.getEntityAt(pt.x, pt.y);
      if (existing) {
        engine.selectEntity(existing.id);
      } else if (activeTool !== 'INSPECT') {
        setActivePresetId(null);
        setActiveTool('INSPECT');
      } else {
        engine.selectEntity(null);
      }
    },
    [phase, engine, obstacleEditMode, activeTool]
  );

  const handleUpdateModule = useCallback(
    (
      towerId: string,
      slot: 'trigger' | 'payload' | 'modifier',
      val: TriggerType | PayloadType | ModifierType
    ) => {
      engine.updateTowerModule(towerId, slot, val);
    },
    [engine]
  );

  const handleSetRules = useCallback(
    (towerId: string, rules: TargetRule[]) => {
      engine.setTowerRules(towerId, rules);
    },
    [engine]
  );

  const handleSell = useCallback(
    (entityId: string) => {
      engine.sellEntity(entityId);
    },
    [engine]
  );

  const pendingCheck = useMemo(() => {
    if (!pendingTile || activeTool === 'INSPECT') return null;
    const cost =
      activeTool === 'TOWER' && activeTowerPreset ? activeTowerPreset.cost : COSTS[activeTool];
    return engine.checkPlacement(pendingTile.x, pendingTile.y, cost);
    // Re-evaluate when hud updates (gold, enemies, wave, or grid changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, pendingTile, activeTool, activeTowerPreset, hud]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (seedModalOpen) {
        if (e.key === 'Escape') setSeedModalOpen(false);
        return;
      }

      if (phase === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.key === '1') {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActivePresetId(null);
        setActiveTool('TOWER');
      } else if (e.key === '2') {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActivePresetId(null);
        setActiveTool('OVERCLOCK');
      } else if (e.key === '3') {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActivePresetId(null);
        setActiveTool('PRISM');
      } else if (e.key === '4' && towerPresets.length > 0) {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActiveTool('TOWER');
        setActivePresetId((curr) => {
          if (!curr) return towerPresets[0].id;
          const idx = towerPresets.findIndex((p) => p.id === curr);
          return towerPresets[(idx + 1) % towerPresets.length].id;
        });
      } else if (e.key === 'Escape') {
        if (pendingTile) {
          setPendingTile(null);
        } else if (obstacleEditMode) {
          setObstacleEditMode(false);
        } else if (activePresetId) {
          setActivePresetId(null);
          setActiveTool('INSPECT');
        } else if (activeTool !== 'INSPECT') {
          setActiveTool('INSPECT');
        } else if (engine.selectedEntityId) {
          engine.selectEntity(null);
        } else if (mobileIntelOpen) {
          setMobileIntelOpen(false);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (engine.gameOutcome !== 'RUNNING') return;
        if (!engine.waveActive) {
          setObstacleEditMode(false);
          engine.startNextWave();
        } else {
          engine.togglePause();
        }
      } else if (e.key.toLowerCase() === 'f') {
        const nextSpeed: 1 | 2 | 4 =
          engine.simSpeed === 1 ? 2 : engine.simSpeed === 2 ? 4 : 1;
        engine.setSimSpeed(nextSpeed);
      } else if (e.key.toLowerCase() === 'r' && engine.selectedEntityId) {
        engine.sellEntity(engine.selectedEntityId);
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      } else if (e.key.toLowerCase() === 't') {
        handleCycleTheme();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    seedModalOpen,
    obstacleEditMode,
    activeTool,
    activePresetId,
    towerPresets,
    pendingTile,
    mobileIntelOpen,
    engine,
    handleStartGame,
    handleToggleMute,
    handleCycleTheme,
  ]);

  const canEditObstacles = !hud.waveActive && hud.waveIndex === 0 && engine.entities.size === 0;
  useEffect(() => {
    if (!canEditObstacles && obstacleEditMode) {
      setObstacleEditMode(false);
    }
  }, [canEditObstacles, obstacleEditMode]);

  const mobileSheetOpen = Boolean(hud.selectedEntityId) || mobileIntelOpen;

  return (
    <div className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      {phase === 'TITLE_MENU' ? (
        <div className="relative h-full w-full">
          <GameCanvas
            engine={engine}
            palette={palette}
            activeTool="INSPECT"
            showFlowField={true}
            obstacleEditMode={false}
            interactive={false}
            pendingTile={null}
            pendingCheck={null}
            onTileTap={handleTileTap}
            onConfirmPending={handleConfirmPending}
            onCancelPending={() => setPendingTile(null)}
            onTileRightClick={handleTileRightClick}
            onPeriodicSync={syncHud}
          />
          <TitleScreen
            selectedPresetId={selectedPreset.id}
            themeId={themeId}
            palette={palette}
            onSelectPreset={handleSelectPreset}
            onSelectTheme={handleSelectTheme}
            onStart={handleStartGame}
            onOpenSeedImport={() => setSeedModalOpen(true)}
          />
        </div>
      ) : (
        <>
          <TopHud
            hud={hud}
            palette={palette}
            showFlowField={showFlowField}
            muted={muted}
            onStartWave={() => {
              setObstacleEditMode(false);
              setPendingTile(null);
              engine.startNextWave();
            }}
            onTogglePause={() => engine.togglePause()}
            onSetSpeed={(spd) => engine.setSimSpeed(spd)}
            onToggleFlowField={() => setShowFlowField((v) => !v)}
            onCycleTheme={handleCycleTheme}
            onOpenSeedModal={() => setSeedModalOpen(true)}
            onToggleMute={handleToggleMute}
            onRestart={handleRestart}
            onReturnTitle={handleReturnTitle}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Playfield Column (100% width on mobile/tablet, flex-1 beside inspector on lg+) */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <main className="relative min-h-0 flex-1 overflow-hidden bg-[var(--bg-app)]">
                <GameCanvas
                  engine={engine}
                  palette={palette}
                  activeTool={activeTool}
                  activePreset={activeTowerPreset}
                  showFlowField={showFlowField}
                  obstacleEditMode={obstacleEditMode}
                  interactive={hud.gameOutcome === 'RUNNING'}
                  paused={hud.paused}
                  onResume={() => engine.togglePause()}
                  pendingTile={pendingTile}
                  pendingCheck={pendingCheck}
                  onTileTap={handleTileTap}
                  onConfirmPending={handleConfirmPending}
                  onCancelPending={() => setPendingTile(null)}
                  onTileRightClick={handleTileRightClick}
                  onPeriodicSync={syncHud}
                />
              </main>

              <BuildBar
                palette={palette}
                activeTool={activeTool}
                gold={hud.gold}
                canEditObstacles={canEditObstacles}
                obstacleEditMode={obstacleEditMode}
                mobileIntelOpen={mobileIntelOpen}
                presets={towerPresets}
                activePresetId={activePresetId}
                onSelectTool={(t) => {
                  setObstacleEditMode(false);
                  setMobileIntelOpen(false);
                  setPendingTile(null);
                  setActivePresetId(null);
                  setActiveTool(t);
                }}
                onSelectPreset={(presetId) => {
                  setObstacleEditMode(false);
                  setMobileIntelOpen(false);
                  setPendingTile(null);
                  setActiveTool('TOWER');
                  setActivePresetId(presetId);
                }}
                onDeletePreset={handleDeleteTowerPreset}
                onToggleObstacleEdit={() => {
                  setPendingTile(null);
                  setActivePresetId(null);
                  setObstacleEditMode((v) => !v);
                }}
                onToggleMobileIntel={() => {
                  setPendingTile(null);
                  engine.selectEntity(null);
                  setMobileIntelOpen((v) => !v);
                }}
              />
            </div>

            {/* Responsive Inspector: Fixed Sidebar on lg+, Slide-Up Bottom Sheet on mobile/tablet */}
            <InspectorPanel
              hud={hud}
              palette={palette}
              mobileSheetOpen={mobileSheetOpen}
              onUpdateModule={handleUpdateModule}
              onSetRules={handleSetRules}
              onSell={handleSell}
              onSavePreset={handleSaveTowerPreset}
              onCloseSelection={() => {
                engine.selectEntity(null);
                setMobileIntelOpen(false);
              }}
            />
          </div>

          {hud.gameOutcome !== 'RUNNING' && (
            <EndModal
              hud={hud}
              onPlayAgain={handleRestart}
              onReturnTitle={handleReturnTitle}
              onShareSeed={() => setSeedModalOpen(true)}
            />
          )}
        </>
      )}

      {seedModalOpen && (
        <SeedModal
          currentPayload={engine.exportSeedPayload()}
          onLoadSeed={handleLoadSeed}
          onClose={() => setSeedModalOpen(false)}
        />
      )}
    </div>
  );
}
