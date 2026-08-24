"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Play,
  Send,
  Crown,
  AlertCircle,
  Trophy,
  MessageCircle,
  Sparkles,
  BookOpen,
  Timer,
  Clock,
  Lock,
  LogIn,
  Flag,
  RotateCcw,
  Gem,
  Swords,
  LogOut,
  Zap,
  Flame,
  HelpCircle,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";
import {
  MultiplayerRoomService,
  MultiplayerGameState,
  RoomPlayer,
  ChatMessage,
  RPSChoice,
} from "@/lib/multiplayer-room-service";

import { RoomRegistry, RoomInfo } from "@/lib/room-registry";

const TURN_TIME_SEC = 20;

export default function RoomMultiplayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams?: Promise<{ create?: string; lang?: string; theme?: string; name?: string; time?: string; bet?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : {};
  const roomId = resolvedParams.roomId;
  const isCreator = resolvedSearchParams?.create === "true";
  const language = (resolvedSearchParams?.lang === "en" ? "en" : "vi") as "vi" | "en";
  const customRoomName = resolvedSearchParams?.name ? decodeURIComponent(resolvedSearchParams.name) : `PHÒNG #${roomId}`;

  const { profile, addGems, addCoins, deductCoins, isLoggedIn, openModal } = useGame();

  const [copied, setCopied] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [wasKicked, setWasKicked] = useState(false);
  const [kickedReason, setKickedReason] = useState("");
  const [wagerDeducted, setWagerDeducted] = useState(false);

  const betCoins = roomInfo?.betCoins ?? (resolvedSearchParams?.bet ? Number(resolvedSearchParams.bet) : 0);

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
        isReady: isCreator,
        score: 0,
      },
    ],
    activePlayerId: profile.id,
    turnDeadline: 0,
    wordChain: [],
    winner: null,
    loser: null,
    rematchReadyIds: [],
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "Hệ Thống", text: `Đã kết nối phòng #${roomId}. Chúc các bạn đấu từ vui vẻ!`, time: "14:00" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [showChatModal, setShowChatModal] = useState(false);
  const [inputWord, setInputWord] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(
    resolvedSearchParams?.time ? Number(resolvedSearchParams.time) : TURN_TIME_SEC
  );
  const [selectedRps, setSelectedRps] = useState<RPSChoice | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<MultiplayerRoomService | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check Room Existence or Auto-register Creator Room
  useEffect(() => {
    let isMounted = true;
    const checkRoom = async () => {
      if (isCreator) {
        const existing = await RoomRegistry.getRoom(roomId);
        if (!existing) {
          const initialRoom: RoomInfo = {
            id: roomId,
            name: customRoomName,
            themeColor: (resolvedSearchParams?.theme as any) || "emerald",
            language,
            hasPassword: false,
            turnTimeSec: resolvedSearchParams?.time ? Number(resolvedSearchParams.time) : 20,
            betCoins: resolvedSearchParams?.bet ? Number(resolvedSearchParams.bet) : 0,
            hostId: profile.id,
            hostNickname: profile.nickname,
            hostAvatarColor: profile.avatarColor,
            playerCount: 1,
            maxPlayers: 2,
            status: "WAITING",
            createdAt: Date.now(),
          };
          await RoomRegistry.registerRoom(initialRoom);
          if (isMounted) setRoomInfo(initialRoom);
        } else if (isMounted) {
          setRoomInfo(existing);
        }
        return;
      }

      // For guests joining
      const info = await RoomRegistry.getRoom(roomId);
      if (isMounted) {
        if (!info) {
          setRoomNotFound(true);
          sounds.playWrong();
        } else {
          setRoomInfo(info);
        }
      }
    };

    checkRoom();
    return () => {
      isMounted = false;
    };
  }, [roomId, isCreator, language, customRoomName, profile.id, profile.nickname, profile.avatarColor]);

  // Active Room Heartbeat (Pings every 4 seconds to prove room is actively occupied)
  useEffect(() => {
    if (roomNotFound) return;

    RoomRegistry.heartbeat(roomId);
    const heartbeatInterval = setInterval(() => {
      RoomRegistry.heartbeat(roomId);
    }, 4000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [roomId, roomNotFound]);

  // Initialize Multiplayer Service
  useEffect(() => {
    if (roomNotFound) return;

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
        onKicked: (reason) => {
          setWasKicked(true);
          setKickedReason(reason);
          sounds.playWrong();
        },
      }
    );

    serviceRef.current = service;
    service.connect();

    return () => {
      service.disconnect();
    };
  }, [roomId, profile.id, profile.nickname, profile.avatarColor, profile.avatarFrame, isCreator, language, roomNotFound]);

  // Turn timer countdown & automatic timeout enforcement
  useEffect(() => {
    if (gameState.status !== "PLAYING") return;

    timerIntervalRef.current = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
      setLocalTimeLeft(remainingSec);

      if (remainingSec <= 4 && remainingSec > 0) {
        sounds.playTick(true);
      }

      // Check if turn time expired!
      if (remainingSec === 0 && Date.now() >= gameState.turnDeadline) {
        clearInterval(timerIntervalRef.current!);
        serviceRef.current?.handleTimeout();
      }
    }, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState.status, gameState.turnDeadline]);

  // Handle Coin Wager Deduction upon entering PLAYING state
  useEffect(() => {
    if (gameState.status === "PLAYING" && betCoins > 0 && !wagerDeducted) {
      deductCoins(betCoins);
      setWagerDeducted(true);
    } else if (gameState.status === "WAITING") {
      setWagerDeducted(false);
    }
  }, [gameState.status, betCoins, wagerDeducted, deductCoins]);

  // Handle Win reward & fanfare
  useEffect(() => {
    if (gameState.status === "FINISHED") {
      if (gameState.winner?.id === profile.id) {
        sounds.playFanfare();
        if (!rewardClaimed) {
          addGems(20);
          if (betCoins > 0) {
            addCoins(betCoins * 2); // Winner receives the 2x Pot!
          }
          setRewardClaimed(true);
        }
      } else {
        sounds.playWrong();
      }
    } else {
      setRewardClaimed(false);
      setSelectedRps(null);
    }
  }, [gameState.status, gameState.winner?.id, profile.id, rewardClaimed, addGems, addCoins, betCoins]);

  // Direct check if it is my turn by ID
  const isMyTurn = gameState.activePlayerId === profile.id;

  // Auto focus input whenever it becomes my turn
  useEffect(() => {
    if (gameState.status === "PLAYING" && isMyTurn) {
      inputRef.current?.focus();
    }
  }, [gameState.status, isMyTurn]);

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
    serviceRef.current?.startRPSPhase();
  };

  const handleToggleReady = (ready: boolean) => {
    sounds.playClick();
    serviceRef.current?.toggleReady(ready);
  };

  const handleRematchReady = () => {
    sounds.playClick();
    serviceRef.current?.toggleRematchReady();
  };

  const handleChooseRPS = (choice: RPSChoice) => {
    setSelectedRps(choice);
    sounds.playClick();
    serviceRef.current?.submitRPSChoice(choice);
  };

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    let wordToSubmit = inputWord.trim();
    const lastItem = gameState.wordChain[gameState.wordChain.length - 1];

    if (lastItem) {
      const lastWords = lastItem.word.trim().split(/\s+/);
      const reqPrefix = lastWords[lastWords.length - 1].toLowerCase();

      // If user typed without prefix, auto prepend prefix
      const currentInputWords = wordToSubmit.split(/\s+/);
      if (currentInputWords[0].toLowerCase() !== reqPrefix) {
        wordToSubmit = `${reqPrefix} ${wordToSubmit}`;
      }
    }

    const success = await serviceRef.current?.submitWord(wordToSubmit);
    if (success) {
      sounds.playCorrect();
      setInputWord("");
      setErrorMessage(null);
    }
  };

  const handleSurrender = () => {
    sounds.playWrong();
    setShowSurrenderConfirm(false);
    serviceRef.current?.surrender(profile.id);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    serviceRef.current?.sendChat(chatInput.trim());
    setChatInput("");
  };

  const handleKickPlayer = (playerId: string) => {
    if (!isHost) return;
    if (confirm("Bạn có chắc chắn muốn KÍCH người chơi này khỏi phòng?")) {
      serviceRef.current?.kickPlayer(playerId);
      sounds.playWrong();
    }
  };

  const playersRef = useRef<RoomPlayer[]>(gameState.players);
  playersRef.current = gameState.players;

  const handleLeaveRoom = () => {
    sounds.playClick();
    const currentPlayers = playersRef.current;
    if (currentPlayers.length <= 1) {
      RoomRegistry.unregisterRoom(roomId);
    } else {
      const other = currentPlayers.find((p) => p.id !== profile.id);
      if (other) {
        RoomRegistry.updateRoom(roomId, {
          hostId: other.id,
          hostNickname: other.nickname,
          hostAvatarColor: other.avatarColor,
          playerCount: 1,
        });
      }
    }
    serviceRef.current?.disconnect();
  };

  useEffect(() => {
    const handleWindowUnload = () => {
      const currentPlayers = playersRef.current;
      if (currentPlayers.length <= 1) {
        RoomRegistry.unregisterRoom(roomId);
      } else {
        const other = currentPlayers.find((p) => p.id !== profile.id);
        if (other) {
          RoomRegistry.updateRoom(roomId, {
            hostId: other.id,
            hostNickname: other.nickname,
            hostAvatarColor: other.avatarColor,
            playerCount: 1,
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleWindowUnload);
    window.addEventListener("pagehide", handleWindowUnload);

    return () => {
      window.removeEventListener("beforeunload", handleWindowUnload);
      window.removeEventListener("pagehide", handleWindowUnload);
    };
  }, [roomId, profile.id]);

  const myPlayer = gameState.players.find((p) => p.id === profile.id);
  const isHost = gameState.players.length > 0 ? (gameState.players[0].id === profile.id) : isCreator;

  // All guests must be ready before host can start
  const allGuestsReady = gameState.players.length >= 2 && gameState.players.slice(1).every((p) => p.isReady);

  const lastItem = gameState.wordChain[gameState.wordChain.length - 1];
  const prevItem = gameState.wordChain.length >= 2 ? gameState.wordChain[gameState.wordChain.length - 2] : null;

  // Split last word into base syllable and chainable syllable
  const lastWordParts = lastItem ? lastItem.word.trim().split(/\s+/) : ["học", "sinh"];
  const firstSyllables = lastWordParts.slice(0, -1).join(" ");
  const lastSyllable = lastWordParts[lastWordParts.length - 1] || "";

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const isActiveP1 = gameState.activePlayerId === p1?.id;
  const isActiveP2 = gameState.activePlayerId === p2?.id;

  const isWinner = gameState.winner?.id === profile.id;
  const hasRematchReady = gameState.rematchReadyIds.includes(profile.id);

  if (roomNotFound) {
    return (
      <div className="relative min-h-[100dvh] pt-24 pb-8 px-4 flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 rounded-[36px] bg-background/90 backdrop-blur-2xl border border-rose-500/30 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Phòng Không Tồn Tại</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mã phòng <strong>#{roomId}</strong> không tồn tại hoặc chủ phòng đã giải tán phòng đấu!
            </p>
          </div>
          <Link
            href="/"
            onClick={() => {
              sounds.playClick();
              openModal("createRoom");
            }}
            className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Xem Sảnh Phòng Đang Mở
          </Link>
        </div>
      </div>
    );
  }

  if (wasKicked) {
    return (
      <div className="relative min-h-[100dvh] pt-24 pb-8 px-4 flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 rounded-[36px] bg-background/90 backdrop-blur-2xl border border-amber-500/30 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
            <LogOut className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Bạn Đã Bị Kích Khỏi Phòng</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {kickedReason || "Bạn đã bị chủ phòng kích khỏi phòng đấu."}
            </p>
          </div>
          <Link
            href="/"
            onClick={() => sounds.playClick()}
            className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Quay Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-[calc(100dvh-76px)] pt-24 pb-8 px-4 flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 rounded-[32px] bg-background/90 backdrop-blur-xl border border-primary/20 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
            <Lock className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Yêu Cầu Đăng Nhập</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn cần đăng nhập tài khoản để vào phòng #{roomId} và tham gia thi đấu cùng bạn bè!
            </p>
          </div>
          <button
            type="button"
            onClick={() => openModal("auth")}
            className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm"
          >
            <LogIn className="h-5 w-5" /> Đăng Nhập / Đăng Ký Ngay
          </button>
          <Link
            href="/"
            onClick={() => sounds.playClick()}
            className="inline-block text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] pt-16 sm:pt-20 md:pt-24 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-3 sm:px-6 md:px-8 max-w-5xl mx-auto flex flex-col justify-between select-none">
      {/* TOP HEADER CONTROLS */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-[24px] sm:rounded-[28px] bg-background/70 backdrop-blur-xl border border-primary/20 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            onClick={handleLeaveRoom}
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary font-black text-[11px] sm:text-xs border border-primary/20">
                {roomInfo?.name || customRoomName} (#{roomId})
              </span>
              {betCoins > 0 && (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[11px] sm:text-xs border border-amber-500/30 flex items-center gap-1 shadow-sm">
                  <Coins className="h-3.5 w-3.5 fill-amber-500" />
                  <span>Hũ Thưởng: {(betCoins * 2).toLocaleString("vi-VN")} Xu</span>
                </span>
              )}
              <span className="text-[11px] sm:text-xs font-bold text-muted-foreground hidden sm:inline">
                {gameState.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"} • {gameState.players.length} người
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="flex items-center gap-1 h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-muted/60 hover:bg-muted text-[11px] sm:text-xs font-bold text-foreground cursor-pointer transition-colors border border-border/50"
          >
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <span>Chat ({chatMessages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSurrenderConfirm(true)}
            className="flex items-center gap-1 h-9 sm:h-10 px-2.5 sm:px-4 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[11px] sm:text-xs font-bold cursor-pointer transition-colors border border-rose-500/30"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-wf-silver flex items-center gap-1 h-9 sm:h-10 px-2.5 sm:px-4 rounded-full text-[11px] sm:text-xs font-bold text-foreground cursor-pointer shadow-sm"
          >
            {copied ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span>{copied ? "Đã sao chép!" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* MAIN ARENA CONTAINER */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-6 w-full max-w-3xl mx-auto gap-6">
        {gameState.status === "WAITING" ? (
          /* LOBBY WAITING SCREEN WITH READY SYSTEM */
          <div className="glass-card w-full rounded-[36px] p-6 sm:p-8 bg-background/80 backdrop-blur-xl border border-primary/20 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95">
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs font-black">
              <Sparkles className="h-4 w-4" />
              <span>PHÒNG CHỜ THI ĐẤU</span>
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Sẵn Sàng Thách Đấu!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-md">
                Người chơi cần bấm <b>Sẵn sàng</b> để Chủ phòng có thể bắt đầu trận đấu
              </p>
            </div>

            {/* Players cards list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full my-2">
              {gameState.players.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    p.isReady
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                      : "bg-muted/40 border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${p.avatarColor} text-white flex items-center justify-center text-lg font-black shadow-md`}
                    >
                      {p.nickname[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-sm text-foreground truncate max-w-[130px]">{p.nickname}</p>
                        {p.isHost && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                      </div>
                      {p.isReady ? (
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Đã sẵn sàng
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 animate-pulse">
                          ⏳ Chưa sẵn sàng
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHost && !p.isHost && (
                      <button
                        type="button"
                        onClick={() => handleKickPlayer(p.id)}
                        className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-[11px] font-black border border-rose-500/30 cursor-pointer active:scale-95 transition-all shadow-sm"
                        title="Kích người chơi này khỏi phòng"
                      >
                        Kích
                      </button>
                    )}
                    <span className="text-xs font-mono text-muted-foreground opacity-60">#{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons: Host starts if all ready; Member toggles Sẵn Sàng / Hủy Sẵn Sàng */}
            <div className="w-full space-y-2.5 pt-2">
              {isHost ? (
                <button
                  type="button"
                  disabled={!allGuestsReady}
                  onClick={handleStartGame}
                  className={`w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all ${
                    allGuestsReady
                      ? "btn-wf-primary text-primary-foreground shadow-xl active:scale-95 cursor-pointer animate-pulse"
                      : "bg-muted/60 text-muted-foreground border border-border/60 cursor-not-allowed opacity-70"
                  }`}
                >
                  <Swords className="h-5 w-5" />
                  {gameState.players.length < 2
                    ? "Đang Chờ Đối Thủ Vào Phòng... (1/2)"
                    : allGuestsReady
                    ? "Bắt Đầu Trận Đấu"
                    : "Chờ Đối Thủ Bấm Sẵn Sàng... ⏳"}
                </button>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleReady(!myPlayer?.isReady)}
                    className={`w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                      myPlayer?.isReady
                        ? "bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 border-2 border-rose-500/40"
                        : "btn-wf-primary text-primary-foreground shadow-xl animate-bounce"
                    }`}
                  >
                    {myPlayer?.isReady ? (
                      <>
                        <RotateCcw className="h-5 w-5" /> Hủy Sẵn Sàng
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 fill-current" /> Sẵn Sàng
                      </>
                    )}
                  </button>
                  {myPlayer?.isReady && (
                    <p className="text-center text-xs font-bold text-emerald-600">
                      ✓ Bạn đã sẵn sàng! Đang chờ Chủ phòng bấm Bắt đầu...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : gameState.status === "RPS" ? (
          /* RPS PHASE */
          <div className="glass-card w-full rounded-[36px] p-6 sm:p-8 bg-background/80 backdrop-blur-xl border border-primary/20 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 text-center">
            <div className="px-4 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs font-black animate-pulse">
              PHÂN CHIA LƯỢT ĐI ĐẦU
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Chọn Búa, Kéo Hoặc Bao! ✊✌️🖐️
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {gameState.rpsState?.resultMessage || "Hãy chọn một biểu tượng để quyết định ai đi trước"}
              </p>
            </div>

            {/* 3 RPS Choice Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full py-2">
              <button
                type="button"
                onClick={() => handleChooseRPS("rock")}
                disabled={!!gameState.rpsState?.winnerId}
                className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer ${
                  selectedRps === "rock"
                    ? "bg-amber-500/20 border-amber-500 scale-105 shadow-xl ring-2 ring-amber-400"
                    : "bg-muted/40 border-border/80 hover:border-primary hover:bg-muted/60"
                }`}
              >
                <span className="text-4xl sm:text-5xl mb-2 select-none">✊</span>
                <span className="font-black text-xs sm:text-sm text-foreground">BÚA</span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">Đập Kéo</span>
              </button>

              <button
                type="button"
                onClick={() => handleChooseRPS("scissors")}
                disabled={!!gameState.rpsState?.winnerId}
                className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer ${
                  selectedRps === "scissors"
                    ? "bg-amber-500/20 border-amber-500 scale-105 shadow-xl ring-2 ring-amber-400"
                    : "bg-muted/40 border-border/80 hover:border-primary hover:bg-muted/60"
                }`}
              >
                <span className="text-4xl sm:text-5xl mb-2 select-none">✌️</span>
                <span className="font-black text-xs sm:text-sm text-foreground">KÉO</span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">Cắt Bao</span>
              </button>

              <button
                type="button"
                onClick={() => handleChooseRPS("paper")}
                disabled={!!gameState.rpsState?.winnerId}
                className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer ${
                  selectedRps === "paper"
                    ? "bg-amber-500/20 border-amber-500 scale-105 shadow-xl ring-2 ring-amber-400"
                    : "bg-muted/40 border-border/80 hover:border-primary hover:bg-muted/60"
                }`}
              >
                <span className="text-4xl sm:text-5xl mb-2 select-none">🖐️</span>
                <span className="font-black text-xs sm:text-sm text-foreground">BAO</span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">Bọc Búa</span>
              </button>
            </div>

            {/* Players choice status */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/50 w-full">
              {gameState.players.slice(0, 2).map((p) => {
                const hasChosen = !!gameState.rpsState?.playerChoices[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <div
                      className={`h-7 w-7 rounded-full bg-gradient-to-br ${p.avatarColor} text-white flex items-center justify-center font-black text-[10px] shadow-sm`}
                    >
                      {p.nickname[0]}
                    </div>
                    <span>{p.nickname}:</span>
                    <span className={hasChosen ? "text-emerald-500 font-black" : "text-amber-500 animate-pulse"}>
                      {hasChosen ? "✓ Đã chọn" : "Đang chọn..."}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ARENA BATTLE VIEW (MODERN GLASSMORPHIC & CLEAN) */
          <div className="w-full flex flex-col items-center gap-5">
            {/* CIRCULAR TIMER AT TOP CENTER */}
            <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-muted/40"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 * (1 - localTimeLeft / TURN_TIME_SEC)}
                  strokeLinecap="round"
                  fill="transparent"
                  className={`transition-all duration-500 ease-linear ${
                    localTimeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-primary"
                  }`}
                />
              </svg>
              <span
                className={`absolute text-2xl sm:text-3xl font-black ${
                  localTimeLeft <= 5 ? "text-rose-500 animate-bounce" : "text-foreground"
                }`}
              >
                {localTimeLeft}
              </span>
            </div>

            {/* WORD COUNT / PREVIOUS WORD PILL */}
            <div className="flex items-center justify-between w-full max-w-xl px-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground">
                <span>ĐÃ NỐI</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-black">
                  {Math.max(0, gameState.wordChain.length - 1)}
                </span>
              </div>

              {prevItem && (
                <div className="rounded-full bg-muted/60 border border-border/80 px-3.5 py-0.5 text-xs font-black text-muted-foreground shadow-sm select-none">
                  {prevItem.word}
                </div>
              )}
            </div>

            {/* MAIN FOCUS ARENA CARD */}
            <div className="glass-card w-full rounded-[36px] p-6 sm:p-8 bg-background/80 backdrop-blur-xl border border-primary/20 shadow-2xl flex flex-col items-center gap-6">
              {/* Inner Word Display Container */}
              <div className="w-full bg-muted/20 border border-primary/20 rounded-[28px] py-8 sm:py-12 px-6 flex flex-col items-center justify-center text-center shadow-inner min-h-[140px] sm:min-h-[170px]">
                <div className="text-4xl sm:text-6xl font-black text-foreground tracking-tight flex items-center justify-center flex-wrap gap-x-3">
                  {firstSyllables && <span>{firstSyllables}</span>}
                  <span className="relative inline-block text-primary">
                    {lastSyllable}
                    {/* Modern Wavy Underline */}
                    <svg
                      className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3 sm:h-4 text-primary opacity-80"
                      viewBox="0 0 100 20"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,10 Q12.5,2 25,10 T50,10 T75,10 T100,10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>

                {lastItem?.meaning && (
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-4 max-w-md line-clamp-2">
                    {lastItem.meaning}
                  </p>
                )}
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-black text-rose-600 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Word Input Form */}
              <form onSubmit={handleSubmitWord} className="flex items-center gap-2.5 w-full">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    disabled={!isMyTurn || gameState.status === "FINISHED"}
                    value={inputWord}
                    onChange={(e) => setInputWord(e.target.value)}
                    placeholder={
                      isMyTurn
                        ? `${lastSyllable} ... (nhập từ nối tiếp)`
                        : "Đang chờ đến lượt của đối thủ..."
                    }
                    className={`w-full h-14 sm:h-16 px-6 sm:px-8 rounded-full border-2 bg-background text-xl sm:text-2xl font-black text-foreground placeholder:text-muted-foreground/60 placeholder:text-base focus:outline-none transition-all shadow-md ${
                      isMyTurn
                        ? "border-primary ring-4 ring-primary/20"
                        : "border-border/80 opacity-60"
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isMyTurn || !inputWord.trim() || gameState.status === "FINISHED"}
                  className="btn-wf-primary h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full flex items-center justify-center text-primary-foreground font-black shadow-lg cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className="h-6 w-6 stroke-[2.5]" />
                </button>
              </form>
            </div>

            {/* BOTTOM PLAYERS AVATARS ROW */}
            <div className="flex items-end justify-between sm:justify-around w-full max-w-lg mx-auto pt-2 px-4">
              {/* Player 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${
                    p1?.avatarColor || "from-emerald-400 to-green-600"
                  } flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ${
                    isActiveP1 ? "ring-primary animate-pulse" : "ring-border/40"
                  }`}
                >
                  <span>{p1?.nickname[0] || "1"}</span>
                  {p1?.isHost && (
                    <span className="absolute -top-1.5 -right-1.5 text-base">👑</span>
                  )}
                </div>
                <span className="text-foreground font-black text-xs sm:text-sm tracking-wide">
                  {p1?.nickname}
                </span>

                {/* Active turn bouncing dots */}
                {isActiveP1 && gameState.status === "PLAYING" ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">{p1?.score || 0} điểm</span>
                )}
              </div>

              {/* Player 2 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${
                    p2?.avatarColor || "from-cyan-400 to-blue-600"
                  } flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ${
                    isActiveP2 ? "ring-primary animate-pulse" : "ring-border/40"
                  }`}
                >
                  <span>{p2?.nickname[0] || "2"}</span>
                  {p2?.isHost && (
                    <span className="absolute -top-1.5 -right-1.5 text-base">👑</span>
                  )}
                </div>
                <span className="text-foreground font-black text-xs sm:text-sm tracking-wide">
                  {p2?.nickname || "Đang chờ..."}
                </span>

                {/* Active turn bouncing dots */}
                {isActiveP2 && gameState.status === "PLAYING" ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {p2 ? `${p2.score || 0} điểm` : "Trống"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHAT FLOATING MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card w-full max-w-md bg-background/95 border border-primary/20 rounded-[32px] p-6 text-foreground shadow-2xl flex flex-col justify-between h-[420px]">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-black text-sm text-foreground">Chat Trong Phòng (#{roomId})</h3>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-xs font-black cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-primary">{msg.sender}</span>
                    <span className="text-muted-foreground opacity-60">{msg.time}</span>
                  </div>
                  <p className="text-foreground font-medium text-xs mt-0.5">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-border/50">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin nhanh..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="btn-wf-primary h-10 px-4 rounded-xl text-primary-foreground font-black text-xs flex items-center justify-center cursor-pointer shadow-sm"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SURRENDER CONFIRMATION MODAL */}
      {showSurrenderConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card max-w-sm w-full p-6 rounded-[32px] bg-background/95 border border-rose-500/30 text-foreground text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <Flag className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">Rời Phòng / Đầu Hàng?</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Nếu rời phòng, đối thủ sẽ được xử thắng trận đấu này ngay lập tức!
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSurrenderConfirm(false)}
                className="btn-wf-silver flex-1 h-11 rounded-2xl text-xs font-black cursor-pointer"
              >
                Ở Lại Chơi
              </button>
              <button
                type="button"
                onClick={handleSurrender}
                className="flex-1 h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md"
              >
                Xác Nhận Rời
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT MODAL WITH DUAL READY CONFIRMATION */}
      {gameState.status === "FINISHED" && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="glass-card max-w-md w-full p-8 rounded-[36px] bg-background/95 border border-primary/30 text-foreground text-center space-y-6 shadow-2xl">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 shadow-xl ring-4 ring-amber-400/30 animate-bounce">
              {isWinner ? <Trophy className="h-12 w-12" /> : <Flag className="h-12 w-12 text-rose-700" />}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-foreground">
                {isWinner ? "CHIẾN THẮNG! 🎉" : "THẤT BẠI! 💔"}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                {gameState.finishReason === "timeout"
                  ? isWinner
                    ? `Đối thủ (${gameState.loser?.nickname}) đã hết thời gian suy nghĩ!`
                    : "Bạn đã hết thời gian nối từ!"
                  : gameState.finishReason === "surrender"
                  ? isWinner
                    ? `Đối thủ (${gameState.loser?.nickname}) đã xin đầu hàng!`
                    : "Bạn đã rời phòng thi đấu!"
                  : `Người chiến thắng: ${gameState.winner?.nickname}`}
              </p>
            </div>

            {isWinner && (
              <div className="space-y-2">
                {betCoins > 0 && (
                  <div className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 font-black text-base shadow-md animate-bounce">
                    <Coins className="h-5 w-5 fill-amber-500" />
                    <span>+{(betCoins * 2).toLocaleString("vi-VN")} Xu Vàng (Thắng Cược)</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-black text-sm">
                  <Gem className="h-5 w-5 text-emerald-500" />
                  <span>+20 💎 Kim Cương Khích Lệ</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleRematchReady}
                className={`w-full h-12 rounded-2xl font-black text-sm shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all ${
                  hasRematchReady
                    ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 animate-pulse"
                    : "btn-wf-primary text-primary-foreground"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                {hasRematchReady
                  ? "Đã Sẵn Sàng! Đang chờ đối thủ... (1/2) ⏳"
                  : "Sẵn Sàng Chơi Tiếp ⚔️"}
              </button>
              <Link
                href="/"
                onClick={() => sounds.playClick()}
                className="btn-wf-silver w-full h-11 rounded-2xl font-black text-foreground flex items-center justify-center text-xs cursor-pointer"
              >
                ← Quay Về Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
