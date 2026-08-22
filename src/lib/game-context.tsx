"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SupabaseService } from "./supabase";

export interface UserProfile {
  id: string;
  nickname: string;
  avatarColor: string;
  avatarFrame: string;
  gems: number;
  level: number;
  totalWins: number;
  totalGames: number;
  highestStreak: number;
}

export interface LevelProgress {
  levelId: number;
  stars: number;
  score: number;
  completed: boolean;
}

interface GameContextType {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  updateNickname: (name: string) => void;
  updateAvatar: (color: string, frame?: string) => void;
  updateAvatarColor: (color: string) => void;
  updateAvatarFrame: (frame: string) => void;
  addGems: (amount: number) => void;
  vuaLevels: Record<number, LevelProgress>;
  completeVuaLevel: (levelId: number, stars: number, score: number) => void;
  viLevels: Record<number, LevelProgress>;
  completeViLevel: (levelId: number, stars: number, score: number) => void;
  enLevels: Record<number, LevelProgress>;
  completeEnLevel: (levelId: number, stars: number, score: number) => void;
  activeModal: string | null;
  openModal: (modalName: string) => void;
  closeModal: () => void;
  isSoundEnabled: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: "user_guest",
  nickname: "Chiến Binh 999",
  avatarColor: "from-emerald-400 to-green-600",
  avatarFrame: "default",
  gems: 50,
  level: 1,
  totalWins: 0,
  totalGames: 0,
  highestStreak: 0,
};

const DEFAULT_LEVEL_PROGRESS: Record<number, LevelProgress> = {
  1: { levelId: 1, stars: 0, score: 0, completed: false },
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [vuaLevels, setVuaLevels] = useState<Record<number, LevelProgress>>(DEFAULT_LEVEL_PROGRESS);
  const [viLevels, setViLevels] = useState<Record<number, LevelProgress>>(DEFAULT_LEVEL_PROGRESS);
  const [enLevels, setEnLevels] = useState<Record<number, LevelProgress>>(DEFAULT_LEVEL_PROGRESS);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("wf_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        SupabaseService.syncProfile({
          id: parsed.id,
          nickname: parsed.nickname,
          avatar_color: parsed.avatarColor,
          avatar_frame: parsed.avatarFrame,
          gems: parsed.gems,
          level: parsed.level,
          total_wins: parsed.totalWins,
          total_games: parsed.totalGames,
          highest_streak: parsed.highestStreak,
        });
      } else {
        const initial = {
          ...DEFAULT_PROFILE,
          id: "user_" + Math.random().toString(36).substring(2, 9),
          nickname: "Chiến Binh " + Math.floor(100 + Math.random() * 900),
        };
        setProfile(initial);
        localStorage.setItem("wf_profile", JSON.stringify(initial));
      }

      const savedVua = localStorage.getItem("wf_vua_levels");
      if (savedVua) setVuaLevels(JSON.parse(savedVua));

      const savedVi = localStorage.getItem("wf_vi_levels");
      if (savedVi) setViLevels(JSON.parse(savedVi));

      const savedEn = localStorage.getItem("wf_en_levels");
      if (savedEn) setEnLevels(JSON.parse(savedEn));

      const soundPref = localStorage.getItem("wf_sound");
      if (soundPref !== null) setIsSoundEnabled(soundPref === "true");

      const themePref = localStorage.getItem("wf_theme");
      if (themePref === "dark") {
        setIsDarkModeState(true);
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      console.warn("Storage load error:", e);
    }
  }, []);

  const updateNickname = (nickname: string) => {
    setProfile((prev) => {
      const updated = { ...prev, nickname };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      SupabaseService.syncProfile({
        id: updated.id,
        nickname: updated.nickname,
        avatar_color: updated.avatarColor,
        avatar_frame: updated.avatarFrame,
        gems: updated.gems,
        level: updated.level,
        total_wins: updated.totalWins,
        total_games: updated.totalGames,
        highest_streak: updated.highestStreak,
      });
      return updated;
    });
  };

  const updateAvatar = (avatarColor: string, avatarFrame = "default") => {
    setProfile((prev) => {
      const updated = { ...prev, avatarColor, avatarFrame };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      return updated;
    });
  };

  const updateAvatarColor = (avatarColor: string) => {
    setProfile((prev) => {
      const updated = { ...prev, avatarColor };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      return updated;
    });
  };

  const updateAvatarFrame = (avatarFrame: string) => {
    setProfile((prev) => {
      const updated = { ...prev, avatarFrame };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      return updated;
    });
  };

  const addGems = (amount: number) => {
    setProfile((prev) => {
      const updated = { ...prev, gems: Math.max(0, prev.gems + amount) };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      return updated;
    });
  };

  const completeVuaLevel = (levelId: number, stars: number, score: number) => {
    setVuaLevels((prev) => {
      const updated = {
        ...prev,
        [levelId]: { levelId, stars: Math.max(stars, prev[levelId]?.stars || 0), score, completed: true },
        [levelId + 1]: prev[levelId + 1] || { levelId: levelId + 1, stars: 0, score: 0, completed: false },
      };
      localStorage.setItem("wf_vua_levels", JSON.stringify(updated));
      SupabaseService.saveLevelProgress({
        user_id: profile.id,
        game_mode: "vua_tieng_viet",
        level_id: levelId,
        stars,
        score,
        completed: true,
      });
      return updated;
    });
    addGems(5);
  };

  const completeViLevel = (levelId: number, stars: number, score: number) => {
    setViLevels((prev) => {
      const updated = {
        ...prev,
        [levelId]: { levelId, stars: Math.max(stars, prev[levelId]?.stars || 0), score, completed: true },
        [levelId + 1]: prev[levelId + 1] || { levelId: levelId + 1, stars: 0, score: 0, completed: false },
      };
      localStorage.setItem("wf_vi_levels", JSON.stringify(updated));
      SupabaseService.saveLevelProgress({
        user_id: profile.id,
        game_mode: "noi_tu_vi",
        level_id: levelId,
        stars,
        score,
        completed: true,
      });
      return updated;
    });
    addGems(6);
  };

  const completeEnLevel = (levelId: number, stars: number, score: number) => {
    setEnLevels((prev) => {
      const updated = {
        ...prev,
        [levelId]: { levelId, stars: Math.max(stars, prev[levelId]?.stars || 0), score, completed: true },
        [levelId + 1]: prev[levelId + 1] || { levelId: levelId + 1, stars: 0, score: 0, completed: false },
      };
      localStorage.setItem("wf_en_levels", JSON.stringify(updated));
      SupabaseService.saveLevelProgress({
        user_id: profile.id,
        game_mode: "noi_tu_en",
        level_id: levelId,
        stars,
        score,
        completed: true,
      });
      return updated;
    });
    addGems(6);
  };

  const openModal = (name: string) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const toggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("wf_sound", String(next));
      return next;
    });
  };

  const setSoundEnabled = (enabled: boolean) => {
    setIsSoundEnabled(enabled);
    localStorage.setItem("wf_sound", String(enabled));
  };

  const setIsDarkMode = (dark: boolean) => {
    setIsDarkModeState(dark);
    localStorage.setItem("wf_theme", dark ? "dark" : "light");
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <GameContext.Provider
      value={{
        profile,
        setProfile,
        updateNickname,
        updateAvatar,
        updateAvatarColor,
        updateAvatarFrame,
        addGems,
        vuaLevels,
        completeVuaLevel,
        viLevels,
        completeViLevel,
        enLevels,
        completeEnLevel,
        activeModal,
        openModal,
        closeModal,
        isSoundEnabled,
        soundEnabled: isSoundEnabled,
        setSoundEnabled,
        toggleSound,
        isDarkMode,
        setIsDarkMode,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
