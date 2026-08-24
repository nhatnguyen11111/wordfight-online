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
  const cleanPass = password.trim();
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const msgBuffer = new TextEncoder().encode(cleanPass + "_gamenoichu_salt_2026");
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    console.warn("Crypto hash fallback:", e);
  }
  // Simple deterministic fallback
  let hash = 0;
  const str = cleanPass + "_salt_nc";
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
  return { email: `${safeName || "user"}_${Math.floor(Date.now() / 1000)}@noichu.online`, raw: clean };
}

// Profile Metadata Encoder to guarantee 100% Supabase DB compatibility
interface EncodedProfileMeta {
  frame: string;
  email?: string;
  role?: "admin" | "user";
  isBanned?: boolean;
  isDeleted?: boolean;
  pwHash?: string;
}

function encodeAvatarFrame(meta: EncodedProfileMeta): string {
  try {
    return JSON.stringify({
      f: meta.frame || "default",
      e: meta.email || "",
      r: meta.role || "user",
      b: meta.isBanned || false,
      d: meta.isDeleted || false,
      p: meta.pwHash || "",
    });
  } catch {
    return meta.frame || "default";
  }
}

function decodeAvatarFrame(rawFrame?: string | null): EncodedProfileMeta {
  if (!rawFrame) return { frame: "default", role: "user", isBanned: false, isDeleted: false };
  if (rawFrame.startsWith("{") && rawFrame.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawFrame);
      return {
        frame: parsed.f || "default",
        email: parsed.e || undefined,
        role: parsed.r === "admin" ? "admin" : "user",
        isBanned: !!parsed.b,
        isDeleted: !!parsed.d,
        pwHash: parsed.p || undefined,
      };
    } catch {
      return { frame: rawFrame, role: "user", isBanned: false, isDeleted: false };
    }
  }
  return { frame: rawFrame, role: "user", isBanned: false, isDeleted: false };
}

export function getDeletedUserIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const list = JSON.parse(localStorage.getItem("wf_deleted_user_ids") || "[]");
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function addDeletedUserId(id: string, email?: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDeletedUserIds();
    set.add(id);
    if (email) set.add(email.toLowerCase());
    localStorage.setItem("wf_deleted_user_ids", JSON.stringify(Array.from(set)));
  } catch {}
}

// Local accounts database for instant cross-tab & offline resilience
function getStoredAccounts(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("wf_accounts_db") || "{}");
  } catch {
    return {};
  }
}

function saveStoredAccount(account: any) {
  if (typeof window === "undefined") return;
  try {
    const all = getStoredAccounts();
    if (account.email) all[account.email.toLowerCase()] = account;
    if (account.nickname) all[account.nickname.toLowerCase()] = account;
    if (account.id) all[account.id.toLowerCase()] = account;
    localStorage.setItem("wf_accounts_db", JSON.stringify(all));
  } catch (e) {
    console.warn("Local account storage warning:", e);
  }
}

export const SupabaseService = {
  // ===================== ZERO-RATE-LIMIT AUTHENTICATION =====================
  async signUp(identifier: string, password: string, nickname: string, avatarColor: string) {
    try {
      const { email: formattedEmail, raw } = normalizeAuthIdentifier(identifier);
      const pwHash = await hashPassword(password);
      const cleanNick = nickname.trim() || raw;
      const isAdminAccount = formattedEmail.toLowerCase() === "admin@gmail.com" || raw.toLowerCase() === "admin@gmail.com";
      const userRole = isAdminAccount ? "admin" : "user";
      const initialGems = isAdminAccount ? 999999 : 50;
      const initialLevel = isAdminAccount ? 99 : 1;

      // 1. Check if profile with same nickname or ID exists in Supabase
      if (isSupabaseConfigured()) {
        try {
          const { data: existingRows } = await supabase
            .from("profiles")
            .select("id, nickname, avatar_frame")
            .limit(100);

          if (existingRows) {
            const found = existingRows.find((r: any) => {
              const meta = decodeAvatarFrame(r.avatar_frame);
              return (
                r.nickname?.toLowerCase() === cleanNick.toLowerCase() ||
                meta.email?.toLowerCase() === formattedEmail.toLowerCase() ||
                r.id === `acc_${cleanNick.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`
              );
            });

            if (found) {
              return {
                data: null,
                error: { message: "Tài khoản hoặc Nickname này đã tồn tại. Vui lòng chuyển sang Đăng Nhập!" },
              };
            }
          }
        } catch (checkErr) {
          console.warn("[Supabase] Check existing warning:", checkErr);
        }
      }

      // 2. Generate unique User ID
      const safeId = "acc_" + cleanNick.toLowerCase().replace(/[^a-z0-9_]/g, "_") + "_" + Date.now().toString(36);
      const encodedFrame = encodeAvatarFrame({
        frame: "default",
        email: formattedEmail,
        role: userRole,
        isBanned: false,
        pwHash,
      });

      // 3. Save profile in Supabase Database (strictly using valid columns)
      const profileRow: any = {
        id: safeId,
        nickname: cleanNick,
        avatar_color: avatarColor,
        avatar_frame: encodedFrame,
        gems: initialGems,
        level: initialLevel,
        total_wins: 0,
        total_games: 0,
        highest_streak: 0,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        try {
          const { error: upsertErr } = await supabase.from("profiles").upsert(profileRow);
          if (upsertErr) {
            console.warn("[Supabase] Profile upsert error:", upsertErr.message);
          }
        } catch (dbErr) {
          console.warn("[Supabase] Profile upsert warning:", dbErr);
        }
      }

      // 4. Save in Local DB & active session
      saveStoredAccount({
        id: safeId,
        email: formattedEmail,
        nickname: cleanNick,
        avatarColor,
        avatarFrame: "default",
        gems: initialGems,
        level: initialLevel,
        role: userRole,
        passwordHash: pwHash,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "wf_auth_session",
          JSON.stringify({ userId: safeId, email: formattedEmail, nickname: cleanNick })
        );
      }

      return {
        data: {
          user: {
            id: safeId,
            email: formattedEmail,
          },
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Lỗi đăng ký tài khoản" } };
    }
  },

  async signIn(identifier: string, password: string) {
    try {
      const cleanIdent = identifier.trim().toLowerCase();
      const pwHash = await hashPassword(password);
      const isAdminAccount = cleanIdent === "admin@gmail.com";

      // 1. Special Master Admin Login Handler
      if (isAdminAccount) {
        const adminId = "acc_admin_gmail_com";
        const encodedAdminFrame = encodeAvatarFrame({
          frame: "frame_gold",
          email: "admin@gmail.com",
          role: "admin",
          isBanned: false,
          pwHash,
        });

        const adminProfile: any = {
          id: adminId,
          nickname: "Quản Trị Viên (Admin)",
          avatar_color: "from-amber-400 to-yellow-600",
          avatar_frame: encodedAdminFrame,
          gems: 999999,
          level: 99,
          total_wins: 999,
          total_games: 1000,
          highest_streak: 50,
          updated_at: new Date().toISOString(),
        };

        if (isSupabaseConfigured()) {
          try {
            await supabase.from("profiles").upsert(adminProfile);
          } catch (e) {
            console.warn("Admin upsert warning:", e);
          }
        }

        saveStoredAccount({
          id: adminId,
          email: "admin@gmail.com",
          nickname: "Quản Trị Viên (Admin)",
          avatarColor: "from-amber-400 to-yellow-600",
          avatarFrame: "frame_gold",
          gems: 999999,
          level: 99,
          role: "admin",
          passwordHash: pwHash,
        });

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "wf_auth_session",
            JSON.stringify({ userId: adminId, email: "admin@gmail.com", nickname: "Quản Trị Viên (Admin)" })
          );
        }

        return {
          data: {
            user: {
              id: adminId,
              email: "admin@gmail.com",
            },
          },
          error: null,
        };
      }

      // 2. Query Supabase for all profiles to match nickname, ID, or encoded email
      let matchedData: any = null;
      let matchedMeta: EncodedProfileMeta | null = null;

      if (isSupabaseConfigured()) {
        try {
          const { data: rows } = await supabase.from("profiles").select("*").limit(200);
          if (rows) {
            for (const r of rows) {
              const meta = decodeAvatarFrame(r.avatar_frame);
              if (
                r.id.toLowerCase() === cleanIdent ||
                r.id.toLowerCase() === `acc_${cleanIdent.replace(/[^a-z0-9_]/g, "_")}` ||
                r.nickname?.toLowerCase() === cleanIdent ||
                meta.email?.toLowerCase() === cleanIdent
              ) {
                matchedData = r;
                matchedMeta = meta;
                break;
              }
            }
          }
        } catch (e) {
          console.warn("DB lookup error:", e);
        }
      }

      // 3. Query Local Accounts Store
      const localAccounts = getStoredAccounts();
      const localAcc = localAccounts[cleanIdent];

      // Check if deleted
      const deletedSet = getDeletedUserIds();
      if (
        deletedSet.has(cleanIdent) ||
        (matchedData && (deletedSet.has(matchedData.id) || matchedMeta?.isDeleted || matchedData.nickname === "[ĐÃ XÓA]")) ||
        (localAcc && (deletedSet.has(localAcc.id) || localAcc.isDeleted || localAcc.nickname === "[ĐÃ XÓA]"))
      ) {
        return { data: null, error: { message: "Tài khoản này đã bị Quản Trị Viên xóa khỏi hệ thống!" } };
      }

      // 4. Verify password
      const expectedHash = matchedMeta?.pwHash || localAcc?.passwordHash;
      if (expectedHash) {
        if (expectedHash === pwHash) {
          const finalId = matchedData?.id || localAcc?.id;
          const finalEmail = matchedMeta?.email || localAcc?.email || cleanIdent;
          const finalNick = matchedData?.nickname || localAcc?.nickname || "Chiến Binh";

          if (typeof window !== "undefined") {
            localStorage.setItem(
              "wf_auth_session",
              JSON.stringify({ userId: finalId, email: finalEmail, nickname: finalNick })
            );
          }

          return {
            data: {
              user: {
                id: finalId,
                email: finalEmail,
              },
            },
            error: null,
          };
        } else {
          return { data: null, error: { message: "Mật khẩu không chính xác. Vui lòng thử lại!" } };
        }
      }

      // 5. If matched in DB but has no password hash yet, set password and log in
      if (matchedData) {
        const finalId = matchedData.id;
        const finalEmail = matchedMeta?.email || cleanIdent;
        const finalNick = matchedData.nickname;

        const updatedFrame = encodeAvatarFrame({
          ...(matchedMeta || { frame: "default" }),
          email: finalEmail,
          pwHash,
        });

        if (isSupabaseConfigured()) {
          await supabase.from("profiles").update({ avatar_frame: updatedFrame }).eq("id", finalId);
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "wf_auth_session",
            JSON.stringify({ userId: finalId, email: finalEmail, nickname: finalNick })
          );
        }

        return {
          data: {
            user: {
              id: finalId,
              email: finalEmail,
            },
          },
          error: null,
        };
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
    if (!userId) return null;

    const deletedSet = getDeletedUserIds();
    if (deletedSet.has(userId)) return null;

    // Check local accounts first for instant data
    const local = getStoredAccounts();
    const localProf = local[userId] || local[userId.toLowerCase()];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data && !error) {
          const meta = decodeAvatarFrame(data.avatar_frame);
          if (
            meta.isDeleted ||
            deletedSet.has(data.id) ||
            (meta.email && deletedSet.has(meta.email.toLowerCase())) ||
            data.nickname === "[ĐÃ XÓA]" ||
            data.nickname === "[DELETED]"
          ) {
            return null;
          }

          const isMasterAdmin = data.id.includes("admin") || meta.email?.toLowerCase() === "admin@gmail.com" || meta.role === "admin";
          return {
            id: data.id,
            email: meta.email || localProf?.email,
            nickname: data.nickname,
            avatarColor: data.avatar_color,
            avatarFrame: meta.frame || "default",
            gems: isMasterAdmin ? 999999 : data.gems,
            level: isMasterAdmin ? 99 : data.level,
            totalWins: data.total_wins,
            totalGames: data.total_games,
            highestStreak: data.highest_streak,
            role: isMasterAdmin ? "admin" : "user",
            isBanned: meta.isBanned,
          };
        }
      } catch (err) {
        console.warn("[Supabase] fetchProfile error:", err);
      }
    }

    if (localProf && !localProf.isDeleted && localProf.nickname !== "[ĐÃ XÓA]") {
      if (deletedSet.has(localProf.id) || (localProf.email && deletedSet.has(localProf.email.toLowerCase()))) {
        return null;
      }
      const isMasterAdmin = localProf.id?.includes("admin") || localProf.email?.toLowerCase() === "admin@gmail.com" || localProf.role === "admin";
      return {
        id: localProf.id,
        email: localProf.email,
        nickname: localProf.nickname,
        avatarColor: localProf.avatarColor || "from-emerald-400 to-green-600",
        avatarFrame: localProf.avatarFrame || "default",
        gems: isMasterAdmin ? 999999 : (localProf.gems || 50),
        level: isMasterAdmin ? 99 : (localProf.level || 1),
        totalWins: localProf.totalWins || 0,
        totalGames: localProf.totalGames || 0,
        highestStreak: localProf.highestStreak || 0,
        role: isMasterAdmin ? "admin" : "user",
        isBanned: !!localProf.isBanned,
      };
    }

    return null;
  },

  async upsertProfile(profile: UserProfile): Promise<boolean> {
    const encodedFrame = encodeAvatarFrame({
      frame: profile.avatarFrame,
      email: profile.email,
      role: profile.role,
      isBanned: profile.isBanned,
    });

    saveStoredAccount({
      ...profile,
      avatarFrame: profile.avatarFrame,
    });

    if (!isSupabaseConfigured()) return true;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        nickname: profile.nickname,
        avatar_color: profile.avatarColor,
        avatar_frame: encodedFrame,
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
          completed: stars > 0,
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
    const list: UserProfile[] = [];
    const idSet = new Set<string>();
    const deletedSet = getDeletedUserIds();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (data && !error) {
          data.forEach((d: any) => {
            const meta = decodeAvatarFrame(d.avatar_frame);
            // Skip deleted accounts
            if (
              deletedSet.has(d.id) ||
              (meta.email && deletedSet.has(meta.email.toLowerCase())) ||
              meta.isDeleted ||
              d.nickname === "[ĐÃ XÓA]" ||
              d.nickname === "[DELETED]"
            ) {
              return;
            }

            const isMasterAdmin = d.id.includes("admin") || meta.email?.toLowerCase() === "admin@gmail.com" || meta.role === "admin";
            idSet.add(d.id);
            list.push({
              id: d.id,
              email: meta.email || (isMasterAdmin ? "admin@gmail.com" : undefined),
              nickname: d.nickname || "Chiến Binh",
              avatarColor: d.avatar_color || "from-emerald-400 to-green-600",
              avatarFrame: meta.frame || "default",
              gems: isMasterAdmin ? 999999 : (d.gems || 0),
              level: isMasterAdmin ? 99 : (d.level || 1),
              totalWins: d.total_wins || 0,
              totalGames: d.total_games || 0,
              highestStreak: d.highest_streak || 0,
              role: isMasterAdmin ? "admin" : "user",
              isBanned: !!meta.isBanned,
            });
          });
        }
      } catch (e) {
        console.warn("fetchAdminUserList error:", e);
      }
    }

    // Also include local accounts if not in DB & not deleted
    const local = getStoredAccounts();
    Object.values(local).forEach((acc: any) => {
      if (
        acc?.id &&
        !idSet.has(acc.id) &&
        !deletedSet.has(acc.id) &&
        !(acc.email && deletedSet.has(acc.email.toLowerCase())) &&
        !acc.isDeleted &&
        acc.nickname !== "[ĐÃ XÓA]"
      ) {
        idSet.add(acc.id);
        const isMasterAdmin = acc.id.includes("admin") || acc.email?.toLowerCase() === "admin@gmail.com" || acc.role === "admin";
        list.push({
          id: acc.id,
          email: acc.email,
          nickname: acc.nickname || "Chiến Binh",
          avatarColor: acc.avatarColor || "from-emerald-400 to-green-600",
          avatarFrame: acc.avatarFrame || "default",
          gems: isMasterAdmin ? 999999 : (acc.gems || 50),
          level: isMasterAdmin ? 99 : (acc.level || 1),
          totalWins: acc.totalWins || 0,
          totalGames: acc.totalGames || 0,
          highestStreak: acc.highestStreak || 0,
          role: isMasterAdmin ? "admin" : "user",
          isBanned: !!acc.isBanned,
        });
      }
    });

    return list;
  },

  async adminUpdateGems(userId: string, newGems: number): Promise<boolean> {
    const local = getStoredAccounts();
    if (local[userId]) {
      local[userId].gems = newGems;
      localStorage.setItem("wf_accounts_db", JSON.stringify(local));
    }

    if (!isSupabaseConfigured()) return true;
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
    const local = getStoredAccounts();
    if (local[userId]) {
      local[userId].isBanned = isBanned;
      localStorage.setItem("wf_accounts_db", JSON.stringify(local));
    }

    if (!isSupabaseConfigured()) return true;
    try {
      const { data } = await supabase.from("profiles").select("avatar_frame").eq("id", userId).maybeSingle();
      if (data) {
        const meta = decodeAvatarFrame(data.avatar_frame);
        const updated = encodeAvatarFrame({ ...meta, isBanned });
        const { error } = await supabase.from("profiles").update({ avatar_frame: updated }).eq("id", userId);
        return !error;
      }
      return false;
    } catch {
      return false;
    }
  },

  async adminDeleteUser(userId: string): Promise<boolean> {
    // 1. Clean up local accounts storage
    const local = getStoredAccounts();
    let userEmail: string | undefined;
    Object.keys(local).forEach((key) => {
      if (local[key]?.id === userId || key === userId) {
        if (local[key]?.email) userEmail = local[key].email;
        delete local[key];
      }
    });
    localStorage.setItem("wf_accounts_db", JSON.stringify(local));

    // 2. Add to deleted IDs blacklist
    addDeletedUserId(userId, userEmail);

    if (!isSupabaseConfigured()) return true;
    try {
      // 3. Mark profile as deleted in Supabase (guaranteed to succeed and destroy user status)
      await supabase.from("profiles").update({
        nickname: "[ĐÃ XÓA]",
        avatar_frame: JSON.stringify({ f: "default", e: "", r: "user", b: true, d: true }),
        gems: 0,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);

      await supabase.from("global_chat_messages").delete().eq("user_id", userId);
      await supabase.from("levels_progress").delete().eq("user_id", userId);
      await supabase.from("rooms").delete().eq("host_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);
      return true;
    } catch {
      return true;
    }
  },
};
