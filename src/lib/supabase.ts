"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zknxldofwaxmstjrzdha.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_oqUOPE2QGg6QPxFKzcmNpQ_NpPxLXaY";

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseAnonKey.includes("your-anon-key")
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface UserProfile {
  id: string;
  email?: string;
  nickname: string;
  avatarColor: string;
  avatarFrame: string;
  gems: number;
  level: number;
  totalWins: number;
  totalGames: number;
  highestStreak: number;
}

export const SupabaseService = {
  // ===================== AUTHENTICATION =====================
  async signUp(email: string, password: string, nickname: string, avatarColor: string) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: "Supabase chưa được cấu hình" } };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
            avatar_color: avatarColor,
          },
        },
      });

      if (error) return { data: null, error };

      if (data.user) {
        // Also manually upsert profile to guarantee immediate availability
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          nickname,
          avatar_color: avatarColor,
          gems: 50,
          level: 1,
          total_wins: 0,
          total_games: 0,
        });
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Lỗi đăng ký" } };
    }
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: "Supabase chưa được cấu hình" } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { data, error };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Lỗi đăng nhập" } };
    }
  },

  async signOut() {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Supabase] Sign out error:", err);
    }
  },

  async getCurrentSession() {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  // ===================== PROFILES =====================
  async fetchProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email || undefined,
        nickname: data.nickname,
        avatarColor: data.avatar_color,
        avatarFrame: data.avatar_frame || "default",
        gems: data.gems,
        level: data.level,
        totalWins: data.total_wins,
        totalGames: data.total_games,
        highestStreak: data.highest_streak,
      };
    } catch (err) {
      console.warn("[Supabase] fetchProfile error:", err);
      return null;
    }
  },

  async upsertProfile(profile: UserProfile): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        avatar_color: profile.avatarColor,
        avatar_frame: profile.avatarFrame,
        gems: profile.gems,
        level: profile.level,
        total_wins: profile.totalWins,
        total_games: profile.totalGames,
        highest_streak: profile.highestStreak,
        updated_at: new Date().toISOString(),
      });

      return !error;
    } catch (err) {
      console.warn("[Supabase] upsertProfile error:", err);
      return false;
    }
  },

  // ===================== LEVEL PROGRESS =====================
  async saveLevelProgress(
    userId: string,
    gameMode: "noi_tu_vi" | "noi_tu_en" | "vua_tieng_viet",
    levelId: number,
    stars: number,
    score: number = 0
  ) {
    if (!isSupabaseConfigured() || !userId) return;

    try {
      await supabase.from("levels_progress").upsert(
        {
          user_id: userId,
          game_mode: gameMode,
          level_id: levelId,
          stars,
          score,
          completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,game_mode,level_id" }
      );
    } catch (err) {
      console.warn("[Supabase] saveLevelProgress error:", err);
    }
  },

  async fetchUserProgress(userId: string, gameMode: "noi_tu_vi" | "noi_tu_en" | "vua_tieng_viet") {
    if (!isSupabaseConfigured() || !userId) return [];

    try {
      const { data, error } = await supabase
        .from("levels_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("game_mode", gameMode);

      if (error || !data) return [];
      return data;
    } catch (err) {
      console.warn("[Supabase] fetchUserProgress error:", err);
      return [];
    }
  },

  // ===================== AI VOCABULARY =====================
  async saveAiVocabulary(language: "vi" | "en", word: string, meaning: string) {
    if (!isSupabaseConfigured()) return;

    try {
      const cleanWord = word.trim().toLowerCase();
      const parts = cleanWord.split(/\s+/);
      const firstSyl = parts[0] || "";
      const lastSyl = parts[parts.length - 1] || "";

      await supabase.from("ai_vocabulary").upsert(
        {
          language,
          word: cleanWord,
          first_syllable: firstSyl,
          last_syllable: lastSyl,
          meaning,
          created_at: new Date().toISOString(),
        },
        { onConflict: "language,word" }
      );
    } catch (err) {
      console.warn("[Supabase] saveAiVocabulary error:", err);
    }
  },
};
