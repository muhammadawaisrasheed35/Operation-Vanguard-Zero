import React from 'react';
import { GameSettings } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onUnlockAllMissions: () => void;
  onResetSaveData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onUnlockAllMissions,
  onResetSaveData,
  onClose,
}) => {
  const applyPreset = (preset: 'Low' | 'Medium' | 'High') => {
    if (preset === 'Low') {
      onUpdateSettings({
        ...settings,
        graphicsPreset: 'Low',
        resolutionScale: 0.7,
        shadowQuality: 'Off',
        textureQuality: 'Low',
        effectsQuality: 'Low',
        viewDistance: 110,
      });
    } else if (preset === 'Medium') {
      onUpdateSettings({
        ...settings,
        graphicsPreset: 'Medium',
        resolutionScale: 0.85,
        shadowQuality: 'Medium',
        textureQuality: 'Medium',
        effectsQuality: 'Medium',
        viewDistance: 145,
      });
    } else {
      onUpdateSettings({
        ...settings,
        graphicsPreset: 'High',
        resolutionScale: 1.0,
        shadowQuality: 'High',
        textureQuality: 'High',
        effectsQuality: 'High',
        viewDistance: 190,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl my-auto">
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-100">
              System Configuration & Performance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All configuration and campaign progression data is persisted locally for 100% offline operation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
          >
            Save & Close
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Graphics & Performance */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-amber-400">
              Graphics & Laptop Optimization
            </h3>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Overall Quality Preset
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
                {(['Low', 'Medium', 'High'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`py-1.5 text-xs font-medium rounded transition-colors ${
                      settings.graphicsPreset === preset
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Resolution Scale
                </label>
                <select
                  value={settings.resolutionScale}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      resolutionScale: parseFloat(e.target.value),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                >
                  <option value={0.7}>70% (Performance)</option>
                  <option value={0.85}>85% (Balanced)</option>
                  <option value={1.0}>100% (Native Crisp)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Frame Rate Limiter
                </label>
                <select
                  value={settings.fpsLimit}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      fpsLimit: Number(e.target.value) as GameSettings['fpsLimit'],
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                >
                  <option value={30}>30 FPS (Battery Saver)</option>
                  <option value={60}>60 FPS (Standard)</option>
                  <option value={120}>120 FPS (High Refresh)</option>
                  <option value={0}>Unlimited</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Dynamic Shadows
                </label>
                <select
                  value={settings.shadowQuality}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      shadowQuality: e.target.value as GameSettings['shadowQuality'],
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Off">Off</option>
                  <option value="Medium">Medium (1024px)</option>
                  <option value="High">High Soft (2048px)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Weather & Particle Effects
                </label>
                <select
                  value={settings.effectsQuality}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      effectsQuality: e.target.value as GameSettings['effectsQuality'],
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>View Distance & Fog Horizon</span>
                <span className="font-mono">{settings.viewDistance}m</span>
              </div>
              <input
                type="range"
                min={95}
                max={220}
                step={5}
                value={settings.viewDistance}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    viewDistance: Number(e.target.value),
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Audio, Controls & Save Management */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-amber-400">
              Audio, Controls & Offline Save Data
            </h3>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Master Volume</span>
                <span className="font-mono">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    masterVolume: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Weapon & Combat SFX Volume</span>
                <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    sfxVolume: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Environmental Ambience Volume</span>
                <span className="font-mono">{Math.round(settings.ambientVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.ambientVolume}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    ambientVolume: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Aim Look Sensitivity</span>
                <span className="font-mono">{settings.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.1}
                value={settings.mouseSensitivity}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    mouseSensitivity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="text-xs font-semibold text-slate-300">
                Offline Campaign Save Management
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onUnlockAllMissions}
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-800/50 rounded-lg transition-colors whitespace-nowrap"
                >
                  Unlock All 10 Missions (Sandbox Access)
                </button>
                <button
                  onClick={onResetSaveData}
                  className="px-3 py-2 text-xs font-medium bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-800/40 rounded-lg transition-colors whitespace-nowrap"
                >
                  Reset Campaign Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
