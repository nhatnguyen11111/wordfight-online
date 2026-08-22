"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Users, Play, Send, Crown, AlertCircle, Trophy, MessageCircle, Sparkles, BookOpen, Clock } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";
import { MultiplayerRoomService, MultiplayerGameState, RoomPlayer, ChatMessage } from "@/lib/multiplayer-room-service";

const TURN_TIME_SEC = 20;

export default function RoomMultiplayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams?: Promise<{ create?: string; lang?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : {};
  const roomId = resolvedParams.roomId;
  const isCreator = resolvedSearchParams?.create === "true";
  const language = (resolvedSearchParams?.lang === "en" ? "en" : "vi") as "vi" | "en";

  const { profile, addGems } = useGame();

  const [copied, setCopied] = useState(false);
  const [gameState, setGameState] = useState<MultiplayerGameState>({
    roomId,
    language,
    status: "WAITING",
    players: [
      {
        id: profile.id,
        nickname: profile.nickname,
        avatarColor: profile.avatarColor,
        avatarFrame: profile.avatarFrame,
        isHost: isCreator,
        isReady: true,
        score: 0,
      },
    ],
    activePlayerIndex: 0,
    turnDeadline: 0,
    wordChain: [],
    winner: null,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "Hệ Thống", text: `Đã kết nối phòng #${roomId}. Chúc các bạn đấu từ vui vẻ!`, time: "14:00" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [inputWord, setInputWord] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(TURN_TIME_SEC);

  const historyEndRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<MultiplayerRoomService | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Multiplayer Service
  useEffect(() => {
    const service = new MultiplayerRoomService(
      roomId,
      {
        id: profile.id,
        nickname: profile.nickname,
        avatarColor: profile.avatarColor,
        avatarFrame: profile.avatarFrame,
        isHost: isCreator,
      },
      language,
      {
        onStateChange: (state) => {
          setGameState(state);
        },
        onChatReceive: (msg) => {
          setChatMessages((prev) => [...prev, msg]);
          sounds.playClick();
        },
        onWordReject: (err) => {
          sounds.playWrong();
          setErrorMessage(err);
          setTimeout(() => setErrorMessage(null), 3000);
        },
      }
    );

    serviceRef.current = service;
    service.connect();

    return () => {
      service.disconnect();
    };
  }, [roomId, profile.id, profile.nickname, profile.avatarColor, profile.avatarFrame, isCreator, language]);

  // Turn timer countdown
  useEffect(() => {
    if (gameState.status !== "PLAYING") return;

    timerIntervalRef.current = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
      setLocalTimeLeft(remainingSec);
    }, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState.status, gameState.turnDeadline]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.wordChain]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    sounds.playCorrect();
    serviceRef.current?.startGame();
  };

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    const wordToSubmit = inputWord.trim();
    const success = await serviceRef.current?.submitWord(wordToSubmit);
    if (success) {
      sounds.playCorrect();
      setInputWord("");
      setErrorMessage(null);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    serviceRef.current?.sendChat(chatInput.trim());
    setChatInput("");
  };

  const isHost = gameState.players.find((p) => p.id === profile.id)?.isHost ?? isCreator;
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === profile.id;
  const lastWord = gameState.wordChain[gameState.wordChain.length - 1];

  return (
    <div className="relative min-h-[calc(100dvh-76px)] pt-20 md:pt-24 pb-8 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col gap-4">
      {/* Top Header */}
      <div className="glass-card flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 rounded-[28px] bg-background/60 backdrop-blur-md">
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
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-black text-xs border border-amber-500/20">
                PHÒNG #{roomId} (ONLINE 🟢)
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {gameState.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"} • {gameState.players.length} người
              </span>
            </div>
          </div>
        </div>

        {/* Copy Invite Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="btn-wf-silver flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold text-foreground cursor-pointer shadow-sm w-full sm:w-auto justify-center"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? "Đã sao chép link!" : "Sao Chép Link Mời"}</span>
        </button>
      </div>

      {/* Main Container */}
      {gameState.status === "WAITING" ? (
        /* LOBBY WAITING ROOM */
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
          {/* Players List Card */}
          <div className="glass-card rounded-[32px] p-6 bg-background/60 backdrop-blur-md space-y-4 flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-black text-sm text-foreground">
                    Danh Sách Người Chơi ({gameState.players.length}/8)
                  </h3>
                </div>
                <span className="text-xs font-bold text-primary animate-pulse">Phòng Chờ Live</span>
              </div>

              {/* Player Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gameState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${p.avatarColor} text-white font-black text-xs shadow-sm`}
                      >
                        {p.nickname[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-foreground truncate">{p.nickname}</p>
                          {p.isHost && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <span className="text-[10px] font-bold text-primary">Sẵn sàng</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground opacity-60">#{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Button or Waiting Info */}
            <div className="pt-4 border-t border-border/40">
              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm"
                >
                  <Play className="h-5 w-5 fill-current" /> Bắt Đầu Trận Đấu
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-muted/30 text-center text-xs font-bold text-muted-foreground">
                  ⏳ Đang chờ chủ phòng bắt đầu trận đấu...
                </div>
              )}
            </div>
          </div>

          {/* Lobby Live Chat Card */}
          <div className="glass-card rounded-[32px] p-5 bg-background/60 backdrop-blur-md flex flex-col justify-between h-[380px]">
            <div className="flex items-center gap-2 pb-3 border-b border-border/50">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h3 className="font-black text-xs text-foreground">Chat Phòng Chờ (Live)</h3>
            </div>

            <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-primary">{msg.sender}</span>
                    <span className="text-muted-foreground opacity-60">{msg.time}</span>
                  </div>
                  <p className="text-foreground font-medium text-xs break-words">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-border/40">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin trong phòng..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="btn-wf-primary h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-primary-foreground cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* LIVE BATTLE ARENA */
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
          {/* Battle Arena Left */}
          <div className="glass-card rounded-[32px] p-5 sm:p-6 bg-background/60 backdrop-blur-md flex flex-col justify-between gap-4 min-h-[440px]">
            {/* Arena Header: Active turn & timer */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${activePlayer?.avatarColor} text-white font-black text-xs`}
                >
                  {activePlayer?.nickname[0]}
                </div>
                <div>
                  <p className="text-xs font-black text-foreground">
                    Lượt của: <span className="text-primary">{activePlayer?.nickname}</span>
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {isMyTurn ? "ĐẾN LƯỢT BẠN! ⚡" : "Đang chờ đối thủ..."}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-black text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>{localTimeLeft}s</span>
              </div>
            </div>

            {/* Word Timeline */}
            <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-3 p-3 max-h-[300px] rounded-2xl bg-muted/20 border border-border/40">
              {gameState.wordChain.map((item, idx) => {
                const isMine = item.senderId === profile.id;
                return (
                  <div key={idx} className={`flex items-start gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm text-xs ${
                        isMine
                          ? "bg-[#7fe36a] text-black rounded-tr-none font-bold"
                          : "bg-muted/50 text-foreground border border-border/50 rounded-tl-none font-medium"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                        <span>{item.senderName}</span>
                        <span>#{idx + 1}</span>
                      </div>
                      <p className="font-black text-sm capitalize mt-0.5">{item.word}</p>
                      {item.meaning && (
                        <p className="text-[11px] mt-1 opacity-90 leading-tight">{item.meaning}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={historyEndRef} />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmitWord} className="flex gap-2">
              <input
                type="text"
                disabled={!isMyTurn}
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder={
                  isMyTurn
                    ? `Nối từ tiếp theo... (Bắt đầu bằng âm cuối của "${lastWord?.word || ""}")`
                    : "Đang chờ đến lượt của bạn..."
                }
                className="flex-1 h-12 px-4 rounded-2xl border-2 border-border/80 bg-background font-bold text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isMyTurn || !inputWord.trim()}
                className="btn-wf-primary h-12 px-5 rounded-2xl font-black text-primary-foreground flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md"
              >
                <Send className="h-4 w-4" /> Gửi
              </button>
            </form>
          </div>

          {/* Right Live Scoreboard & Chat */}
          <div className="glass-card rounded-[32px] p-5 bg-background/60 backdrop-blur-md flex flex-col justify-between gap-4 h-[440px]">
            <div>
              <h3 className="font-black text-xs text-foreground pb-2 border-b border-border/50">
                Bảng Điểm Trận Đấu
              </h3>
              <div className="space-y-2 mt-3">
                {gameState.players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${p.avatarColor} text-white font-bold text-[10px]`}
                      >
                        {p.nickname[0]}
                      </div>
                      <span className="font-bold text-foreground truncate">{p.nickname}</span>
                    </div>
                    <span className="font-black text-primary">{p.score} điểm</span>
                  </div>
                ))}
              </div>
            </div>

            {/* In-game Chat */}
            <div className="flex-1 flex flex-col justify-between min-h-[160px] border-t border-border/50 pt-3">
              <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-1.5 text-xs max-h-[120px]">
                {chatMessages.slice(-5).map((msg) => (
                  <div key={msg.id} className="text-[11px]">
                    <span className="font-bold text-primary">{msg.sender}: </span>
                    <span className="text-foreground">{msg.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-1.5 pt-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat nhanh..."
                  className="flex-1 h-9 px-3 rounded-xl bg-muted/40 border border-border/60 text-xs font-bold text-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  className="btn-wf-primary h-9 w-9 rounded-xl flex items-center justify-center text-primary-foreground"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
