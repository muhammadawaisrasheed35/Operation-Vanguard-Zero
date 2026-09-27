export type EnvironmentType = 'snow' | 'base' | 'urban' | 'desert' | 'industrial';

export type DifficultyLevel = 'Easy' | 'Normal' | 'Hard' | 'Extreme';

export type WeaponId = 'assault_rifle' | 'shotgun' | 'sniper_rifle' | 'pistol';

export type TacticalItemType = 'frag' | 'flashbang' | 'smoke' | 'breach';

export type EnemyRole =
  | 'patrol'
  | 'indoor_guard'
  | 'rooftop_guard'
  | 'sniper'
  | 'heavy'
  | 'commander';

export type EnemyAIState =
  | 'PATROL'
  | 'GUARD'
  | 'SUSPICIOUS'
  | 'COMBAT'
  | 'COVER'
  | 'RETREAT'
  | 'STUNNED';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  designation: string;
  category: string;
  damage: number;
  headshotMultiplier: number;
  fireRateMs: number;
  automatic: boolean;
  pelletCount: number;
  spreadRad: number;
  adsSpreadRad: number;
  recoilKick: number;
  effectiveRange: number;
  maxRange: number;
  magSize: number;
  reloadTimeMs: number;
  zoomFov: number;
  isSuppressed: boolean;
  noiseRadius: number;
  description: string;
}

export interface Vector2D {
  x: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  wallColor: number;
  roofColor: number;
  hasInterior: boolean;
  hasRooftopAccess: boolean;
  doorSide: 'north' | 'south' | 'east' | 'west';
  requiresBreach?: boolean;
  isBreached?: boolean;
}

export interface ObstacleDef {
  id: string;
  type: 'rock' | 'container' | 'sandbag' | 'vehicle' | 'wall' | 'watchtower' | 'dune';
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY?: number;
  color?: number;
}

export interface SupplyCrateDef {
  id: string;
  type: 'ammo' | 'medical' | 'tactical';
  label: string;
  x: number;
  y: number;
  z: number;
  collected?: boolean;
}

export interface ObjectiveDef {
  id: string;
  title: string;
  description: string;
  type:
    | 'eliminate_target'
    | 'eliminate_all'
    | 'secure_zone'
    | 'recover_item'
    | 'destroy_equipment'
    | 'rescue_teammate'
    | 'breach_room'
    | 'reach_extraction';
  isOptional: boolean;
  x: number;
  y?: number;
  z: number;
  radius: number;
  targetCount?: number;
  currentCount?: number;
  holdSeconds?: number;
  completed?: boolean;
}

export interface EnemySpawnDef {
  id: string;
  role: EnemyRole;
  name: string;
  x: number;
  y: number;
  z: number;
  patrolWaypoints: Vector2D[];
  isTargetObjectiveId?: string;
}

export interface MissionDef {
  id: number;
  codeName: string;
  title: string;
  location: string;
  sectorCoordinates: string;
  environment: EnvironmentType;
  environmentLabel: string;
  threatLevel: 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night' | 'overcast';
  timeLimitSeconds: number | null;
  storyContext: string;
  intelligenceSummary: string;
  recommendedStrategy: string;
  intelReconZones: { x: number; z: number; radius: number; label: string }[];
  startingLoadout: {
    assaultRifleReserve: number;
    shotgunReserve: number;
    sniperReserve: number;
    pistolReserve: number;
    medkits: number;
    fragGrenades: number;
    flashbangs: number;
    smokeGrenades: number;
    breachCharges: number;
  };
  playerSpawn: { x: number; z: number; rotationY: number };
  extractionPoint: { x: number; z: number; radius: number };
  mapBounds: number;
  buildings: BuildingDef[];
  obstacles: ObstacleDef[];
  supplies: SupplyCrateDef[];
  objectives: ObjectiveDef[];
  enemies: EnemySpawnDef[];
}

export interface RuntimeEnemy {
  id: string;
  role: EnemyRole;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  health: number;
  maxHealth: number;
  state: EnemyAIState;
  alertLevel: number; // 0 to 100
  patrolWaypoints: Vector2D[];
  currentWaypointIdx: number;
  lastKnownPlayerPos: Vector2D | null;
  stateTimer: number;
  fireCooldown: number;
  stunTimer: number;
  detectedTimer: number; // > 0 means legitimately detected and visible on tactical map
  acousticPingTimer: number;
  isAlive: boolean;
  isTargetObjectiveId?: string;
}

export interface ActiveSmokeCloud {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  remainingSeconds: number;
}

export interface MissionCompletionRecord {
  missionId: number;
  completed: boolean;
  bestTimeSeconds: number;
  bestRating: 'S' | 'A' | 'B' | 'C';
  bestAccuracy: number;
  optionalCompleted: boolean;
  difficultyCompleted: DifficultyLevel;
}

export interface GameSettings {
  graphicsPreset: 'Low' | 'Medium' | 'High';
  resolutionScale: number; // 0.65, 0.85, 1.0
  fpsLimit: 30 | 60 | 120 | 0; // 0 = unlimited
  shadowQuality: 'Off' | 'Medium' | 'High';
  textureQuality: 'Low' | 'Medium' | 'High';
  effectsQuality: 'Low' | 'Medium' | 'High';
  viewDistance: number; // 90, 140, 210
  mouseSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  invertY: boolean;
}

export interface SaveData {
  unlockedMissionId: number;
  lastPlayedMissionId: number;
  difficulty: DifficultyLevel;
  missionRecords: Record<number, MissionCompletionRecord>;
  settings: GameSettings;
}

export interface MissionResultSummary {
  missionId: number;
  success: boolean;
  failureReason?: string;
  completionTimeSeconds: number;
  mainObjectivesCompleted: number;
  mainObjectivesTotal: number;
  optionalObjectivesCompleted: number;
  optionalObjectivesTotal: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  accuracyPercent: number;
  ammoEfficiencyPercent: number;
  damageReceived: number;
  enemiesNeutralized: number;
  enemiesTotal: number;
  stealthBonus: boolean;
  rating: 'S' | 'A' | 'B' | 'C' | 'F';
  difficulty: DifficultyLevel;
}
