import { DifficultyLevel, WeaponId, WeaponSpec } from '../types/game';

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  assault_rifle: {
    id: 'assault_rifle',
    name: 'VX-4 Tactical Carbine',
    designation: '5.56×45mm NATO',
    category: 'Assault Rifle',
    damage: 34,
    headshotMultiplier: 2.1,
    fireRateMs: 115,
    automatic: true,
    pelletCount: 1,
    spreadRad: 0.018,
    adsSpreadRad: 0.004,
    recoilKick: 0.016,
    effectiveRange: 65,
    maxRange: 135,
    magSize: 30,
    reloadTimeMs: 1850,
    zoomFov: 50,
    isSuppressed: false,
    noiseRadius: 75,
    description: 'Balanced select-fire service carbine with reliable mid-range ballistics and controllable recoil.',
  },
  shotgun: {
    id: 'shotgun',
    name: 'M890 Combat Breacher',
    designation: '12-Gauge 00 Buck',
    category: 'Shotgun',
    damage: 19, // per pellet (8 pellets = 152 close range max)
    headshotMultiplier: 1.5,
    fireRateMs: 780,
    automatic: false,
    pelletCount: 8,
    spreadRad: 0.075,
    adsSpreadRad: 0.048,
    recoilKick: 0.062,
    effectiveRange: 18,
    maxRange: 36,
    magSize: 6,
    reloadTimeMs: 2300,
    zoomFov: 58,
    isSuppressed: false,
    noiseRadius: 85,
    description: 'Heavy pump-action scattergun engineered for indoor room clearing and close-quarters neutralization.',
  },
  sniper_rifle: {
    id: 'sniper_rifle',
    name: 'SRS-99 Longbow Marksman',
    designation: '.338 Lapua Magnum',
    category: 'Sniper Rifle',
    damage: 105,
    headshotMultiplier: 2.5,
    fireRateMs: 1150,
    automatic: false,
    pelletCount: 1,
    spreadRad: 0.038,
    adsSpreadRad: 0.0005,
    recoilKick: 0.075,
    effectiveRange: 160,
    maxRange: 250,
    magSize: 5,
    reloadTimeMs: 2600,
    zoomFov: 20,
    isSuppressed: false,
    noiseRadius: 95,
    description: 'Precision bolt-action anti-materiel rifle with high-magnification optics for long-range overwatch.',
  },
  pistol: {
    id: 'pistol',
    name: 'P226 SpecOps Suppressed',
    designation: '9×19mm Subsonic',
    category: 'Suppressed Pistol',
    damage: 28,
    headshotMultiplier: 2.4,
    fireRateMs: 210,
    automatic: false,
    pelletCount: 1,
    spreadRad: 0.015,
    adsSpreadRad: 0.003,
    recoilKick: 0.012,
    effectiveRange: 32,
    maxRange: 65,
    magSize: 12,
    reloadTimeMs: 1350,
    zoomFov: 56,
    isSuppressed: true,
    noiseRadius: 14, // Quiet! Enables stealth takedowns without alerting entire camp
    description: 'Baffled tactical sidearm firing subsonic rounds. Minimal acoustic signature for stealth infiltration.',
  },
};

export const WEAPON_ORDER: WeaponId[] = [
  'assault_rifle',
  'shotgun',
  'sniper_rifle',
  'pistol',
];

export interface DifficultyConfig {
  label: DifficultyLevel;
  subtitle: string;
  enemyVisionMultiplier: number;
  enemyReactionSpeedMultiplier: number;
  enemyAccuracyMultiplier: number;
  enemyDamageMultiplier: number;
  resourceMultiplier: number;
  timeLimitMultiplier: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  Easy: {
    label: 'Easy',
    subtitle: 'Forgiving enemy detection, +35% ammunition reserves, reduced incoming ballistic damage.',
    enemyVisionMultiplier: 0.75,
    enemyReactionSpeedMultiplier: 0.7,
    enemyAccuracyMultiplier: 0.65,
    enemyDamageMultiplier: 0.6,
    resourceMultiplier: 1.35,
    timeLimitMultiplier: 1.3,
  },
  Normal: {
    label: 'Normal',
    subtitle: 'Standard tactical doctrine. Balanced enemy sightlines, realistic cover usage, and strict supply allocation.',
    enemyVisionMultiplier: 1.0,
    enemyReactionSpeedMultiplier: 1.0,
    enemyAccuracyMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    resourceMultiplier: 1.0,
    timeLimitMultiplier: 1.0,
  },
  Hard: {
    label: 'Hard',
    subtitle: 'Heightened enemy situational awareness, coordinated squad flanking, and 20% fewer field supplies.',
    enemyVisionMultiplier: 1.22,
    enemyReactionSpeedMultiplier: 1.3,
    enemyAccuracyMultiplier: 1.25,
    enemyDamageMultiplier: 1.35,
    resourceMultiplier: 0.8,
    timeLimitMultiplier: 0.9,
  },
  Extreme: {
    label: 'Extreme',
    subtitle: 'Zero-margin special operations. Lethal enemy marksmen, rapid acoustic triangulation, and scarce ammunition.',
    enemyVisionMultiplier: 1.45,
    enemyReactionSpeedMultiplier: 1.65,
    enemyAccuracyMultiplier: 1.5,
    enemyDamageMultiplier: 1.75,
    resourceMultiplier: 0.65,
    timeLimitMultiplier: 0.8,
  },
};
