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
  Clock,
  Lock,
  LogIn,
  Flag,
  RotateCcw,
  Gem,
  Swords,
  Link as LinkIcon,
  LogOut,
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

  const { profile, addGems, isLoggedIn, openModal } = useGame();

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
    loser: null,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "Hệ Thống", text: `Đã kết nối phòng #${roomId}. Chúc các bạn đấu từ vui vẻ!`, time: "14:00" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [showChatModal, setShowChatModal] = useState(false);
  const [inputWord, setInputWord] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(TURN_TIME_SEC);
  const [selectedRps, setSelectedRps] = useState<RPSChoice | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
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

  // Handle Win reward & fanfare
  useEffect(() => {
    if (gameState.status === "FINISHED") {
      if (gameState.winner?.id === profile.id) {
        sounds.playFanfare();
        if (!rewardClaimed) {
          addGems(20);
          setRewardClaimed(true);
        }
      } else {
        sounds.playWrong();
      }
    } else {
      setRewardClaimed(false);
      setSelectedRps(null);
    }
  }, [gameState.status, gameState.winner?.id, profile.id, rewardClaimed, addGems]);

  // Focus input on player turn
  useEffect(() => {
    if (gameState.status === "PLAYING") {
      const activeP = gameState.players[gameState.activePlayerIndex];
      if (activeP?.id === profile.id) {
        inputRef.current?.focus();
      }
    }
  }, [gameState.status, gameState.activePlayerIndex, gameState.players, profile.id]);

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

  const handleRestart = () => {
    sounds.playCorrect();
    serviceRef.current?.restartGame();
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

  const lastItem = gameState.wordChain[gameState.wordChain.length - 1];
  const prevItem = gameState.wordChain.length >= 2 ? gameState.wordChain[gameState.wordChain.length - 2] : null;

  // Split last word into base syllable and chainable syllable
  const lastWordParts = lastItem ? lastItem.word.trim().split(/\s+/) : ["học", "sinh"];
  const firstSyllables = lastWordParts.slice(0, -1).join(" ");
  const lastSyllable = lastWordParts[lastWordParts.length - 1] || "";

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const isActiveP1 = activePlayer?.id === p1?.id;
  const isActiveP2 = activePlayer?.id === p2?.id;

  const isWinner = gameState.winner?.id === profile.id;

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
    <div className="relative min-h-[calc(100dvh-76px)] bg-[#4a7263] text-white flex flex-col justify-between py-4 px-3 sm:px-6 select-none overflow-hidden font-sans">
      {/* Background Blackboard Doodles */}
      <div className="absolute inset-0 pointer-events-none opacity-10 text-white flex flex-wrap justify-around items-center p-12 text-7xl font-black tracking-widest select-none">
        <span>Ư</span>
        <span>A</span>
        <span>?</span>
        <span>!</span>
        <span>✿</span>
        <span>Ô</span>
        <span>B</span>
        <span>☆</span>
      </div>

      {/* TOP PILL HEADER */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between px-5 sm:px-7 py-3 rounded-full bg-[#fffef7] border-[3px] border-black shadow-[0_4px_0_0_rgba(0,0,0,0.85)] text-black">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#34d399] border-2 border-black text-black">
              <LinkIcon className="h-5 w-5" />
            </div>
            <span className="font-black text-base sm:text-xl tracking-tight text-black">
              Nối Từ Online
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChatModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 border-2 border-black text-xs font-black text-black transition-colors cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat ({chatMessages.length})</span>
            </button>
            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 border-2 border-black text-xs font-black text-black">
              <Users className="h-4 w-4" />
              <span>{gameState.players.length}</span>
            </div>
          </div>
        </div>

        {/* SUB-HEADER CONTROLS */}
        <div className="flex items-center justify-between mt-3 px-2">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-xs font-bold text-white shadow-sm">
            <LinkIcon className="h-3.5 w-3.5 opacity-80" />
            <span>Phòng #{roomId}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSurrenderConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#f87171] hover:bg-[#ef4444] text-black font-black text-xs border-2 border-black shadow-[0_3px_0_0_#991b1b] cursor-pointer transition-all active:translate-y-0.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Rời phòng</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#60a5fa] hover:bg-[#3b82f6] text-black font-black text-xs border-2 border-black shadow-[0_3px_0_0_#1d4ed8] cursor-pointer transition-all active:translate-y-0.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Đã chép!" : "Copy link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN ARENA BODY */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto py-4 w-full max-w-4xl mx-auto gap-4">
        {gameState.status === "WAITING" ? (
          /* LOBBY WAITING SCREEN */
          <div className="w-full max-w-xl bg-[#fffef7] border-[3.5px] border-black rounded-[36px] p-6 sm:p-8 text-black shadow-[0_8px_0_0_rgba(0,0,0,0.85)] flex flex-col items-center gap-5 animate-in zoom-in-95">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border-2 border-black text-xs font-black text-amber-800">
              <Sparkles className="h-4 w-4" />
              <span>PHÒNG CHỜ THI ĐẤU</span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Sẵn Sàng Thách Đấu!
              </h2>
              <p className="text-xs text-gray-500 font-bold">
                Mời bạn bè cùng vào phòng bằng mã <b>#{roomId}</b> hoặc bấm Copy Link ở góc trên
              </p>
            </div>

            {/* Players cards */}
            <div className="grid grid-cols-2 gap-3 w-full my-2">
              {gameState.players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-white border-2 border-black shadow-sm"
                >
                  <div
                    className={`h-12 w-12 rounded-full border-2 border-black bg-gradient-to-br ${p.avatarColor} text-white flex items-center justify-center text-xl font-black`}
                  >
                    {p.nickname[0]}
                  </div>
                  <div className="text-center">
                    <p className="font-black text-xs text-black truncate max-w-[120px]">{p.nickname}</p>
                    <span className="text-[10px] font-bold text-emerald-600">✓ Sẵn sàng</span>
                  </div>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full h-14 rounded-full bg-[#34d399] hover:bg-[#10b981] active:translate-y-1 active:shadow-none border-[3px] border-black text-black font-black text-base shadow-[0_5px_0_0_rgba(0,0,0,0.85)] cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <Play className="h-5 w-5 fill-current" /> Bắt Đầu Trận Đấu
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-gray-100 border-2 border-black/30 text-center text-xs font-bold text-gray-600 w-full">
                ⏳ Đang chờ chủ phòng bắt đầu trận đấu...
              </div>
            )}
          </div>
        ) : gameState.status === "RPS" ? (
          /* RPS PHASE (PHÂN CHIA LƯỢT ĐI ĐẦU) */
          <div className="w-full max-w-xl bg-[#fffef7] border-[3.5px] border-black rounded-[36px] p-6 sm:p-8 text-black shadow-[0_8px_0_0_rgba(0,0,0,0.85)] flex flex-col items-center gap-5 animate-in zoom-in-95 text-center">
            <div className="px-4 py-1 rounded-full bg-amber-200 border-2 border-black text-xs font-black text-black animate-pulse">
              PHÂN CHIA LƯỢT ĐI ĐẦU
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Chọn Búa, Kéo Hoặc Bao! ✊✌️🖐️
              </h2>
              <p className="text-xs font-bold text-gray-500">
                {gameState.rpsState?.resultMessage || "Hãy chọn một biểu tượng để quyết định ai đi trước"}
              </p>
            </div>

            {/* 3 RPS Choice Buttons */}
            <div className="grid grid-cols-3 gap-3 w-full py-2">
              <button
                type="button"
                onClick={() => handleChooseRPS("rock")}
                disabled={!!gameState.rpsState?.winnerId}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-[2.5px] border-black transition-all transform active:scale-95 cursor-pointer ${
                  selectedRps === "rock"
                    ? "bg-amber-300 scale-105 shadow-[0_4px_0_0_rgba(0,0,0,0.9)]"
                    : "bg-white hover:bg-amber-50 shadow-[0_3px_0_0_rgba(0,0,0,0.7)]"
                }`}
              >
                <span className="text-4xl mb-1 select-none">✊</span>
                <span className="font-black text-xs text-black">BÚA</span>
              </button>

              <button
                type="button"
                onClick={() => handleChooseRPS("scissors")}
                disabled={!!gameState.rpsState?.winnerId}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-[2.5px] border-black transition-all transform active:scale-95 cursor-pointer ${
                  selectedRps === "scissors"
                    ? "bg-amber-300 scale-105 shadow-[0_4px_0_0_rgba(0,0,0,0.9)]"
                    : "bg-white hover:bg-amber-50 shadow-[0_3px_0_0_rgba(0,0,0,0.7)]"
                }`}
              >
                <span className="text-4xl mb-1 select-none">✌️</span>
                <span className="font-black text-xs text-black">KÉO</span>
              </button>

              <button
                type="button"
                onClick={() => handleChooseRPS("paper")}
                disabled={!!gameState.rpsState?.winnerId}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-[2.5px] border-black transition-all transform active:scale-95 cursor-pointer ${
                  selectedRps === "paper"
                    ? "bg-amber-300 scale-105 shadow-[0_4px_0_0_rgba(0,0,0,0.9)]"
                    : "bg-white hover:bg-amber-50 shadow-[0_3px_0_0_rgba(0,0,0,0.7)]"
                }`}
              >
                <span className="text-4xl mb-1 select-none">🖐️</span>
                <span className="font-black text-xs text-black">BAO</span>
              </button>
            </div>

            {/* Players choice status */}
            <div className="flex items-center justify-center gap-6 pt-2 border-t-2 border-black/10 w-full">
              {gameState.players.slice(0, 2).map((p) => {
                const hasChosen = !!gameState.rpsState?.playerChoices[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs font-bold text-black">
                    <span className="font-black">{p.nickname}:</span>
                    <span className={hasChosen ? "text-emerald-600 font-black" : "text-amber-600 animate-pulse"}>
                      {hasChosen ? "✓ Đã chọn" : "Đang chọn..."}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ICONIC BATTLE ARENA */
          <div className="w-full flex flex-col items-center gap-4">
            {/* CIRCULAR TIMER AT TOP CENTER */}
            <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="rgba(0,0,0,0.25)"
                  strokeWidth="7"
                  fill="rgba(0,0,0,0.15)"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke={localTimeLeft <= 5 ? "#ef4444" : "#f87171"}
                  strokeWidth="7"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 * (1 - localTimeLeft / TURN_TIME_SEC)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 ease-linear"
                />
              </svg>
              <span
                className={`absolute text-2xl sm:text-3xl font-black ${
                  localTimeLeft <= 5 ? "text-rose-300 animate-bounce" : "text-rose-300"
                }`}
              >
                {localTimeLeft}
              </span>
            </div>

            {/* WORD COUNT / PREVIOUS WORD PILL */}
            <div className="flex items-center justify-between w-full max-w-xl px-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-white">
                <span>ĐÃ NỐI</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 border-2 border-black text-black text-xs font-black">
                  {Math.max(0, gameState.wordChain.length - 1)}
                </span>
              </div>

              {prevItem && (
                <div className="rounded-full bg-[#fffef7] border-2 border-black/80 px-3.5 py-0.5 text-xs font-black text-black shadow-sm select-none">
                  {prevItem.word}
                </div>
              )}
            </div>

            {/* MAIN WHITE/CREAM ARENA CARD */}
            <div className="w-full max-w-2xl bg-[#fffef7] border-[3.5px] border-black rounded-[36px] p-5 sm:p-8 text-black shadow-[0_8px_0_0_rgba(0,0,0,0.85)] flex flex-col items-center gap-5">
              {/* Inner Word Display Container */}
              <div className="w-full bg-[#fffef7] border-[2.5px] border-black/80 rounded-[28px] py-8 sm:py-12 px-6 flex flex-col items-center justify-center text-center shadow-inner min-h-[140px] sm:min-h-[170px]">
                <div className="text-4xl sm:text-6xl font-black text-[#1a1a1a] tracking-tight flex items-center justify-center flex-wrap gap-x-3">
                  {firstSyllables && <span>{firstSyllables}</span>}
                  <span className="relative inline-block text-black">
                    {lastSyllable}
                    {/* Wavy Underline */}
                    <svg
                      className="absolute -bottom-2.5 sm:-bottom-3.5 left-0 w-full h-3 sm:h-4 text-[#5eead4]"
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
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mt-4 max-w-md line-clamp-2">
                    {lastItem.meaning}
                  </p>
                )}
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-100 border-2 border-rose-500 text-xs font-black text-rose-700 animate-shake">
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
                        ? `${lastSyllable} ...`
                        : "Đang chờ đến lượt của đối thủ..."
                    }
                    className="w-full h-14 sm:h-16 px-6 sm:px-8 rounded-full border-[3px] border-black bg-[#fffef7] text-xl sm:text-2xl font-black text-black placeholder:text-gray-400 placeholder:text-base focus:outline-none focus:ring-4 focus:ring-emerald-400/40 shadow-[0_4px_0_0_rgba(0,0,0,0.85)] disabled:opacity-50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isMyTurn || !inputWord.trim() || gameState.status === "FINISHED"}
                  className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-[#6ee7b7] hover:bg-[#34d399] active:translate-y-1 active:shadow-none border-[3px] border-black flex items-center justify-center text-black font-black shadow-[0_4px_0_0_rgba(0,0,0,0.9)] cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className="h-6 w-6 stroke-[2.5]" />
                </button>
              </form>
            </div>

            {/* BOTTOM PLAYERS AVATARS ROW */}
            <div className="flex items-end justify-between sm:justify-around w-full max-w-lg mx-auto pt-3 px-4">
              {/* Player 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-black bg-gradient-to-br ${
                    p1?.avatarColor || "from-amber-400 to-orange-500"
                  } flex items-center justify-center text-white text-2xl font-black shadow-[0_4px_0_0_rgba(0,0,0,0.8)]`}
                >
                  <span className="select-none text-2xl sm:text-3xl">👦</span>
                  {p1?.isHost && (
                    <span className="absolute -top-1 -right-1 text-base">👑</span>
                  )}
                </div>
                <span className="text-white font-black text-xs sm:text-sm tracking-wide drop-shadow-md">
                  {p1?.nickname}
                </span>

                {/* Active turn bouncing dots */}
                {isActiveP1 && gameState.status === "PLAYING" ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-white/70">{p1?.score || 0} điểm</span>
                )}
              </div>

              {/* Player 2 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-black bg-gradient-to-br ${
                    p2?.avatarColor || "from-cyan-400 to-blue-600"
                  } flex items-center justify-center text-white text-2xl font-black shadow-[0_4px_0_0_rgba(0,0,0,0.8)]`}
                >
                  <span className="select-none text-2xl sm:text-3xl">👧</span>
                  {p2?.isHost && (
                    <span className="absolute -top-1 -right-1 text-base">👑</span>
                  )}
                </div>
                <span className="text-white font-black text-xs sm:text-sm tracking-wide drop-shadow-md">
                  {p2?.nickname || "Đang chờ..."}
                </span>

                {/* Active turn bouncing dots */}
                {isActiveP2 && gameState.status === "PLAYING" ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-white/70">
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
          <div className="w-full max-w-md bg-[#fffef7] border-[3.5px] border-black rounded-[32px] p-6 text-black shadow-2xl flex flex-col justify-between h-[420px]">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-sm text-black">Chat Trong Phòng (#{roomId})</h3>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="h-8 w-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-black hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="wordfight-scrollbar flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-gray-100 border border-black/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-emerald-700">{msg.sender}</span>
                    <span className="text-gray-400">{msg.time}</span>
                  </div>
                  <p className="text-black font-medium text-xs mt-0.5">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t-2 border-black/10">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin nhanh..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black focus:outline-none"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-[#6ee7b7] border-2 border-black text-black font-black text-xs flex items-center justify-center cursor-pointer shadow-sm"
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
          <div className="max-w-sm w-full p-6 rounded-[32px] bg-[#fffef7] border-[3.5px] border-black text-black text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 border-2 border-black text-rose-600">
              <Flag className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-black">Rời Phòng / Đầu Hàng?</h3>
              <p className="text-xs text-gray-600 font-bold">
                Nếu rời phòng, đối thủ sẽ được xử thắng trận đấu này ngay lập tức!
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSurrenderConfirm(false)}
                className="flex-1 h-11 rounded-2xl border-2 border-black bg-white hover:bg-gray-100 text-xs font-black cursor-pointer text-black"
              >
                Ở Lại Chơi
              </button>
              <button
                type="button"
                onClick={handleSurrender}
                className="flex-1 h-11 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs border-2 border-black shadow-[0_3px_0_0_rgba(0,0,0,0.8)] cursor-pointer"
              >
                Xác Nhận Rời
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT MODAL */}
      {gameState.status === "FINISHED" && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="max-w-md w-full p-8 rounded-[36px] bg-[#fffef7] border-[4px] border-black text-black text-center space-y-6 shadow-2xl">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-[3px] border-black text-amber-900 shadow-xl ring-4 ring-amber-400/30 animate-bounce">
              {isWinner ? <Trophy className="h-12 w-12" /> : <Flag className="h-12 w-12 text-rose-700" />}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-black">
                {isWinner ? "CHIẾN THẮNG! 🎉" : "THẤT BẠI! 💔"}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-gray-600">
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
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-100 border-2 border-black text-emerald-800 font-black text-sm">
                <Gem className="h-5 w-5 text-emerald-600" />
                <span>+20 💎 Kim Cương Khích Lệ</span>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full h-12 rounded-2xl bg-[#34d399] hover:bg-[#10b981] active:translate-y-1 active:shadow-none border-[3px] border-black text-black font-black text-sm shadow-[0_4px_0_0_rgba(0,0,0,0.85)] cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="h-4 w-4" /> Chơi Lại Ván Mới
              </button>
              <Link
                href="/"
                onClick={() => sounds.playClick()}
                className="w-full h-11 rounded-2xl bg-white hover:bg-gray-100 border-2 border-black text-black font-black text-xs flex items-center justify-center cursor-pointer"
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
