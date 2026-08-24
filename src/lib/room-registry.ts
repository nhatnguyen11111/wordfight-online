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

// Maximum silence allowed before a room without players is purged (20 seconds)
const ROOM_HEARTBEAT_TIMEOUT_MS = 20_000;

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
      lastHeartbeat: room.lastHeartbeat || now,
    };
    memoryRooms.set(cleanId, formattedRoom);

    // Save in local storage for fallback
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        stored[cleanId] = formattedRoom;
        localStorage.setItem("wf_active_rooms", JSON.stringify(stored));

        // Remove from disbanded if newly registered
        const disbanded = getDisbandedRoomIds();
        if (disbanded.has(cleanId)) {
          disbanded.delete(cleanId);
          localStorage.setItem("wf_disbanded_rooms", JSON.stringify(Array.from(disbanded)));
        }
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("rooms").upsert({
          id: cleanId,
          code: cleanId,
          host_id: null,
          language: room.language,
          status: room.status,
        });
      } catch (err) {
        console.warn("[RoomRegistry] DB upsert error:", err);
      }
    }

    // Broadcast room update to all lobby listeners with full payload
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
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        if (stored[cleanId]) {
          stored[cleanId].lastHeartbeat = now;
          localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
        }
      } catch {}
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

    const now = Date.now();

    // 1. Check in-memory
    if (memoryRooms.has(cleanId)) {
      const r = memoryRooms.get(cleanId)!;
      if (now - (r.lastHeartbeat || r.createdAt) > ROOM_HEARTBEAT_TIMEOUT_MS) {
        this.unregisterRoom(cleanId);
        return null;
      }
      return r;
    }

    // 2. Check localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        if (stored[cleanId]) {
          const r = stored[cleanId];
          if (now - (r.lastHeartbeat || r.createdAt) > ROOM_HEARTBEAT_TIMEOUT_MS) {
            this.unregisterRoom(cleanId);
            return null;
          }
          memoryRooms.set(cleanId, r);
          return r;
        }
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    return null;
  },

  /**
   * List all active rooms (filters out abandoned/dead rooms)
   */
  async listActiveRooms(): Promise<RoomInfo[]> {
    const map = new Map<string, RoomInfo>();
    const disbanded = getDisbandedRoomIds();
    const now = Date.now();
    const staleIds: string[] = [];

    // 1. Inspect in-memory rooms
    memoryRooms.forEach((r, id) => {
      if (disbanded.has(id) || now - (r.lastHeartbeat || r.createdAt) > ROOM_HEARTBEAT_TIMEOUT_MS || r.playerCount <= 0) {
        staleIds.push(id);
      } else {
        map.set(id, r);
      }
    });

    // 2. Inspect localStorage rooms
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        Object.values(stored).forEach((r: any) => {
          if (r?.id) {
            if (
              disbanded.has(r.id) ||
              now - (r.lastHeartbeat || r.createdAt || 0) > ROOM_HEARTBEAT_TIMEOUT_MS ||
              r.playerCount <= 0
            ) {
              staleIds.push(r.id);
            } else {
              map.set(r.id, r as RoomInfo);
            }
          }
        });
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    // Clean up all stale dead rooms immediately
    staleIds.forEach((id) => {
      this.unregisterRoom(id);
    });

    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Subscribe to real-time room list updates with periodic auto-cleaning
   */
  subscribeToRooms(onRoomsUpdate: (rooms: RoomInfo[]) => void) {
    const fetchAndNotify = () => {
      this.listActiveRooms().then(onRoomsUpdate);
    };

    fetchAndNotify();

    // Periodic sweep every 3 seconds to immediately remove empty/closed rooms
    const interval = setInterval(() => {
      fetchAndNotify();
    }, 3000);

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
