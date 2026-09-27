import React, { useMemo, useState } from 'react';
import { BriefingModal } from './components/BriefingModal';
import { FieldManualModal } from './components/FieldManualModal';
import { GameViewport3D } from './components/GameViewport3D';
import { MenuBackground3D } from './components/MenuBackground3D';
import { MissionResultsModal } from './components/MissionResultsModal';
import { SettingsModal } from './components/SettingsModal';
import { CAMPAIGN_MISSIONS } from './data/missions';
import { DIFFICULTY_CONFIGS, WEAPON_ORDER, WEAPONS } from './data/weapons';
import { SaveManager } from './storage/SaveManager';
import {
  DifficultyLevel,
  EnvironmentType,
  GameSettings,
  MissionDef,
  MissionResultSummary,
  SaveData,
  WeaponId,
} from './types/game';

type ActiveScreen = 'command_hub' | 'mission_select' | 'arsenal_intel' | 'in_game';

export default function App() {
  const [saveData, setSaveData] = useState<SaveData>(() => SaveManager.load());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('command_hub');
  const [selectedMissionId, setSelectedMissionId] = useState<number>(() => {
    const loaded = SaveManager.load();
    return loaded.lastPlayedMissionId || 1;
  });
  const [envFilter, setEnvFilter] = useState<'all' | EnvironmentType>('all');
  const [selectedWeaponTab, setSelectedWeaponTab] = useState<WeaponId>('assault_rifle');

  // Modals
  const [briefingMission, setBriefingMission] = useState<MissionDef | null>(null);
  const [missionResult, setMissionResult] = useState<MissionResultSummary | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showManual, setShowManual] = useState<boolean>(false);

  const selectedMission = useMemo(
    () =>
      CAMPAIGN_MISSIONS.find((m) => m.id === selectedMissionId) || CAMPAIGN_MISSIONS[0],
    [selectedMissionId]
  );

  const continueMission = useMemo(
    () =>
      CAMPAIGN_MISSIONS.find((m) => m.id === saveData.unlockedMissionId) ||
      CAMPAIGN_MISSIONS[0],
    [saveData.unlockedMissionId]
  );

  const filteredMissions = useMemo(() => {
    if (envFilter === 'all') return CAMPAIGN_MISSIONS;
    return CAMPAIGN_MISSIONS.filter((m) => m.environment === envFilter);
  }, [envFilter]);

  const handleChangeDifficulty = (difficulty: DifficultyLevel) => {
    const updated: SaveData = { ...saveData, difficulty };
    setSaveData(updated);
    SaveManager.save(updated);
  };

  const handleUpdateSettings = (settings: GameSettings) => {
    const updated: SaveData = { ...saveData, settings };
    setSaveData(updated);
    SaveManager.save(updated);
  };

  const handleOpenBriefing = (mission: MissionDef) => {
    setSelectedMissionId(mission.id);
    setBriefingMission(mission);
  };

  const handleStartMissionFromBriefing = () => {
    if (!briefingMission) return;
    const updated: SaveData = {
      ...saveData,
      lastPlayedMissionId: briefingMission.id,
    };
    setSaveData(updated);
    SaveManager.save(updated);
    setBriefingMission(null);
    setMissionResult(null);
    setActiveScreen('in_game');
  };

  const handleMissionComplete = (summary: MissionResultSummary) => {
    setMissionResult(summary);
    if (summary.success && summary.rating !== 'F') {
      const optionalDone =
        summary.optionalObjectivesTotal > 0 &&
        summary.optionalObjectivesCompleted === summary.optionalObjectivesTotal;
      const updated = SaveManager.recordMissionWin(
        saveData,
        summary.missionId,
        summary.completionTimeSeconds,
        summary.rating,
        summary.accuracyPercent,
        optionalDone,
        summary.difficulty,
        CAMPAIGN_MISSIONS.length
      );
      setSaveData(updated);
    }
  };

  const completedCount = Object.values(saveData.missionRecords).filter(
    (r) => r.completed
  ).length;

  const formatTimeShort = (sec: number) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  // If actively playing in 3D viewport
  if (activeScreen === 'in_game') {
    return (
      <>
        <GameViewport3D
          key={`${selectedMission.id}_${saveData.difficulty}`}
          mission={selectedMission}
          difficulty={saveData.difficulty}
          settings={saveData.settings}
          onMissionComplete={handleMissionComplete}
          onExitToMenu={() => {
            setMissionResult(null);
            setActiveScreen('command_hub');
          }}
          onOpenSettings={() => setShowSettings(true)}
        />

        {missionResult && (
          <MissionResultsModal
            mission={selectedMission}
            result={missionResult}
            hasNextMission={selectedMission.id < CAMPAIGN_MISSIONS.length}
            onRetry={() => {
              setMissionResult(null);
              setActiveScreen('command_hub');
              setTimeout(() => setActiveScreen('in_game'), 20);
            }}
            onNextMission={() => {
              const nextM = CAMPAIGN_MISSIONS.find(
                (m) => m.id === selectedMission.id + 1
              );
              setMissionResult(null);
              if (nextM) {
                setSelectedMissionId(nextM.id);
                setActiveScreen('command_hub');
                setBriefingMission(nextM);
              } else {
                setActiveScreen('command_hub');
              }
            }}
            onReturnToMenu={() => {
              setMissionResult(null);
              setActiveScreen('command_hub');
            }}
          />
        )}

        {showSettings && (
          <SettingsModal
            settings={saveData.settings}
            onUpdateSettings={handleUpdateSettings}
            onUnlockAllMissions={() =>
              setSaveData(SaveManager.unlockAllMissions(saveData, CAMPAIGN_MISSIONS.length))
            }
            onResetSaveData={() => setSaveData(SaveManager.resetProgress(saveData))}
            onClose={() => setShowSettings(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-y-auto bg-[#090d11] text-slate-100 flex flex-col">
      {/* Cinematic 3D Background Scene */}
      <MenuBackground3D environment={selectedMission.environment} />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="relative z-20 flex items-center justify-between px-8 py-4 border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveScreen('command_hub')}
          className="text-lg font-display font-bold tracking-wider text-slate-100 text-left whitespace-nowrap"
        >
          OPERATION VANGUARD ZERO
        </button>

        {/* Zone 2: 4-5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveScreen('command_hub')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeScreen === 'command_hub'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Command Hub
          </button>
          <button
            onClick={() => setActiveScreen('mission_select')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeScreen === 'mission_select'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Mission Select
          </button>
          <button
            onClick={() => setActiveScreen('arsenal_intel')}
            className={`hover:text-white transition-colors whitespace-nowrap ${
              activeScreen === 'arsenal_intel'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Arsenal & AI Intel
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Controls & Manual
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenBriefing(continueMission)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            Deploy Mission {String(continueMission.id).padStart(2, '0')}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-8 py-10 flex flex-col justify-between">
        {activeScreen === 'command_hub' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start my-auto">
            {/* Left 7 Columns: Story Campaign Hero & Main Menu Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-mono text-amber-400 tracking-wide">
                OFFLINE SINGLE-PLAYER TACTICAL MILITARY CAMPAIGN · CALLSIGN VESPER-1
              </div>

              <h1
                className="text-4xl sm:text-5xl font-display font-bold text-slate-100 leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Strike Behind Hostile Lines Across Five Tactical Theaters
              </h1>

              <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                Command Task Force Vanguard through a 10-mission story campaign spanning Snow Mountains, Fortified Military Bases, Urban Colonies, Arid Deserts, and Heavy Industrial Zones. Scout enemy patrols, manage scarce ammunition, breach reinforced structures, and extract alive.
              </p>

              {/* Unboxed Campaign Progress Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 pt-1">
                <span>
                  Campaign Progress: <strong className="text-slate-200">{completedCount} / 10 Missions Completed</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Active Difficulty: <strong className="text-amber-400">{saveData.difficulty}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Graphics Preset: <strong className="text-slate-200">{saveData.settings.graphicsPreset}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>100% Offline Local Storage</span>
              </div>

              {/* Primary Menu Controls */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                <button
                  onClick={() => handleOpenBriefing(continueMission)}
                  className="px-6 py-3 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shadow-lg"
                >
                  {completedCount > 0
                    ? `Continue Campaign (Mission ${String(continueMission.id).padStart(2, '0')})`
                    : 'Start Campaign (Mission 01)'}
                </button>

                <button
                  onClick={() => setActiveScreen('mission_select')}
                  className="px-5 py-3 text-sm font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Mission Select ({saveData.unlockedMissionId}/10 Unlocked)
                </button>

                <button
                  onClick={() => setShowManual(true)}
                  className="px-5 py-3 text-sm font-medium bg-slate-900/70 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Controls & Field Manual
                </button>

                <button
                  onClick={() => setShowSettings(true)}
                  className="px-5 py-3 text-sm font-medium bg-slate-900/70 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Graphics & Settings
                </button>
              </div>

              {/* Difficulty Selector Bar */}
              <div className="pt-6 border-t border-white/10 max-w-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Combat Doctrine / Difficulty
                  </span>
                  <span className="font-mono text-amber-400">{saveData.difficulty}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
                  {(['Easy', 'Normal', 'Hard', 'Extreme'] as DifficultyLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleChangeDifficulty(lvl)}
                      className={`py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        saveData.difficulty === lvl
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {DIFFICULTY_CONFIGS[saveData.difficulty].subtitle}
                </p>
              </div>
            </div>

            {/* Right 5 Columns: Active Operation Dossier Preview Card */}
            <div className="lg:col-span-5 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-amber-400">
                    ACTIVE OPERATION DOSSIER · {selectedMission.codeName}
                  </div>
                  <h2 className="text-xl font-display font-bold text-slate-100 mt-1">
                    {selectedMission.title}
                  </h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedMission.location} · {selectedMission.environmentLabel}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[11px] text-slate-400">THREAT</div>
                  <div className="text-xs font-semibold text-amber-400">
                    {selectedMission.threatLevel}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedMission.storyContext}
              </p>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  Primary Mission Objectives
                </div>
                {selectedMission.objectives
                  .filter((o) => !o.isOptional)
                  .map((obj, idx) => (
                    <div key={obj.id} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="font-mono text-amber-400">0{idx + 1}.</span>
                      <span>{obj.title}</span>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 font-mono text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">HOSTILES</div>
                  <div className="text-slate-100 font-semibold">
                    {selectedMission.enemies.length} Units
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">BEST RATING</div>
                  <div className="text-amber-400 font-semibold">
                    {saveData.missionRecords[selectedMission.id]?.bestRating || 'UNPLAYED'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">BEST TIME</div>
                  <div className="text-slate-100 font-semibold">
                    {formatTimeShort(
                      saveData.missionRecords[selectedMission.id]?.bestTimeSeconds || 0
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenBriefing(selectedMission)}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  Open Mission Briefing & Deploy
                </button>
                <button
                  onClick={() => setActiveScreen('mission_select')}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  All 10 Missions
                </button>
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'mission_select' && (
          <div className="space-y-6 my-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h1 className="text-3xl font-display font-bold text-slate-100">
                  Campaign Mission Select (10 Operations)
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Select any unlocked operation across all 5 tactical environments, or unlock all missions in Settings for sandbox play.
                </p>
              </div>

              {/* Interactive Environment Filter Controls */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
                {(
                  [
                    { id: 'all', label: 'All Environments' },
                    { id: 'snow', label: 'Snow Mountains' },
                    { id: 'base', label: 'Military Base' },
                    { id: 'urban', label: 'Urban Colony' },
                    { id: 'desert', label: 'Desert' },
                    { id: 'industrial', label: 'Industrial' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setEnvFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      envFilter === tab.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMissions.map((m) => {
                const isUnlocked = m.id <= saveData.unlockedMissionId;
                const record = saveData.missionRecords[m.id];

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setSelectedMissionId(m.id);
                      }
                    }}
                    className={`p-5 rounded-xl border transition-all ${
                      isUnlocked
                        ? selectedMissionId === m.id
                          ? 'bg-slate-900/90 border-amber-500/80 cursor-pointer'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 cursor-pointer'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                          <span className="text-amber-400">{m.codeName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{m.environmentLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>Threat: {m.threatLevel}</span>
                        </div>
                        <h3 className="text-lg font-display font-bold text-slate-100 mt-1">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{m.location}</p>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        {record?.completed ? (
                          <div>
                            <div className="text-xs text-emerald-400 font-semibold">
                              RATING {record.bestRating}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatTimeShort(record.bestTimeSeconds)} ·{' '}
                              {record.optionalCompleted ? 'OPT ✓' : 'OPT —'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {isUnlocked ? 'READY' : 'LOCKED'}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-3 line-clamp-2">
                      {m.storyContext}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80 text-xs">
                      <span className="font-mono text-slate-400">
                        Objectives: {m.objectives.length} · Hostiles: {m.enemies.length}
                      </span>
                      {isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBriefing(m);
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md transition-colors whitespace-nowrap"
                        >
                          Mission Briefing
                        </button>
                      ) : (
                        <span className="font-mono text-slate-500">
                          Complete Mission {String(m.id - 1).padStart(2, '0')} to Unlock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeScreen === 'arsenal_intel' && (
          <div className="space-y-8 my-auto">
            <div className="border-b border-white/10 pb-4">
              <h1 className="text-3xl font-display font-bold text-slate-100">
                Tactical Arsenal, Equipment & Hostile AI Doctrine
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Inspect weapon ballistics, acoustic suppression profiles, and enemy squad roles before deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Weapon Inspector */}
              <div className="lg:col-span-7 bg-slate-950/85 border border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
                  {WEAPON_ORDER.map((wId) => (
                    <button
                      key={wId}
                      onClick={() => setSelectedWeaponTab(wId)}
                      className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        selectedWeaponTab === wId
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {WEAPONS[wId].category}
                    </button>
                  ))}
                </div>

                {(() => {
                  const spec = WEAPONS[selectedWeaponTab];
                  return (
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <h2 className="text-2xl font-display font-bold text-slate-100">
                            {spec.name}
                          </h2>
                          <div className="text-xs font-mono text-amber-400 mt-0.5">
                            Caliber: {spec.designation} ·{' '}
                            {spec.isSuppressed
                              ? 'INTEGRATED SOUND SUPPRESSOR (14m Acoustic Radius)'
                              : `UNSUPPRESSED (${spec.noiseRadius}m Acoustic Radius)`}
                          </div>
                        </div>
                        <div className="text-right font-mono text-xs text-slate-300">
                          MAGAZINE: <strong>{spec.magSize} RDS</strong>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed">
                        {spec.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                          <div className="text-slate-400 text-[11px]">BASE DAMAGE</div>
                          <div className="text-slate-100 font-semibold mt-0.5">
                            {spec.damage} {spec.pelletCount > 1 ? `× ${spec.pelletCount}` : 'HP'}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                          <div className="text-slate-400 text-[11px]">HEADSHOT MULT</div>
                          <div className="text-slate-100 font-semibold mt-0.5">
                            {spec.headshotMultiplier}x
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                          <div className="text-slate-400 text-[11px]">EFFECTIVE RANGE</div>
                          <div className="text-slate-100 font-semibold mt-0.5">
                            {spec.effectiveRange}m
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                          <div className="text-slate-400 text-[11px]">RELOAD TIME</div>
                          <div className="text-slate-100 font-semibold mt-0.5">
                            {(spec.reloadTimeMs / 1000).toFixed(2)}s
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Hostile AI Archetypes */}
              <div className="lg:col-span-5 bg-slate-950/85 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-display font-bold text-slate-100">
                  Hostile Squad AI Classification
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="pb-2.5 border-b border-slate-800">
                    <div className="font-semibold text-slate-200">
                      01. Ground Patrol & Indoor Guards
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Patrol predefined routes, investigate unsuppressed gunfire or sprinting footsteps, and hold interior doorways.
                    </div>
                  </div>
                  <div className="pb-2.5 border-b border-slate-800">
                    <div className="font-semibold text-purple-400">
                      02. Rooftop Guards & Marksmen Snipers
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Occupy elevated rooftops and watchtowers with 95m sightlines. Look for red optic glint and use smoke grenades to cross open streets.
                    </div>
                  </div>
                  <div className="pb-2.5 border-b border-slate-800">
                    <div className="font-semibold text-orange-400">
                      03. Heavy Armored Shock Troopers
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Equipped with heavy ballistic plating (165 HP) and rapid suppressive fire. Aim for headshots or stun with Flashbangs.
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-rose-400">
                      04. Sector Commanders / Leaders
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      High-value officers who broadcast radio alerts to all squadmates within 38m when spotting you. Neutralize them first.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiet Footer */}
        <footer className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span>
            Operation Vanguard Zero · Offline Single-Player Tactical Military Shooter
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowManual(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Controls & Build Guide
            </button>
            <span>·</span>
            <button
              onClick={() => setShowSettings(true)}
              className="hover:text-slate-200 transition-colors"
            >
              System Settings
            </button>
          </div>
        </footer>
      </main>

      {/* Modals */}
      {briefingMission && (
        <BriefingModal
          mission={briefingMission}
          difficulty={saveData.difficulty}
          onChangeDifficulty={handleChangeDifficulty}
          onLaunchMission={handleStartMissionFromBriefing}
          onCancel={() => setBriefingMission(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={saveData.settings}
          onUpdateSettings={handleUpdateSettings}
          onUnlockAllMissions={() =>
            setSaveData(SaveManager.unlockAllMissions(saveData, CAMPAIGN_MISSIONS.length))
          }
          onResetSaveData={() => setSaveData(SaveManager.resetProgress(saveData))}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showManual && <FieldManualModal onClose={() => setShowManual(false)} />}
    </div>
  );
}
