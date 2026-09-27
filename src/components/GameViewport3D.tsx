import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';
import { DIFFICULTY_CONFIGS, WEAPON_ORDER, WEAPONS } from '../data/weapons';
import {
  ActiveSmokeCloud,
  BuildingDef,
  DifficultyLevel,
  GameSettings,
  MissionDef,
  MissionResultSummary,
  ObjectiveDef,
  RuntimeEnemy,
  SupplyCrateDef,
  TacticalItemType,
  WeaponId,
} from '../types/game';
import { TacticalMap } from './TacticalMap';

interface GameViewport3DProps {
  mission: MissionDef;
  difficulty: DifficultyLevel;
  settings: GameSettings;
  onMissionComplete: (summary: MissionResultSummary) => void;
  onExitToMenu: () => void;
  onOpenSettings: () => void;
}

interface CollisionBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isRoofFloor?: boolean;
  roofY?: number;
  buildingId?: string;
  isDoorBlock?: boolean;
}

interface RampSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startZ: number;
  endZ: number;
  maxHeight: number;
}

export const GameViewport3D: React.FC<GameViewport3DProps> = ({
  mission,
  difficulty,
  settings,
  onMissionComplete,
  onExitToMenu,
  onOpenSettings,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const diffConfig = DIFFICULTY_CONFIGS[difficulty];

  // HUD React states
  const [health, setHealth] = useState<number>(100);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponId>('assault_rifle');
  const [magAmmo, setMagAmmo] = useState<Record<WeaponId, number>>({
    assault_rifle: WEAPONS.assault_rifle.magSize,
    shotgun: WEAPONS.shotgun.magSize,
    sniper_rifle: WEAPONS.sniper_rifle.magSize,
    pistol: WEAPONS.pistol.magSize,
  });
  const [reserveAmmo, setReserveAmmo] = useState<Record<WeaponId, number>>(() => ({
    assault_rifle: Math.round(mission.startingLoadout.assaultRifleReserve * diffConfig.resourceMultiplier),
    shotgun: Math.round(mission.startingLoadout.shotgunReserve * diffConfig.resourceMultiplier),
    sniper_rifle: Math.round(mission.startingLoadout.sniperReserve * diffConfig.resourceMultiplier),
    pistol: Math.round(mission.startingLoadout.pistolReserve * diffConfig.resourceMultiplier),
  }));
  const [medkits, setMedkits] = useState<number>(() =>
    Math.max(1, Math.round(mission.startingLoadout.medkits * diffConfig.resourceMultiplier))
  );
  const [tacticalCounts, setTacticalCounts] = useState<Record<TacticalItemType, number>>(() => ({
    frag: Math.max(1, Math.round(mission.startingLoadout.fragGrenades * diffConfig.resourceMultiplier)),
    flashbang: Math.max(1, Math.round(mission.startingLoadout.flashbangs * diffConfig.resourceMultiplier)),
    smoke: Math.max(1, Math.round(mission.startingLoadout.smokeGrenades * diffConfig.resourceMultiplier)),
    breach: Math.max(1, mission.startingLoadout.breachCharges),
  }));

  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isADS, setIsADS] = useState<boolean>(false);
  const [isCrouching, setIsCrouching] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showFullMap, setShowFullMap] = useState<boolean>(false);
  const [pointerLocked, setPointerLocked] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<number>(0);
  const [hitMarker, setHitMarker] = useState<'normal' | 'headshot' | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [radioMessage, setRadioMessage] = useState<string>(
    `COMMAND: Drop zone secure. Execute ${mission.codeName}.`
  );
  const [secureProgress, setSecureProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    mission.timeLimitSeconds
      ? Math.round(mission.timeLimitSeconds * diffConfig.timeLimitMultiplier)
      : null
  );

  // Synced Tactical Map states
  const [playerMapPos, setPlayerMapPos] = useState({
    x: mission.playerSpawn.x,
    y: 0,
    z: mission.playerSpawn.z,
    rotationY: mission.playerSpawn.rotationY,
  });
  const [objectivesState, setObjectivesState] = useState<ObjectiveDef[]>(() =>
    mission.objectives.map((o) => ({ ...o, completed: false, currentCount: 0 }))
  );
  const [suppliesState, setSuppliesState] = useState<SupplyCrateDef[]>(() =>
    mission.supplies.map((s) => ({ ...s, collected: false }))
  );
  const [enemiesState, setEnemiesState] = useState<RuntimeEnemy[]>([]);
  const [smokeCloudsState, setSmokeCloudsState] = useState<ActiveSmokeCloud[]>([]);
  const [webglError, setWebglError] = useState<boolean>(false);

  // Mutable gameplay refs for 60fps loop
  const gameRef = useRef<{
    player: {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      yaw: number;
      pitch: number;
      height: number;
      onGround: boolean;
      health: number;
      isCrouching: boolean;
      isSprinting: boolean;
      isADS: boolean;
    };
    weapon: {
      current: WeaponId;
      mag: Record<WeaponId, number>;
      reserve: Record<WeaponId, number>;
      isReloading: boolean;
      lastFireTime: number;
      recoilOffsetPitch: number;
      recoilKickBack: number;
    };
    inventory: {
      medkits: number;
      tactical: Record<TacticalItemType, number>;
    };
    stats: {
      shotsFired: number;
      shotsHit: number;
      headshots: number;
      damageReceived: number;
      enemiesNeutralized: number;
      timesDetected: number;
      startTime: number;
    };
    buildings: BuildingDef[];
    objectives: ObjectiveDef[];
    supplies: SupplyCrateDef[];
    enemies: RuntimeEnemy[];
    smokeClouds: ActiveSmokeCloud[];
    collisions: CollisionBox[];
    ramps: RampSurface[];
    keys: Record<string, boolean>;
    mouseButtons: { left: boolean; right: boolean };
    isPaused: boolean;
    showFullMap: boolean;
    missionFinished: boolean;
    secureZoneTimer: number;
    footstepAccum: number;
    triggerShootRef: () => void;
    triggerInteractRef: () => void;
    triggerThrowTacticalRef: (type: TacticalItemType) => void;
    triggerMedkitRef: () => void;
    triggerReloadRef: () => void;
  }>({
    player: {
      x: mission.playerSpawn.x,
      y: 0,
      z: mission.playerSpawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: mission.playerSpawn.rotationY,
      pitch: 0,
      height: 1.7,
      onGround: true,
      health: 100,
      isCrouching: false,
      isSprinting: false,
      isADS: false,
    },
    weapon: {
      current: 'assault_rifle',
      mag: {
        assault_rifle: WEAPONS.assault_rifle.magSize,
        shotgun: WEAPONS.shotgun.magSize,
        sniper_rifle: WEAPONS.sniper_rifle.magSize,
        pistol: WEAPONS.pistol.magSize,
      },
      reserve: {
        assault_rifle: Math.round(mission.startingLoadout.assaultRifleReserve * diffConfig.resourceMultiplier),
        shotgun: Math.round(mission.startingLoadout.shotgunReserve * diffConfig.resourceMultiplier),
        sniper_rifle: Math.round(mission.startingLoadout.sniperReserve * diffConfig.resourceMultiplier),
        pistol: Math.round(mission.startingLoadout.pistolReserve * diffConfig.resourceMultiplier),
      },
      isReloading: false,
      lastFireTime: 0,
      recoilOffsetPitch: 0,
      recoilKickBack: 0,
    },
    inventory: {
      medkits: Math.max(1, Math.round(mission.startingLoadout.medkits * diffConfig.resourceMultiplier)),
      tactical: {
        frag: Math.max(1, Math.round(mission.startingLoadout.fragGrenades * diffConfig.resourceMultiplier)),
        flashbang: Math.max(1, Math.round(mission.startingLoadout.flashbangs * diffConfig.resourceMultiplier)),
        smoke: Math.max(1, Math.round(mission.startingLoadout.smokeGrenades * diffConfig.resourceMultiplier)),
        breach: Math.max(1, mission.startingLoadout.breachCharges),
      },
    },
    stats: {
      shotsFired: 0,
      shotsHit: 0,
      headshots: 0,
      damageReceived: 0,
      enemiesNeutralized: 0,
      timesDetected: 0,
      startTime: performance.now(),
    },
    buildings: mission.buildings.map((b) => ({ ...b, isBreached: false })),
    objectives: mission.objectives.map((o) => ({ ...o, completed: false, currentCount: 0 })),
    supplies: mission.supplies.map((s) => ({ ...s, collected: false })),
    enemies: mission.enemies.map((e) => {
      const baseHp =
        e.role === 'heavy'
          ? 165
          : e.role === 'commander'
          ? 140
          : e.role === 'sniper'
          ? 85
          : 100;
      return {
        id: e.id,
        role: e.role,
        name: e.name,
        x: e.x,
        y: e.y,
        z: e.z,
        rotationY: 0,
        health: baseHp,
        maxHealth: baseHp,
        state: e.patrolWaypoints.length > 1 ? 'PATROL' : 'GUARD',
        alertLevel: 0,
        patrolWaypoints: e.patrolWaypoints,
        currentWaypointIdx: 0,
        lastKnownPlayerPos: null,
        stateTimer: 0,
        fireCooldown: 1.0 + Math.random(),
        stunTimer: 0,
        detectedTimer: 0,
        acousticPingTimer: 0,
        isAlive: true,
        isTargetObjectiveId: e.isTargetObjectiveId,
      };
    }),
    smokeClouds: [],
    collisions: [],
    ramps: [],
    keys: {},
    mouseButtons: { left: false, right: false },
    isPaused: false,
    showFullMap: false,
    missionFinished: false,
    secureZoneTimer: 0,
    footstepAccum: 0,
    triggerShootRef: () => {},
    triggerInteractRef: () => {},
    triggerThrowTacticalRef: () => {},
    triggerMedkitRef: () => {},
    triggerReloadRef: () => {},
  });

  const allMainObjectivesCompleted = objectivesState
    .filter((o) => !o.isOptional)
    .every((o) => o.completed);

  const finalizeMission = useCallback(
    (success: boolean, failureReason?: string) => {
      if (gameRef.current.missionFinished) return;
      gameRef.current.missionFinished = true;
      soundEngine.stopAmbient();
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }

      const st = gameRef.current.stats;
      const objs = gameRef.current.objectives;
      const mainObjs = objs.filter((o) => !o.isOptional);
      const optObjs = objs.filter((o) => o.isOptional);
      const mainDone = mainObjs.filter((o) => o.completed).length;
      const optDone = optObjs.filter((o) => o.completed).length;

      const accuracy = st.shotsFired > 0 ? Math.round((st.shotsHit / st.shotsFired) * 100) : 100;
      const totalElapsed = Math.max(1, Math.round((performance.now() - st.startTime) / 1000));
      const stealthBonus = st.timesDetected === 0;

      let rating: 'S' | 'A' | 'B' | 'C' | 'F' = 'F';
      if (success) {
        let score = 65;
        if (optDone === optObjs.length) score += 15;
        if (accuracy >= 55) score += 10;
        if (st.damageReceived <= 45) score += 10;
        if (stealthBonus) score += 10;

        if (score >= 90) rating = 'S';
        else if (score >= 78) rating = 'A';
        else if (score >= 65) rating = 'B';
        else rating = 'C';
      }

      onMissionComplete({
        missionId: mission.id,
        success,
        failureReason,
        completionTimeSeconds: totalElapsed,
        mainObjectivesCompleted: mainDone,
        mainObjectivesTotal: mainObjs.length,
        optionalObjectivesCompleted: optDone,
        optionalObjectivesTotal: optObjs.length,
        shotsFired: st.shotsFired,
        shotsHit: st.shotsHit,
        headshots: st.headshots,
        accuracyPercent: accuracy,
        ammoEfficiencyPercent: Math.min(100, Math.round(accuracy * 1.15)),
        damageReceived: Math.round(st.damageReceived),
        enemiesNeutralized: st.enemiesNeutralized,
        enemiesTotal: gameRef.current.enemies.length,
        stealthBonus,
        rating,
        difficulty,
      });
    },
    [difficulty, mission.id, onMissionComplete]
  );

  // Sync volumes and start ambient sound
  useEffect(() => {
    soundEngine.setVolumes(
      settings.masterVolume,
      settings.sfxVolume,
      settings.ambientVolume
    );
    soundEngine.startAmbient(mission.environment);
    return () => {
      soundEngine.stopAmbient();
    };
  }, [mission.environment, settings.ambientVolume, settings.masterVolume, settings.sfxVolume]);

  // Main Three.js Scene & Gameplay Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: settings.graphicsPreset !== 'Low',
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * settings.resolutionScale);
    renderer.shadowMap.enabled = settings.shadowQuality !== 'Off';
    renderer.shadowMap.type =
      settings.shadowQuality === 'High' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();

    // Environment Sky & Fog Configuration
    const envColors: Record<
      MissionDef['environment'],
      { sky: number; ground: number; fogDensity: number; road: number }
    > = {
      snow: {
        sky: mission.timeOfDay === 'night' ? 0x0b1320 : 0xcbd5e1,
        ground: 0xe2e8f0,
        fogDensity: 0.013,
        road: 0x94a3b8,
      },
      base: {
        sky: mission.timeOfDay === 'dusk' ? 0x1e293b : 0x384b63,
        ground: 0x3b443b,
        fogDensity: 0.008,
        road: 0x27272a,
      },
      urban: {
        sky: mission.timeOfDay === 'dusk' ? 0x272030 : 0x475569,
        ground: 0x333840,
        fogDensity: 0.009,
        road: 0x1e2229,
      },
      desert: {
        sky: 0xd9b382,
        ground: 0xd4a359,
        fogDensity: 0.012,
        road: 0xa67c46,
      },
      industrial: {
        sky: 0x090d16,
        ground: 0x22262e,
        fogDensity: 0.01,
        road: 0x161920,
      },
    };

    const palette = envColors[mission.environment];
    scene.background = new THREE.Color(palette.sky);
    const fogFactor = 180 / Math.max(90, settings.viewDistance);
    scene.fog = new THREE.FogExp2(palette.sky, palette.fogDensity * fogFactor);

    // Camera & First-Person Weapon Rig
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, settings.viewDistance + 60);
    scene.add(camera);

    // Three-point + atmospheric lighting
    const ambientLight = new THREE.AmbientLight(
      mission.timeOfDay === 'night' ? 0x64748b : 0xffffff,
      mission.timeOfDay === 'night' ? 0.55 : 0.75
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      mission.environment === 'desert' ? 0xfff3d1 : 0xf8fafc,
      mission.timeOfDay === 'night' ? 0.65 : 1.15
    );
    dirLight.position.set(45, 75, 35);
    if (settings.shadowQuality !== 'Off') {
      dirLight.castShadow = true;
      const mapSize = settings.shadowQuality === 'High' ? 2048 : 1024;
      dirLight.shadow.mapSize.width = mapSize;
      dirLight.shadow.mapSize.height = mapSize;
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 190;
      const d = 85;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
    }
    scene.add(dirLight);

    // Ground Terrain & Tactical Grid Texture
    const groundGeo = new THREE.PlaneGeometry(mission.mapBounds * 2.4, mission.mapBounds * 2.4, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: palette.ground,
      roughness: 0.92,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Central tactical road
    const roadGeo = new THREE.PlaneGeometry(11, mission.mapBounds * 2.2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: palette.road,
      roughness: 0.85,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.y = 0.02;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Distant perimeter mountain / skyline silhouettes
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const dist = mission.mapBounds + 18 + (i % 3) * 8;
      const h = 18 + (i % 4) * 9;
      const peakGeo =
        mission.environment === 'urban' || mission.environment === 'industrial'
          ? new THREE.BoxGeometry(22, h, 22)
          : new THREE.ConeGeometry(24, h, 5);
      const peakMat = new THREE.MeshStandardMaterial({
        color:
          mission.environment === 'snow'
            ? 0xdbeafe
            : mission.environment === 'desert'
            ? 0xc29b61
            : 0x1e293b,
        roughness: 0.9,
      });
      const peak = new THREE.Mesh(peakGeo, peakMat);
      peak.position.set(Math.cos(angle) * dist, h / 2 - 1, Math.sin(angle) * dist);
      scene.add(peak);
    }

    // Build Collisions, Enterable Buildings, Breaching Doors, and Rooftop Ramps
    const collisions: CollisionBox[] = [];
    const ramps: RampSurface[] = [];
    const doorMeshes: Record<string, THREE.Mesh> = {};

    const wallThickness = 0.45;
    const doorWidth = 3.2;
    const doorHeight = 3.2;

    gameRef.current.buildings.forEach((b) => {
      const halfW = b.width / 2;
      const halfD = b.depth / 2;
      const wallMat = new THREE.MeshStandardMaterial({
        color: b.wallColor,
        roughness: 0.85,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: b.roofColor,
        roughness: 0.8,
      });

      // Interior Floor
      const floorGeo = new THREE.BoxGeometry(b.width, 0.15, b.depth);
      const floorMesh = new THREE.Mesh(
        floorGeo,
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
      );
      floorMesh.position.set(b.x, 0.075, b.z);
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // Roof Slab (Walkable if hasRooftopAccess)
      const roofGeo = new THREE.BoxGeometry(b.width + 0.4, 0.35, b.depth + 0.4);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(b.x, b.height, b.z);
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      scene.add(roofMesh);

      collisions.push({
        minX: b.x - halfW,
        maxX: b.x + halfW,
        minY: b.height - 0.25,
        maxY: b.height + 0.2,
        minZ: b.z - halfD,
        maxZ: b.z + halfD,
        isRoofFloor: true,
        roofY: b.height + 0.18,
      });

      // Helper to add a solid wall segment + collision box
      const addWallSegment = (wx: number, wy: number, wz: number, ww: number, wh: number, wd: number) => {
        const geo = new THREE.BoxGeometry(ww, wh, wd);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(wx, wy, wz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        collisions.push({
          minX: wx - ww / 2,
          maxX: wx + ww / 2,
          minY: wy - wh / 2,
          maxY: wy + wh / 2,
          minZ: wz - wd / 2,
          maxZ: wz + wd / 2,
        });
      };

      // Build 4 sides with doorway on b.doorSide
      (['north', 'south', 'east', 'west'] as const).forEach((side) => {
        const isDoor = b.doorSide === side;
        if (side === 'north' || side === 'south') {
          const wz = side === 'north' ? b.z - halfD : b.z + halfD;
          if (!isDoor) {
            addWallSegment(b.x, b.height / 2, wz, b.width, b.height, wallThickness);
          } else {
            const segW = (b.width - doorWidth) / 2;
            addWallSegment(b.x - halfW + segW / 2, b.height / 2, wz, segW, b.height, wallThickness);
            addWallSegment(b.x + halfW - segW / 2, b.height / 2, wz, segW, b.height, wallThickness);
            const topH = b.height - doorHeight;
            if (topH > 0.1) {
              addWallSegment(b.x, doorHeight + topH / 2, wz, doorWidth, topH, wallThickness);
            }
            if (b.requiresBreach && !b.isBreached) {
              const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 0.3);
              const doorMat = new THREE.MeshStandardMaterial({
                color: 0x991b1b,
                metalness: 0.5,
                roughness: 0.4,
              });
              const doorMesh = new THREE.Mesh(doorGeo, doorMat);
              doorMesh.position.set(b.x, doorHeight / 2, wz);
              scene.add(doorMesh);
              doorMeshes[b.id] = doorMesh;
              collisions.push({
                minX: b.x - doorWidth / 2,
                maxX: b.x + doorWidth / 2,
                minY: 0,
                maxY: doorHeight,
                minZ: wz - 0.4,
                maxZ: wz + 0.4,
                buildingId: b.id,
                isDoorBlock: true,
              });
            }
          }
        } else {
          const wx = side === 'west' ? b.x - halfW : b.x + halfW;
          if (!isDoor) {
            addWallSegment(wx, b.height / 2, b.z, wallThickness, b.height, b.depth);
          } else {
            const segD = (b.depth - doorWidth) / 2;
            addWallSegment(wx, b.height / 2, b.z - halfD + segD / 2, wallThickness, b.height, segD);
            addWallSegment(wx, b.height / 2, b.z + halfD - segD / 2, wallThickness, b.height, segD);
            const topH = b.height - doorHeight;
            if (topH > 0.1) {
              addWallSegment(wx, doorHeight + topH / 2, b.z, wallThickness, topH, doorWidth);
            }
            if (b.requiresBreach && !b.isBreached) {
              const doorGeo = new THREE.BoxGeometry(0.3, doorHeight, doorWidth);
              const doorMat = new THREE.MeshStandardMaterial({
                color: 0x991b1b,
                metalness: 0.5,
                roughness: 0.4,
              });
              const doorMesh = new THREE.Mesh(doorGeo, doorMat);
              doorMesh.position.set(wx, doorHeight / 2, b.z);
              scene.add(doorMesh);
              doorMeshes[b.id] = doorMesh;
              collisions.push({
                minX: wx - 0.4,
                maxX: wx + 0.4,
                minY: 0,
                maxY: doorHeight,
                minZ: b.z - doorWidth / 2,
                maxZ: b.z + doorWidth / 2,
                buildingId: b.id,
                isDoorBlock: true,
              });
            }
          }
        }
      });

      // Exterior Tactical Ramp to Rooftop if b.hasRooftopAccess
      if (b.hasRooftopAccess) {
        const rampSideX = b.doorSide === 'east' ? b.x - halfW - 1.3 : b.x + halfW + 1.3;
        const rampLen = b.depth;
        const rampSlopeLen = Math.hypot(rampLen, b.height);
        const rampAngle = Math.atan2(b.height, rampLen);
        const rampGeo = new THREE.BoxGeometry(2.2, 0.25, rampSlopeLen);
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.position.set(rampSideX, b.height / 2, b.z);
        rampMesh.rotation.x = rampAngle;
        rampMesh.castShadow = true;
        scene.add(rampMesh);

        ramps.push({
          minX: rampSideX - 1.25,
          maxX: rampSideX + 1.25,
          minZ: b.z - halfD - 0.5,
          maxZ: b.z + halfD + 0.5,
          startZ: b.z + halfD, // bottom of ramp at south
          endZ: b.z - halfD,   // top of ramp at north
          maxHeight: b.height + 0.18,
        });
      }
    });

    // Obstacles (Rocks, Containers, Sandbags, Vehicles, Watchtowers, Dunes)
    mission.obstacles.forEach((o) => {
      if (o.type === 'watchtower') {
        const towerGroup = new THREE.Group();
        towerGroup.position.set(o.x, 0, o.z);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        const platY = 6.0;
        [
          [-1.8, -1.8],
          [1.8, -1.8],
          [-1.8, 1.8],
          [1.8, 1.8],
        ].forEach(([px, pz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, platY + 2.2, 0.35), postMat);
          post.position.set(px, (platY + 2.2) / 2, pz);
          post.castShadow = true;
          towerGroup.add(post);
        });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(o.width, 0.3, o.depth), postMat);
        platform.position.set(0, platY, 0);
        towerGroup.add(platform);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.5, 4), postMat);
        roof.position.set(0, platY + 2.8, 0);
        roof.rotation.y = Math.PI / 4;
        towerGroup.add(roof);
        scene.add(towerGroup);

        collisions.push({
          minX: o.x - o.width / 2,
          maxX: o.x + o.width / 2,
          minY: platY - 0.2,
          maxY: platY + 0.2,
          minZ: o.z - o.depth / 2,
          maxZ: o.z + o.depth / 2,
          isRoofFloor: true,
          roofY: platY + 0.15,
        });
        return;
      }

      const matColor =
        o.color ??
        (o.type === 'sandbag'
          ? 0xa18862
          : o.type === 'vehicle'
          ? 0x3f4d3b
          : o.type === 'dune'
          ? 0xd4a359
          : o.type === 'rock'
          ? 0x64748b
          : 0x475569);

      const geo =
        o.type === 'rock'
          ? new THREE.DodecahedronGeometry(Math.max(o.width, o.height) * 0.55, 1)
          : new THREE.BoxGeometry(o.width, o.height, o.depth);
      const mat = new THREE.MeshStandardMaterial({ color: matColor, roughness: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(o.x, o.height / 2, o.z);
      if (o.rotationY) mesh.rotation.y = o.rotationY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      if (o.type !== 'dune') {
        collisions.push({
          minX: o.x - o.width / 2,
          maxX: o.x + o.width / 2,
          minY: 0,
          maxY: o.height,
          minZ: o.z - o.depth / 2,
          maxZ: o.z + o.depth / 2,
        });
      }
    });

    gameRef.current.collisions = collisions;
    gameRef.current.ramps = ramps;

    // Supply Crates 3D Meshes
    const supplyMeshes: Record<string, THREE.Group> = {};
    gameRef.current.supplies.forEach((s) => {
      const grp = new THREE.Group();
      const boxColor =
        s.type === 'medical' ? 0x10b981 : s.type === 'ammo' ? 0x0284c7 : 0x9333ea;
      const crateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.75, 0.8),
        new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.5 })
      );
      crateMesh.position.y = 0.38;
      crateMesh.castShadow = true;
      grp.add(crateMesh);
      grp.position.set(s.x, s.y, s.z);
      scene.add(grp);
      supplyMeshes[s.id] = grp;
    });

    // Objective 3D Beacons / Equipment / Hostage
    const objectiveMeshes: Record<string, THREE.Group> = {};
    gameRef.current.objectives.forEach((obj) => {
      const grp = new THREE.Group();
      grp.position.set(obj.x, obj.y ?? 0, obj.z);

      if (obj.type === 'rescue_teammate') {
        // Friendly operative Echo-4 kneeling
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.35, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x0ea5e9 })
        );
        body.position.y = 0.6;
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xfde047 })
        );
        head.position.y = 1.38;
        grp.add(body, head);
      } else if (obj.type === 'destroy_equipment' || obj.type === 'recover_item') {
        const pedestal = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 1.2, 0.9),
          new THREE.MeshStandardMaterial({
            color: obj.isOptional ? 0x0284c7 : 0xd97706,
            metalness: 0.4,
            roughness: 0.4,
          })
        );
        pedestal.position.y = 0.6;
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.45, 0.1),
          new THREE.MeshBasicMaterial({ color: obj.isOptional ? 0x38bdf8 : 0xfbbf24 })
        );
        screen.position.set(0, 1.35, 0);
        grp.add(pedestal, screen);
      } else if (obj.type === 'secure_zone') {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(obj.radius - 0.35, obj.radius, 32),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;
        grp.add(ring);
      }

      scene.add(grp);
      objectiveMeshes[obj.id] = grp;
    });

    // Extraction Zone 3D Green Perimeter Ring & Beacon
    const extractionGroup = new THREE.Group();
    extractionGroup.position.set(mission.extractionPoint.x, 0.06, mission.extractionPoint.z);
    const extRing = new THREE.Mesh(
      new THREE.RingGeometry(
        mission.extractionPoint.radius - 0.45,
        mission.extractionPoint.radius,
        36
      ),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
    );
    extRing.rotation.x = -Math.PI / 2;
    const extPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 6, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 })
    );
    extPillar.position.y = 3;
    extractionGroup.add(extRing, extPillar);
    scene.add(extractionGroup);

    // Build Articulated 3D Enemy Meshes
    const enemyMeshes: Record<
      string,
      {
        group: THREE.Group;
        head: THREE.Mesh;
        body: THREE.Mesh;
        sniperGlint?: THREE.Mesh;
      }
    > = {};

    gameRef.current.enemies.forEach((enemy) => {
      const group = new THREE.Group();
      group.position.set(enemy.x, enemy.y, enemy.z);

      const uniformColor =
        enemy.role === 'commander'
          ? 0x991b1b
          : enemy.role === 'heavy'
          ? 0x1e293b
          : enemy.role === 'sniper'
          ? 0x365314
          : mission.environment === 'snow'
          ? 0x94a3b8
          : mission.environment === 'desert'
          ? 0xa16207
          : 0x3f4d3b;

      const bodyRadius = enemy.role === 'heavy' ? 0.46 : 0.34;
      const bodyGeo = new THREE.CylinderGeometry(bodyRadius * 0.9, bodyRadius, 1.25, 10);
      const bodyMat = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.75 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.65;
      body.castShadow = true;
      body.userData = { enemyId: enemy.id, isHead: false };
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const headMat = new THREE.MeshStandardMaterial({
        color: enemy.role === 'commander' ? 0xdc2626 : 0x1f2937,
        roughness: 0.6,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.48;
      head.castShadow = true;
      head.userData = { enemyId: enemy.id, isHead: true };
      group.add(head);

      // Enemy rifle mesh pointing forward (-Z in local space)
      const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.14, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 })
      );
      gun.position.set(0.25, 0.95, -0.35);
      group.add(gun);

      let sniperGlint: THREE.Mesh | undefined;
      if (enemy.role === 'sniper') {
        sniperGlint = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        sniperGlint.position.set(0.25, 1.04, -0.8);
        group.add(sniperGlint);
      }

      scene.add(group);
      enemyMeshes[enemy.id] = { group, head, body, sniperGlint };
    });

    // Weather Particle System (Snowflakes / Sandstorm Dust)
    const particleCount =
      settings.effectsQuality === 'Low' ? 220 : settings.effectsQuality === 'Medium' ? 500 : 900;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 140;
      particlePositions[i * 3 + 1] = Math.random() * 28;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color:
        mission.environment === 'snow'
          ? 0xffffff
          : mission.environment === 'desert'
          ? 0xeab308
          : 0x94a3b8,
      size: mission.environment === 'snow' ? 0.24 : 0.16,
      transparent: true,
      opacity: mission.environment === 'snow' || mission.environment === 'desert' ? 0.7 : 0.25,
    });
    const weatherParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(weatherParticles);

    // First-Person 3D Weapon Viewmodel attached to Camera
    const weaponRig = new THREE.Group();
    camera.add(weaponRig);

    const buildWeaponViewmodel = (wId: WeaponId) => {
      while (weaponRig.children.length > 0) {
        weaponRig.remove(weaponRig.children[0]);
      }
      const metalDark = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.75,
        roughness: 0.35,
      });
      const polymerMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.7,
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.8,
        roughness: 0.3,
      });

      const receiver = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.08,
          0.11,
          wId === 'pistol' ? 0.26 : wId === 'sniper_rifle' ? 0.85 : 0.62
        ),
        polymerMat
      );
      weaponRig.add(receiver);

      const barrelLen =
        wId === 'sniper_rifle' ? 0.65 : wId === 'shotgun' ? 0.48 : wId === 'assault_rifle' ? 0.42 : 0.24;
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, barrelLen, 10),
        metalDark
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -barrelLen / 2 - 0.15);
      weaponRig.add(barrel);

      if (wId === 'pistol') {
        // Suppressor cylinder
        const suppressor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.026, 0.22, 12),
          accentMat
        );
        suppressor.rotation.x = Math.PI / 2;
        suppressor.position.set(0, 0.02, -0.35);
        weaponRig.add(suppressor);
      } else if (wId === 'sniper_rifle') {
        // High-magnification scope tube
        const scope = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.028, 0.34, 14),
          metalDark
        );
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.095, -0.12);
        weaponRig.add(scope);
      } else if (wId === 'assault_rifle') {
        // Reflex sight housing
        const optic = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), metalDark);
        optic.position.set(0, 0.08, -0.08);
        weaponRig.add(optic);
      }
    };

    buildWeaponViewmodel(gameRef.current.weapon.current);
    weaponRig.position.set(0.24, -0.22, -0.45);

    // Muzzle flash light
    const muzzleLight = new THREE.PointLight(0xf59e0b, 0, 8);
    muzzleLight.position.set(0, 0.05, -0.85);
    weaponRig.add(muzzleLight);

    // Active 3D Smoke Meshes & Ballistic Tracers
    const smokeMeshes: Record<string, THREE.Mesh> = {};
    const activeTracers: { line: THREE.Line; ttl: number }[] = [];

    const spawnTracer = (start: THREE.Vector3, end: THREE.Vector3, colorHex: number) => {
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      activeTracers.push({ line, ttl: 0.08 });
    };

    // Check line of sight between two 3D points (blocked by buildings, obstacles, or smoke)
    const hasLineOfSight = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number
    ): boolean => {
      // Check active smoke clouds first
      for (const smoke of gameRef.current.smokeClouds) {
        const dx = bx - ax;
        const dz = bz - az;
        const lenSq = dx * dx + dz * dz;
        if (lenSq > 0.001) {
          const t = Math.max(0, Math.min(1, ((smoke.x - ax) * dx + (smoke.z - az) * dz) / lenSq));
          const projX = ax + t * dx;
          const projZ = az + t * dz;
          const distSq = (projX - smoke.x) ** 2 + (projZ - smoke.z) ** 2;
          if (distSq < smoke.radius * smoke.radius) {
            return false;
          }
        }
      }

      // Ray march in 16 steps against solid collision boxes
      const steps = 16;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        const pz = az + (bz - az) * t;

        for (const box of gameRef.current.collisions) {
          if (
            px >= box.minX &&
            px <= box.maxX &&
            py >= box.minY &&
            py <= box.maxY &&
            pz >= box.minZ &&
            pz <= box.maxZ
          ) {
            return false;
          }
        }
      }
      return true;
    };

    // Alert nearby enemies within acoustic radius
    const broadcastSoundAlert = (originX: number, originZ: number, radius: number) => {
      gameRef.current.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        const dist = Math.hypot(enemy.x - originX, enemy.z - originZ);
        if (dist <= radius) {
          enemy.lastKnownPlayerPos = { x: originX, z: originZ };
          if (enemy.state === 'PATROL' || enemy.state === 'GUARD') {
            enemy.state = 'SUSPICIOUS';
            enemy.stateTimer = 8;
          } else if (dist <= radius * 0.55) {
            enemy.state = 'COMBAT';
            enemy.stateTimer = 10;
          }
        }
      });
    };

    // Weapon Fire Logic
    const handleFireWeapon = () => {
      const state = gameRef.current;
      if (state.isPaused || state.showFullMap || state.missionFinished) return;
      const wSpec = WEAPONS[state.weapon.current];
      const now = performance.now();

      if (state.weapon.isReloading) return;
      if (now - state.weapon.lastFireTime < wSpec.fireRateMs) return;

      const currentMag = state.weapon.mag[state.weapon.current];
      if (currentMag <= 0) {
        handleReloadWeapon();
        return;
      }

      state.weapon.lastFireTime = now;
      state.weapon.mag[state.weapon.current] = currentMag - 1;
      setMagAmmo({ ...state.weapon.mag });

      state.stats.shotsFired += 1;
      soundEngine.playWeaponFire(state.weapon.current);

      if (!wSpec.isSuppressed) {
        muzzleLight.intensity = 3.5;
        setTimeout(() => {
          muzzleLight.intensity = 0;
        }, 45);
      }

      // Broadcast gunshot sound to enemies
      broadcastSoundAlert(state.player.x, state.player.z, wSpec.noiseRadius);

      // Raycast pellets
      const raycaster = new THREE.Raycaster();
      const hitMeshes: THREE.Object3D[] = [];
      state.enemies.forEach((e) => {
        if (e.isAlive && enemyMeshes[e.id]) {
          hitMeshes.push(enemyMeshes[e.id].head, enemyMeshes[e.id].body);
        }
      });

      let registeredHitThisShot = false;
      let registeredHeadshot = false;

      for (let p = 0; p < wSpec.pelletCount; p++) {
        const baseSpread = state.player.isADS ? wSpec.adsSpreadRad : wSpec.spreadRad;
        const crouchMod = state.player.isCrouching ? 0.65 : 1.0;
        const spread = baseSpread * crouchMod;

        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          -1
        ).normalize();
        dir.applyQuaternion(camera.quaternion);

        raycaster.set(camera.position, dir);
        raycaster.far = wSpec.maxRange;

        const intersects = raycaster.intersectObjects(hitMeshes, false);
        const tracerStart = camera.position
          .clone()
          .add(new THREE.Vector3(0.15, -0.12, -0.4).applyQuaternion(camera.quaternion));

        if (intersects.length > 0) {
          const hit = intersects[0];
          const { enemyId, isHead } = hit.object.userData as {
            enemyId: string;
            isHead: boolean;
          };
          const targetEnemy = state.enemies.find((e) => e.id === enemyId);

          if (
            targetEnemy &&
            targetEnemy.isAlive &&
            hasLineOfSight(
              camera.position.x,
              camera.position.y,
              camera.position.z,
              hit.point.x,
              hit.point.y,
              hit.point.z
            )
          ) {
            spawnTracer(tracerStart, hit.point, 0xfbbf24);

            // Distance falloff calculation
            const dist = hit.distance;
            const rangeFactor =
              dist <= wSpec.effectiveRange
                ? 1.0
                : Math.max(
                    0.25,
                    1 - (dist - wSpec.effectiveRange) / (wSpec.maxRange - wSpec.effectiveRange)
                  );

            const dmg =
              wSpec.damage * rangeFactor * (isHead ? wSpec.headshotMultiplier : 1.0);
            targetEnemy.health -= dmg;
            targetEnemy.detectedTimer = 20;
            targetEnemy.lastKnownPlayerPos = { x: state.player.x, z: state.player.z };
            targetEnemy.state = targetEnemy.health < 30 ? 'RETREAT' : 'COMBAT';

            registeredHitThisShot = true;
            if (isHead) registeredHeadshot = true;

            if (targetEnemy.health <= 0) {
              targetEnemy.isAlive = false;
              state.stats.enemiesNeutralized += 1;
              if (enemyMeshes[targetEnemy.id]) {
                enemyMeshes[targetEnemy.id].group.rotation.x = -Math.PI / 2;
                enemyMeshes[targetEnemy.id].group.position.y = targetEnemy.y + 0.2;
              }

              // Check if enemy was an eliminate_target objective
              if (targetEnemy.isTargetObjectiveId) {
                const obj = state.objectives.find(
                  (o) => o.id === targetEnemy.isTargetObjectiveId
                );
                if (obj && !obj.completed) {
                  obj.completed = true;
                  setObjectivesState([...state.objectives]);
                  soundEngine.playRadioBeep('objective');
                  setRadioMessage(`COMMAND: High-value target ${targetEnemy.name} neutralized.`);
                }
              }
            }
          } else {
            spawnTracer(
              tracerStart,
              camera.position.clone().add(dir.multiplyScalar(45)),
              0xfde68a
            );
          }
        } else {
          spawnTracer(
            tracerStart,
            camera.position.clone().add(dir.multiplyScalar(55)),
            0xfde68a
          );
        }
      }

      if (registeredHitThisShot) {
        state.stats.shotsHit += 1;
        if (registeredHeadshot) state.stats.headshots += 1;
        soundEngine.playHitMarker(registeredHeadshot);
        setHitMarker(registeredHeadshot ? 'headshot' : 'normal');
        setTimeout(() => setHitMarker(null), 160);
      }

      // Apply realistic recoil kick
      const recoilMod = state.player.isCrouching ? 0.65 : 1.0;
      state.player.pitch = Math.min(
        Math.PI / 2.2,
        state.player.pitch + wSpec.recoilKick * recoilMod
      );
      state.player.yaw += (Math.random() - 0.5) * wSpec.recoilKick * 0.45;
      state.weapon.recoilKickBack = 0.09;
    };

    // Reload Weapon Logic
    const handleReloadWeapon = () => {
      const state = gameRef.current;
      if (state.weapon.isReloading) return;
      const wId = state.weapon.current;
      const wSpec = WEAPONS[wId];
      const curMag = state.weapon.mag[wId];
      const curRes = state.weapon.reserve[wId];

      if (curMag >= wSpec.magSize || curRes <= 0) return;

      state.weapon.isReloading = true;
      setIsReloading(true);
      soundEngine.playReload();

      setTimeout(() => {
        const needed = wSpec.magSize - state.weapon.mag[wId];
        const transfer = Math.min(needed, state.weapon.reserve[wId]);
        state.weapon.mag[wId] += transfer;
        state.weapon.reserve[wId] -= transfer;
        state.weapon.isReloading = false;
        setMagAmmo({ ...state.weapon.mag });
        setReserveAmmo({ ...state.weapon.reserve });
        setIsReloading(false);
      }, wSpec.reloadTimeMs);
    };

    // Use Medical Kit
    const handleUseMedkit = () => {
      const state = gameRef.current;
      if (state.inventory.medkits <= 0 || state.player.health >= 100) return;
      state.inventory.medkits -= 1;
      state.player.health = Math.min(100, state.player.health + 55);
      setMedkits(state.inventory.medkits);
      setHealth(Math.round(state.player.health));
      soundEngine.playRadioBeep('heal');
      setRadioMessage('TRAUMA KIT APPLIED: Vital signs stabilized (+55% Health).');
    };

    // Throw Tactical Equipment (Frag, Flashbang, Smoke, Breach)
    const handleThrowTactical = (type: TacticalItemType) => {
      const state = gameRef.current;
      if (state.inventory.tactical[type] <= 0) return;

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const targetX = state.player.x + forward.x * 13;
      const targetZ = state.player.z + forward.z * 13;

      state.inventory.tactical[type] -= 1;
      setTacticalCounts({ ...state.inventory.tactical });
      soundEngine.playExplosion(type);

      if (type === 'smoke') {
        const smokeId = `smoke_${Date.now()}`;
        const smokeCloud: ActiveSmokeCloud = {
          id: smokeId,
          x: targetX,
          y: 0,
          z: targetZ,
          radius: 7.5,
          remainingSeconds: 14,
        };
        state.smokeClouds.push(smokeCloud);
        setSmokeCloudsState([...state.smokeClouds]);

        const smokeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(7.2, 16, 16),
          new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,
            transparent: true,
            opacity: 0.55,
            roughness: 1,
          })
        );
        smokeMesh.position.set(targetX, 2.5, targetZ);
        scene.add(smokeMesh);
        smokeMeshes[smokeId] = smokeMesh;
        setRadioMessage('SMOKE DEPLOYED: Visual concealment screen active for 14s.');
      } else if (type === 'flashbang') {
        let stunnedCount = 0;
        state.enemies.forEach((e) => {
          if (!e.isAlive) return;
          const dist = Math.hypot(e.x - targetX, e.z - targetZ);
          if (dist <= 13) {
            e.state = 'STUNNED';
            e.stunTimer = 5.5;
            e.detectedTimer = 18;
            stunnedCount++;
          }
        });
        setRadioMessage(
          `FLASHBANG DETONATED: ${stunnedCount} hostile(s) disoriented and stunned.`
        );
      } else if (type === 'frag' || type === 'breach') {
        // Check if near any breachable building door
        state.buildings.forEach((b) => {
          if (b.requiresBreach && !b.isBreached) {
            const dist = Math.hypot(b.x - targetX, b.z - targetZ);
            if (dist <= 12) {
              b.isBreached = true;
              if (doorMeshes[b.id]) {
                scene.remove(doorMeshes[b.id]);
              }
              state.collisions = state.collisions.filter((c) => c.buildingId !== b.id);
              setRadioMessage(`BREACH SUCCESSFUL: ${b.name} reinforced door destroyed.`);
            }
          }
        });

        // Blast damage to enemies in radius
        state.enemies.forEach((e) => {
          if (!e.isAlive) return;
          const dist = Math.hypot(e.x - targetX, e.z - targetZ);
          if (dist <= 10.5) {
            const dmg = (1 - dist / 11) * 145;
            e.health -= dmg;
            e.detectedTimer = 18;
            if (e.health <= 0) {
              e.isAlive = false;
              state.stats.enemiesNeutralized += 1;
              if (enemyMeshes[e.id]) {
                enemyMeshes[e.id].group.rotation.x = -Math.PI / 2;
                enemyMeshes[e.id].group.position.y = e.y + 0.2;
              }
              if (e.isTargetObjectiveId) {
                const obj = state.objectives.find((o) => o.id === e.isTargetObjectiveId);
                if (obj && !obj.completed) {
                  obj.completed = true;
                  setObjectivesState([...state.objectives]);
                }
              }
            }
          }
        });
        broadcastSoundAlert(targetX, targetZ, 90);
      }
    };

    // Context Interaction [E] (Supply Crates, Breaching Doors, Objectives)
    const handleInteract = () => {
      const state = gameRef.current;
      const px = state.player.x;
      const pz = state.player.z;

      // 1. Check Reinforced Doors requiring breach
      for (const b of state.buildings) {
        if (b.requiresBreach && !b.isBreached) {
          const dist = Math.hypot(b.x - px, b.z - pz);
          if (dist <= Math.max(b.width, b.depth) / 2 + 4.5) {
            if (state.inventory.tactical.breach > 0) {
              state.inventory.tactical.breach -= 1;
              setTacticalCounts({ ...state.inventory.tactical });
            }
            b.isBreached = true;
            soundEngine.playExplosion('breach');
            if (doorMeshes[b.id]) {
              scene.remove(doorMeshes[b.id]);
            }
            state.collisions = state.collisions.filter((c) => c.buildingId !== b.id);
            // Stun enemies inside the breached building
            state.enemies.forEach((e) => {
              if (
                e.isAlive &&
                Math.abs(e.x - b.x) <= b.width / 2 &&
                Math.abs(e.z - b.z) <= b.depth / 2
              ) {
                e.state = 'STUNNED';
                e.stunTimer = 4.0;
                e.detectedTimer = 18;
              }
            });
            setRadioMessage(`DOOR BREACHED: ${b.name} entry cleared! Interior guards stunned.`);
            return;
          }
        }
      }

      // 2. Check Supply Crates
      for (const s of state.supplies) {
        if (!s.collected && Math.hypot(s.x - px, s.z - pz) <= 4.2) {
          s.collected = true;
          if (supplyMeshes[s.id]) {
            supplyMeshes[s.id].visible = false;
          }
          setSuppliesState([...state.supplies]);
          soundEngine.playRadioBeep('intel');

          if (s.type === 'ammo') {
            state.weapon.reserve.assault_rifle += 45;
            state.weapon.reserve.shotgun += 12;
            state.weapon.reserve.sniper_rifle += 6;
            state.weapon.reserve.pistol += 24;
            setReserveAmmo({ ...state.weapon.reserve });
            setRadioMessage(`RESUPPLY: Collected ${s.label} (+Ammo for all weapons).`);
          } else if (s.type === 'medical') {
            state.inventory.medkits += 2;
            setMedkits(state.inventory.medkits);
            setRadioMessage(`RESUPPLY: Collected ${s.label} (+2 Medical Kits).`);
          } else {
            state.inventory.tactical.frag += 1;
            state.inventory.tactical.flashbang += 1;
            state.inventory.tactical.smoke += 1;
            state.inventory.tactical.breach += 1;
            setTacticalCounts({ ...state.inventory.tactical });
            setRadioMessage(`RESUPPLY: Collected ${s.label} (+1 Frag, Flash, Smoke & Breach).`);
          }
          return;
        }
      }

      // 3. Check Interactive Objectives (recover_item, destroy_equipment, rescue_teammate)
      for (const obj of state.objectives) {
        if (
          !obj.completed &&
          (obj.type === 'recover_item' ||
            obj.type === 'destroy_equipment' ||
            obj.type === 'rescue_teammate')
        ) {
          if (Math.hypot(obj.x - px, obj.z - pz) <= obj.radius + 1.5) {
            obj.completed = true;
            if (objectiveMeshes[obj.id]) {
              if (obj.type === 'destroy_equipment') {
                soundEngine.playExplosion('frag');
              } else {
                soundEngine.playRadioBeep('objective');
              }
              objectiveMeshes[obj.id].visible = false;
            }
            setObjectivesState([...state.objectives]);
            setRadioMessage(`OBJECTIVE COMPLETE: ${obj.title}`);
            return;
          }
        }
      }
    };

    gameRef.current.triggerShootRef = handleFireWeapon;
    gameRef.current.triggerInteractRef = handleInteract;
    gameRef.current.triggerThrowTacticalRef = handleThrowTactical;
    gameRef.current.triggerMedkitRef = handleUseMedkit;
    gameRef.current.triggerReloadRef = handleReloadWeapon;

    // Input Event Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      gameRef.current.keys[code] = true;

      if (code === 'KeyM' || code === 'Tab') {
        e.preventDefault();
        gameRef.current.showFullMap = !gameRef.current.showFullMap;
        setShowFullMap(gameRef.current.showFullMap);
        if (gameRef.current.showFullMap && document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        gameRef.current.isPaused = !gameRef.current.isPaused;
        setIsPaused(gameRef.current.isPaused);
        if (gameRef.current.isPaused && document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }

      if (gameRef.current.isPaused || gameRef.current.showFullMap) return;

      if (code === 'Digit1') {
        gameRef.current.weapon.current = 'assault_rifle';
        setCurrentWeapon('assault_rifle');
        buildWeaponViewmodel('assault_rifle');
      } else if (code === 'Digit2') {
        gameRef.current.weapon.current = 'shotgun';
        setCurrentWeapon('shotgun');
        buildWeaponViewmodel('shotgun');
      } else if (code === 'Digit3') {
        gameRef.current.weapon.current = 'sniper_rifle';
        setCurrentWeapon('sniper_rifle');
        buildWeaponViewmodel('sniper_rifle');
      } else if (code === 'Digit4') {
        gameRef.current.weapon.current = 'pistol';
        setCurrentWeapon('pistol');
        buildWeaponViewmodel('pistol');
      } else if (code === 'KeyR') {
        handleReloadWeapon();
      } else if (code === 'KeyC' || code === 'ControlLeft') {
        gameRef.current.player.isCrouching = !gameRef.current.player.isCrouching;
        setIsCrouching(gameRef.current.player.isCrouching);
      } else if (code === 'KeyZ') {
        gameRef.current.player.isADS = !gameRef.current.player.isADS;
        setIsADS(gameRef.current.player.isADS);
      } else if (code === 'KeyE') {
        handleInteract();
      } else if (code === 'KeyH') {
        handleUseMedkit();
      } else if (code === 'KeyG') {
        handleThrowTactical('frag');
      } else if (code === 'KeyF') {
        handleThrowTactical('flashbang');
      } else if (code === 'KeyV') {
        handleThrowTactical('smoke');
      } else if (code === 'KeyB') {
        handleThrowTactical('breach');
      } else if (code === 'Space' && gameRef.current.player.onGround) {
        gameRef.current.player.vy = 6.2;
        gameRef.current.player.onGround = false;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameRef.current.isPaused || gameRef.current.showFullMap) return;
      if (document.pointerLockElement === renderer.domElement || gameRef.current.mouseButtons.left) {
        const sens = 0.0022 * settings.mouseSensitivity;
        gameRef.current.player.yaw -= e.movementX * sens;
        const yDir = settings.invertY ? 1 : -1;
        gameRef.current.player.pitch = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, gameRef.current.player.pitch + e.movementY * sens * yDir)
        );
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameRef.current.isPaused || gameRef.current.showFullMap) return;
      if (e.button === 0) {
        gameRef.current.mouseButtons.left = true;
        if (document.pointerLockElement !== renderer.domElement) {
          renderer.domElement.requestPointerLock?.();
        }
        handleFireWeapon();
      } else if (e.button === 2) {
        gameRef.current.mouseButtons.right = true;
        gameRef.current.player.isADS = true;
        setIsADS(true);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) gameRef.current.mouseButtons.left = false;
      if (e.button === 2) {
        gameRef.current.mouseButtons.right = false;
        gameRef.current.player.isADS = false;
        setIsADS(false);
      }
    };

    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === renderer.domElement);
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    domElem.addEventListener('contextmenu', onContextMenu);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Main Animation & AI Tick Loop
    let animationFrameId = 0;
    let lastFrameTime = performance.now();
    let hudSyncAccum = 0;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // FPS Limiter support
      if (settings.fpsLimit > 0) {
        const minFrameInterval = 1000 / settings.fpsLimit;
        if (now - lastFrameTime < minFrameInterval - 1) return;
      }

      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const state = gameRef.current;
      if (state.isPaused || state.showFullMap || state.missionFinished) {
        renderer.render(scene, camera);
        return;
      }

      // Automatic rifle firing while holding left mouse button
      if (
        state.mouseButtons.left &&
        WEAPONS[state.weapon.current].automatic &&
        document.pointerLockElement === renderer.domElement
      ) {
        handleFireWeapon();
      }

      // Keyboard fallback look controls (Arrow keys or Q/E) for laptop/trackpad accessibility
      const turnSpeed = 1.85 * settings.mouseSensitivity;
      if (state.keys['ArrowLeft'] || state.keys['KeyQ']) {
        state.player.yaw += turnSpeed * dt;
      }
      if (state.keys['ArrowRight']) {
        state.player.yaw -= turnSpeed * dt;
      }
      if (state.keys['ArrowUp']) {
        state.player.pitch = Math.min(Math.PI / 2.3, state.player.pitch + turnSpeed * 0.7 * dt);
      }
      if (state.keys['ArrowDown']) {
        state.player.pitch = Math.max(-Math.PI / 2.3, state.player.pitch - turnSpeed * 0.7 * dt);
      }

      // Player Movement (Walk, Sprint, Crouch, Jump, Ramps, Rooftops)
      const p = state.player;
      const sprinting = Boolean(
        (state.keys['ShiftLeft'] || state.keys['ShiftRight']) && !p.isCrouching && !p.isADS
      );
      if (sprinting !== p.isSprinting) {
        p.isSprinting = sprinting;
        setIsSprinting(sprinting);
      }

      const moveSpeed = p.isCrouching ? 3.4 : p.isADS ? 3.8 : sprinting ? 8.2 : 5.6;
      let moveForward = 0;
      let moveRight = 0;
      if (state.keys['KeyW']) moveForward += 1;
      if (state.keys['KeyS']) moveForward -= 1;
      if (state.keys['KeyD']) moveRight += 1;
      if (state.keys['KeyA']) moveRight -= 1;

      const sinYaw = Math.sin(p.yaw);
      const cosYaw = Math.cos(p.yaw);
      const dirX = -sinYaw * moveForward + cosYaw * moveRight;
      const dirZ = -cosYaw * moveForward - sinYaw * moveRight;
      const dirLen = Math.hypot(dirX, dirZ);

      const stepX = dirLen > 0 ? (dirX / dirLen) * moveSpeed * dt : 0;
      const stepZ = dirLen > 0 ? (dirZ / dirLen) * moveSpeed * dt : 0;

      // Horizontal collision check with sliding
      const playerRadius = 0.48;
      const canMoveTo = (nx: number, nz: number, py: number) => {
        if (Math.abs(nx) > mission.mapBounds || Math.abs(nz) > mission.mapBounds) return false;
        for (const box of state.collisions) {
          if (box.isRoofFloor) continue;
          if (py + 1.5 > box.minY && py < box.maxY - 0.2) {
            if (
              nx + playerRadius > box.minX &&
              nx - playerRadius < box.maxX &&
              nz + playerRadius > box.minZ &&
              nz - playerRadius < box.maxZ
            ) {
              return false;
            }
          }
        }
        return true;
      };

      if (canMoveTo(p.x + stepX, p.z, p.y)) p.x += stepX;
      if (canMoveTo(p.x, p.z + stepZ, p.y)) p.z += stepZ;

      // Determine ground/ramp/rooftop elevation beneath player
      let supportY = 0;
      for (const ramp of state.ramps) {
        if (p.x >= ramp.minX && p.x <= ramp.maxX && p.z >= ramp.minZ && p.z <= ramp.maxZ) {
          const t = Math.max(
            0,
            Math.min(1, (ramp.startZ - p.z) / (ramp.startZ - ramp.endZ))
          );
          supportY = Math.max(supportY, t * ramp.maxHeight);
        }
      }
      for (const box of state.collisions) {
        if (
          box.isRoofFloor &&
          box.roofY !== undefined &&
          p.x >= box.minX - 0.3 &&
          p.x <= box.maxX + 0.3 &&
          p.z >= box.minZ - 0.3 &&
          p.z <= box.maxZ + 0.3 &&
          p.y >= box.roofY - 1.5
        ) {
          supportY = Math.max(supportY, box.roofY);
        }
      }

      // Gravity & Vertical movement
      p.vy -= 17.5 * dt;
      p.y += p.vy * dt;
      if (p.y <= supportY) {
        p.y = supportY;
        p.vy = 0;
        p.onGround = true;
      }

      // Footstep acoustics & enemy sound detection when sprinting
      if (dirLen > 0 && p.onGround) {
        state.footstepAccum += moveSpeed * dt;
        if (state.footstepAccum >= 2.3) {
          state.footstepAccum = 0;
          soundEngine.playFootstep(mission.environment, p.isCrouching, sprinting);
          if (sprinting) {
            broadcastSoundAlert(p.x, p.z, 22);
          }
        }
      }

      // Smooth Camera Height, FOV (ADS Zoom), and Weapon Bob
      const targetEyeHeight = p.isCrouching ? 1.05 : 1.7;
      p.height += (targetEyeHeight - p.height) * Math.min(1, dt * 12);

      const walkBob =
        dirLen > 0 && p.onGround ? Math.sin(now * 0.011) * (p.isADS ? 0.01 : 0.035) : 0;

      camera.position.set(p.x, p.y + p.height + walkBob, p.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = p.yaw;
      camera.rotation.x = p.pitch;

      const wSpec = WEAPONS[state.weapon.current];
      const targetFov = p.isADS ? wSpec.zoomFov : sprinting ? 75 : 70;
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14);
      camera.updateProjectionMatrix();

      // Animate Weapon Viewmodel (ADS centering + Recoil recovery + Reload tilt)
      state.weapon.recoilKickBack = Math.max(0, state.weapon.recoilKickBack - dt * 0.45);
      const targetRigX = p.isADS ? 0.0 : 0.24;
      const targetRigY = state.weapon.isReloading ? -0.38 : p.isADS ? -0.145 : -0.22;
      const targetRigZ = (p.isADS ? -0.32 : -0.45) + state.weapon.recoilKickBack;
      weaponRig.position.x += (targetRigX - weaponRig.position.x) * Math.min(1, dt * 15);
      weaponRig.position.y += (targetRigY - weaponRig.position.y) * Math.min(1, dt * 12);
      weaponRig.position.z += (targetRigZ - weaponRig.position.z) * Math.min(1, dt * 15);
      weaponRig.rotation.x = state.weapon.isReloading ? -0.45 : 0;

      // Update Weather Particles around Player
      const posAttr = weatherParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let py = posAttr.getY(i) - (mission.environment === 'snow' ? 3.2 : 1.5) * dt;
        let px = posAttr.getX(i) + (mission.environment === 'desert' ? 6.5 : 0.8) * dt;
        if (py < 0) py = 26;
        if (px - p.x > 70) px -= 140;
        if (px - p.x < -70) px += 140;
        posAttr.setXY(i, px, py);
      }
      posAttr.needsUpdate = true;

      // Update Active Tracers
      for (let i = activeTracers.length - 1; i >= 0; i--) {
        activeTracers[i].ttl -= dt;
        if (activeTracers[i].ttl <= 0) {
          scene.remove(activeTracers[i].line);
          activeTracers.splice(i, 1);
        }
      }

      // Update Active Smoke Clouds
      for (let i = state.smokeClouds.length - 1; i >= 0; i--) {
        const sc = state.smokeClouds[i];
        sc.remainingSeconds -= dt;
        if (sc.remainingSeconds <= 0) {
          if (smokeMeshes[sc.id]) {
            scene.remove(smokeMeshes[sc.id]);
            delete smokeMeshes[sc.id];
          }
          state.smokeClouds.splice(i, 1);
          setSmokeCloudsState([...state.smokeClouds]);
        }
      }

      // Update Intelligent Enemy AI & Line-of-Sight Detection
      const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

      state.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        const meshObj = enemyMeshes[enemy.id];
        if (!meshObj) return;

        if (enemy.detectedTimer > 0) enemy.detectedTimer = Math.max(0, enemy.detectedTimer - dt);
        if (enemy.acousticPingTimer > 0)
          enemy.acousticPingTimer = Math.max(0, enemy.acousticPingTimer - dt);

        if (enemy.stunTimer > 0) {
          enemy.stunTimer -= dt;
          meshObj.group.rotation.z = Math.sin(now * 0.025) * 0.22;
          if (enemy.stunTimer <= 0) {
            enemy.state = 'COMBAT';
            meshObj.group.rotation.z = 0;
          }
          return;
        }

        const dx = p.x - enemy.x;
        const dz = p.z - enemy.z;
        const distToPlayer = Math.hypot(dx, dz);
        const canSeePlayer =
          distToPlayer <=
            (enemy.role === 'sniper' ? 95 : 58) *
              diffConfig.enemyVisionMultiplier *
              (p.isCrouching ? 0.68 : 1.0) &&
          hasLineOfSight(
            enemy.x,
            enemy.y + 1.4,
            enemy.z,
            p.x,
            p.y + p.height * 0.85,
            p.z
          );

        // Check if Player visually spots this enemy (within player view cone + line of sight)
        if (distToPlayer <= 115) {
          const toEnemy = new THREE.Vector3(
            enemy.x - p.x,
            enemy.y + 1.0 - (p.y + p.height),
            enemy.z - p.z
          ).normalize();
          const dot = playerForward.dot(toEnemy);
          if (
            dot > (p.isADS ? 0.78 : 0.65) &&
            hasLineOfSight(p.x, p.y + p.height, p.z, enemy.x, enemy.y + 1.3, enemy.z)
          ) {
            enemy.detectedTimer = 18; // Legitimately spotted! Shows on Tactical Map
          }
        }

        if (canSeePlayer) {
          enemy.lastKnownPlayerPos = { x: p.x, z: p.z };
          enemy.alertLevel = Math.min(
            100,
            enemy.alertLevel + dt * 65 * diffConfig.enemyReactionSpeedMultiplier
          );
          if (enemy.alertLevel >= 45 && enemy.state !== 'COMBAT' && enemy.state !== 'RETREAT') {
            enemy.state = 'COMBAT';
            state.stats.timesDetected += 1;
            soundEngine.playRadioBeep('alert');
            // Commander alerts nearby squadmates in 35m radius!
            const squadAlertRadius = enemy.role === 'commander' ? 38 : 20;
            state.enemies.forEach((ally) => {
              if (
                ally.isAlive &&
                ally.id !== enemy.id &&
                Math.hypot(ally.x - enemy.x, ally.z - enemy.z) <= squadAlertRadius
              ) {
                ally.lastKnownPlayerPos = { x: p.x, z: p.z };
                if (ally.state === 'PATROL' || ally.state === 'GUARD') {
                  ally.state = 'COMBAT';
                }
              }
            });
          }
        } else {
          enemy.alertLevel = Math.max(0, enemy.alertLevel - dt * 14);
        }

        // State behaviors
        if (enemy.state === 'PATROL' && enemy.patrolWaypoints.length > 1) {
          const wp = enemy.patrolWaypoints[enemy.currentWaypointIdx];
          const wdx = wp.x - enemy.x;
          const wdz = wp.z - enemy.z;
          const wDist = Math.hypot(wdx, wdz);
          if (wDist < 1.0) {
            enemy.currentWaypointIdx =
              (enemy.currentWaypointIdx + 1) % enemy.patrolWaypoints.length;
          } else {
            const patrolSpeed = 2.2;
            enemy.x += (wdx / wDist) * patrolSpeed * dt;
            enemy.z += (wdz / wDist) * patrolSpeed * dt;
            enemy.rotationY = Math.atan2(-wdx, -wdz);
          }
        } else if (enemy.state === 'SUSPICIOUS' && enemy.lastKnownPlayerPos) {
          enemy.stateTimer -= dt;
          const tdx = enemy.lastKnownPlayerPos.x - enemy.x;
          const tdz = enemy.lastKnownPlayerPos.z - enemy.z;
          const tDist = Math.hypot(tdx, tdz);
          enemy.rotationY = Math.atan2(-tdx, -tdz);
          if (
            tDist > 4 &&
            enemy.role !== 'rooftop_guard' &&
            enemy.role !== 'sniper' &&
            enemy.y < 1
          ) {
            enemy.x += (tdx / tDist) * 2.5 * dt;
            enemy.z += (tdz / tDist) * 2.5 * dt;
          }
          if (enemy.stateTimer <= 0) {
            enemy.state = enemy.patrolWaypoints.length > 1 ? 'PATROL' : 'GUARD';
          }
        } else if (enemy.state === 'COMBAT' || enemy.state === 'RETREAT') {
          // Face player
          enemy.rotationY = Math.atan2(-dx, -dz);

          // Tactical positioning / strafing / retreat if grounded
          if (enemy.y < 1.0 && enemy.role !== 'rooftop_guard' && enemy.role !== 'sniper') {
            if (enemy.state === 'RETREAT' && distToPlayer < 26) {
              const backX = enemy.x - (dx / distToPlayer) * 2.8 * dt;
              const backZ = enemy.z - (dz / distToPlayer) * 2.8 * dt;
              if (canMoveTo(backX, backZ, enemy.y)) {
                enemy.x = backX;
                enemy.z = backZ;
              }
            } else if (distToPlayer > 22 && enemy.role !== 'indoor_guard') {
              const advX = enemy.x + (dx / distToPlayer) * 2.6 * dt;
              const advZ = enemy.z + (dz / distToPlayer) * 2.6 * dt;
              if (canMoveTo(advX, advZ, enemy.y)) {
                enemy.x = advX;
                enemy.z = advZ;
              }
            }
          }

          // Enemy firing logic when line of sight is clear
          if (canSeePlayer) {
            enemy.fireCooldown -= dt * diffConfig.enemyReactionSpeedMultiplier;
            if (enemy.fireCooldown <= 0) {
              enemy.fireCooldown =
                enemy.role === 'sniper'
                  ? 2.2
                  : enemy.role === 'heavy'
                  ? 0.55
                  : 1.05 + Math.random() * 0.45;

              enemy.acousticPingTimer = 8; // Firing reveals acoustic location on map!
              soundEngine.playEnemyGunshot(distToPlayer);

              const enemyGunPos = new THREE.Vector3(enemy.x, enemy.y + 1.25, enemy.z);
              const playerTargetPos = new THREE.Vector3(
                p.x + (Math.random() - 0.5) * 1.2,
                p.y + p.height * 0.75,
                p.z + (Math.random() - 0.5) * 1.2
              );
              spawnTracer(enemyGunPos, playerTargetPos, 0xef4444);

              const hitChance =
                Math.max(0.12, 0.58 - distToPlayer / 145) *
                diffConfig.enemyAccuracyMultiplier *
                (p.isCrouching ? 0.72 : 1.0);

              if (Math.random() < hitChance) {
                const rawDmg =
                  (enemy.role === 'sniper' ? 28 : enemy.role === 'heavy' ? 14 : 11) *
                  diffConfig.enemyDamageMultiplier;
                p.health = Math.max(0, p.health - rawDmg);
                state.stats.damageReceived += rawDmg;
                setHealth(Math.round(p.health));
                setDamageFlash(1);
                setTimeout(() => setDamageFlash(0), 260);

                if (p.health <= 0) {
                  finalizeMission(false, `Killed in action by ${enemy.name}.`);
                }
              }
            }
          }
        }

        meshObj.group.position.set(enemy.x, enemy.y, enemy.z);
        meshObj.group.rotation.y = enemy.rotationY;
      });

      // Check Secure Zone Objectives & Context Interaction Prompts
      let activePrompt: string | null = null;
      let holdingZone = false;

      // Reinforced door prompt
      for (const b of state.buildings) {
        if (b.requiresBreach && !b.isBreached) {
          if (Math.hypot(b.x - p.x, b.z - p.z) <= Math.max(b.width, b.depth) / 2 + 4.5) {
            activePrompt = `[E] Place Breaching Charge on ${b.name}`;
          }
        }
      }

      // Supply crate prompt
      for (const s of state.supplies) {
        if (!s.collected && Math.hypot(s.x - p.x, s.z - p.z) <= 4.2) {
          activePrompt = `[E] Scavenge ${s.label}`;
        }
      }

      // Objectives check
      for (const obj of state.objectives) {
        if (obj.completed) continue;
        const dist = Math.hypot(obj.x - p.x, obj.z - p.z);

        if (obj.type === 'secure_zone') {
          if (dist <= obj.radius) {
            holdingZone = true;
            const reqSec = obj.holdSeconds ?? 5;
            state.secureZoneTimer += dt;
            setSecureProgress(Math.min(100, Math.round((state.secureZoneTimer / reqSec) * 100)));
            activePrompt = `Securing ${obj.title} (${Math.min(
              100,
              Math.round((state.secureZoneTimer / reqSec) * 100)
            )}%)...`;
            if (state.secureZoneTimer >= reqSec) {
              obj.completed = true;
              state.secureZoneTimer = 0;
              setSecureProgress(0);
              setObjectivesState([...state.objectives]);
              soundEngine.playRadioBeep('objective');
              setRadioMessage(`SECTOR SECURED: ${obj.title} complete.`);
            }
          }
        } else if (
          obj.type === 'recover_item' ||
          obj.type === 'destroy_equipment' ||
          obj.type === 'rescue_teammate'
        ) {
          if (dist <= obj.radius + 1.5) {
            const verb =
              obj.type === 'recover_item'
                ? 'Recover Intelligence'
                : obj.type === 'destroy_equipment'
                ? 'Plant Sabotage Charge'
                : 'Rescue Operative Echo-4';
            activePrompt = `[E] ${verb}: ${obj.title}`;
          }
        }
      }

      if (!holdingZone && state.secureZoneTimer > 0) {
        state.secureZoneTimer = Math.max(0, state.secureZoneTimer - dt * 0.5);
        setSecureProgress(Math.round((state.secureZoneTimer / 5) * 100));
      }

      // Check Extraction Zone completion
      const mainComplete = state.objectives.filter((o) => !o.isOptional).every((o) => o.completed);
      const distToExtract = Math.hypot(
        mission.extractionPoint.x - p.x,
        mission.extractionPoint.z - p.z
      );
      if (distToExtract <= mission.extractionPoint.radius) {
        if (mainComplete) {
          finalizeMission(true);
          return;
        } else {
          activePrompt = 'EXTRACTION LOCKED: Complete all Primary Objectives first.';
        }
      }

      // Periodic HUD & Mini-Map state sync (every ~120ms for smooth performance)
      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.12) {
        hudSyncAccum = 0;
        setInteractionPrompt(activePrompt);
        setPlayerMapPos({ x: p.x, y: p.y, z: p.z, rotationY: p.yaw });
        setEnemiesState([...state.enemies]);

        const totalSec = Math.floor((now - state.stats.startTime) / 1000);
        setElapsedSeconds(totalSec);

        if (mission.timeLimitSeconds) {
          const maxSec = Math.round(mission.timeLimitSeconds * diffConfig.timeLimitMultiplier);
          const rem = Math.max(0, maxSec - totalSec);
          setRemainingSeconds(rem);
          if (rem <= 0) {
            finalizeMission(false, 'Mission time limit expired before extraction.');
            return;
          }
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
  }, [diffConfig, finalizeMission, mission, settings]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const activeWeaponSpec = WEAPONS[currentWeapon];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Graceful WebGL Fallback */}
      {webglError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 p-8 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-display font-bold text-amber-400">
              3D WebGL Hardware Context Unavailable
            </h2>
            <p className="text-sm text-slate-300">
              Please enable hardware acceleration in your browser or use the Tactical Map [M] to inspect mission parameters.
            </p>
            <button
              onClick={onExitToMenu}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-semibold rounded-lg text-xs"
            >
              Return to Command Menu
            </button>
          </div>
        </div>
      )}

      {/* Damage & Low-Health Screen Vignette */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: damageFlash > 0 ? 0.65 : health < 35 ? 0.45 : 0,
          background:
            'radial-gradient(circle, transparent 45%, rgba(185, 28, 28, 0.85) 100%)',
        }}
      />

      {/* Sniper High-Magnification Mil-Dot Scope Overlay when ADS with Sniper Rifle */}
      {isADS && currentWeapon === 'sniper_rifle' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/75">
          <div className="relative w-[440px] h-[440px] rounded-full border-4 border-slate-700 overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.82)]">
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-red-500/80" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-red-500/80" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-red-500" />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-red-400">
              SRS-99 OPTIC · 8.0X MAGNIFICATION
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Tactical Crosshair & Hitmarker */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        {!(isADS && currentWeapon === 'sniper_rifle') && (
          <div className="relative flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-amber-400" />
            <div
              className={`absolute border border-white/70 transition-all duration-75 ${
                isADS ? 'w-4 h-4' : isCrouching ? 'w-6 h-6' : 'w-8 h-8'
              } rounded-full`}
            />
          </div>
        )}
        {hitMarker && (
          <div
            className={`absolute w-5 h-5 rotate-45 border-2 ${
              hitMarker === 'headshot' ? 'border-red-500 scale-125' : 'border-amber-400'
            }`}
          />
        )}
      </div>

      {/* TOP-LEFT HUD: Mission Objectives & Radio Feed */}
      <div className="pointer-events-none absolute top-4 left-4 z-20 w-80 space-y-2.5">
        <div className="bg-black/55 backdrop-blur-md border border-white/10 rounded-lg p-3.5 text-slate-100">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 mb-1">
            <span>{mission.codeName}</span>
            <span>
              {remainingSeconds !== null
                ? `T-MINUS ${formatTimer(remainingSeconds)}`
                : `ELAPSED ${formatTimer(elapsedSeconds)}`}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-300 mb-2">
            {mission.location} · {difficulty}
          </div>

          <div className="space-y-1.5 border-t border-white/10 pt-2">
            {objectivesState.map((obj) => (
              <div
                key={obj.id}
                className={`flex items-start gap-2 text-xs ${
                  obj.completed
                    ? 'text-emerald-400 line-through opacity-75'
                    : obj.isOptional
                    ? 'text-sky-300'
                    : 'text-slate-100'
                }`}
              >
                <span className="font-mono mt-0.5">{obj.completed ? '[✓]' : '[ ]'}</span>
                <div>
                  <span className="font-medium">{obj.title}</span>
                </div>
              </div>
            ))}
            <div
              className={`flex items-start gap-2 text-xs pt-1 ${
                allMainObjectivesCompleted ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="font-mono">[→]</span>
              <span>
                {allMainObjectivesCompleted
                  ? 'Proceed to Northern Extraction LZ (Green Beacon)'
                  : 'Complete Primary Objectives to unlock Extraction'}
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Radio Feed */}
        <div className="bg-slate-950/75 backdrop-blur-md border border-amber-500/30 rounded-lg px-3.5 py-2 text-xs font-mono text-amber-300">
          {radioMessage}
        </div>
      </div>

      {/* TOP-RIGHT HUD: Live Mini-Map & Quick Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <TacticalMap
          mission={mission}
          playerPos={playerMapPos}
          enemies={enemiesState}
          objectives={objectivesState}
          supplies={suppliesState}
          smokeClouds={smokeCloudsState}
          allMainCompleted={allMainObjectivesCompleted}
          mode="minimap"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              gameRef.current.showFullMap = true;
              setShowFullMap(true);
            }}
            className="px-2.5 py-1 text-[11px] font-mono bg-black/60 hover:bg-slate-800 text-slate-200 border border-white/15 rounded transition-colors whitespace-nowrap"
          >
            Full Map [M]
          </button>
          <button
            onClick={() => {
              gameRef.current.isPaused = true;
              setIsPaused(true);
            }}
            className="px-2.5 py-1 text-[11px] font-mono bg-black/60 hover:bg-slate-800 text-slate-200 border border-white/15 rounded transition-colors whitespace-nowrap"
          >
            Pause [Esc]
          </button>
        </div>
      </div>

      {/* CENTER INTERACTION PROMPT & ZONE PROGRESS */}
      {(interactionPrompt || secureProgress > 0) && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          {secureProgress > 0 && (
            <div className="w-56 h-2 bg-slate-900/90 rounded-full overflow-hidden border border-amber-500/40">
              <div
                className="h-full bg-amber-400 transition-all duration-100"
                style={{ width: `${secureProgress}%` }}
              />
            </div>
          )}
          {interactionPrompt && (
            <div className="px-4 py-2 rounded-lg bg-black/75 backdrop-blur-md border border-amber-400/50 text-amber-300 text-xs font-mono tracking-wide shadow-lg">
              {interactionPrompt}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM-LEFT HUD: Operator Health, Stance, Stealth Signature & Medkits */}
      <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg p-3.5 w-72 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-slate-300">OPERATOR INTEGRITY</span>
          <span
            className={`font-mono font-bold ${
              health > 60 ? 'text-emerald-400' : health > 30 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {health}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-150 ${
              health > 60 ? 'bg-emerald-500' : health > 30 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${health}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pt-1">
          <span>
            STANCE:{' '}
            <strong className="text-sky-300">
              {isCrouching ? 'CROUCH (STEALTH)' : isSprinting ? 'SPRINT' : 'STANDING'}
            </strong>
          </span>
          <button
            onClick={() => gameRef.current.triggerMedkitRef()}
            className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded transition-colors whitespace-nowrap"
          >
            [H] Medkit ({medkits})
          </button>
        </div>
      </div>

      {/* BOTTOM-CENTER ACCESSIBILITY / LAPTOP QUICK ACTION BAR */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden xl:flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-300">
        <span>
          {pointerLocked
            ? 'MOUSE LOCKED · [WASD] Move · [LMB] Fire · [RMB/Z] Aim · [C] Crouch'
            : 'Click 3D View to Lock Mouse · Or use [WASD] + [Arrows] + Quick Actions:'}
        </span>
        <button
          onClick={() => gameRef.current.triggerShootRef()}
          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded whitespace-nowrap"
        >
          Fire
        </button>
        <button
          onClick={() => gameRef.current.triggerInteractRef()}
          className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 rounded whitespace-nowrap"
        >
          Interact [E]
        </button>
      </div>

      {/* BOTTOM-RIGHT HUD: Weapon Arsenal, Ammunition & Tactical Equipment */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg p-3.5 w-80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-display font-bold text-slate-100 tracking-wide">
              {activeWeaponSpec.name}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {activeWeaponSpec.designation} · {activeWeaponSpec.isSuppressed ? 'SUPPRESSED' : 'UNSUPPRESSED'}
            </div>
          </div>
          <div className="text-right font-mono">
            {isReloading ? (
              <span className="text-xs text-amber-400 animate-pulse">RELOADING...</span>
            ) : (
              <div>
                <span className="text-xl font-bold text-amber-400">{magAmmo[currentWeapon]}</span>
                <span className="text-xs text-slate-400"> / {reserveAmmo[currentWeapon]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Weapon Slots [1 - 4] */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {WEAPON_ORDER.map((wId, index) => {
            const active = currentWeapon === wId;
            const shortLabels: Record<WeaponId, string> = {
              assault_rifle: '1. RIFLE',
              shotgun: '2. SHOT',
              sniper_rifle: '3. SNIPER',
              pistol: '4. PISTOL',
            };
            return (
              <button
                key={wId}
                onClick={() => {
                  gameRef.current.weapon.current = wId;
                  setCurrentWeapon(wId);
                }}
                className={`py-1 px-1.5 rounded text-[10px] font-mono border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-semibold'
                    : 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {shortLabels[wId]}
              </button>
            );
          })}
        </div>

        {/* Tactical Ordnance Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/10 text-[10px] font-mono">
          <button
            onClick={() => gameRef.current.triggerThrowTacticalRef('frag')}
            className="py-1 px-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 whitespace-nowrap"
          >
            [G] Frag:{tacticalCounts.frag}
          </button>
          <button
            onClick={() => gameRef.current.triggerThrowTacticalRef('flashbang')}
            className="py-1 px-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 whitespace-nowrap"
          >
            [F] Flash:{tacticalCounts.flashbang}
          </button>
          <button
            onClick={() => gameRef.current.triggerThrowTacticalRef('smoke')}
            className="py-1 px-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 whitespace-nowrap"
          >
            [V] Smoke:{tacticalCounts.smoke}
          </button>
          <button
            onClick={() => gameRef.current.triggerThrowTacticalRef('breach')}
            className="py-1 px-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 whitespace-nowrap"
          >
            [B] C4:{tacticalCounts.breach}
          </button>
        </div>
      </div>

      {/* FULLSCREEN TACTICAL MAP MODAL */}
      {showFullMap && (
        <TacticalMap
          mission={mission}
          playerPos={playerMapPos}
          enemies={enemiesState}
          objectives={objectivesState}
          supplies={suppliesState}
          smokeClouds={smokeCloudsState}
          allMainCompleted={allMainObjectivesCompleted}
          mode="fullscreen"
          onClose={() => {
            gameRef.current.showFullMap = false;
            setShowFullMap(false);
          }}
        />
      )}

      {/* PAUSE MENU OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5 shadow-2xl">
            <div>
              <div className="text-xs font-mono text-amber-400">{mission.codeName}</div>
              <h2 className="text-xl font-display font-bold text-slate-100 mt-0.5">
                Operation Paused
              </h2>
              <p className="text-xs text-slate-400 mt-1">{mission.title}</p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  gameRef.current.isPaused = false;
                  setIsPaused(false);
                }}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors"
              >
                Resume Mission
              </button>
              <button
                onClick={() => {
                  gameRef.current.isPaused = false;
                  setIsPaused(false);
                  gameRef.current.showFullMap = true;
                  setShowFullMap(true);
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm rounded-lg transition-colors"
              >
                Open Tactical Reconnaissance Map [M]
              </button>
              <button
                onClick={onOpenSettings}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm rounded-lg transition-colors"
              >
                Graphics & Audio Settings
              </button>
              <button
                onClick={onExitToMenu}
                className="w-full py-2.5 px-4 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-sm rounded-lg transition-colors"
              >
                Abort Operation & Return to Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
