"use client";

import { supabase, isSupabaseConfigured } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { GeminiAI } from "./gemini-ai";

export interface RoomPlayer {
  id: string;
  nickname: string;
  avatarColor: string;
  avatarFrame: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  isEliminated?: boolean;
}

export interface WordChainItem {
  word: string;
  meaning?: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export interface MultiplayerGameState {
  roomId: string;
  language: "vi" | "en";
  status: "WAITING" | "PLAYING" | "FINISHED";
  players: RoomPlayer[];
  activePlayerIndex: number;
  turnDeadline: number;
  wordChain: WordChainItem[];
  winner: RoomPlayer | null;
}

export class MultiplayerRoomService {
  private channel: RealtimeChannel | null = null;
  private roomId: string;
  private localPlayer: RoomPlayer;
  private onStateChange: (state: MultiplayerGameState) => void;
  private onChatReceive: (msg: ChatMessage) => void;
  private onWordReject: (err: string) => void;

  private state: MultiplayerGameState;

  constructor(
    roomId: string,
    player: { id: string; nickname: string; avatarColor: string; avatarFrame: string; isHost?: boolean },
    language: "vi" | "en",
    callbacks: {
      onStateChange: (state: MultiplayerGameState) => void;
      onChatReceive: (msg: ChatMessage) => void;
      onWordReject: (err: string) => void;
    }
  ) {
    this.roomId = roomId;
    this.localPlayer = {
      id: player.id,
      nickname: player.nickname,
      avatarColor: player.avatarColor,
      avatarFrame: player.avatarFrame,
      isHost: !!player.isHost,
      isReady: true,
      score: 0,
      isEliminated: false,
    };
    this.onStateChange = callbacks.onStateChange;
    this.onChatReceive = callbacks.onChatReceive;
    this.onWordReject = callbacks.onWordReject;

    this.state = {
      roomId,
      language,
      status: "WAITING",
      players: [this.localPlayer],
      activePlayerIndex: 0,
      turnDeadline: 0,
      wordChain: [],
      winner: null,
    };
  }

  public async connect() {
    this.onStateChange(this.state);

    if (!isSupabaseConfigured()) {
      console.warn("[Multiplayer] Supabase not configured, using local fallback mode");
      return;
    }

    try {
      this.channel = supabase.channel(`room:${this.roomId}`, {
        config: {
          presence: { key: this.localPlayer.id },
          broadcast: { self: false },
        },
      });

      // Handle presence (players join/leave)
      this.channel.on("presence", { event: "sync" }, () => {
        const presenceState = this.channel?.presenceState() || {};
        const onlinePlayers: RoomPlayer[] = [];

        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.id) {
              onlinePlayers.push({
                id: p.id,
                nickname: p.nickname || "Người chơi",
                avatarColor: p.avatarColor || "from-emerald-400 to-green-600",
                avatarFrame: p.avatarFrame || "default",
                isHost: !!p.isHost,
                isReady: true,
                score: p.score || 0,
                isEliminated: !!p.isEliminated,
              });
            }
          });
        });

        // Ensure host is first
        if (onlinePlayers.length > 0) {
          const hasHost = onlinePlayers.some((p) => p.isHost);
          if (!hasHost) onlinePlayers[0].isHost = true;

          this.state.players = onlinePlayers;
          this.onStateChange({ ...this.state });
        }
      });

      // Handle broadcast events
      this.channel
        .on("broadcast", { event: "game_state" }, ({ payload }) => {
          if (payload) {
            this.state = { ...this.state, ...payload };
            this.onStateChange(this.state);
          }
        })
        .on("broadcast", { event: "chat_msg" }, ({ payload }) => {
          if (payload) {
            this.onChatReceive(payload);
          }
        })
        .on("broadcast", { event: "word_rejected" }, ({ payload }) => {
          if (payload?.error) {
            this.onWordReject(payload.error);
          }
        });

      await this.channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.channel?.track({
            id: this.localPlayer.id,
            nickname: this.localPlayer.nickname,
            avatarColor: this.localPlayer.avatarColor,
            avatarFrame: this.localPlayer.avatarFrame,
            isHost: this.localPlayer.isHost,
            score: 0,
          });
        }
      });
    } catch (err) {
      console.warn("[Multiplayer] Channel connect error:", err);
    }
  }

  public async startGame() {
    if (this.state.players.length === 0) return;

    const starterWord = this.state.language === "vi" ? "học sinh" : "apple";
    const starterMeaning =
      this.state.language === "vi"
        ? "Người đang theo học ở các trường bậc phổ thông"
        : "A round fruit with red or green skin";

    this.state.status = "PLAYING";
    this.state.activePlayerIndex = 0;
    this.state.turnDeadline = Date.now() + 20000;
    this.state.wordChain = [
      {
        word: starterWord,
        meaning: starterMeaning,
        senderId: "system",
        senderName: "Hệ Thống",
        senderColor: "from-blue-500 to-indigo-600",
        timestamp: Date.now(),
      },
    ];

    this.broadcastState();
  }

  public async submitWord(word: string): Promise<boolean> {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== this.localPlayer.id) {
      this.onWordReject("Chưa đến lượt của bạn!");
      return false;
    }

    const lastItem = this.state.wordChain[this.state.wordChain.length - 1];
    const prevWord = lastItem ? lastItem.word : null;
    const usedList = this.state.wordChain.map((w) => w.word);

    const evalResult = await GeminiAI.evaluateWord(this.state.language, word, prevWord, usedList);

    if (!evalResult.valid) {
      this.onWordReject(evalResult.error || "Từ không hợp lệ!");
      return false;
    }

    // Add to chain
    const newItem: WordChainItem = {
      word: evalResult.normalizedWord,
      meaning: evalResult.meaning,
      senderId: this.localPlayer.id,
      senderName: this.localPlayer.nickname,
      senderColor: this.localPlayer.avatarColor,
      timestamp: Date.now(),
    };

    this.state.wordChain.push(newItem);
    activePlayer.score += 10;

    // Advance to next active player
    let nextIdx = (this.state.activePlayerIndex + 1) % this.state.players.length;
    let count = 0;
    while (this.state.players[nextIdx].isEliminated && count < this.state.players.length) {
      nextIdx = (nextIdx + 1) % this.state.players.length;
      count++;
    }

    this.state.activePlayerIndex = nextIdx;
    this.state.turnDeadline = Date.now() + 20000;

    this.broadcastState();
    return true;
  }

  public sendChat(text: string) {
    const msg: ChatMessage = {
      id: String(Date.now()),
      sender: this.localPlayer.nickname,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    this.onChatReceive(msg);
    this.channel?.send({
      type: "broadcast",
      event: "chat_msg",
      payload: msg,
    });
  }

  private broadcastState() {
    this.onStateChange({ ...this.state });
    this.channel?.send({
      type: "broadcast",
      event: "game_state",
      payload: this.state,
    });
  }

  public disconnect() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}
