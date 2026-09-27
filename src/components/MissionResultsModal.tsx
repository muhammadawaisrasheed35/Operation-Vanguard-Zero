import React from 'react';
import { MissionDef, MissionResultSummary } from '../types/game';

interface MissionResultsModalProps {
  mission: MissionDef;
  result: MissionResultSummary;
  hasNextMission: boolean;
  onRetry: () => void;
  onNextMission: () => void;
  onReturnToMenu: () => void;
}

export const MissionResultsModal: React.FC<MissionResultsModalProps> = ({
  mission,
  result,
  hasNextMission,
  onRetry,
  onNextMission,
  onReturnToMenu,
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className={`px-8 py-6 border-b ${
            result.success
              ? 'bg-emerald-950/25 border-emerald-800/40'
              : 'bg-red-950/25 border-red-800/40'
          } flex items-center justify-between`}
        >
          <div>
            <div className="text-xs font-mono text-slate-400">
              {mission.codeName} · {result.difficulty.toUpperCase()} DIFFICULTY
            </div>
            <h2
              className={`text-2xl font-display font-bold mt-1 ${
                result.success ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {result.success ? 'Mission Accomplished' : 'Operation Failed'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {result.success
                ? `Sector extracted. All primary objectives in ${mission.location} verified.`
                : result.failureReason || 'Operator incapacitated during combat operations.'}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono text-slate-400">TACTICAL RATING</div>
            <div
              className={`text-4xl font-display font-bold ${
                result.rating === 'S'
                  ? 'text-amber-400'
                  : result.rating === 'A'
                  ? 'text-emerald-400'
                  : result.rating === 'F'
                  ? 'text-red-500'
                  : 'text-sky-400'
              }`}
            >
              {result.rating}
            </div>
          </div>
        </div>

        {/* Performance Metrics Table */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400">COMPLETION TIME</div>
              <div className="text-lg font-semibold text-slate-100 mt-1">
                {formatTime(result.completionTimeSeconds)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400">PRIMARY OBJECTIVES</div>
              <div className="text-lg font-semibold text-slate-100 mt-1">
                {result.mainObjectivesCompleted} / {result.mainObjectivesTotal}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400">OPTIONAL OBJECTIVES</div>
              <div className="text-lg font-semibold text-sky-400 mt-1">
                {result.optionalObjectivesCompleted} / {result.optionalObjectivesTotal}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400">BALLISTIC ACCURACY</div>
              <div className="text-lg font-semibold text-slate-100 mt-1">
                {result.accuracyPercent}% ({result.shotsHit}/{result.shotsFired})
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400">DAMAGE RECEIVED</div>
              <div className="text-lg font-semibold text-slate-100 mt-1">
                {result.damageReceived} HP
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400">HOSTILES NEUTRALIZED</div>
              <div className="text-lg font-semibold text-slate-100 mt-1">
                {result.enemiesNeutralized} / {result.enemiesTotal}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>
              Precision Headshots: <strong className="text-slate-200 font-mono">{result.headshots}</strong> ·{' '}
              Ammunition Efficiency:{' '}
              <strong className="text-slate-200 font-mono">{result.ammoEfficiencyPercent}%</strong>
            </span>
            <span>
              Stealth Discipline:{' '}
              <strong className="text-amber-400">
                {result.stealthBonus ? 'UNDETECTED (GHOST BONUS)' : 'COMBAT ENGAGED'}
              </strong>
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onReturnToMenu}
              className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Return to Command Menu
            </button>
            <button
              onClick={onRetry}
              className="px-4 py-2.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Replay Mission
            </button>
            {result.success && hasNextMission && (
              <button
                onClick={onNextMission}
                className="px-6 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
              >
                Advance to Next Mission
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
