"use client";

import { supabase, isSupabaseConfigured } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { GeminiAI } from "./gemini-ai";

export type RPSChoice = "rock" | "paper" | "scissors";

export interface RPSState {
  playerChoices: Record<string, RPSChoice>;
  deadline: number;
  winnerId: string | "draw" | null;
  resultMessage?: string;
}

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
  status: "WAITING" | "RPS" | "PLAYING" | "FINISHED";
  players: RoomPlayer[];
  activePlayerIndex: number;
  turnDeadline: number;
  wordChain: WordChainItem[];
  winner: RoomPlayer | null;
  loser: RoomPlayer | null;
  finishReason?: string;
  rpsState?: RPSState;
}

const VIETNAMESE_STARTERS = [
  { word: "học sinh", meaning: "Người đang theo học ở các trường phổ thông hoặc cơ sở giáo dục." },
  { word: "sinh động", meaning: "Có sức sống phong phú, tự nhiên và lôi cuốn người xem." },
  { word: "thiên nhiên", meaning: "Toàn thể giới tự nhiên, sinh thái và cảnh quan bao quanh con người." },
  { word: "mặt trời", meaning: "Thiên thể trung tâm phát ánh sáng và năng lượng cho hệ mặt trời." },
  { word: "cây cối", meaning: "Thực vật nói chung xanh tươi sống trên mặt đất." },
  { word: "đất nước", meaning: "Tổ quốc, quốc gia nơi dân tộc sinh sống và xây dựng non sông." },
  { word: "gia đình", meaning: "Tổ ấm thiêng liêng gồm cha mẹ, con cái và những người thân yêu." },
  { word: "hạnh phúc", meaning: "Trạng thái tâm hồn vui tươi, an lạc và mãn nguyện trọn vẹn." },
  { word: "sáng tạo", meaning: "Khả năng tư duy tạo ra những cái mới mẻ, độc đáo và hữu ích." },
  { word: "tương lai", meaning: "Khoảng thời gian phía trước với nhiều niềm tin và hy vọng." },
  { word: "bình minh", meaning: "Thời khắc rực rỡ khi mặt trời bắt đầu mọc báo hiệu ngày mới." },
  { word: "hoàng hôn", meaning: "Thời điểm chiều tà khi ánh mặt trời dần lặn ở đường chân trời." },
  { word: "núi non", meaning: "Cảnh sắc núi đồi hùng vĩ trùng điệp nối tiếp nhau." },
  { word: "biển cả", meaning: "Đại dương mênh mông bao la với sóng vỗ ngập tràn." },
  { word: "rừng rậm", meaning: "Khu rừng nguyên sinh rậm rạp với muôn loài muông thú cỏ cây." },
  { word: "bạn bè", meaning: "Những người cùng trang lứa, đồng hành sẻ chia trong cuộc sống." },
  { word: "chiến thắng", meaning: "Đạt được thành công vang dội, vượt qua thử thách cam go." },
];

const ENGLISH_STARTERS = [
  { word: "sunshine", meaning: "Direct sunlight unbroken by cloud; warmth and light." },
  { word: "nature", meaning: "The phenomena of the physical world including plants and animals." },
  { word: "family", meaning: "A group consisting of parents and children living together in harmony." },
  { word: "galaxy", meaning: "A huge system of millions or billions of stars held by gravity." },
  { word: "mountain", meaning: "A large natural elevation of the earth's surface rising abruptly." },
  { word: "ocean", meaning: "A very large expanse of sea, in particular each of the main areas." },
  { word: "freedom", meaning: "The power or right to act, speak, or think without hindrance." },
  { word: "victory", meaning: "An act of defeating an enemy or winning a battle or match." },
  { word: "rainbow", meaning: "An arch of colors formed in the sky in suitable conditions of mist." },
  { word: "diamond", meaning: "A precious stone consisting of a clear and colorless crystalline form." },
];

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
      loser: null,
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

      // 1. Presence Sync
      const handlePresenceUpdate = () => {
        const presenceState = this.channel?.presenceState() || {};
        const onlineMap = new Map<string, RoomPlayer>();

        // Always keep local player
        onlineMap.set(this.localPlayer.id, this.localPlayer);

        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.id) {
              const existing = onlineMap.get(p.id);
              onlineMap.set(p.id, {
                id: p.id,
                nickname: p.nickname || existing?.nickname || "Người chơi",
                avatarColor: p.avatarColor || existing?.avatarColor || "from-emerald-400 to-green-600",
                avatarFrame: p.avatarFrame || "default",
                isHost: p.isHost ?? existing?.isHost ?? false,
                isReady: true,
                score: p.score ?? existing?.score ?? 0,
                isEliminated: !!p.isEliminated,
              });
            }
          });
        });

        const list = Array.from(onlineMap.values());
        if (list.length > 0) {
          const hasHost = list.some((p) => p.isHost);
          if (!hasHost) list[0].isHost = true;
          this.state.players = list;
          this.onStateChange({ ...this.state });
        }
      };

      this.channel.on("presence", { event: "sync" }, handlePresenceUpdate);
      this.channel.on("presence", { event: "join" }, ({ newPresences }) => {
        handlePresenceUpdate();
      });
      this.channel.on("presence", { event: "leave" }, () => {
        handlePresenceUpdate();
      });

      // 2. Direct Broadcast Events (Instant Handshake between players)
      this.channel
        .on("broadcast", { event: "player_hello" }, ({ payload }) => {
          if (payload?.player && payload.player.id !== this.localPlayer.id) {
            const incoming = payload.player;
            const exists = this.state.players.some((p) => p.id === incoming.id);
            if (!exists) {
              this.state.players = [...this.state.players, incoming];
              this.onStateChange({ ...this.state });
            }
            // If I am host, send full game state back to incoming player
            if (this.localPlayer.isHost) {
              this.channel?.send({
                type: "broadcast",
                event: "room_welcome",
                payload: { state: this.state },
              });
            }
          }
        })
        .on("broadcast", { event: "room_welcome" }, ({ payload }) => {
          if (payload?.state) {
            this.state = {
              ...this.state,
              ...payload.state,
              players: this.mergePlayers(this.state.players, payload.state.players),
            };
            this.onStateChange({ ...this.state });
          }
        })
        .on("broadcast", { event: "game_state" }, ({ payload }) => {
          if (payload) {
            this.state = {
              ...this.state,
              ...payload,
              players: this.mergePlayers(this.state.players, payload.players || []),
            };
            this.onStateChange({ ...this.state });
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

          // Announce hello to everyone in the room
          this.channel?.send({
            type: "broadcast",
            event: "player_hello",
            payload: { player: this.localPlayer },
          });
        }
      });
    } catch (err) {
      console.warn("[Multiplayer] Channel connect error:", err);
    }
  }

  private mergePlayers(current: RoomPlayer[], incoming: RoomPlayer[]): RoomPlayer[] {
    const map = new Map<string, RoomPlayer>();
    current.forEach((p) => map.set(p.id, p));
    incoming.forEach((p) => {
      const existing = map.get(p.id);
      map.set(p.id, { ...existing, ...p });
    });
    return Array.from(map.values());
  }

  // ===================== RPS PHASE =====================
  public startRPSPhase() {
    if (this.state.players.length === 0) return;

    this.state.status = "RPS";
    this.state.winner = null;
    this.state.loser = null;
    this.state.finishReason = undefined;
    this.state.rpsState = {
      playerChoices: {},
      deadline: Date.now() + 6000,
      winnerId: null,
      resultMessage: "Chọn để phân chia người đi trước!",
    };

    this.broadcastState();
  }

  public submitRPSChoice(choice: RPSChoice) {
    if (!this.state.rpsState || this.state.status !== "RPS") return;

    this.state.rpsState.playerChoices[this.localPlayer.id] = choice;

    const numPlayers = Math.min(this.state.players.length, 2);
    const choices = Object.values(this.state.rpsState.playerChoices);

    if (choices.length >= numPlayers) {
      this.evaluateRPS();
    } else {
      this.broadcastState();
    }
  }

  public evaluateRPS() {
    if (!this.state.rpsState || this.state.players.length === 0) return;

    const p1 = this.state.players[0];
    const p2 = this.state.players[1] || this.state.players[0];

    const c1: RPSChoice = this.state.rpsState.playerChoices[p1.id] || "rock";
    const c2: RPSChoice = (p2 && this.state.rpsState.playerChoices[p2.id]) || "scissors";

    let winnerId: string = p1.id;
    let message = "";

    const choiceNames: Record<RPSChoice, string> = {
      rock: "✊ Búa",
      paper: "🖐️ Bao",
      scissors: "✌️ Kéo",
    };

    if (c1 === c2) {
      winnerId = Math.random() > 0.5 ? p1.id : (p2?.id || p1.id);
      const winnerName = this.state.players.find((p) => p.id === winnerId)?.nickname || "Người chơi";
      message = `Hòa (${choiceNames[c1]} vs ${choiceNames[c2]})! Hệ thống chỉ định ${winnerName} đi trước.`;
    } else if (
      (c1 === "rock" && c2 === "scissors") ||
      (c1 === "scissors" && c2 === "paper") ||
      (c1 === "paper" && c2 === "rock")
    ) {
      winnerId = p1.id;
      message = `${p1.nickname} (${choiceNames[c1]}) thắng ${p2?.nickname} (${choiceNames[c2]}) và giành quyền ĐI TRƯỚC!`;
    } else {
      winnerId = p2.id;
      message = `${p2.nickname} (${choiceNames[c2]}) thắng ${p1.nickname} (${choiceNames[c1]}) và giành quyền ĐI TRƯỚC!`;
    }

    this.state.rpsState.winnerId = winnerId;
    this.state.rpsState.resultMessage = message;
    this.broadcastState();

    setTimeout(() => {
      this.startPlayingFromRPS(winnerId);
    }, 2500);
  }

  private startPlayingFromRPS(firstPlayerId: string) {
    const list = this.state.language === "vi" ? VIETNAMESE_STARTERS : ENGLISH_STARTERS;
    const randomStarter = list[Math.floor(Math.random() * list.length)];

    let activeIndex = this.state.players.findIndex((p) => p.id === firstPlayerId);
    if (activeIndex === -1) activeIndex = 0;

    this.state.status = "PLAYING";
    this.state.activePlayerIndex = activeIndex;
    this.state.turnDeadline = Date.now() + 20000;
    this.state.wordChain = [
      {
        word: randomStarter.word,
        meaning: randomStarter.meaning,
        senderId: "system",
        senderName: "Hệ Thống",
        senderColor: "from-blue-500 to-indigo-600",
        timestamp: Date.now(),
      },
    ];

    this.state.players.forEach((p) => (p.score = 0));
    this.broadcastState();
  }

  // ===================== BATTLE GAMEPLAY =====================
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
      this.onWordReject(evalResult.error || "Từ không hợp lệ hoặc không có nghĩa!");
      return false;
    }

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

  // ===================== TIMEOUT & SURRENDER =====================
  public handleTimeout() {
    if (this.state.status !== "PLAYING") return;

    const timedOutPlayer = this.state.players[this.state.activePlayerIndex];
    if (!timedOutPlayer) return;

    const otherIdx = (this.state.activePlayerIndex + 1) % this.state.players.length;
    const winnerPlayer = this.state.players[otherIdx] || timedOutPlayer;

    this.state.status = "FINISHED";
    this.state.winner = winnerPlayer;
    this.state.loser = timedOutPlayer;
    this.state.finishReason = "timeout";

    this.broadcastState();
  }

  public surrender(playerId: string) {
    if (this.state.status !== "PLAYING") return;

    const surrenderingPlayer = this.state.players.find((p) => p.id === playerId);
    const winnerPlayer = this.state.players.find((p) => p.id !== playerId) || this.state.players[0];

    this.state.status = "FINISHED";
    this.state.winner = winnerPlayer;
    this.state.loser = surrenderingPlayer || null;
    this.state.finishReason = "surrender";

    this.broadcastState();
  }

  public restartGame() {
    this.startRPSPhase();
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
