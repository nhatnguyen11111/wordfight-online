"use client";

import { supabase, isSupabaseConfigured } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface RoomInfo {
  id: string; // Room Code
  name: string; // Custom Room Name
  themeColor: "emerald" | "blue" | "purple" | "amber" | "rose" | "cyan";
  language: "vi" | "en";
  hasPassword: boolean;
  password?: string;
  turnTimeSec: number; // 15 | 20 | 30
  betCoins?: number; // 0 (Free) or Coin amount (1000, 2000, 5000, 10000, ...)
  hostId: string;
  hostNickname: string;
  hostAvatarColor: string;
  playerCount: number;
  maxPlayers: number;
  status: "WAITING" | "PLAYING" | "FINISHED";
  createdAt: number;
  lastHeartbeat?: number;
}

export const BET_COIN_PRESETS = [0, 1000, 2000, 5000, 10000, 20000, 50000, 100000] as const;

export const ROOM_COLOR_THEMES = [
  { id: "emerald", name: "Lục Bảo", bg: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-600" },
  { id: "blue", name: "Đại Dương", bg: "from-blue-500/20 to-indigo-500/20", border: "border-blue-500/40", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-600" },
  { id: "purple", name: "Hoàng Gia", bg: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/40", text: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500/10 text-purple-600" },
  { id: "amber", name: "Hổ Phách", bg: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500/10 text-amber-600" },
  { id: "rose", name: "Hồng Ngọc", bg: "from-rose-500/20 to-red-500/20", border: "border-rose-500/40", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500/10 text-rose-600" },
  { id: "cyan", name: "Neon Cyber", bg: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/40", text: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-500/10 text-cyan-600" },
] as const;

// In-memory cross-tab fallback storage
const memoryRooms = new Map<string, RoomInfo>();

// Shared Realtime Channel for Lobby Room Broadcasts
let lobbyChannel: RealtimeChannel | null = null;

function getDisbandedRoomIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const list = JSON.parse(localStorage.getItem("wf_disbanded_rooms") || "[]");
    return new Set(list);
  } catch {
    return new Set();
  }
}

function addDisbandedRoomId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDisbandedRoomIds();
    set.add(id);
    localStorage.setItem("wf_disbanded_rooms", JSON.stringify(Array.from(set)));
  } catch {}
}

function removeDisbandedRoomId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDisbandedRoomIds();
    set.delete(id);
    localStorage.setItem("wf_disbanded_rooms", JSON.stringify(Array.from(set)));
  } catch {}
}

export const RoomRegistry = {
  /**
   * Register or update an active room
   */
  async registerRoom(room: RoomInfo): Promise<boolean> {
    const cleanId = room.id.trim().toUpperCase();
    const now = Date.now();
    const formattedRoom: RoomInfo = {
      ...room,
      id: cleanId,
      createdAt: room.createdAt || now,
      lastHeartbeat: now,
    };

    memoryRooms.set(cleanId, formattedRoom);
    removeDisbandedRoomId(cleanId);

    // Save in local storage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        stored[cleanId] = formattedRoom;
        localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    // Save to Supabase DB for cross-client discovery
    if (isSupabaseConfigured()) {
      try {
        const encodedMeta = JSON.stringify({
          n: room.name,
          t: room.themeColor,
          b: room.betCoins || 0,
          s: room.turnTimeSec,
          p: room.hasPassword,
          pw: room.password,
          h: room.hostNickname,
          hc: room.hostAvatarColor,
          c: room.playerCount || 1,
          l: room.language,
          hb: now,
        });

        await supabase.from("rooms").upsert({
          id: cleanId,
          code: cleanId,
          host_id: room.hostId,
          language: encodedMeta,
          status: room.status || "WAITING",
        });
      } catch (err) {
        console.warn("[RoomRegistry] DB upsert error:", err);
      }
    }

    // Broadcast update
    this.broadcastLobbyUpdate(formattedRoom);
    return true;
  },

  /**
   * Heartbeat ping from an active player inside a room
   */
  async heartbeat(roomId: string): Promise<void> {
    const cleanId = roomId.trim().toUpperCase();
    const now = Date.now();
    const existing = memoryRooms.get(cleanId);
    if (existing) {
      existing.lastHeartbeat = now;
      memoryRooms.set(cleanId, existing);
    }
  },

  /**
   * Update room status or player count
   */
  async updateRoom(roomId: string, patch: Partial<RoomInfo>): Promise<void> {
    const existing = await this.getRoom(roomId);
    if (existing) {
      const updated = { ...existing, ...patch, lastHeartbeat: Date.now() };
      await this.registerRoom(updated);
    }
  },

  /**
   * Unregister / disband a room when the last player leaves
   */
  async unregisterRoom(roomId: string): Promise<void> {
    const cleanId = roomId.trim().toUpperCase();
    memoryRooms.delete(cleanId);
    addDisbandedRoomId(cleanId);

    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        delete stored[cleanId];
        delete stored[roomId];
        localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("rooms").delete().eq("id", cleanId);
      } catch (err) {
        console.warn("[RoomRegistry] DB delete error:", err);
      }
    }

    this.broadcastLobbyUpdate(undefined, cleanId);
  },

  /**
   * Get specific room by code/ID
   */
  async getRoom(roomId: string): Promise<RoomInfo | null> {
    const cleanId = roomId.trim().toUpperCase();
    const disbanded = getDisbandedRoomIds();
    if (disbanded.has(cleanId)) return null;

    // 1. Check in-memory
    if (memoryRooms.has(cleanId)) {
      return memoryRooms.get(cleanId)!;
    }

    // 2. Check localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        if (stored[cleanId]) {
          const r = stored[cleanId];
          memoryRooms.set(cleanId, r);
          return r;
        }
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    // 3. Check Supabase DB
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from("rooms").select("*").eq("id", cleanId).maybeSingle();
        if (data && !error && data.status !== "FINISHED") {
          let parsed: any = {};
          try {
            if (data.language && data.language.startsWith("{")) {
              parsed = JSON.parse(data.language);
            }
          } catch {}

          const room: RoomInfo = {
            id: data.id,
            name: parsed.n || `Phòng Đấu #${data.id}`,
            themeColor: parsed.t || "emerald",
            language: parsed.l || (data.language === "en" ? "en" : "vi"),
            hasPassword: !!parsed.p,
            password: parsed.pw,
            turnTimeSec: parsed.s || 20,
            betCoins: parsed.b || 0,
            hostId: data.host_id || "host",
            hostNickname: parsed.h || "Chủ Phòng",
            hostAvatarColor: parsed.hc || "from-emerald-400 to-green-600",
            playerCount: parsed.c || 1,
            maxPlayers: 2,
            status: data.status || "WAITING",
            createdAt: new Date(data.created_at).getTime(),
            lastHeartbeat: parsed.hb || Date.now(),
          };

          memoryRooms.set(cleanId, room);
          return room;
        }
      } catch (err) {
        console.warn("[RoomRegistry] DB fetch error:", err);
      }
    }

    return null;
  },

  /**
   * List all active rooms
   */
  async listActiveRooms(): Promise<RoomInfo[]> {
    const map = new Map<string, RoomInfo>();
    const disbanded = getDisbandedRoomIds();
    const now = Date.now();
    const MAX_AGE_MS = 25 * 60 * 1000; // 25 minutes TTL for active rooms

    // 1. From Memory
    memoryRooms.forEach((r, id) => {
      if (!disbanded.has(id) && r.status !== "FINISHED" && now - r.createdAt < MAX_AGE_MS) {
        map.set(id, r);
      }
    });

    // 2. From LocalStorage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        Object.values(stored).forEach((r: any) => {
          if (r?.id && !disbanded.has(r.id) && r.status !== "FINISHED" && now - (r.createdAt || 0) < MAX_AGE_MS) {
            map.set(r.id, r as RoomInfo);
          }
        });
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    // 3. From Supabase Database
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30);

        if (data && !error) {
          data.forEach((d: any) => {
            if (!disbanded.has(d.id) && d.status !== "FINISHED") {
              const age = now - new Date(d.created_at).getTime();
              if (age < MAX_AGE_MS) {
                let parsed: any = {};
                try {
                  if (d.language && d.language.startsWith("{")) {
                    parsed = JSON.parse(d.language);
                  }
                } catch {}

                if (!map.has(d.id)) {
                  map.set(d.id, {
                    id: d.id,
                    name: parsed.n || `Phòng Đấu #${d.id}`,
                    themeColor: parsed.t || "emerald",
                    language: parsed.l || (d.language === "en" ? "en" : "vi"),
                    hasPassword: !!parsed.p,
                    password: parsed.pw,
                    turnTimeSec: parsed.s || 20,
                    betCoins: parsed.b || 0,
                    hostId: d.host_id || "host",
                    hostNickname: parsed.h || "Chủ Phòng",
                    hostAvatarColor: parsed.hc || "from-emerald-400 to-green-600",
                    playerCount: parsed.c || 1,
                    maxPlayers: 2,
                    status: d.status || "WAITING",
                    createdAt: new Date(d.created_at).getTime(),
                    lastHeartbeat: parsed.hb || Date.now(),
                  });
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn("[RoomRegistry] DB list error:", err);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Subscribe to real-time room list updates
   */
  subscribeToRooms(onRoomsUpdate: (rooms: RoomInfo[]) => void) {
    const fetchAndNotify = () => {
      this.listActiveRooms().then(onRoomsUpdate);
    };

    fetchAndNotify();

    const interval = setInterval(fetchAndNotify, 4000);

    if (!isSupabaseConfigured()) {
      return () => clearInterval(interval);
    }

    if (!lobbyChannel) {
      lobbyChannel = supabase.channel("public_room_lobby");
      lobbyChannel.subscribe();
    }

    const handler = ({ payload }: any) => {
      if (payload?.disbandedId) {
        memoryRooms.delete(payload.disbandedId);
        addDisbandedRoomId(payload.disbandedId);
        if (typeof window !== "undefined") {
          try {
            const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
            delete stored[payload.disbandedId];
            localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
          } catch {}
        }
      } else if (payload?.room?.id) {
        memoryRooms.set(payload.room.id, payload.room);
        removeDisbandedRoomId(payload.room.id);
        if (typeof window !== "undefined") {
          try {
            const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
            stored[payload.room.id] = payload.room;
            localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
          } catch {}
        }
      }
      fetchAndNotify();
    };

    lobbyChannel.on("broadcast", { event: "rooms_updated" }, handler);

    return () => {
      clearInterval(interval);
    };
  },

  broadcastLobbyUpdate(room?: RoomInfo, disbandedId?: string) {
    if (lobbyChannel) {
      lobbyChannel.send({
        type: "broadcast",
        event: "rooms_updated",
        payload: { room, disbandedId, timestamp: Date.now() },
      });
    }
  },
};
