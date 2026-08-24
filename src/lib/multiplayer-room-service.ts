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
        }
      });
    } catch (err) {
      console.warn("[Multiplayer] Channel connect error:", err);
    }
  }

  // ===================== RPS PHASE (OẲN TÙ TÌ) =====================
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

    // Check if both players (or all players) have made their choice
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
      // Tie: randomly pick or default to p1
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

    // After 2.5 seconds, start the actual game with the starter word!
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

    // Reset scores
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

    // Switch turn to next player
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

    // The other player is the winner
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
