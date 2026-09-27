import { DifficultyLevel, GameSettings, MissionCompletionRecord, SaveData } from '../types/game';

const STORAGE_KEY = 'vanguard_zero_offline_save_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsPreset: 'High',
  resolutionScale: 1.0,
  fpsLimit: 60,
  shadowQuality: 'High',
  textureQuality: 'High',
  effectsQuality: 'High',
  viewDistance: 180,
  mouseSensitivity: 1.0,
  masterVolume: 0.85,
  sfxVolume: 0.9,
  ambientVolume: 0.5,
  invertY: false,
};

export const DEFAULT_SAVE_DATA: SaveData = {
  unlockedMissionId: 1,
  lastPlayedMissionId: 1,
  difficulty: 'Normal',
  missionRecords: {},
  settings: DEFAULT_SETTINGS,
};

export class SaveManager {
  public static load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SAVE_DATA, settings: { ...DEFAULT_SETTINGS } };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        unlockedMissionId: parsed.unlockedMissionId ?? 1,
        lastPlayedMissionId: parsed.lastPlayedMissionId ?? 1,
        difficulty: parsed.difficulty ?? 'Normal',
        missionRecords: parsed.missionRecords ?? {},
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings ?? {}),
        },
      };
    } catch {
      return { ...DEFAULT_SAVE_DATA, settings: { ...DEFAULT_SETTINGS } };
    }
  }

  public static save(data: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Handle storage quota or private browsing gracefully
    }
  }

  public static recordMissionWin(
    currentSave: SaveData,
    missionId: number,
    timeSeconds: number,
    rating: 'S' | 'A' | 'B' | 'C',
    accuracy: number,
    optionalCompleted: boolean,
    difficulty: DifficultyLevel,
    totalMissions: number
  ): SaveData {
    const existing: MissionCompletionRecord | undefined = currentSave.missionRecords[missionId];
    const ratingOrder: Record<'S' | 'A' | 'B' | 'C', number> = { S: 4, A: 3, B: 2, C: 1 };

    const bestRating =
      existing && ratingOrder[existing.bestRating] > ratingOrder[rating]
        ? existing.bestRating
        : rating;

    const bestTimeSeconds =
      existing && existing.bestTimeSeconds > 0
        ? Math.min(existing.bestTimeSeconds, timeSeconds)
        : timeSeconds;

    const bestAccuracy = existing ? Math.max(existing.bestAccuracy, accuracy) : accuracy;

    const nextUnlocked = Math.min(
      totalMissions,
      Math.max(currentSave.unlockedMissionId, missionId + 1)
    );

    const updated: SaveData = {
      ...currentSave,
      unlockedMissionId: nextUnlocked,
      lastPlayedMissionId: nextUnlocked,
      missionRecords: {
        ...currentSave.missionRecords,
        [missionId]: {
          missionId,
          completed: true,
          bestTimeSeconds,
          bestRating,
          bestAccuracy,
          optionalCompleted: (existing?.optionalCompleted || optionalCompleted) ?? false,
          difficultyCompleted: difficulty,
        },
      },
    };

    SaveManager.save(updated);
    return updated;
  }

  public static unlockAllMissions(currentSave: SaveData, totalMissions: number): SaveData {
    const updated: SaveData = {
      ...currentSave,
      unlockedMissionId: totalMissions,
    };
    SaveManager.save(updated);
    return updated;
  }

  public static resetProgress(currentSave: SaveData): SaveData {
    const reset: SaveData = {
      ...DEFAULT_SAVE_DATA,
      settings: currentSave.settings,
    };
    SaveManager.save(reset);
    return reset;
  }
}
