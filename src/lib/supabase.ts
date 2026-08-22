import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your-anon-key"
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbProfile {
  id: string;
  nickname: string;
  avatar_color: string;
  avatar_frame: string;
  gems: number;
  level: number;
  total_wins: number;
  total_games: number;
  highest_streak: number;
}

export interface DbLevelProgress {
  user_id: string;
  game_mode: string;
  level_id: number;
  stars: number;
  score: number;
  completed: boolean;
}

export interface DbAiVocabulary {
  language: string;
  word: string;
  first_syllable: string;
  last_syllable: string;
  meaning: string;
  example_sentence?: string;
}

export const SupabaseService = {
  // Save or update user profile
  async syncProfile(profile: DbProfile) {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("profiles").upsert(profile, { onConflict: "id" });
    } catch (err) {
      console.warn("[Supabase] syncProfile error:", err);
    }
  },

  // Save level progress
  async saveLevelProgress(progress: DbLevelProgress) {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("levels_progress").upsert(progress, {
        onConflict: "user_id,game_mode,level_id",
      });
    } catch (err) {
      console.warn("[Supabase] saveLevelProgress error:", err);
    }
  },

  // Save continuous AI vocabulary to database
  async saveAiVocabulary(vocab: DbAiVocabulary) {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from("ai_vocabulary").upsert(vocab, {
        onConflict: "language,word",
      });
    } catch (err) {
      console.warn("[Supabase] saveAiVocabulary error:", err);
    }
  },

  // Fetch cached AI word definitions
  async getAiWord(language: string, word: string) {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase
        .from("ai_vocabulary")
        .select("*")
        .eq("language", language)
        .eq("word", word.toLowerCase().trim())
        .maybeSingle();
      return data;
    } catch (err) {
      console.warn("[Supabase] getAiWord error:", err);
      return null;
    }
  },
};
