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
  role?: "admin" | "user";
  isBanned?: boolean;
}

// Password hashing utility for zero-rate-limit instant registration & login
async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const msgBuffer = new TextEncoder().encode(password + "_wordfight_salt_2026");
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    console.warn("Crypto hash fallback:", e);
  }
  // Simple deterministic fallback if crypto.subtle is unavailable
  let hash = 0;
  const str = password + "_wf_salt";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "hash_" + Math.abs(hash).toString(16);
}

function normalizeAuthIdentifier(identifier: string): { email: string; raw: string } {
  const clean = identifier.trim().toLowerCase();
  if (clean.includes("@")) {
    return { email: clean, raw: clean };
  }
  const safeName = clean.replace(/[^a-z0-9_]/g, "");
  return { email: `${safeName || "user"}_${Math.floor(Date.now() / 1000)}@wordfight.player`, raw: clean };
}

export const SupabaseService = {
  // ===================== ZERO-RATE-LIMIT AUTHENTICATION =====================
  async signUp(identifier: string, password: string, nickname: string, avatarColor: string) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: "Supabase chưa được cấu hình" } };
    }

    try {
      const { email: formattedEmail, raw } = normalizeAuthIdentifier(identifier);
      const pwHash = await hashPassword(password);

      // 1. Check if profile with same nickname or email already exists in DB
      try {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id, nickname, email")
          .or(`nickname.ilike.${nickname.trim()},email.eq.${formattedEmail},email.eq.${raw}`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          if (existing.nickname.toLowerCase() === nickname.trim().toLowerCase()) {
            return {
              data: null,
              error: { message: `Nickname "${nickname}" đã được sử dụng. Vui lòng chọn tên khác!` },
            };
          }
          return {
            data: null,
            error: { message: "Tài khoản này đã tồn tại. Vui lòng chuyển sang tab Đăng Nhập!" },
          };
        }
      } catch (checkErr) {
        console.warn("[Supabase] Check existing error (skipping):", checkErr);
      }

      // 2. Try standard Supabase Auth first
      let userId = "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      let authUserEmail = formattedEmail;

      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formattedEmail,
          password,
          options: {
            data: {
              nickname,
              avatar_color: avatarColor,
            },
          },
        });

        if (authData?.user) {
          userId = authData.user.id;
          authUserEmail = authData.user.email || formattedEmail;
        } else if (authError) {
          console.info("[Supabase Auth] Rate limit/error encountered, using direct DB account:", authError.message);
          // Zero-rate-limit fallback: create direct DB user ID
        }
      } catch (authEx) {
        console.info("[Supabase Auth] Exception encountered, fallback to DB:", authEx);
      }

      // 3. Upsert profile with password_hash & 50 gems welcome bonus
      const profileData: any = {
        id: userId,
        email: authUserEmail,
        nickname: nickname.trim(),
        avatar_color: avatarColor,
        avatar_frame: "default",
        gems: 50,
        level: 1,
        total_wins: 0,
        total_games: 0,
        highest_streak: 0,
        password_hash: pwHash,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profileData);
      if (profileError) {
        console.warn("[Supabase] Profile upsert warning:", profileError.message);
      }

      // Save persistent session locally
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "wf_auth_session",
          JSON.stringify({ userId, email: authUserEmail, nickname: nickname.trim() })
        );
      }

      return {
        data: {
          user: {
            id: userId,
            email: authUserEmail,
          },
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Lỗi đăng ký tài khoản" } };
    }
  },

  async signIn(identifier: string, password: string) {
    if (!isSupabaseConfigured()) {
      return { data: null, error: { message: "Supabase chưa được cấu hình" } };
    }

    try {
      const cleanIdent = identifier.trim();
      const pwHash = await hashPassword(password);

      // 1. Check profiles database for matching email, nickname, or username
      let matchedProfile: any = null;
      try {
        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .or(`email.ilike.${cleanIdent},nickname.ilike.${cleanIdent},id.eq.${cleanIdent}`)
          .limit(1)
          .maybeSingle();

        if (profData) {
          matchedProfile = profData;
        }
      } catch (dbErr) {
        console.warn("[Supabase] Profile lookup error:", dbErr);
      }

      // 2. If matched in DB, verify password hash
      if (matchedProfile) {
        if (matchedProfile.password_hash) {
          if (matchedProfile.password_hash === pwHash) {
            // Password matches!
            if (typeof window !== "undefined") {
              localStorage.setItem(
                "wf_auth_session",
                JSON.stringify({
                  userId: matchedProfile.id,
                  email: matchedProfile.email,
                  nickname: matchedProfile.nickname,
                })
              );
            }
            return {
              data: {
                user: {
                  id: matchedProfile.id,
                  email: matchedProfile.email,
                },
              },
              error: null,
            };
          } else {
            return { data: null, error: { message: "Mật khẩu không chính xác. Vui lòng thử lại!" } };
          }
        }
      }

      // 3. Fallback: try standard Supabase Auth
      try {
        const targetEmail = matchedProfile?.email || cleanIdent;
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (authData?.user) {
          // Update password hash in profile for future instant logins
          await supabase.from("profiles").update({ password_hash: pwHash }).eq("id", authData.user.id);

          if (typeof window !== "undefined") {
            localStorage.setItem(
              "wf_auth_session",
              JSON.stringify({
                userId: authData.user.id,
                email: authData.user.email,
                nickname: matchedProfile?.nickname || "Chiến Binh",
              })
            );
          }
          return { data: authData, error: null };
        }

        if (authError) {
          // If profile existed but had no password hash, update it now
          if (matchedProfile) {
            await supabase.from("profiles").update({ password_hash: pwHash }).eq("id", matchedProfile.id);
            return {
              data: {
                user: {
                  id: matchedProfile.id,
                  email: matchedProfile.email,
                },
              },
              error: null,
            };
          }
          return { data: null, error: { message: "Tài khoản hoặc Mật khẩu không chính xác!" } };
        }
      } catch (authEx) {
        console.warn("[Supabase Auth] Fallback sign in exception:", authEx);
      }

      return { data: null, error: { message: "Tài khoản không tồn tại. Vui lòng chọn Đăng Ký!" } };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Lỗi đăng nhập" } };
    }
  },

  async signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("wf_auth_session");
      localStorage.removeItem("wf_profile");
    }
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Supabase] Sign out error:", err);
    }
  },

  async getCurrentSession() {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("wf_auth_session");
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed?.userId) {
            return { user: { id: parsed.userId, email: parsed.email } };
          }
        }
      } catch (e) {
        console.warn("Local auth parse error:", e);
      }
    }

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

  // ===================== GLOBAL LIVE CHAT =====================
  async fetchGlobalChatMessages(limit = 50): Promise<Array<{ id: string; sender: string; avatarColor: string; text: string; time: string }>> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("global_chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error || !data) return [];
      return data.map((m: any) => ({
        id: m.id,
        sender: m.sender,
        avatarColor: m.avatar_color || "from-emerald-400 to-green-600",
        text: m.text,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
    } catch (err) {
      console.warn("[Supabase] fetchGlobalChatMessages error:", err);
      return [];
    }
  },

  async sendGlobalChatMessage(sender: string, avatarColor: string, text: string, userId?: string) {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from("global_chat_messages")
        .insert({
          user_id: userId || null,
          sender,
          avatar_color: avatarColor,
          text,
        })
        .select()
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        sender: data.sender,
        avatarColor: data.avatar_color,
        text: data.text,
        time: new Date(data.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    } catch (err) {
      console.warn("[Supabase] sendGlobalChatMessage error:", err);
      return null;
    }
  },

  // ===================== ADMIN MANAGEMENT =====================
  async fetchAdminUserList(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        email: d.email || undefined,
        nickname: d.nickname || "Chiến Binh",
        avatarColor: d.avatar_color || "from-emerald-400 to-green-600",
        avatarFrame: d.avatar_frame || "default",
        gems: d.gems || 0,
        level: d.level || 1,
        totalWins: d.total_wins || 0,
        totalGames: d.total_games || 0,
        highestStreak: d.highest_streak || 0,
        role: (d.email?.toLowerCase() === "admin@gmail.com" || d.role === "admin") ? "admin" : "user",
        isBanned: !!d.is_banned,
      }));
    } catch (e) {
      console.warn("fetchAdminUserList error:", e);
      return [];
    }
  },

  async adminUpdateGems(userId: string, newGems: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ gems: newGems, updated_at: new Date().toISOString() })
        .eq("id", userId);
      return !error;
    } catch {
      return false;
    }
  },

  async adminToggleBan(userId: string, isBanned: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
        .eq("id", userId);
      return !error;
    } catch {
      return false;
    }
  },

  async adminDeleteUser(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      return !error;
    } catch {
      return false;
    }
  },
};
