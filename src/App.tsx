import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/synth';
import { BuildBar } from './components/BuildBar';
import { EndModal } from './components/EndModal';
import { GameCanvas } from './components/GameCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { SeedModal } from './components/SeedModal';
import { TitleScreen } from './components/TitleScreen';
import { AUTO_WAVE_DURATIONS, AutoWaveDuration, TopHud } from './components/TopHud';
import { WaveCountdownOverlay } from './components/WaveCountdownOverlay';
import { VectraEngine } from './sim/engine';
import { COSTS, isFloorKind, rotateDirCW } from './sim/stats';
import { createTowerPreset, deleteTowerPreset, fetchTowerPresets } from './api/presets';
import {
  BuildTool,
  CardinalDir,
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
import { MAP_PRESETS, ShuffleDensity, generateShuffledLayout } from './sim/waves';
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

function readInitialAutoWaveEnabled(): boolean {
  try {
    const saved = window.localStorage.getItem('vectra-auto-wave');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // Ignore storage access errors
  }
  return true;
}

function readInitialAutoWaveDuration(): AutoWaveDuration {
  try {
    const saved = Number(window.localStorage.getItem('vectra-auto-wave-duration'));
    if (AUTO_WAVE_DURATIONS.includes(saved as AutoWaveDuration)) {
      return saved as AutoWaveDuration;
    }
  } catch {
    // Ignore storage access errors
  }
  return 15;
}

function readInitialAutoStartWave1(): boolean {
  try {
    return window.localStorage.getItem('vectra-auto-wave-w1') === 'true';
  } catch {
    // Ignore storage access errors
  }
  return false;
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
  const [shuffleDensity, setShuffleDensity] = useState<ShuffleDensity>('ANY');
  const [activeTool, setActiveTool] = useState<BuildTool>('TOWER');
  const [conveyorDir, setConveyorDir] = useState<CardinalDir>('N');
  const [towerPresets, setTowerPresets] = useState<TowerPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showFlowField, setShowFlowField] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [obstacleEditMode, setObstacleEditMode] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  // Mobile-specific ergonomic state: tap-to-preview before placing & Intel bottom sheet
  const [pendingTile, setPendingTile] = useState<GridPoint | null>(null);
  const [mobileIntelOpen, setMobileIntelOpen] = useState(false);

  // Optional Next-Wave Countdown Timer state
  const [autoWaveEnabled, setAutoWaveEnabled] = useState<boolean>(readInitialAutoWaveEnabled);
  const [autoWaveDuration, setAutoWaveDuration] = useState<AutoWaveDuration>(
    readInitialAutoWaveDuration
  );
  const [autoStartWave1, setAutoStartWave1] = useState<boolean>(readInitialAutoStartWave1);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [countdownTotal, setCountdownTotal] = useState<number>(readInitialAutoWaveDuration);
  const [countdownHeld, setCountdownHeld] = useState<boolean>(false);
  const countdownRemainingRef = useRef<number | null>(null);
  const lastCountdownPipRef = useRef<number>(4);
  const prevWaveActiveRef = useRef<boolean>(false);

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

  const handleShuffleTitleLayout = useCallback(
    (densityOverride?: ShuffleDensity) => {
      const next = generateShuffledLayout(densityOverride ?? shuffleDensity);
      setSelectedPreset(next);
      engine.loadDemoBattle(next);
      syncHud();
    },
    [engine, syncHud, shuffleDensity]
  );

  const handleSelectShuffleDensity = useCallback(
    (nextDensity: ShuffleDensity) => {
      setShuffleDensity(nextDensity);
      handleShuffleTitleLayout(nextDensity);
    },
    [handleShuffleTitleLayout]
  );

  const setCountdownValue = useCallback((nextRemaining: number | null, nextTotal?: number) => {
    countdownRemainingRef.current = nextRemaining;
    lastCountdownPipRef.current = nextRemaining !== null ? Math.ceil(nextRemaining) + 1 : 4;
    setCountdownRemaining(nextRemaining);
    if (nextTotal !== undefined) {
      setCountdownTotal(nextTotal);
    }
  }, []);

  const resetCountdownForFreshMatch = useCallback(
    (enabled: boolean, duration: AutoWaveDuration, includeWave1: boolean) => {
      prevWaveActiveRef.current = false;
      setCountdownHeld(false);
      if (enabled && includeWave1) {
        setCountdownValue(duration, duration);
      } else {
        setCountdownValue(null, duration);
      }
    },
    [setCountdownValue]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem('vectra-auto-wave', String(autoWaveEnabled));
    } catch {
      // Ignore storage write errors
    }
  }, [autoWaveEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem('vectra-auto-wave-duration', String(autoWaveDuration));
    } catch {
      // Ignore storage write errors
    }
  }, [autoWaveDuration]);

  useEffect(() => {
    try {
      window.localStorage.setItem('vectra-auto-wave-w1', String(autoStartWave1));
    } catch {
      // Ignore storage write errors
    }
  }, [autoStartWave1]);

  const handleShuffleBoard = useCallback(() => {
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setActivePresetId(null);
    const next = engine.shuffleLayout(undefined, shuffleDensity);
    setSelectedPreset(next);
    resetCountdownForFreshMatch(autoWaveEnabled, autoWaveDuration, autoStartWave1);
    syncHud();
  }, [
    engine,
    shuffleDensity,
    syncHud,
    resetCountdownForFreshMatch,
    autoWaveEnabled,
    autoWaveDuration,
    autoStartWave1,
  ]);

  const handleStartGame = useCallback(() => {
    engine.loadPreset(selectedPreset);
    setActiveTool('TOWER');
    setActivePresetId(null);
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setPhase('PLAYING');
    resetCountdownForFreshMatch(autoWaveEnabled, autoWaveDuration, autoStartWave1);
    syncHud();
  }, [
    engine,
    selectedPreset,
    syncHud,
    resetCountdownForFreshMatch,
    autoWaveEnabled,
    autoWaveDuration,
    autoStartWave1,
  ]);

  const handleLoadSeed = useCallback(
    (seed: SeedPayload) => {
      engine.loadSeed(seed);
      setActiveTool('TOWER');
      setActivePresetId(null);
      setObstacleEditMode(false);
      setPendingTile(null);
      setMobileIntelOpen(false);
      setPhase('PLAYING');
      resetCountdownForFreshMatch(autoWaveEnabled, autoWaveDuration, autoStartWave1);
      syncHud();
    },
    [engine, syncHud, resetCountdownForFreshMatch, autoWaveEnabled, autoWaveDuration, autoStartWave1]
  );

  const handleReturnTitle = useCallback(() => {
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setActivePresetId(null);
    prevWaveActiveRef.current = false;
    setCountdownHeld(false);
    setCountdownValue(null);
    setPhase('TITLE_MENU');
    engine.loadDemoBattle(selectedPreset);
    syncHud();
  }, [engine, selectedPreset, syncHud, setCountdownValue]);

  const handleRestart = useCallback(() => {
    setObstacleEditMode(false);
    setPendingTile(null);
    setMobileIntelOpen(false);
    setActivePresetId(null);
    engine.resetSimulationState();
    setActiveTool('TOWER');
    resetCountdownForFreshMatch(autoWaveEnabled, autoWaveDuration, autoStartWave1);
    syncHud();
  }, [
    engine,
    syncHud,
    resetCountdownForFreshMatch,
    autoWaveEnabled,
    autoWaveDuration,
    autoStartWave1,
  ]);

  const handleLaunchWave = useCallback(() => {
    setObstacleEditMode(false);
    setPendingTile(null);
    setCountdownHeld(false);
    setCountdownValue(null);
    engine.startNextWave();
  }, [engine, setCountdownValue]);

  const handleToggleAutoWave = useCallback(() => {
    const next = !autoWaveEnabled;
    setAutoWaveEnabled(next);
    if (!next) {
      setCountdownHeld(false);
      setCountdownValue(null);
    } else if (
      phase === 'PLAYING' &&
      !engine.waveActive &&
      engine.gameOutcome === 'RUNNING' &&
      engine.waveIndex < engine.waves.length &&
      (engine.waveIndex > 0 || autoStartWave1)
    ) {
      setCountdownHeld(false);
      setCountdownValue(autoWaveDuration, autoWaveDuration);
    }
  }, [autoWaveEnabled, phase, engine, autoStartWave1, autoWaveDuration, setCountdownValue]);

  const handleSetAutoWaveDuration = useCallback(
    (nextDuration: AutoWaveDuration) => {
      setAutoWaveDuration(nextDuration);
      if (countdownRemainingRef.current !== null) {
        setCountdownValue(nextDuration, nextDuration);
      } else {
        setCountdownTotal(nextDuration);
      }
    },
    [setCountdownValue]
  );

  const handleToggleAutoStartWave1 = useCallback(() => {
    const next = !autoStartWave1;
    setAutoStartWave1(next);
    if (
      next &&
      autoWaveEnabled &&
      phase === 'PLAYING' &&
      !engine.waveActive &&
      engine.waveIndex === 0 &&
      engine.gameOutcome === 'RUNNING' &&
      countdownRemainingRef.current === null
    ) {
      setCountdownHeld(false);
      setCountdownValue(autoWaveDuration, autoWaveDuration);
    }
  }, [autoStartWave1, autoWaveEnabled, phase, engine, autoWaveDuration, setCountdownValue]);

  const handleStartCountdownNow = useCallback(() => {
    if (
      phase !== 'PLAYING' ||
      engine.waveActive ||
      engine.gameOutcome !== 'RUNNING' ||
      engine.waveIndex >= engine.waves.length
    ) {
      return;
    }
    setAutoWaveEnabled(true);
    setCountdownHeld(false);
    setCountdownValue(autoWaveDuration, autoWaveDuration);
  }, [phase, engine, autoWaveDuration, setCountdownValue]);

  const handleToggleCountdownHold = useCallback(() => {
    if (countdownRemainingRef.current === null) return;
    setCountdownHeld((v) => !v);
  }, []);

  const handleExtendCountdown = useCallback(
    (seconds: number) => {
      const curr = countdownRemainingRef.current;
      if (curr === null) return;
      const next = Math.min(60, curr + seconds);
      setCountdownTotal((prevTotal) => Math.max(prevTotal, next));
      setCountdownValue(next);
    },
    [setCountdownValue]
  );

  // Detect wave clear transitions (waveActive: true -> false) to auto-start the prep countdown
  useEffect(() => {
    if (phase !== 'PLAYING') {
      prevWaveActiveRef.current = false;
      return;
    }

    if (hud.waveActive || hud.gameOutcome !== 'RUNNING' || !hud.nextWaveSummary) {
      if (countdownRemainingRef.current !== null) {
        setCountdownHeld(false);
        setCountdownValue(null);
      }
    } else if (prevWaveActiveRef.current && autoWaveEnabled) {
      setCountdownHeld(false);
      setCountdownValue(autoWaveDuration, autoWaveDuration);
    }

    prevWaveActiveRef.current = hud.waveActive;
  }, [
    phase,
    hud.waveActive,
    hud.gameOutcome,
    hud.nextWaveSummary,
    autoWaveEnabled,
    autoWaveDuration,
    setCountdownValue,
  ]);

  const countdownAutoPausedReason = obstacleEditMode
    ? 'editing walls'
    : seedModalOpen
    ? 'seed modal'
    : hud.paused
    ? 'game paused'
    : null;

  const isCountdownTicking =
    phase === 'PLAYING' &&
    !hud.waveActive &&
    hud.gameOutcome === 'RUNNING' &&
    Boolean(hud.nextWaveSummary) &&
    countdownRemaining !== null &&
    !countdownHeld &&
    !countdownAutoPausedReason;

  // Real-time (1x wall-clock) countdown rAF ticker so 2x/4x speed never eats prep time
  useEffect(() => {
    if (!isCountdownTicking) return;

    let rafId = 0;
    let lastNow = performance.now();
    let uiAccum = 0;

    const step = (now: number) => {
      const dt = Math.min(Math.max((now - lastNow) / 1000, 0), 0.1);
      lastNow = now;

      const curr = countdownRemainingRef.current;
      if (curr === null) return;

      const next = Math.max(0, curr - dt);
      countdownRemainingRef.current = next;

      if (next > 0 && next <= 3.0) {
        const ceilSec = Math.ceil(next);
        if (ceilSec < lastCountdownPipRef.current && ceilSec >= 1) {
          lastCountdownPipRef.current = ceilSec;
          soundEngine.play('COUNTDOWN_TICK', ceilSec === 1 ? 1.15 : 0.85);
        }
      }

      if (next <= 0) {
        countdownRemainingRef.current = null;
        setCountdownHeld(false);
        setCountdownRemaining(null);
        setObstacleEditMode(false);
        setPendingTile(null);
        engine.startNextWave();
        return;
      }

      uiAccum += dt;
      if (uiAccum >= 0.05) {
        uiAccum = 0;
        setCountdownRemaining(next);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isCountdownTicking, engine]);

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
          const placed = engine.placeEntity(
            pt.x,
            pt.y,
            activeTool,
            activeTowerPreset,
            conveyorDir
          );
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
      engine.placeEntity(pt.x, pt.y, activeTool, activeTowerPreset, conveyorDir);
    },
    [phase, engine, obstacleEditMode, activeTool, activeTowerPreset, conveyorDir, pendingTile]
  );

  const handleConfirmPending = useCallback(() => {
    if (!pendingTile || activeTool === 'INSPECT') return;
    const placed = engine.placeEntity(
      pendingTile.x,
      pendingTile.y,
      activeTool,
      activeTowerPreset,
      conveyorDir
    );
    if (placed) {
      setPendingTile(null);
      // Deselect immediately after touch build so the mobile bottom sheet doesn't pop up during mazing
      engine.selectEntity(null);
    }
  }, [engine, pendingTile, activeTool, activeTowerPreset, conveyorDir]);

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

  const handleRotateConveyor = useCallback(() => {
    setConveyorDir((d) => rotateDirCW(d));
  }, []);

  const handleSetFloorDirection = useCallback(
    (entityId: string, dir: CardinalDir) => {
      engine.setFloorDirection(entityId, dir);
    },
    [engine]
  );

  const handleUpdateMinePayload = useCallback(
    (entityId: string, payload: PayloadType) => {
      engine.updateMinePayload(entityId, payload);
    },
    [engine]
  );

  const pendingCheck = useMemo(() => {
    if (!pendingTile || activeTool === 'INSPECT') return null;
    const cost =
      activeTool === 'TOWER' && activeTowerPreset ? activeTowerPreset.cost : COSTS[activeTool];
    return engine.checkPlacement(pendingTile.x, pendingTile.y, cost, isFloorKind(activeTool));
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
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleShuffleTitleLayout();
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
      } else if (e.key === '4') {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActivePresetId(null);
        setActiveTool('STASIS');
      } else if (e.key === '5') {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActivePresetId(null);
        setActiveTool('CONVEYOR');
      } else if (e.key === '6') {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActivePresetId(null);
        setActiveTool('MINE');
      } else if (e.key === '7' && towerPresets.length > 0) {
        setObstacleEditMode(false);
        setPendingTile(null);
        setActiveTool('TOWER');
        setActivePresetId((curr) => {
          if (!curr) return towerPresets[0].id;
          const idx = towerPresets.findIndex((p) => p.id === curr);
          return towerPresets[(idx + 1) % towerPresets.length].id;
        });
      } else if (e.key.toLowerCase() === 'q') {
        const selectedEnt = engine.selectedEntityId
          ? engine.entities.get(engine.selectedEntityId)
          : null;
        if (selectedEnt && selectedEnt.kind === 'CONVEYOR' && activeTool !== 'CONVEYOR') {
          engine.rotateFloorEntity(selectedEnt.id);
        } else {
          setConveyorDir((d) => rotateDirCW(d));
        }
      } else if (e.key.toLowerCase() === 's' && !engine.waveActive && engine.waveIndex === 0) {
        handleShuffleBoard();
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
          handleLaunchWave();
        } else {
          engine.togglePause();
        }
      } else if (e.key.toLowerCase() === 'a') {
        handleToggleAutoWave();
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
      } else if (e.key.toLowerCase() === 'h') {
        setShowHeatmap((v) => !v);
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
    handleShuffleTitleLayout,
    handleShuffleBoard,
    handleLaunchWave,
    handleToggleAutoWave,
    handleToggleMute,
    handleCycleTheme,
  ]);

  const canEditObstacles = !hud.waveActive && hud.waveIndex === 0 && engine.entities.size === 0;
  const canShuffleBoard = !hud.waveActive && hud.waveIndex === 0;
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
            selectedPreset={selectedPreset}
            shuffleDensity={shuffleDensity}
            themeId={themeId}
            palette={palette}
            onSelectPreset={handleSelectPreset}
            onShuffleLayout={handleShuffleTitleLayout}
            onSelectShuffleDensity={handleSelectShuffleDensity}
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
            showHeatmap={showHeatmap}
            muted={muted}
            autoWaveEnabled={autoWaveEnabled}
            autoWaveDuration={autoWaveDuration}
            autoStartWave1={autoStartWave1}
            countdownRemaining={countdownRemaining}
            countdownTotal={countdownTotal}
            countdownHeld={countdownHeld}
            onStartWave={handleLaunchWave}
            onTogglePause={() => engine.togglePause()}
            onSetSpeed={(spd) => engine.setSimSpeed(spd)}
            onToggleAutoWave={handleToggleAutoWave}
            onSetAutoWaveDuration={handleSetAutoWaveDuration}
            onToggleAutoStartWave1={handleToggleAutoStartWave1}
            onStartCountdownNow={handleStartCountdownNow}
            onToggleCountdownHold={handleToggleCountdownHold}
            onExtendCountdown={handleExtendCountdown}
            onToggleFlowField={() => setShowFlowField((v) => !v)}
            onToggleHeatmap={() => setShowHeatmap((v) => !v)}
            onCycleTheme={handleCycleTheme}
            onShuffleBoard={handleShuffleBoard}
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
                  conveyorDir={conveyorDir}
                  onRotateConveyor={handleRotateConveyor}
                  showFlowField={showFlowField}
                  showHeatmap={showHeatmap}
                  maxTileDamage={hud.maxTileDamage}
                  hotTileCount={hud.hotTileCount}
                  onClearHeatmap={() => engine.clearHeatmap()}
                  onCloseHeatmap={() => setShowHeatmap(false)}
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

                {!hud.waveActive &&
                  hud.gameOutcome === 'RUNNING' &&
                  hud.nextWaveSummary &&
                  countdownRemaining !== null && (
                    <WaveCountdownOverlay
                      hud={hud}
                      remaining={countdownRemaining}
                      total={countdownTotal}
                      held={countdownHeld}
                      autoPausedReason={countdownAutoPausedReason}
                      hideMobileBar={Boolean(pendingTile && activeTool !== 'INSPECT')}
                      onToggleHold={handleToggleCountdownHold}
                      onExtend={handleExtendCountdown}
                      onStartNow={handleLaunchWave}
                      onDisableAutoWave={handleToggleAutoWave}
                    />
                  )}
              </main>

              <BuildBar
                palette={palette}
                activeTool={activeTool}
                conveyorDir={conveyorDir}
                gold={hud.gold}
                canEditObstacles={canEditObstacles}
                canShuffleBoard={canShuffleBoard}
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
                onRotateConveyor={handleRotateConveyor}
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
                onShuffleBoard={handleShuffleBoard}
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
              autoWaveEnabled={autoWaveEnabled}
              autoWaveDuration={autoWaveDuration}
              countdownRemaining={countdownRemaining}
              countdownTotal={countdownTotal}
              countdownHeld={countdownHeld}
              onToggleAutoWave={handleToggleAutoWave}
              onStartCountdownNow={handleStartCountdownNow}
              onToggleCountdownHold={handleToggleCountdownHold}
              onExtendCountdown={handleExtendCountdown}
              onUpdateModule={handleUpdateModule}
              onSetRules={handleSetRules}
              onSetFloorDirection={handleSetFloorDirection}
              onUpdateMinePayload={handleUpdateMinePayload}
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
              onShuffleNew={handleShuffleBoard}
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
