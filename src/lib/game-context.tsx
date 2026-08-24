"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SupabaseService, UserProfile, supabase } from "./supabase";

export type { UserProfile };

export interface LevelProgress {
  levelId: number;
  stars: number;
  score: number;
  completed: boolean;
}

interface GameContextType {
  profile: UserProfile;
  isLoggedIn: boolean;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  updateNickname: (name: string) => void;
  updateAvatar: (color: string, frame?: string) => void;
  updateAvatarColor: (color: string) => void;
  updateAvatarFrame: (frame: string) => void;
  addGems: (amount: number) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, nickname: string, color: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  vuaLevels: Record<number, LevelProgress>;
  completeVuaLevel: (levelId: number, stars?: number, score?: number) => void;
  viLevels: Record<number, LevelProgress>;
  completeViLevel: (levelId: number, stars?: number, score?: number) => void;
  enLevels: Record<number, LevelProgress>;
  completeEnLevel: (levelId: number, stars?: number, score?: number) => void;
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [vuaLevels, setVuaLevels] = useState<Record<number, LevelProgress>>(DEFAULT_LEVEL_PROGRESS);
  const [viLevels, setViLevels] = useState<Record<number, LevelProgress>>(DEFAULT_LEVEL_PROGRESS);
  const [enLevels, setEnLevels] = useState<Record<number, LevelProgress>>(DEFAULT_LEVEL_PROGRESS);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(false);

  // Load user profile & sync Supabase on auth state change
  const loadUserData = async (userId: string, userEmail?: string) => {
    try {
      const serverProfile = await SupabaseService.fetchProfile(userId);
      if (serverProfile) {
        setProfile(serverProfile);
        setIsLoggedIn(true);
        localStorage.setItem("wf_profile", JSON.stringify(serverProfile));
      } else {
        // Create initial profile if not exists
        const newProf: UserProfile = {
          ...DEFAULT_PROFILE,
          id: userId,
          email: userEmail,
          nickname: "Chiến Binh " + Math.floor(100 + Math.random() * 900),
        };
        setProfile(newProf);
        setIsLoggedIn(true);
        await SupabaseService.upsertProfile(newProf);
        localStorage.setItem("wf_profile", JSON.stringify(newProf));
      }

      // Fetch user's level progress from Supabase
      const [viRows, enRows, vuaRows] = await Promise.all([
        SupabaseService.fetchUserProgress(userId, "noi_tu_vi"),
        SupabaseService.fetchUserProgress(userId, "noi_tu_en"),
        SupabaseService.fetchUserProgress(userId, "vua_tieng_viet"),
      ]);

      if (viRows && viRows.length > 0) {
        const map: Record<number, LevelProgress> = { ...DEFAULT_LEVEL_PROGRESS };
        viRows.forEach((r: any) => {
          map[r.level_id] = { levelId: r.level_id, stars: r.stars, score: r.score, completed: r.completed };
          if (!map[r.level_id + 1]) map[r.level_id + 1] = { levelId: r.level_id + 1, stars: 0, score: 0, completed: false };
        });
        setViLevels(map);
      }

      if (enRows && enRows.length > 0) {
        const map: Record<number, LevelProgress> = { ...DEFAULT_LEVEL_PROGRESS };
        enRows.forEach((r: any) => {
          map[r.level_id] = { levelId: r.level_id, stars: r.stars, score: r.score, completed: r.completed };
          if (!map[r.level_id + 1]) map[r.level_id + 1] = { levelId: r.level_id + 1, stars: 0, score: 0, completed: false };
        });
        setEnLevels(map);
      }

      if (vuaRows && vuaRows.length > 0) {
        const map: Record<number, LevelProgress> = { ...DEFAULT_LEVEL_PROGRESS };
        vuaRows.forEach((r: any) => {
          map[r.level_id] = { levelId: r.level_id, stars: r.stars, score: r.score, completed: r.completed };
          if (!map[r.level_id + 1]) map[r.level_id + 1] = { levelId: r.level_id + 1, stars: 0, score: 0, completed: false };
        });
        setVuaLevels(map);
      }
    } catch (err) {
      console.warn("[GameContext] Error loading user data:", err);
    }
  };

  useEffect(() => {
    try {
      // Check active Supabase or Local Auth session on mount
      SupabaseService.getCurrentSession().then((session) => {
        if (session?.user) {
          loadUserData(session.user.id, session.user.email);
        } else {
          // Check local auth session
          const authSession = localStorage.getItem("wf_auth_session");
          if (authSession) {
            try {
              const parsed = JSON.parse(authSession);
              if (parsed.userId) {
                loadUserData(parsed.userId, parsed.email);
                return;
              }
            } catch (e) {
              console.warn("Auth session parse error:", e);
            }
          }

          // Check local guest profile
          const saved = localStorage.getItem("wf_profile");
          if (saved) {
            const parsed = JSON.parse(saved);
            setProfile(parsed);
            if (parsed.email) setIsLoggedIn(true);
          } else {
            const initial = {
              ...DEFAULT_PROFILE,
              id: "user_" + Math.random().toString(36).substring(2, 9),
              nickname: "Chiến Binh " + Math.floor(100 + Math.random() * 900),
            };
            setProfile(initial);
            localStorage.setItem("wf_profile", JSON.stringify(initial));
          }
        }
      });

      // Listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await loadUserData(session.user.id, session.user.email);
        } else if (event === "SIGNED_OUT") {
          setIsLoggedIn(false);
          const guest: UserProfile = {
            ...DEFAULT_PROFILE,
            id: "user_" + Math.random().toString(36).substring(2, 9),
            nickname: "Khách " + Math.floor(100 + Math.random() * 900),
          };
          setProfile(guest);
          localStorage.setItem("wf_profile", JSON.stringify(guest));
        }
      });

      const soundPref = localStorage.getItem("wf_sound");
      if (soundPref !== null) setIsSoundEnabled(soundPref === "true");

      const themePref = localStorage.getItem("wf_theme");
      if (themePref === "dark") {
        setIsDarkModeState(true);
        document.documentElement.classList.add("dark");
      }

      return () => {
        authListener?.subscription.unsubscribe();
      };
    } catch (e) {
      console.warn("Init error:", e);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const { data, error } = await SupabaseService.signIn(email, pass);
    if (error) {
      return { success: false, error: error.message };
    }
    if (data?.user) {
      await loadUserData(data.user.id, data.user.email);
      return { success: true };
    }
    return { success: false, error: "Đăng nhập thất bại" };
  };

  const register = async (email: string, pass: string, nickname: string, color: string) => {
    const { data, error } = await SupabaseService.signUp(email, pass, nickname, color);
    if (error) {
      return { success: false, error: error.message };
    }
    if (data?.user) {
      await loadUserData(data.user.id, data.user.email);
      return { success: true };
    }
    return { success: true };
  };

  const logout = async () => {
    await SupabaseService.signOut();
    setIsLoggedIn(false);
    const guest: UserProfile = {
      ...DEFAULT_PROFILE,
      id: "user_" + Math.random().toString(36).substring(2, 9),
      nickname: "Khách " + Math.floor(100 + Math.random() * 900),
    };
    setProfile(guest);
    localStorage.setItem("wf_profile", JSON.stringify(guest));
  };

  const updateNickname = (nickname: string) => {
    setProfile((prev) => {
      const updated = { ...prev, nickname };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      SupabaseService.upsertProfile(updated);
      return updated;
    });
  };

  const updateAvatar = (avatarColor: string, avatarFrame = "default") => {
    setProfile((prev) => {
      const updated = { ...prev, avatarColor, avatarFrame };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      SupabaseService.upsertProfile(updated);
      return updated;
    });
  };

  const updateAvatarColor = (avatarColor: string) => {
    setProfile((prev) => {
      const updated = { ...prev, avatarColor };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      SupabaseService.upsertProfile(updated);
      return updated;
    });
  };

  const updateAvatarFrame = (avatarFrame: string) => {
    setProfile((prev) => {
      const updated = { ...prev, avatarFrame };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      SupabaseService.upsertProfile(updated);
      return updated;
    });
  };

  const addGems = (amount: number) => {
    setProfile((prev) => {
      const updated = { ...prev, gems: Math.max(0, prev.gems + amount) };
      localStorage.setItem("wf_profile", JSON.stringify(updated));
      SupabaseService.upsertProfile(updated);
      return updated;
    });
  };

  const completeVuaLevel = (levelId: number, stars = 3, score = 100) => {
    setVuaLevels((prev) => {
      const updated = {
        ...prev,
        [levelId]: { levelId, stars: Math.max(stars, prev[levelId]?.stars || 0), score, completed: true },
        [levelId + 1]: prev[levelId + 1] || { levelId: levelId + 1, stars: 0, score: 0, completed: false },
      };
      localStorage.setItem("wf_vua_levels", JSON.stringify(updated));
      SupabaseService.saveLevelProgress(profile.id, "vua_tieng_viet", levelId, stars, score);
      return updated;
    });
    addGems(5);
  };

  const completeViLevel = (levelId: number, stars = 3, score = 100) => {
    setViLevels((prev) => {
      const updated = {
        ...prev,
        [levelId]: { levelId, stars: Math.max(stars, prev[levelId]?.stars || 0), score, completed: true },
        [levelId + 1]: prev[levelId + 1] || { levelId: levelId + 1, stars: 0, score: 0, completed: false },
      };
      localStorage.setItem("wf_vi_levels", JSON.stringify(updated));
      SupabaseService.saveLevelProgress(profile.id, "noi_tu_vi", levelId, stars, score);
      return updated;
    });
    addGems(6);
  };

  const completeEnLevel = (levelId: number, stars = 3, score = 100) => {
    setEnLevels((prev) => {
      const updated = {
        ...prev,
        [levelId]: { levelId, stars: Math.max(stars, prev[levelId]?.stars || 0), score, completed: true },
        [levelId + 1]: prev[levelId + 1] || { levelId: levelId + 1, stars: 0, score: 0, completed: false },
      };
      localStorage.setItem("wf_en_levels", JSON.stringify(updated));
      SupabaseService.saveLevelProgress(profile.id, "noi_tu_en", levelId, stars, score);
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
        isLoggedIn,
        setProfile,
        updateNickname,
        updateAvatar,
        updateAvatarColor,
        updateAvatarFrame,
        addGems,
        login,
        register,
        logout,
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
