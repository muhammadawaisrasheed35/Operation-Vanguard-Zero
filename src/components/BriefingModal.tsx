import React from 'react';
import { DIFFICULTY_CONFIGS, WEAPON_ORDER, WEAPONS } from '../data/weapons';
import { DifficultyLevel, MissionDef } from '../types/game';

interface BriefingModalProps {
  mission: MissionDef;
  difficulty: DifficultyLevel;
  onChangeDifficulty: (diff: DifficultyLevel) => void;
  onLaunchMission: () => void;
  onCancel: () => void;
}

export const BriefingModal: React.FC<BriefingModalProps> = ({
  mission,
  difficulty,
  onChangeDifficulty,
  onLaunchMission,
  onCancel,
}) => {
  const diffConfig = DIFFICULTY_CONFIGS[difficulty];
  const primaryObjectives = mission.objectives.filter((o) => !o.isOptional);
  const optionalObjectives = mission.objectives.filter((o) => o.isOptional);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl my-auto">
        {/* Briefing Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 border-b border-slate-800 bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <span>MISSION {String(mission.id).padStart(2, '0')}</span>
              <span aria-hidden="true">·</span>
              <span>{mission.codeName}</span>
              <span aria-hidden="true">·</span>
              <span>THREAT LEVEL: {mission.threatLevel}</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">
              {mission.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>{mission.location}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{mission.sectorCoordinates}</span>
              <span aria-hidden="true">·</span>
              <span>Environment: {mission.environmentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Back to Command
            </button>
            <button
              onClick={onLaunchMission}
              className="px-6 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              Deploy to Sector
            </button>
          </div>
        </div>

        {/* Briefing Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left 2 Columns: Operational Dossier, Objectives & Strategy */}
          <div className="lg:col-span-2 p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">Operational Context</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{mission.storyContext}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-amber-400">Primary Objectives</h3>
                <ul className="space-y-2.5">
                  {primaryObjectives.map((obj, idx) => (
                    <li key={obj.id} className="text-sm text-slate-200">
                      <div className="font-medium">
                        0{idx + 1}. {obj.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{obj.description}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-sky-400">Secondary / Optional Objectives</h3>
                <ul className="space-y-2.5">
                  {optionalObjectives.map((obj) => (
                    <li key={obj.id} className="text-sm text-slate-200">
                      <div className="font-medium">{obj.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{obj.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-200">Sector Intelligence</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {mission.intelligenceSummary}
                </p>
                <div className="text-xs font-mono text-slate-300 pt-1">
                  Confirmed Hostile Garrison: {mission.enemies.length} Operatives ·{' '}
                  {mission.timeLimitSeconds
                    ? `Time Limit: ${Math.round(
                        (mission.timeLimitSeconds * diffConfig.timeLimitMultiplier) / 60
                      )} min`
                    : 'No Time Limit'}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-200">Recommended Tactical Doctrine</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {mission.recommendedStrategy}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Equipment Allocation & Difficulty Selector */}
          <div className="p-8 bg-slate-900/25 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">
                  Available Arsenal & Initial Allocation
                </h3>
                <div className="space-y-2.5 text-xs">
                  {WEAPON_ORDER.map((wId) => {
                    const spec = WEAPONS[wId];
                    const reserveMap: Record<typeof wId, number> = {
                      assault_rifle: Math.round(
                        mission.startingLoadout.assaultRifleReserve * diffConfig.resourceMultiplier
                      ),
                      shotgun: Math.round(
                        mission.startingLoadout.shotgunReserve * diffConfig.resourceMultiplier
                      ),
                      sniper_rifle: Math.round(
                        mission.startingLoadout.sniperReserve * diffConfig.resourceMultiplier
                      ),
                      pistol: Math.round(
                        mission.startingLoadout.pistolReserve * diffConfig.resourceMultiplier
                      ),
                    };
                    return (
                      <div
                        key={wId}
                        className="flex items-center justify-between py-1.5 border-b border-slate-800/70"
                      >
                        <div>
                          <div className="font-medium text-slate-200">{spec.name}</div>
                          <div className="text-slate-400">{spec.category}</div>
                        </div>
                        <div className="font-mono text-slate-300">
                          {spec.magSize} + {reserveMap[wId]} rds
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Tactical Equipment & Medical Supplies
                </h3>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs font-mono text-slate-300">
                  <div>
                    Medical Kits:{' '}
                    {Math.max(
                      1,
                      Math.round(mission.startingLoadout.medkits * diffConfig.resourceMultiplier)
                    )}
                  </div>
                  <div>
                    Frag Grenades:{' '}
                    {Math.max(
                      1,
                      Math.round(
                        mission.startingLoadout.fragGrenades * diffConfig.resourceMultiplier
                      )
                    )}
                  </div>
                  <div>
                    Flashbangs:{' '}
                    {Math.max(
                      1,
                      Math.round(mission.startingLoadout.flashbangs * diffConfig.resourceMultiplier)
                    )}
                  </div>
                  <div>
                    Smoke Grenades:{' '}
                    {Math.max(
                      1,
                      Math.round(
                        mission.startingLoadout.smokeGrenades * diffConfig.resourceMultiplier
                      )
                    )}
                  </div>
                  <div>Breach Charges: {mission.startingLoadout.breachCharges}</div>
                  <div>Field Caches: {mission.supplies.length} Locs</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Operation Difficulty
                </h3>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
                  {(['Easy', 'Normal', 'Hard', 'Extreme'] as DifficultyLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => onChangeDifficulty(lvl)}
                      className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        difficulty === lvl
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {diffConfig.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onLaunchMission}
              className="w-full py-3 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap"
            >
              Confirm Loadout & Enter Mission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
