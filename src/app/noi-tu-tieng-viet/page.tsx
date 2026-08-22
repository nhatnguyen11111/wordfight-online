"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Flag, Star, Gem, HelpCircle, Send, BookOpen, MessageSquare, Lock, Sparkles, RotateCcw, Trophy, AlertCircle, Lightbulb, Loader2 } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { VIETNAMESE_CHAIN_LEVELS, WordChainLevel } from "@/lib/dictionary/word-chain-levels";
import { GeminiAI } from "@/lib/gemini-ai";
import { SupabaseService } from "@/lib/supabase";
import { sounds } from "@/lib/sound-effects";

interface ChainMessage {
  id: string;
  word: string;
  meaning: string;
  sender: "player" | "bot";
}

export default function NoiTuTiengVietPage() {
  const { profile, viLevels, completeViLevel } = useGame();

  const [activeLevel, setActiveLevel] = useState<WordChainLevel | null>(null);

  // Gameplay state
  const [messages, setMessages] = useState<ChainMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"player" | "bot">("player");
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [playerInputSyllable, setPlayerInputSyllable] = useState<string>("");
  const [autoSubmit, setAutoSubmit] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputHasError, setInputHasError] = useState<boolean>(false);
  const [showHintBox, setShowHintBox] = useState<boolean>(false);
  const [hintText, setHintText] = useState<string>("");
  const [showSurrenderModal, setShowSurrenderModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [showDefeatModal, setShowDefeatModal] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const currentPrefix = lastMessage ? lastMessage.word.trim().split(/\s+/).slice(-1)[0] : "";

  const startLevel = useCallback((level: WordChainLevel) => {
    setActiveLevel(level);
    setShowVictoryModal(false);
    setShowDefeatModal(false);
    setShowSurrenderModal(false);
    setShowHintBox(false);
    setErrorMessage(null);
    setInputHasError(false);
    setPlayerInputSyllable("");
    setIsBotThinking(false);

    const initialMsg: ChainMessage = {
      id: "1",
      word: level.starterWord,
      meaning: level.starterMeaning,
      sender: "bot",
    };

    setMessages([initialMsg]);
    setCurrentTurn("player");
    setTimeLeft(level.timerSec);
    sounds.playClick();
  }, []);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotThinking]);

  // Turn timer countdown (Only triggers defeat when player's time hits 0)
  useEffect(() => {
    if (!activeLevel || showVictoryModal || showDefeatModal || showSurrenderModal) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (currentTurn === "player") {
            sounds.playWrong();
            setShowDefeatModal(true);
          }
          return 0;
        }

        if (prev <= 4) {
          sounds.playTick(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeLevel, currentTurn, showVictoryModal, showDefeatModal, showSurrenderModal]);

  const handleLevelWin = useCallback(() => {
    if (!activeLevel) return;
    sounds.playFanfare();
    setIsBotThinking(false);
    completeViLevel(activeLevel.id, 3, 100);
    setShowVictoryModal(true);
  }, [activeLevel, completeViLevel]);

  // Bot Turn Logic
  const triggerBotTurn = useCallback(
    async (prevWord: string, currentHistory: ChainMessage[], level: WordChainLevel) => {
      setCurrentTurn("bot");
      setTimeLeft(level.timerSec);
      setIsBotThinking(true);

      const usedWordsList = currentHistory.map((m) => m.word);
      const botRes = await GeminiAI.getAiWord("vi", prevWord, usedWordsList);

      setIsBotThinking(false);

      if (botRes) {
        sounds.playCorrect();
        const newMsg: ChainMessage = {
          id: String(Date.now()),
          word: botRes.word,
          meaning: botRes.meaning,
          sender: "bot",
        };

        const updatedHistory = [...currentHistory, newMsg];
        setMessages(updatedHistory);
        setCurrentTurn("player");
        setTimeLeft(level.timerSec);

        const syllables = botRes.word.split(/\s+/);
        SupabaseService.saveAiVocabulary({
          language: "vi",
          word: botRes.word,
          first_syllable: syllables[0],
          last_syllable: syllables[1] || "",
          meaning: botRes.meaning,
        });

        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    []
  );

  // Submit word logic: If invalid, keep timer running and allow player to re-enter
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeLevel || currentTurn !== "player" || isSubmitting) return;

    const typed = playerInputSyllable.trim().toLowerCase();
    if (!typed) return;

    let fullWord = "";
    if (typed.startsWith(currentPrefix.toLowerCase() + " ")) {
      fullWord = typed;
    } else {
      fullWord = `${currentPrefix} ${typed}`.trim();
    }

    setIsSubmitting(true);
    const usedWords = messages.map((m) => m.word);
    const evalResult = await GeminiAI.evaluateWord("vi", fullWord, lastMessage?.word || null, usedWords);

    if (!evalResult.valid) {
      sounds.playWrong();
      setInputHasError(true);
      setErrorMessage(`${evalResult.error || "Từ không có nghĩa hợp lý!"} (Bạn còn ${timeLeft}s để nhập lại)`);

      setTimeout(() => setInputHasError(false), 800);
      setIsSubmitting(false);

      // Re-focus and select text so user can immediately type another word
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return;
    }

    // Word is valid!
    sounds.playCorrect();
    setErrorMessage(null);
    setInputHasError(false);
    setPlayerInputSyllable("");
    setIsSubmitting(false);

    const newMsg: ChainMessage = {
      id: String(Date.now()),
      word: evalResult.normalizedWord,
      meaning: evalResult.meaning || "Từ tiếng Việt hợp lệ",
      sender: "player",
    };

    const newHistory = [...messages, newMsg];
    setMessages(newHistory);

    const syllables = evalResult.normalizedWord.split(/\s+/);
    SupabaseService.saveAiVocabulary({
      language: "vi",
      word: evalResult.normalizedWord,
      first_syllable: syllables[0],
      last_syllable: syllables[1] || "",
      meaning: evalResult.meaning || "",
    });

    const playerWordsCount = newHistory.filter((m) => m.sender === "player").length;
    if (playerWordsCount >= activeLevel.targetWords) {
      handleLevelWin();
    } else {
      triggerBotTurn(evalResult.normalizedWord, newHistory, activeLevel);
    }
  };

  const handleInputChange = (val: string) => {
    setPlayerInputSyllable(val);
    if (errorMessage) setErrorMessage(null);

    if (autoSubmit && val.trim().length >= 2 && !val.includes(" ")) {
      setTimeout(() => handleSubmit(), 150);
    }
  };

  const handleNextLevel = () => {
    if (!activeLevel) return;
    const nextLvl = VIETNAMESE_CHAIN_LEVELS.find((l) => l.id === activeLevel.id + 1);
    if (nextLvl) {
      startLevel(nextLvl);
    } else {
      setActiveLevel(null);
    }
  };

  const completedWords = messages.filter((m) => m.sender === "player").length;
  const targetWords = activeLevel?.targetWords || 3;
  const progressPercent = Math.min(100, Math.round((completedWords / targetWords) * 100));

  return (
    <div className="relative min-h-[calc(100dvh-76px)] pt-18 md:pt-22 pb-8 px-4 sm:px-8 max-w-3xl mx-auto flex flex-col justify-between">
      {!activeLevel ? (
        /* LEVEL SELECTION MAP */
        <div className="glass-card w-full rounded-[32px] p-6 bg-background/60 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                onClick={() => sounds.playClick()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black text-foreground">Nối Từ Tiếng Việt</h1>
                <p className="text-xs text-muted-foreground">Độ khó tăng dần qua từng màn đấu</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {VIETNAMESE_CHAIN_LEVELS.map((level) => {
              const isUnlocked = !!viLevels[level.id];
              const stars = viLevels[level.id]?.stars || 0;

              return (
                <button
                  key={level.id}
                  disabled={!isUnlocked}
                  onClick={() => startLevel(level)}
                  className={`group relative flex flex-col justify-between p-4 rounded-[26px] border-2 transition-all min-h-[145px] text-left ${
                    isUnlocked
                      ? "bg-background border-[#78c97d]/50 hover:border-[#67cf64] hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                      : "bg-muted/30 border-border/40 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black text-foreground">Màn {level.id}</span>
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black">
                      <Gem className="h-3 w-3 text-emerald-500" /> +{level.gemsReward}
                    </span>
                  </div>

                  <div className="my-2">
                    <p className="text-xs font-bold text-muted-foreground">{level.opponentName} ({level.targetWords} cặp)</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-black mt-0.5 truncate">
                      &quot;{level.starterWord}&quot;
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {isUnlocked ? (
                      [1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= stars ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"}`}
                        />
                      ))
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* EXACT LEVEL GAMEPLAY MATCHING SCREENSHOTS */
        <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
          {/* 1. Header Màn X */}
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => setActiveLevel(null)}
              className="flex items-center gap-1 text-sm font-bold text-foreground hover:opacity-80 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Thoát ra
            </button>

            <div className="text-center">
              <h2 className="text-base font-black text-foreground">Màn {activeLevel.id}</h2>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {[1, 2, 3].map((s) => (
                  <Star key={s} className="h-3.5 w-3.5 text-amber-400/50" />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSurrenderModal(true)}
              className="flex items-center gap-1 text-sm font-bold text-foreground hover:opacity-80 cursor-pointer"
            >
              <Flag className="h-4 w-4" /> Đầu hàng
            </button>
          </div>

          {/* 2. Progress Bar (X/3, X/5, X/7 từ 💎 %) */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-gray-900/90 border border-border/60 shadow-sm">
            <span className="text-xs font-black text-foreground shrink-0">
              {completedWords}/{targetWords} từ
            </span>

            <div className="flex items-center gap-1 text-xs font-black text-emerald-600 shrink-0">
              <Gem className="h-4 w-4 text-emerald-500" />
              <span>{completedWords * activeLevel.gemsReward}</span>
            </div>

            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted/60 shadow-inner">
              <div
                className="h-full rounded-full bg-[#7fe36a] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="text-xs font-black text-foreground shrink-0">{progressPercent}%</span>
          </div>

          {/* 3. VS Arena Header */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 rounded-2xl bg-white/90 dark:bg-gray-900/90 border border-border/60 shadow-sm">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${profile.avatarColor} text-white font-black text-base shadow-sm ring-2 ${
                  currentTurn === "player" ? "ring-[#7fe36a]" : "ring-transparent"
                }`}
              >
                {profile.nickname[0]}
              </div>
              <p className="text-xs font-bold text-foreground mt-1 max-w-[90px] truncate text-center">
                {profile.nickname}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center px-6">
              <span className={`text-4xl font-black tracking-tight ${timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
                {timeLeft}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${activeLevel.opponentAvatarColor} text-white font-black text-base shadow-sm ring-2 ${
                  currentTurn === "bot" ? "ring-[#7fe36a] animate-pulse" : "ring-transparent"
                }`}
              >
                {activeLevel.opponentName[0]}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-xs font-bold text-foreground max-w-[90px] truncate text-center">
                  {activeLevel.opponentName}
                </p>
                {isBotThinking && <Loader2 className="h-3 w-3 text-[#2e7d32] animate-spin" />}
              </div>
            </div>
          </div>

          {/* 4. Word Timeline Box with Thinking Bubble */}
          <div className="relative min-h-[260px] max-h-[360px] overflow-y-auto p-4 rounded-[28px] bg-white/95 dark:bg-gray-900/95 border border-border/60 shadow-sm space-y-3.5 wordfight-scrollbar">
            {messages.map((msg) => {
              const isPlayer = msg.sender === "player";
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isPlayer ? "justify-end" : "justify-start"}`}>
                  {!isPlayer && (
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${activeLevel.opponentAvatarColor} text-white font-bold text-xs shadow-sm`}
                    >
                      {activeLevel.opponentName[0]}
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] p-3.5 rounded-[22px] transition-all shadow-sm ${
                      isPlayer
                        ? "bg-[#7fe36a] text-black rounded-tr-none"
                        : "bg-muted/40 text-foreground border border-border/50 rounded-tl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black tracking-wide capitalize">{msg.word}</p>
                      <MessageSquare className="h-3.5 w-3.5 opacity-60" />
                    </div>

                    {msg.meaning && (
                      <p className={`text-xs mt-1 leading-relaxed ${isPlayer ? "text-black/80 font-medium" : "text-muted-foreground font-normal"}`}>
                        {msg.meaning}
                      </p>
                    )}
                  </div>

                  {isPlayer && (
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${profile.avatarColor} text-white font-bold text-xs shadow-sm`}
                    >
                      {profile.nickname[0]}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Thinking Animation Indicator */}
            {isBotThinking && (
              <div className="flex items-start gap-2.5 justify-start animate-in fade-in duration-150">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${activeLevel.opponentAvatarColor} text-white font-bold text-xs shadow-sm`}
                >
                  {activeLevel.opponentName[0]}
                </div>
                <div className="p-3.5 rounded-[22px] rounded-tl-none bg-muted/50 border border-border/60 text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <span>{activeLevel.opponentName} đang suy nghĩ</span>
                  <span className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2e7d32] dark:bg-[#7fe36a] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2e7d32] dark:bg-[#7fe36a] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2e7d32] dark:bg-[#7fe36a] animate-bounce" />
                  </span>
                </div>
              </div>
            )}

            <div ref={historyEndRef} />

            <div className="sticky bottom-0 flex justify-end pointer-events-none">
              <button
                type="button"
                onClick={() => setErrorMessage("Hãy nối một từ ghép 2 âm tiết bắt đầu bằng âm cuối của từ trước.")}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted cursor-pointer shadow-sm"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 5. Hint Bar Button */}
          <button
            type="button"
            onClick={async () => {
              if (showHintBox) {
                setShowHintBox(false);
              } else {
                setShowHintBox(true);
                setHintText("Đang phân tích...");
                const hints = await GeminiAI.getAiWord("vi", lastMessage?.word || null, messages.map((m) => m.word));
                if (hints) {
                  setHintText(`Gợi ý: ${hints.word} (${hints.meaning})`);
                } else {
                  setHintText("Không có gợi ý khả dụng.");
                }
              }
            }}
            className="w-full py-2.5 rounded-2xl bg-white/90 dark:bg-gray-900/90 border border-border/60 shadow-sm flex items-center justify-center gap-1.5 text-xs font-bold text-foreground hover:bg-white transition-colors cursor-pointer"
          >
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>Xem từ vựng gợi ý (Hint)</span>
          </button>

          {showHintBox && hintText && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 font-bold animate-in fade-in">
              💡 {hintText}
            </div>
          )}

          {/* Error Alert Bar with Retry Countdown */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border-2 border-rose-500/50 text-xs font-black text-rose-600 dark:text-rose-400 animate-shake shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 6. Input Control Row */}
          <div className="flex items-center justify-between text-xs px-1 font-bold text-muted-foreground">
            <span className="flex items-center gap-1">⌨️ Nhập từ của bạn bên dưới</span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span>Tự động gửi</span>
              <input
                type="checkbox"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
                className="toggle-checkbox h-4 w-7 rounded-full bg-muted cursor-pointer accent-[#7fe36a]"
              />
            </label>
          </div>

          {/* 7. Input Form with Fixed Prefix and Circular Send Button */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
            <div
              className={`relative flex-1 flex items-center h-14 px-4 rounded-[26px] border-2 bg-white dark:bg-gray-900 shadow-sm transition-all ${
                inputHasError
                  ? "border-rose-500 ring-2 ring-rose-500/30 animate-shake"
                  : "border-[#8fe879] focus-within:border-[#67cf64]"
              }`}
            >
              <BookOpen className="h-5 w-5 text-muted-foreground mr-2.5 shrink-0" />

              {currentPrefix && (
                <span className="text-base font-black text-[#2e7d32] dark:text-[#7fe36a] mr-1.5 select-none shrink-0">
                  {currentPrefix}
                </span>
              )}

              <input
                ref={inputRef}
                type="text"
                disabled={currentTurn !== "player" || isSubmitting}
                value={playerInputSyllable}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={currentPrefix ? "..." : "Nhập từ..."}
                className="flex-1 bg-transparent font-black text-base text-foreground focus:outline-none border-b-2 border-foreground/30 focus:border-foreground"
              />

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-black text-foreground shrink-0 ml-2">
                <span>⏱️ {timeLeft}s</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={currentTurn !== "player" || !playerInputSyllable.trim() || isSubmitting}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7fe36a] hover:bg-[#6ed958] active:scale-95 text-black font-black shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isSubmitting ? <Sparkles className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 fill-black" />}
            </button>
          </form>
        </div>
      )}

      {/* Surrender Modal */}
      {showSurrenderModal && activeLevel && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[32px] bg-background p-6 text-center shadow-2xl border border-border space-y-4">
            <Flag className="h-12 w-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-black text-foreground">Bạn muốn đầu hàng?</h3>
            <p className="text-xs text-muted-foreground">Bạn sẽ bị tính là thua cuộc ở Màn {activeLevel.id}.</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSurrenderModal(false)}
                className="btn-wf-silver flex-1 h-11 rounded-2xl text-xs font-bold text-foreground cursor-pointer"
              >
                Tiếp tục chơi
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSurrenderModal(false);
                  setShowDefeatModal(true);
                  sounds.playWrong();
                }}
                className="flex-1 h-11 rounded-2xl bg-rose-500 text-white font-black text-xs cursor-pointer hover:bg-rose-600"
              >
                Đầu hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defeat Modal (Chỉ xuất hiện khi hết thời gian hoặc đầu hàng) */}
      {showDefeatModal && activeLevel && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95">
          <div className="relative w-full max-w-sm rounded-[32px] bg-background/95 p-6 text-center shadow-2xl border-2 border-rose-500 space-y-4">
            <AlertCircle className="h-14 w-14 text-rose-500 mx-auto animate-pulse" />
            <h3 className="text-xl font-black text-foreground">HẾT GIỜ! 😢</h3>
            <p className="text-xs text-muted-foreground">Bạn chưa hoàn thành {activeLevel.targetWords} cặp từ của Màn {activeLevel.id}.</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveLevel(null)}
                className="btn-wf-silver flex-1 h-11 rounded-2xl text-xs font-bold text-foreground cursor-pointer"
              >
                Danh Sách Màn
              </button>
              <button
                type="button"
                onClick={() => startLevel(activeLevel)}
                className="btn-wf-primary flex-1 h-11 rounded-2xl text-xs font-black text-primary-foreground flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <RotateCcw className="h-4 w-4" /> Thử Lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {showVictoryModal && activeLevel && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95">
          <div className="relative w-full max-w-sm rounded-[32px] bg-background/95 p-6 text-center shadow-2xl border-2 border-[#7fe36a] space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <Trophy className="h-8 w-8 animate-bounce text-amber-500" />
            </div>

            <div>
              <h3 className="text-xl font-black text-foreground">HOÀN THÀNH MÀN {activeLevel.id}! 🎉</h3>
              <p className="text-xs text-muted-foreground mt-1">Xuất sắc nối đủ {activeLevel.targetWords} cặp từ vựng!</p>
            </div>

            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3].map((s) => (
                <Star key={s} className="h-7 w-7 fill-amber-400 text-amber-500" />
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2">
              <Gem className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-black text-emerald-600">+{activeLevel.gemsReward * 2} Kim Cương</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveLevel(null)}
                className="btn-wf-silver flex-1 h-11 rounded-2xl text-xs font-bold text-foreground cursor-pointer"
              >
                Danh Sách Màn
              </button>
              <button
                type="button"
                onClick={handleNextLevel}
                className="btn-wf-primary flex-1 h-11 rounded-2xl text-xs font-black text-primary-foreground cursor-pointer shadow-md"
              >
                Màn Tiếp Theo ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
