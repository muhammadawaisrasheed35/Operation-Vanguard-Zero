import React from 'react';

interface FieldManualModalProps {
  onClose: () => void;
}

export const FieldManualModal: React.FC<FieldManualModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-100">
              Operator Field Manual, Controls & Offline Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete operational controls, tactical mechanics, project structure, and local offline build guide.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
          >
            Close Manual
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 text-sm text-slate-300">
          {/* Section 1: Controls */}
          <div className="space-y-3">
            <h3 className="text-base font-display font-bold text-amber-400">
              01. Tactical Operator Controls
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">W, A, S, D</strong> — Move Operator
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">Mouse / Arrows</strong> — Aim & Look
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">Left Click</strong> — Fire Weapon
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">Right Click / Z</strong> — Aim Down Sights (ADS)
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">1, 2, 3, 4</strong> — Switch Weapons
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">R</strong> — Reload Magazine
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">C / Left Ctrl</strong> — Toggle Stealth Crouch
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">Left Shift</strong> — Tactical Sprint
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">Spacebar</strong> — Jump / Vault
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">E</strong> — Interact / Scavenge / Breach
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">H</strong> — Use Medical Kit (+55 HP)
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">G / F / V / B</strong> — Frag / Flash / Smoke / C4
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">M / Tab</strong> — Full Tactical Map
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <strong className="text-slate-100">Esc / P</strong> — Pause Operation
              </div>
            </div>
          </div>

          {/* Section 2: Tactical Combat & AI Mechanics */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-display font-bold text-amber-400">
              02. Reconnaissance, Stealth & Squad AI Doctrine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
              <div className="space-y-2">
                <div className="font-semibold text-slate-100">Legitimate Enemy Detection System</div>
                <p>
                  Hostiles do not permanently appear on your tactical map. You must visually spot them within your field-of-view cone (which marks their position for 18 seconds) or triangulate their acoustic gunfire ring. Mission briefing intelligence zones indicate general threat sectors.
                </p>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-slate-100">Acoustic Signature & Suppressed Fire</div>
                <p>
                  Firing unsuppressed weapons (Assault Rifle, Shotgun, Sniper Rifle) alerts enemies within 75–95 meters. Equipping the <strong className="text-slate-100">P226 Suppressed Pistol [4]</strong> restricts gunshot noise to 14 meters, allowing silent sentry takedowns. Crouching [C] reduces both your visual profile and footstep noise.
                </p>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-slate-100">Smoke Concealment, Flashbangs & Breaching</div>
                <p>
                  Deploying a <strong className="text-slate-100">Smoke Grenade [V]</strong> creates a volumetric smoke screen that physically blocks enemy line-of-sight rays. <strong className="text-slate-100">Flashbangs [F]</strong> blind and stun hostiles for 5.5 seconds. Reinforced red-striped bunker doors require a <strong className="text-slate-100">Breaching Charge [E or B]</strong> to blow open.
                </p>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-slate-100">Rooftop Access & Verticality</div>
                <p>
                  Buildings marked with <span className="font-mono text-sky-300">[ROOF ACCESS]</span> feature exterior tactical ramps along their flank. Climb onto rooftops to eliminate hostile rooftop guards and snipers or gain an overwatch advantage.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Local Offline Installation, Build & Folder Structure */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-display font-bold text-amber-400">
              03. Local Offline Setup, Build Instructions & Project Structure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <div className="font-semibold text-slate-100">Running & Building Locally (100% Offline)</div>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`# 1. Install dependencies once
npm install

# 2. Run local development server (offline ready)
npm run dev

# 3. Build standalone production bundle
npm run build
npm run preview`}
                </pre>
                <p className="text-slate-400 leading-relaxed">
                  All 3D geometry, materials, shaders, Web Audio API weapon/ambient synthesis, AI behavior trees, and `localStorage` save states are self-contained with zero external network dependencies.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-100">Modular Folder Architecture & Troubleshooting</div>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`src/
├── audio/SoundEngine.ts        # Offline Web Audio synthesizer
├── components/
│   ├── GameViewport3D.tsx      # Three.js 3D FPS & AI engine
│   ├── TacticalMap.tsx         # Recon mini-map & full map
│   ├── BriefingModal.tsx       # Pre-mission dossier & loadout
│   ├── MissionResultsModal.tsx # Post-mission rating & stats
│   ├── SettingsModal.tsx       # Graphics, FPS & offline save
│   └── FieldManualModal.tsx    # Controls & technical docs
├── data/
│   ├── missions.ts             # 10 missions across 5 biomes
│   └── weapons.ts              # Ballistics & difficulty rules
├── storage/SaveManager.ts      # Offline localStorage persistence
└── types/game.ts               # Core TypeScript schemas`}
                </pre>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-200">Troubleshooting:</strong> If mouse look does not lock automatically inside an embedded window, click directly on the 3D canvas or use the keyboard Arrow / Q & E look controls. For older laptops, select the <strong className="text-slate-200">Low</strong> or <strong className="text-slate-200">Medium</strong> graphics preset in Settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
