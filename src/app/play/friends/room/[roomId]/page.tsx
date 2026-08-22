"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Users, Play, Send, Crown, AlertCircle, Trophy, MessageCircle } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";
import { getSocket } from "@/lib/socket-client";

interface RoomPlayer {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
  avatarColor: string;
  avatarFrame: string;
  isEliminated: boolean;
  score: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface WordChainItem {
  word: string;
  senderName: string;
  senderColor: string;
  timestamp: number;
}

interface RoomData {
  id: string;
  language: "vi" | "en";
  status: "WAITING" | "STARTING" | "PLAYING" | "FINISHED";
  players: RoomPlayer[];
  activePlayerIndex: number;
  turnDeadline: number;
  turnDurationMs: number;
  wordChain: WordChainItem[];
  winner: RoomPlayer | null;
}

const TURN_TIME_SEC = 20;

export default function RoomMultiplayerPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const { profile, addGems } = useGame();

  const [copied, setCopied] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "Hệ Thống", text: `Đã kết nối phòng #${roomId}. Chúc các bạn đấu từ vui vẻ!`, time: "14:00" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [inputWord, setInputWord] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(TURN_TIME_SEC);

  const historyEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connect and join room via Socket.IO
  useEffect(() => {
    if (typeof window === "undefined") return;
    const socket = getSocket();

    const joinPayload = {
      roomId,
      player: {
        id: profile.id,
        nickname: profile.nickname,
        avatarColor: profile.avatarColor,
        avatarFrame: profile.avatarFrame,
      },
    };

    socket.emit("room:join", joinPayload, (res: { success: boolean; room?: RoomData; error?: string }) => {
      if (res.success && res.room) {
        setRoomData(res.room);
      }
    });

    const handleRoomUpdated = (updatedRoom: RoomData) => {
      setRoomData(updatedRoom);
    };

    const handleGameState = (updatedRoom: RoomData) => {
      setRoomData(updatedRoom);
    };

    const handleRoomChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      sounds.playClick();
    };

    const handleWordRejected = ({ error }: { error: string }) => {
      sounds.playWrong();
      setErrorMessage(error || "Từ không hợp lệ!");
      setTimeout(() => setErrorMessage(null), 2500);
    };

    const handlePlayerEliminated = ({ player, reason }: { player: RoomPlayer; reason: string }) => {
      sounds.playWrong();
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "Hệ Thống",
          text: `⚡ ${player.nickname} đã bị loại (${reason})`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    };

    const handleGameFinished = ({ winner }: { winner: RoomPlayer | null }) => {
      if (winner && winner.id === profile.id) {
        sounds.playFanfare();
        addGems(30);
      }
    };

    socket.on("room:updated", handleRoomUpdated);
    socket.on("game:state", handleGameState);
    socket.on("chat:room:message", handleRoomChatMessage);
    socket.on("game:word_rejected", handleWordRejected);
    socket.on("game:player_eliminated", handlePlayerEliminated);
    socket.on("game:finished", handleGameFinished);

    return () => {
      socket.off("room:updated", handleRoomUpdated);
      socket.off("game:state", handleGameState);
      socket.off("chat:room:message", handleRoomChatMessage);
      socket.off("game:word_rejected", handleWordRejected);
      socket.off("game:player_eliminated", handlePlayerEliminated);
      socket.off("game:finished", handleGameFinished);
      socket.emit("room:leave", { roomId });
    };
  }, [roomId, profile.id, profile.nickname, profile.avatarColor, profile.avatarFrame, addGems]);

  // Turn timer countdown sync with server turnDeadline
  useEffect(() => {
    if (!roomData || roomData.status !== "PLAYING") return;

    timerIntervalRef.current = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((roomData.turnDeadline - Date.now()) / 1000));
      setLocalTimeLeft(remainingSec);
    }, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [roomData]);

  // Auto-scroll word history to bottom
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomData?.wordChain]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const socket = getSocket();
    socket.emit("chat:room:send", {
      roomId,
      sender: profile.nickname,
      text: chatInput.trim(),
    });

    setChatInput("");
  };

  const handleStartGame = () => {
    const socket = getSocket();
    sounds.playClick();
    socket.emit("game:start", { roomId });
  };

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    const socket = getSocket();
    socket.emit("game:submit_word", {
      roomId,
      word: inputWord.trim(),
    });

    setInputWord("");
  };

  const players = roomData?.players || [];
  const myPlayerObj = players.find((p) => p.id === profile.id);
  const isHost = myPlayerObj?.isHost || false;
  const inGame = roomData?.status === "PLAYING";
  const activePlayer = roomData ? players[roomData.activePlayerIndex] : null;
  const isMyTurn = inGame && activePlayer && activePlayer.id === profile.id;
  const lastWord = roomData?.wordChain && roomData.wordChain.length > 0 ? roomData.wordChain[roomData.wordChain.length - 1].word : null;

  return (
    <div className="relative min-h-[calc(100dvh-76px)] pt-20 md:pt-24 pb-8 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col gap-4">
      {/* Top Room Header */}
      <div className="glass-card flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 rounded-[28px] bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            onClick={() => sounds.playClick()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase">
                Phòng #{roomId} (Online 🟢)
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {roomData?.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"} • {players.length} người
              </span>
            </div>
          </div>
        </div>

        {/* Copy Invite Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="btn-wf-silver flex items-center gap-2 h-10 px-4 rounded-full text-xs font-black text-foreground cursor-pointer shadow-sm w-full sm:w-auto justify-center"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? "Đã copy link phòng!" : "Sao Chép Link Mời"}</span>
        </button>
      </div>

      {/* Main View: Lobby vs Live Arena */}
      {!inGame ? (
        /* LOBBY VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 flex-1">
          {/* Players List & Host Controls */}
          <div className="glass-card rounded-[32px] p-6 bg-background/60 backdrop-blur-md flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-black text-foreground">
                    Danh Sách Người Chơi ({players.length}/8)
                  </h2>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Phòng Chờ Live
                </span>
              </div>

              <div className="space-y-2.5">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${player.avatarColor} text-white font-black text-sm`}
                      >
                        {player.nickname[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground">{player.nickname}</p>
                          {player.isHost && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-black text-[9px]">
                              <Crown className="h-3 w-3 fill-amber-400" /> Chủ Phòng
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Đã kết nối</span>
                      </div>
                    </div>

                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                  </div>
                ))}
              </div>
            </div>

            {/* Host Start Button or Waiting text */}
            <div className="pt-4 border-t border-border/50">
              {isHost ? (
                <button
                  type="button"
                  disabled={players.length < 1}
                  onClick={handleStartGame}
                  className="btn-wf-primary w-full h-13 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md text-base"
                >
                  <Play className="h-5 w-5 fill-current" /> Bắt Đầu Trận Đấu (Real-Time)
                </button>
              ) : (
                <div className="p-3 text-center rounded-2xl bg-muted/40 text-xs font-bold text-muted-foreground">
                  ⏳ Đang chờ chủ phòng bắt đầu trận đấu...
                </div>
              )}
            </div>
          </div>

          {/* Lobby In-Room Chat */}
          <div className="glass-card rounded-[32px] p-5 bg-background/60 backdrop-blur-md flex flex-col justify-between gap-3 h-[420px] lg:h-auto">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-black text-foreground">Chat Phòng Chờ (Live)</h3>
            </div>

            <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-2.5 pr-1">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-muted/40 text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-foreground">{msg.sender}</span>
                    <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-muted-foreground">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-border/50">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin trong phòng..."
                className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-medium focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="btn-wf-primary h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* LIVE ARENA VIEW */
        <div className="glass-card flex-1 rounded-[32px] p-4 sm:p-6 bg-background/60 backdrop-blur-md flex flex-col justify-between gap-4">
          {/* Active Turn Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${
                  activePlayer?.avatarColor || "from-emerald-400 to-green-600"
                } text-white font-black`}
              >
                {activePlayer?.nickname[0] || "?"}
              </div>
              <div>
                <p className="text-sm font-black text-foreground">
                  Lượt của: <span className="text-primary">{activePlayer?.nickname}</span>
                </p>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {isMyTurn ? "🔥 Đến lượt của bạn! Nhập từ ngay." : "Đang chờ đối thủ nhập từ..."}
                </p>
              </div>
            </div>

            {/* Synchronized Timer Badge */}
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary/20 text-primary font-black text-sm">
              <span>⏱️ {localTimeLeft}s</span>
            </div>
          </div>

          {/* Word Chain History */}
          <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-3 p-3 max-h-[340px] rounded-2xl bg-muted/20 border border-border/40">
            {roomData?.wordChain.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${h.senderColor} text-white text-[10px] font-bold`}
                >
                  {h.senderName[0]}
                </div>
                <div className="px-4 py-2 rounded-2xl bg-background border border-border/70 shadow-sm text-sm font-black flex items-center justify-between flex-1">
                  <span className="capitalize">{h.word}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">#{i + 1}</span>
                </div>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>

          {/* Error Message & Input */}
          <div className="space-y-2">
            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWord} className="flex gap-2">
              <input
                type="text"
                disabled={!isMyTurn}
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder={isMyTurn ? `Nhập từ nối tiếp từ "${lastWord}"...` : "Chưa đến lượt của bạn..."}
                className="flex-1 h-12 px-4 rounded-2xl border-2 border-border/80 bg-background font-bold text-sm focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isMyTurn || !inputWord.trim()}
                className="btn-wf-primary h-12 px-6 rounded-2xl font-black text-primary-foreground flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md"
              >
                <Send className="h-4 w-4" /> Gửi Từ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Winner Podium Modal */}
      {roomData?.winner && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border-2 border-amber-400 bg-background/95 p-6 text-center shadow-2xl backdrop-blur-xl space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
              <Trophy className="h-10 w-10 text-amber-500 animate-bounce" />
            </div>

            <div>
              <p className="text-xl font-black text-foreground">NHÀ VÔ ĐỊCH! 👑</p>
              <p className="text-xs text-muted-foreground mt-1">
                Chúc mừng <strong className="text-primary font-black">{roomData.winner.nickname}</strong> đã giành chiến thắng!
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Link
                href="/"
                onClick={() => sounds.playClick()}
                className="btn-wf-silver flex-1 h-11 rounded-2xl text-xs font-bold text-foreground flex items-center justify-center cursor-pointer"
              >
                Trang Chủ
              </Link>
              {isHost && (
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="btn-wf-primary flex-1 h-11 rounded-2xl text-xs font-black text-primary-foreground cursor-pointer shadow-md"
                >
                  Đấu Tiếp ➔
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
