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
  hostId: string;
  hostNickname: string;
  hostAvatarColor: string;
  playerCount: number;
  maxPlayers: number;
  status: "WAITING" | "PLAYING" | "FINISHED";
  createdAt: number;
}

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

export const RoomRegistry = {
  /**
   * Register or update an active room
   */
  async registerRoom(room: RoomInfo): Promise<boolean> {
    memoryRooms.set(room.id, room);

    // Save in local storage for fallback
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        stored[room.id] = room;
        localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("rooms").upsert({
          id: room.id,
          code: room.id,
          host_id: room.hostId,
          language: room.language,
          status: room.status,
        });
      } catch (err) {
        console.warn("[RoomRegistry] DB upsert error:", err);
      }
    }

    // Broadcast room update to all lobby listeners
    this.broadcastLobbyUpdate();
    return true;
  },

  /**
   * Update room status or player count
   */
  async updateRoom(roomId: string, patch: Partial<RoomInfo>): Promise<void> {
    const existing = await this.getRoom(roomId);
    if (existing) {
      const updated = { ...existing, ...patch };
      await this.registerRoom(updated);
    }
  },

  /**
   * Unregister / disband a room
   */
  async unregisterRoom(roomId: string): Promise<void> {
    memoryRooms.delete(roomId);

    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        delete stored[roomId];
        localStorage.setItem("wf_active_rooms", JSON.stringify(stored));
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("rooms").delete().eq("id", roomId);
      } catch (err) {
        console.warn("[RoomRegistry] DB delete error:", err);
      }
    }

    this.broadcastLobbyUpdate();
  },

  /**
   * Get specific room by code/ID
   */
  async getRoom(roomId: string): Promise<RoomInfo | null> {
    const cleanId = roomId.trim().toUpperCase();

    // 1. Check in-memory
    if (memoryRooms.has(cleanId)) {
      return memoryRooms.get(cleanId)!;
    }

    // 2. Check localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        if (stored[cleanId]) {
          memoryRooms.set(cleanId, stored[cleanId]);
          return stored[cleanId];
        }
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    // 3. Check Supabase DB
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from("rooms").select("*").eq("id", cleanId).maybeSingle();
        if (data && !error) {
          const room: RoomInfo = {
            id: data.id,
            name: `Phòng Chiến #${data.id}`,
            themeColor: "emerald",
            language: data.language || "vi",
            hasPassword: false,
            turnTimeSec: 20,
            hostId: data.host_id || "host",
            hostNickname: "Chủ Phòng",
            hostAvatarColor: "from-emerald-400 to-green-600",
            playerCount: 1,
            maxPlayers: 2,
            status: data.status || "WAITING",
            createdAt: new Date(data.created_at).getTime(),
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

    // From memory
    memoryRooms.forEach((r, id) => {
      // Filter out stale rooms older than 3 hours
      if (Date.now() - r.createdAt < 3 * 60 * 60 * 1000) {
        map.set(id, r);
      }
    });

    // From localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("wf_active_rooms") || "{}");
        Object.values(stored).forEach((r: any) => {
          if (r?.id && Date.now() - (r.createdAt || 0) < 3 * 60 * 60 * 1000) {
            map.set(r.id, r as RoomInfo);
          }
        });
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }

    // From DB
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from("rooms").select("*").order("created_at", { ascending: false }).limit(20);
        if (data) {
          data.forEach((d: any) => {
            if (!map.has(d.id)) {
              map.set(d.id, {
                id: d.id,
                name: `Phòng Chiến #${d.id}`,
                themeColor: "emerald",
                language: d.language || "vi",
                hasPassword: false,
                turnTimeSec: 20,
                hostId: d.host_id || "host",
                hostNickname: "Chủ Phòng",
                hostAvatarColor: "from-emerald-400 to-green-600",
                playerCount: 1,
                maxPlayers: 2,
                status: d.status || "WAITING",
                createdAt: new Date(d.created_at).getTime(),
              });
            }
          });
        }
      } catch (e) {
        console.warn("Fetch rooms DB error:", e);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Subscribe to real-time room list updates
   */
  subscribeToRooms(onRoomsUpdate: (rooms: RoomInfo[]) => void) {
    if (!isSupabaseConfigured()) {
      this.listActiveRooms().then(onRoomsUpdate);
      return () => {};
    }

    if (!lobbyChannel) {
      lobbyChannel = supabase.channel("public_room_lobby");
      lobbyChannel.subscribe();
    }

    const handler = () => {
      this.listActiveRooms().then(onRoomsUpdate);
    };

    lobbyChannel.on("broadcast", { event: "rooms_updated" }, handler);
    // Initial fetch
    this.listActiveRooms().then(onRoomsUpdate);

    return () => {
      // Unsubscribe listener
    };
  },

  broadcastLobbyUpdate() {
    if (lobbyChannel) {
      lobbyChannel.send({
        type: "broadcast",
        event: "rooms_updated",
        payload: { timestamp: Date.now() },
      });
    }
  },
};
