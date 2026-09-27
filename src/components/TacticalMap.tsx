import React, { useEffect, useRef } from 'react';
import {
  ActiveSmokeCloud,
  MissionDef,
  ObjectiveDef,
  RuntimeEnemy,
  SupplyCrateDef,
} from '../types/game';

interface TacticalMapProps {
  mission: MissionDef;
  playerPos: { x: number; y: number; z: number; rotationY: number };
  enemies: RuntimeEnemy[];
  objectives: ObjectiveDef[];
  supplies: SupplyCrateDef[];
  smokeClouds: ActiveSmokeCloud[];
  allMainCompleted: boolean;
  mode: 'minimap' | 'fullscreen';
  onClose?: () => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  mission,
  playerPos,
  enemies,
  objectives,
  supplies,
  smokeClouds,
  allMainCompleted,
  mode,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.fillStyle = mode === 'minimap' ? 'rgba(9, 14, 22, 0.88)' : '#0a1018';
    ctx.fillRect(0, 0, width, height);

    const scale = mode === 'minimap' ? 2.1 : Math.min(width, height) / (mission.mapBounds * 2.05);
    const centerX = width / 2;
    const centerY = height / 2;

    const toScreen = (wx: number, wz: number) => {
      if (mode === 'minimap') {
        // Player-centered minimap
        return {
          sx: centerX + (wx - playerPos.x) * scale,
          sy: centerY + (wz - playerPos.z) * scale,
        };
      } else {
        // World-centered full tactical map (offset slightly so north -z is well framed)
        return {
          sx: centerX + wx * scale,
          sy: centerY + (wz + 15) * scale,
        };
      }
    };

    // Tactical grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
    ctx.lineWidth = 1;
    const step = 20 * scale;
    for (let x = centerX % step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = centerY % step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Main central road / corridor
    const roadTop = toScreen(-5, -mission.mapBounds);
    const roadBottom = toScreen(5, mission.mapBounds);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.fillRect(
      roadTop.sx,
      roadTop.sy,
      (roadBottom.sx - roadTop.sx),
      (roadBottom.sy - roadTop.sy)
    );

    // Intelligence Recon Zones (approximate threat areas from briefing)
    mission.intelReconZones.forEach((zone) => {
      const { sx, sy } = toScreen(zone.x, zone.z);
      const r = zone.radius * scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (mode === 'fullscreen') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText(`INTEL: ${zone.label.toUpperCase()}`, sx - r * 0.6, sy - r - 5);
      }
    });

    // Buildings
    mission.buildings.forEach((b) => {
      const topLeft = toScreen(b.x - b.width / 2, b.z - b.depth / 2);
      const w = b.width * scale;
      const d = b.depth * scale;

      ctx.fillStyle =
        b.requiresBreach && !b.isBreached
          ? 'rgba(127, 29, 29, 0.55)'
          : 'rgba(51, 65, 85, 0.85)';
      ctx.strokeStyle =
        b.requiresBreach && !b.isBreached
          ? 'rgba(248, 113, 113, 0.8)'
          : 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(topLeft.sx, topLeft.sy, w, d);
      ctx.strokeRect(topLeft.sx, topLeft.sy, w, d);

      if (mode === 'fullscreen') {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(b.name, topLeft.sx + 4, topLeft.sy + 13);
        if (b.requiresBreach && !b.isBreached) {
          ctx.fillStyle = '#fca5a5';
          ctx.font = '600 9px "JetBrains Mono", monospace';
          ctx.fillText('[BREACH REQ]', topLeft.sx + 4, topLeft.sy + 25);
        } else if (b.hasRooftopAccess) {
          ctx.fillStyle = '#93c5fd';
          ctx.font = '500 9px "JetBrains Mono", monospace';
          ctx.fillText('[ROOF ACCESS]', topLeft.sx + 4, topLeft.sy + 25);
        }
      }
    });

    // Obstacles (Watchtowers, vehicles, cover)
    mission.obstacles.forEach((o) => {
      const pos = toScreen(o.x, o.z);
      const w = Math.max(4, o.width * scale);
      const d = Math.max(4, o.depth * scale);
      ctx.fillStyle =
        o.type === 'watchtower'
          ? 'rgba(217, 119, 6, 0.65)'
          : o.type === 'vehicle'
          ? 'rgba(71, 85, 105, 0.85)'
          : 'rgba(100, 116, 139, 0.5)';
      ctx.fillRect(pos.sx - w / 2, pos.sy - d / 2, w, d);
    });

    // Active Smoke Clouds
    smokeClouds.forEach((smoke) => {
      const pos = toScreen(smoke.x, smoke.z);
      ctx.fillStyle = 'rgba(203, 213, 225, 0.38)';
      ctx.beginPath();
      ctx.arc(pos.sx, pos.sy, smoke.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // Uncollected Supply Crates
    supplies.forEach((s) => {
      if (s.collected) return;
      const pos = toScreen(s.x, s.z);
      ctx.fillStyle =
        s.type === 'medical'
          ? '#10b981'
          : s.type === 'ammo'
          ? '#38bdf8'
          : '#a855f7';
      ctx.fillRect(pos.sx - 3.5, pos.sy - 3.5, 7, 7);
    });

    // Objectives
    objectives.forEach((obj) => {
      if (obj.completed) return;
      const pos = toScreen(obj.x, obj.z);
      ctx.fillStyle = obj.isOptional ? '#38bdf8' : '#f59e0b';
      ctx.strokeStyle = obj.isOptional ? 'rgba(56, 189, 248, 0.45)' : 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.sx, pos.sy, mode === 'minimap' ? 5 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.sx, pos.sy, mode === 'minimap' ? 9 : 13, 0, Math.PI * 2);
      ctx.stroke();

      if (mode === 'fullscreen') {
        ctx.fillStyle = obj.isOptional ? '#bae6fd' : '#fde68a';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(obj.title, pos.sx + 12, pos.sy + 4);
      }
    });

    // Extraction Point
    const ext = toScreen(mission.extractionPoint.x, mission.extractionPoint.z);
    ctx.strokeStyle = allMainCompleted ? '#10b981' : 'rgba(16, 185, 129, 0.4)';
    ctx.fillStyle = allMainCompleted ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ext.sx, ext.sy, mission.extractionPoint.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (mode === 'fullscreen') {
      ctx.fillStyle = '#34d399';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('EXTRACTION LZ', ext.sx - 36, ext.sy - mission.extractionPoint.radius * scale - 6);
    }

    // Legitimately Detected Enemies ONLY
    enemies.forEach((enemy) => {
      if (!enemy.isAlive) return;
      const isVisuallyDetected = enemy.detectedTimer > 0;
      const isAcousticallyDetected = enemy.acousticPingTimer > 0;

      if (!isVisuallyDetected && !isAcousticallyDetected) {
        // Hidden! Exploration and line-of-sight detection required
        return;
      }

      const pos = toScreen(enemy.x, enemy.z);

      if (isAcousticallyDetected && !isVisuallyDetected) {
        // Acoustic ring only
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.sx, pos.sy, mode === 'minimap' ? 8 : 12, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }

      // Visually detected enemy marker
      ctx.fillStyle =
        enemy.role === 'commander'
          ? '#f43f5e'
          : enemy.role === 'sniper'
          ? '#a855f7'
          : enemy.role === 'heavy'
          ? '#f97316'
          : '#ef4444';

      ctx.beginPath();
      ctx.arc(pos.sx, pos.sy, mode === 'minimap' ? 4.5 : 6, 0, Math.PI * 2);
      ctx.fill();

      if (mode === 'fullscreen') {
        ctx.fillStyle = '#fca5a5';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(enemy.role.toUpperCase(), pos.sx + 8, pos.sy + 3);
      }
    });

    // Player Marker & View Cone
    const pScreen = toScreen(playerPos.x, playerPos.z);
    ctx.save();
    ctx.translate(pScreen.sx, pScreen.sy);
    // In Three.js, rotationY = 0 looks along -Z (up on canvas)
    ctx.rotate(-playerPos.rotationY);

    // View cone
    const coneLen = mode === 'minimap' ? 38 : 65;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-coneLen * 0.55, -coneLen);
    ctx.lineTo(coneLen * 0.55, -coneLen);
    ctx.closePath();
    ctx.fill();

    // Player chevron
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [mission, playerPos, enemies, objectives, supplies, smokeClouds, allMainCompleted, mode]);

  if (mode === 'minimap') {
    return (
      <div className="relative rounded-lg overflow-hidden border border-white/15 bg-black/60 backdrop-blur-md shadow-lg">
        <canvas ref={canvasRef} width={176} height={176} className="block" />
        <div className="absolute top-1.5 left-2 text-[10px] font-mono text-slate-300 tracking-wider">
          N ▲ · TAC-MAP [M]
        </div>
        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>
            SPOTTED:{' '}
            <strong className="text-amber-400">
              {enemies.filter((e) => e.isAlive && (e.detectedTimer > 0 || e.acousticPingTimer > 0)).length}
            </strong>
          </span>
          <span>
            HOSTILES: <strong className="text-slate-200">{enemies.filter((e) => e.isAlive).length}</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 pointer-events-auto">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-100 tracking-wide">
              Tactical Reconnaissance Map — {mission.location}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hostiles only appear when visually spotted via line-of-sight or acoustically triangulated during gunfire.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            Resume Operation [M / Tab]
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
          <div className="lg:col-span-2 flex items-center justify-center bg-[#070b11] p-4 relative">
            <canvas
              ref={canvasRef}
              width={620}
              height={520}
              className="max-w-full max-h-[68vh] rounded border border-slate-800/80"
            />
          </div>

          <div className="p-6 border-l border-slate-800 flex flex-col justify-between overflow-y-auto bg-slate-900/30 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Mission Objectives</h3>
              <div className="space-y-2.5">
                {objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className={`p-3 rounded-lg border ${
                      obj.completed
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : obj.isOptional
                        ? 'bg-slate-900/70 border-sky-900/50 text-slate-200'
                        : 'bg-slate-900/70 border-amber-500/40 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span>{obj.isOptional ? 'OPTIONAL OBJECTIVE' : 'PRIMARY OBJECTIVE'}</span>
                      <span>{obj.completed ? 'COMPLETE' : 'ACTIVE'}</span>
                    </div>
                    <div className="text-sm font-semibold">{obj.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{obj.description}</div>
                  </div>
                ))}

                <div
                  className={`p-3 rounded-lg border ${
                    allMainCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span>EXTRACTION</span>
                    <span>{allMainCompleted ? 'READY FOR EVAC' : 'LOCKED'}</span>
                  </div>
                  <div className="text-sm font-semibold">Reach Northern Extraction Zone</div>
                  <div className="text-xs opacity-80 mt-1">
                    Complete all primary objectives, then move to the green extraction perimeter.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
              <div className="font-semibold text-slate-200 mb-2">Tactical Legend</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                  <span>Operator (Vesper-1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span>Primary Objective</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span>Spotted Hostile</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  <span>Spotted Sniper</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Extraction / Medkit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-amber-500/60 border-dashed rounded-full inline-block" />
                  <span>Intel Threat Sector</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
