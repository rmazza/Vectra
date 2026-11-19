import { EnemyType, PayloadType, TriggerType } from '../sim/types';

export type ThemeId = 'foundry' | 'paper' | 'phosphor';

export interface ThemePalette {
  id: ThemeId;
  label: string;
  shortLabel: string;
  isLight: boolean;
  // Canvas backdrop & arena deck
  outerBgInner: string;
  outerBgOuter: string;
  deckGradStart: string;
  deckGradMid: string;
  deckGradEnd: string;
  checkerTile: string;
  gridLine: string;
  crosshair: string;
  boardFrame: string;
  boardCorner: string;
  // Obstacles
  obstacleShadow: string;
  obstacleTop: string;
  obstacleMid: string;
  obstacleBot: string;
  obstacleRim: string;
  obstacleHighlight: string;
  obstacleInsetFill: string;
  obstacleInsetStroke: string;
  obstacleSeam: string;
  // Flow field & path
  flowArrow: string;
  pathGlow: string;
  pathLine: string;
  pathMoteGlow: string;
  pathMoteCore: string;
  previewPathGlow: string;
  previewPathLine: string;
  previewMoteGlow: string;
  previewMoteCore: string;
  // Spawn & Goal
  spawnBg: string;
  spawnStroke: string;
  spawnRing: string;
  spawnInnerRingRgb: string;
  spawnCore: string;
  spawnFloorGlow: string;
  goalBg: string;
  goalStroke: string;
  goalArcLit: string;
  goalArcDim: string;
  goalDiamondStroke: string;
  goalDiamondFillRgb: string;
  goalNucleus: string;
  goalFloorGlow: string;
  // Entities: Towers & Utility Nodes
  entityShadow: string;
  towerBodyTop: string;
  towerBodyMid: string;
  towerBodyBot: string;
  towerBorderDefault: string;
  towerBorderSelected: string;
  towerSocketFill: string;
  towerSocketStroke: string;
  towerBarrelFill: string;
  towerCoreSpec: string;
  chainCoilColor: string;
  overclock: string;
  overclockLight: string;
  overclockCore: string;
  overclockBodyTop: string;
  overclockBodyBot: string;
  overclockFloorGlow: string;
  overclockRailGlow: string;
  overclockRailDash: string;
  prism: string;
  prismLight: string;
  prismCore: string;
  prismChromatic: string;
  prismBodyTop: string;
  prismBodyBot: string;
  prismFloorRgb: string;
  prismRelayLine: string;
  // Modules
  triggers: Record<TriggerType, string>;
  payloads: Record<PayloadType, string>;
  payloadFloorGlows: Record<PayloadType, string>;
  payloadCoreGlows: Record<PayloadType, string>;
  // Enemies & combat
  enemies: Record<EnemyType, string>;
  enemyArmorFill: string;
  enemyArmorCore: string;
  enemyArmorSpec: string;
  enemyShieldedFill: string;
  enemyShieldedCore: string;
  enemySwarmSpec: string;
  enemyHitFlash: string;
  shieldColor: string;
  shieldArc: string;
  shieldGlow: string;
  slowStatus: string;
  shredStatus: string;
  hpBarBg: string;
  hpBarBorder: string;
  hpBarGood: string;
  hpBarMid: string;
  hpBarLow: string;
  hpBarTrail: string;
  beamCore: string;
  beamFloorGlow: string;
  beamRelayFloorGlow: string;
  // Feedback & placement
  validColor: string;
  validFill: string;
  validText: string;
  validBracket: string;
  invalidColor: string;
  invalidFill: string;
  invalidText: string;
  invalidBracket: string;
  tooltipBg: string;
  floatingTextShadow: string;
  goldText: string;
  waveClearText: string;
  breachText: string;
  sellBurst: string;
  // Preview swatches for UI switcher
  swatches: [string, string, string];
}

export const THEME_ORDER: ThemeId[] = ['foundry', 'paper', 'phosphor'];

export const PALETTES: Record<ThemeId, ThemePalette> = {
  // 1. CARBON FOUNDRY (Default): Industrial matte warm carbon, warm bone ink, Acid Volt, Signal Vermilion, Burnished Brass, Frost Cobalt, Quartz Violet
  foundry: {
    id: 'foundry',
    label: 'Carbon Foundry',
    shortLabel: 'Foundry',
    isLight: false,
    outerBgInner: '#181715',
    outerBgOuter: '#0D0C0B',
    deckGradStart: '#141311',
    deckGradMid: '#11100E',
    deckGradEnd: '#161512',
    checkerTile: 'rgba(242, 239, 233, 0.028)',
    gridLine: 'rgba(156, 150, 139, 0.14)',
    crosshair: 'rgba(212, 204, 190, 0.24)',
    boardFrame: '#38352F',
    boardCorner: '#D4FF2A',

    obstacleShadow: 'rgba(0, 0, 0, 0.7)',
    obstacleTop: '#33302B',
    obstacleMid: '#262420',
    obstacleBot: '#1B1917',
    obstacleRim: '#4A453D',
    obstacleHighlight: 'rgba(242, 239, 233, 0.24)',
    obstacleInsetFill: '#151412',
    obstacleInsetStroke: 'rgba(120, 113, 102, 0.45)',
    obstacleSeam: 'rgba(92, 86, 77, 0.5)',

    flowArrow: 'rgba(212, 255, 42, 0.22)',
    pathGlow: 'rgba(212, 255, 42, 0.11)',
    pathLine: 'rgba(212, 255, 42, 0.42)',
    pathMoteGlow: 'rgba(212, 255, 42, 0.52)',
    pathMoteCore: '#F4FFBA',
    previewPathGlow: 'rgba(69, 230, 166, 0.22)',
    previewPathLine: 'rgba(69, 230, 166, 0.88)',
    previewMoteGlow: 'rgba(69, 230, 166, 0.65)',
    previewMoteCore: '#D1FAE5',

    spawnBg: 'rgba(212, 255, 42, 0.1)',
    spawnStroke: 'rgba(212, 255, 42, 0.72)',
    spawnRing: '#D4FF2A',
    spawnInnerRingRgb: '212, 255, 42',
    spawnCore: '#F4FFBA',
    spawnFloorGlow: 'rgba(212, 255, 42, 0.15)',

    goalBg: 'rgba(255, 77, 46, 0.13)',
    goalStroke: 'rgba(255, 77, 46, 0.8)',
    goalArcLit: '#FF5E42',
    goalArcDim: 'rgba(130, 122, 112, 0.34)',
    goalDiamondStroke: '#FF9E8A',
    goalDiamondFillRgb: '255, 77, 46',
    goalNucleus: '#FFF1ED',
    goalFloorGlow: 'rgba(255, 77, 46, 0.18)',

    entityShadow: 'rgba(0, 0, 0, 0.72)',
    towerBodyTop: '#33302A',
    towerBodyMid: '#24221E',
    towerBodyBot: '#191714',
    towerBorderDefault: '#544F46',
    towerBorderSelected: '#F5F2EB',
    towerSocketFill: '#11100E',
    towerSocketStroke: 'rgba(156, 150, 139, 0.32)',
    towerBarrelFill: '#141311',
    towerCoreSpec: '#FAF8F5',
    chainCoilColor: '#6BA3FF',

    overclock: '#F5B841',
    overclockLight: '#FDE073',
    overclockCore: '#FEF6C7',
    overclockBodyTop: '#352B19',
    overclockBodyBot: '#1B1711',
    overclockFloorGlow: 'rgba(245, 184, 65, 0.14)',
    overclockRailGlow: 'rgba(245, 184, 65, 0.38)',
    overclockRailDash: 'rgba(253, 224, 115, 0.88)',

    prism: '#B37BFF',
    prismLight: '#D8B4FE',
    prismCore: '#FAF5FF',
    prismChromatic: 'rgba(212, 255, 42, 0.55)',
    prismBodyTop: '#2A1F36',
    prismBodyBot: '#16131C',
    prismFloorRgb: '179, 123, 255',
    prismRelayLine: 'rgba(179, 123, 255, 0.6)',

    triggers: {
      PULSE: '#D4FF2A',
      BEAM: '#FF4D2E',
      NOVA: '#F5B841',
    },
    payloads: {
      KINETIC: '#FF6B35',
      CRYO: '#6BA3FF',
      CORRODE: '#C8FF2E',
    },
    payloadFloorGlows: {
      KINETIC: 'rgba(255, 107, 53, 0.085)',
      CRYO: 'rgba(107, 163, 255, 0.095)',
      CORRODE: 'rgba(200, 255, 46, 0.085)',
    },
    payloadCoreGlows: {
      KINETIC: 'rgba(255, 107, 53, 0.42)',
      CRYO: 'rgba(107, 163, 255, 0.45)',
      CORRODE: 'rgba(200, 255, 46, 0.42)',
    },

    enemies: {
      SWARM: '#45E6A6',
      ARMOR: '#FF5733',
      SHIELDED: '#C084FC',
    },
    enemyArmorFill: '#451408',
    enemyArmorCore: '#FF704D',
    enemyArmorSpec: '#FFE4DC',
    enemyShieldedFill: '#2E1047',
    enemyShieldedCore: '#E9D5FF',
    enemySwarmSpec: '#E8FFF5',
    enemyHitFlash: '#FAF8F5',

    shieldColor: '#6BA3FF',
    shieldArc: '#A8CCFF',
    shieldGlow: 'rgba(107, 163, 255, 0.24)',
    slowStatus: '#6BA3FF',
    shredStatus: '#C8FF2E',
    hpBarBg: 'rgba(13, 12, 11, 0.92)',
    hpBarBorder: 'rgba(242, 239, 233, 0.28)',
    hpBarGood: '#2EE67B',
    hpBarMid: '#FACC15',
    hpBarLow: '#FF3B30',
    hpBarTrail: '#FFF3C4',

    beamCore: '#FFFDF7',
    beamFloorGlow: 'rgba(255, 107, 53, 0.2)',
    beamRelayFloorGlow: 'rgba(179, 123, 255, 0.24)',

    validColor: '#45E6A6',
    validFill: 'rgba(69, 230, 166, 0.16)',
    validText: '#A7F3D0',
    validBracket: '#A7F3D0',
    invalidColor: '#FF4D2E',
    invalidFill: 'rgba(255, 77, 46, 0.2)',
    invalidText: '#FFD1C7',
    invalidBracket: '#FFD1C7',
    tooltipBg: 'rgba(17, 16, 14, 0.96)',
    floatingTextShadow: '#0D0C0B',
    goldText: '#F5B841',
    waveClearText: '#D4FF2A',
    breachText: '#FF5E42',
    sellBurst: '#9C968B',
    swatches: ['#181715', '#D4FF2A', '#FF4D2E'],
  },

  // 2. RISOGRAPH PAPER (Light Mode): Warm archival Swiss drafting paper, sumi ink, Vermilion, Cobalt, Emerald, Ochre
  paper: {
    id: 'paper',
    label: 'Risograph Paper',
    shortLabel: 'Paper',
    isLight: true,
    outerBgInner: '#ECE6DA',
    outerBgOuter: '#E2DBD0',
    deckGradStart: '#F8F4EC',
    deckGradMid: '#F5F1E7',
    deckGradEnd: '#F2EDE2',
    checkerTile: 'rgba(24, 23, 21, 0.028)',
    gridLine: 'rgba(24, 23, 21, 0.11)',
    crosshair: 'rgba(24, 23, 21, 0.26)',
    boardFrame: '#8E8679',
    boardCorner: '#E03A26',

    obstacleShadow: 'rgba(24, 23, 21, 0.24)',
    obstacleTop: '#36332E',
    obstacleMid: '#282622',
    obstacleBot: '#1B1917',
    obstacleRim: '#181715',
    obstacleHighlight: 'rgba(248, 244, 236, 0.28)',
    obstacleInsetFill: '#201E1B',
    obstacleInsetStroke: 'rgba(248, 244, 236, 0.16)',
    obstacleSeam: 'rgba(248, 244, 236, 0.14)',

    flowArrow: 'rgba(31, 94, 255, 0.26)',
    pathGlow: 'rgba(31, 94, 255, 0.12)',
    pathLine: 'rgba(31, 94, 255, 0.55)',
    pathMoteGlow: 'rgba(31, 94, 255, 0.35)',
    pathMoteCore: '#1F5EFF',
    previewPathGlow: 'rgba(15, 140, 94, 0.18)',
    previewPathLine: 'rgba(15, 140, 94, 0.85)',
    previewMoteGlow: 'rgba(15, 140, 94, 0.35)',
    previewMoteCore: '#0F8C5E',

    spawnBg: 'rgba(31, 94, 255, 0.09)',
    spawnStroke: 'rgba(31, 94, 255, 0.72)',
    spawnRing: '#1F5EFF',
    spawnInnerRingRgb: '31, 94, 255',
    spawnCore: '#1F5EFF',
    spawnFloorGlow: 'rgba(31, 94, 255, 0.1)',

    goalBg: 'rgba(224, 58, 38, 0.1)',
    goalStroke: 'rgba(224, 58, 38, 0.78)',
    goalArcLit: '#E03A26',
    goalArcDim: 'rgba(24, 23, 21, 0.22)',
    goalDiamondStroke: '#E03A26',
    goalDiamondFillRgb: '224, 58, 38',
    goalNucleus: '#FFF5F2',
    goalFloorGlow: 'rgba(224, 58, 38, 0.11)',

    entityShadow: 'rgba(24, 23, 21, 0.22)',
    towerBodyTop: '#FFFFFF',
    towerBodyMid: '#F5F0E6',
    towerBodyBot: '#E6DFD1',
    towerBorderDefault: '#3A3630',
    towerBorderSelected: '#1F5EFF',
    towerSocketFill: '#22201D',
    towerSocketStroke: 'rgba(24, 23, 21, 0.3)',
    towerBarrelFill: '#22201D',
    towerCoreSpec: '#FFFFFF',
    chainCoilColor: '#1F5EFF',

    overclock: '#C97F00',
    overclockLight: '#E59B10',
    overclockCore: '#FFF8E1',
    overclockBodyTop: '#FFF6DE',
    overclockBodyBot: '#F2DFA8',
    overclockFloorGlow: 'rgba(201, 127, 0, 0.1)',
    overclockRailGlow: 'rgba(201, 127, 0, 0.25)',
    overclockRailDash: 'rgba(180, 108, 0, 0.9)',

    prism: '#7C3AED',
    prismLight: '#9D5CFF',
    prismCore: '#FFFFFF',
    prismChromatic: 'rgba(31, 94, 255, 0.5)',
    prismBodyTop: '#F3ECFF',
    prismBodyBot: '#DFCFFE',
    prismFloorRgb: '124, 58, 237',
    prismRelayLine: 'rgba(124, 58, 237, 0.65)',

    triggers: {
      PULSE: '#1F5EFF',
      BEAM: '#E03A26',
      NOVA: '#C97F00',
    },
    payloads: {
      KINETIC: '#E04D1F',
      CRYO: '#1F5EFF',
      CORRODE: '#0F8C5E',
    },
    payloadFloorGlows: {
      KINETIC: 'rgba(224, 77, 31, 0.06)',
      CRYO: 'rgba(31, 94, 255, 0.06)',
      CORRODE: 'rgba(15, 140, 94, 0.06)',
    },
    payloadCoreGlows: {
      KINETIC: 'rgba(224, 77, 31, 0.28)',
      CRYO: 'rgba(31, 94, 255, 0.28)',
      CORRODE: 'rgba(15, 140, 94, 0.28)',
    },

    enemies: {
      SWARM: '#0F8C5E',
      ARMOR: '#D63222',
      SHIELDED: '#7C3AED',
    },
    enemyArmorFill: '#4A120C',
    enemyArmorCore: '#E84A3A',
    enemyArmorSpec: '#FFF1EE',
    enemyShieldedFill: '#2E1065',
    enemyShieldedCore: '#DDD6FE',
    enemySwarmSpec: '#FFFFFF',
    enemyHitFlash: '#FFFFFF',

    shieldColor: '#1F5EFF',
    shieldArc: '#1F5EFF',
    shieldGlow: 'rgba(31, 94, 255, 0.16)',
    slowStatus: '#1F5EFF',
    shredStatus: '#0F8C5E',
    hpBarBg: 'rgba(24, 23, 21, 0.88)',
    hpBarBorder: 'rgba(24, 23, 21, 0.72)',
    hpBarGood: '#16A34A',
    hpBarMid: '#EAB308',
    hpBarLow: '#DC2626',
    hpBarTrail: '#FEF08A',

    beamCore: '#FFFFFF',
    beamFloorGlow: 'rgba(224, 58, 38, 0.14)',
    beamRelayFloorGlow: 'rgba(124, 58, 237, 0.16)',

    validColor: '#0F8C5E',
    validFill: 'rgba(15, 140, 94, 0.15)',
    validText: '#A7F3D0',
    validBracket: '#0F8C5E',
    invalidColor: '#E03A26',
    invalidFill: 'rgba(224, 58, 38, 0.16)',
    invalidText: '#FECACA',
    invalidBracket: '#E03A26',
    tooltipBg: 'rgba(24, 23, 21, 0.94)',
    floatingTextShadow: '#F8F4EC',
    goldText: '#B46900',
    waveClearText: '#0F8C5E',
    breachText: '#D63222',
    sellBurst: '#57534E',
    swatches: ['#F5F1E7', '#E03A26', '#1F5EFF'],
  },

  // 3. VECTOR RADAR (Deep Phosphor CRT): Abyssal pine-black, Phosphor Emerald, Oscilloscope Amber, Infrared Crimson
  phosphor: {
    id: 'phosphor',
    label: 'Vector Radar',
    shortLabel: 'Radar',
    isLight: false,
    outerBgInner: '#0C1A14',
    outerBgOuter: '#050C09',
    deckGradStart: '#081510',
    deckGradMid: '#07110D',
    deckGradEnd: '#0A1812',
    checkerTile: 'rgba(57, 255, 136, 0.024)',
    gridLine: 'rgba(57, 255, 136, 0.11)',
    crosshair: 'rgba(57, 255, 136, 0.25)',
    boardFrame: '#1F4232',
    boardCorner: '#39FF88',

    obstacleShadow: 'rgba(0, 0, 0, 0.72)',
    obstacleTop: '#163024',
    obstacleMid: '#10241B',
    obstacleBot: '#0A1812',
    obstacleRim: '#28523F',
    obstacleHighlight: 'rgba(134, 239, 172, 0.26)',
    obstacleInsetFill: '#07120D',
    obstacleInsetStroke: 'rgba(57, 255, 136, 0.24)',
    obstacleSeam: 'rgba(57, 255, 136, 0.2)',

    flowArrow: 'rgba(57, 255, 136, 0.24)',
    pathGlow: 'rgba(57, 255, 136, 0.11)',
    pathLine: 'rgba(57, 255, 136, 0.45)',
    pathMoteGlow: 'rgba(57, 255, 136, 0.55)',
    pathMoteCore: '#D2FFE3',
    previewPathGlow: 'rgba(255, 176, 32, 0.2)',
    previewPathLine: 'rgba(255, 176, 32, 0.88)',
    previewMoteGlow: 'rgba(255, 176, 32, 0.6)',
    previewMoteCore: '#FEF3C7',

    spawnBg: 'rgba(57, 255, 136, 0.1)',
    spawnStroke: 'rgba(57, 255, 136, 0.78)',
    spawnRing: '#39FF88',
    spawnInnerRingRgb: '57, 255, 136',
    spawnCore: '#D2FFE3',
    spawnFloorGlow: 'rgba(57, 255, 136, 0.16)',

    goalBg: 'rgba(255, 66, 88, 0.13)',
    goalStroke: 'rgba(255, 66, 88, 0.8)',
    goalArcLit: '#FF4258',
    goalArcDim: 'rgba(120, 160, 139, 0.3)',
    goalDiamondStroke: '#FF94A1',
    goalDiamondFillRgb: '255, 66, 88',
    goalNucleus: '#FFE8EC',
    goalFloorGlow: 'rgba(255, 66, 88, 0.18)',

    entityShadow: 'rgba(0, 0, 0, 0.72)',
    towerBodyTop: '#183327',
    towerBodyMid: '#10241B',
    towerBodyBot: '#091610',
    towerBorderDefault: '#2D5C46',
    towerBorderSelected: '#E2F2E8',
    towerSocketFill: '#060F0B',
    towerSocketStroke: 'rgba(57, 255, 136, 0.26)',
    towerBarrelFill: '#07120D',
    towerCoreSpec: '#F0FFF4',
    chainCoilColor: '#52D1FF',

    overclock: '#FFB020',
    overclockLight: '#FFD166',
    overclockCore: '#FFF3C4',
    overclockBodyTop: '#2B2412',
    overclockBodyBot: '#12150D',
    overclockFloorGlow: 'rgba(255, 176, 32, 0.14)',
    overclockRailGlow: 'rgba(255, 176, 32, 0.36)',
    overclockRailDash: 'rgba(255, 209, 102, 0.88)',

    prism: '#C278FF',
    prismLight: '#E0B0FF',
    prismCore: '#FAF5FF',
    prismChromatic: 'rgba(57, 255, 136, 0.55)',
    prismBodyTop: '#221830',
    prismBodyBot: '#0E121A',
    prismFloorRgb: '194, 120, 255',
    prismRelayLine: 'rgba(194, 120, 255, 0.6)',

    triggers: {
      PULSE: '#39FF88',
      BEAM: '#FF4258',
      NOVA: '#FFB020',
    },
    payloads: {
      KINETIC: '#FFB020',
      CRYO: '#52D1FF',
      CORRODE: '#B8FF2C',
    },
    payloadFloorGlows: {
      KINETIC: 'rgba(255, 176, 32, 0.085)',
      CRYO: 'rgba(82, 209, 255, 0.09)',
      CORRODE: 'rgba(184, 255, 44, 0.085)',
    },
    payloadCoreGlows: {
      KINETIC: 'rgba(255, 176, 32, 0.42)',
      CRYO: 'rgba(82, 209, 255, 0.42)',
      CORRODE: 'rgba(184, 255, 44, 0.42)',
    },

    enemies: {
      SWARM: '#39FF88',
      ARMOR: '#FFB020',
      SHIELDED: '#FF5C8A',
    },
    enemyArmorFill: '#3D2405',
    enemyArmorCore: '#FFB020',
    enemyArmorSpec: '#FEF3C7',
    enemyShieldedFill: '#420B24',
    enemyShieldedCore: '#FBCFE8',
    enemySwarmSpec: '#D2FFE3',
    enemyHitFlash: '#F0FFF4',

    shieldColor: '#52D1FF',
    shieldArc: '#99E6FF',
    shieldGlow: 'rgba(82, 209, 255, 0.22)',
    slowStatus: '#52D1FF',
    shredStatus: '#B8FF2C',
    hpBarBg: 'rgba(5, 12, 9, 0.94)',
    hpBarBorder: 'rgba(134, 239, 172, 0.3)',
    hpBarGood: '#39FF88',
    hpBarMid: '#FFE033',
    hpBarLow: '#FF3B4E',
    hpBarTrail: '#FEF9C3',

    beamCore: '#F5FFF9',
    beamFloorGlow: 'rgba(57, 255, 136, 0.18)',
    beamRelayFloorGlow: 'rgba(194, 120, 255, 0.24)',

    validColor: '#39FF88',
    validFill: 'rgba(57, 255, 136, 0.16)',
    validText: '#BBF7D0',
    validBracket: '#BBF7D0',
    invalidColor: '#FF4258',
    invalidFill: 'rgba(255, 66, 88, 0.2)',
    invalidText: '#FECDD3',
    invalidBracket: '#FECDD3',
    tooltipBg: 'rgba(7, 17, 13, 0.96)',
    floatingTextShadow: '#050C09',
    goldText: '#FFB020',
    waveClearText: '#39FF88',
    breachText: '#FF5C6C',
    sellBurst: '#78A08B',
    swatches: ['#0B1A13', '#39FF88', '#FFB020'],
  },
};

let activeThemeId: ThemeId = 'foundry';

export function setActiveTheme(id: ThemeId): void {
  activeThemeId = id;
}

export function getActiveThemeId(): ThemeId {
  return activeThemeId;
}

export function getActivePalette(): ThemePalette {
  return PALETTES[activeThemeId];
}
