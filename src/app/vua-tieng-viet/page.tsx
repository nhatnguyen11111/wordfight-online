"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Play, Lock, Star, Sparkles, Shuffle, RotateCcw, Check, Gem, HelpCircle, LogIn } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { VUA_TIENG_VIET_LEVELS, VuaLevel } from "@/lib/dictionary/vua-tieng-viet-levels";
import { sounds } from "@/lib/sound-effects";

export default function VuaTiengVietPage() {
  const { vuaLevels, completeVuaLevel, isLoggedIn, openModal } = useGame();
  const [activeLevel, setActiveLevel] = useState<VuaLevel | null>(null);

  // Puzzle state for active level
  const [scrambledTiles, setScrambledTiles] = useState<{ id: number; char: string; used: boolean }[]>([]);
  const [selectedChars, setSelectedChars] = useState<{ tileId: number; char: string }[]>([]);
  const [showWinModal, setShowWinModal] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Setup puzzle when active level changes
  const startLevel = useCallback((level: VuaLevel) => {
    setActiveLevel(level);
    setShowWinModal(false);
    setIsWrong(false);
    setShowHint(false);

    // Extract characters (omit space)
    const target = level.word.replace(/\s+/g, "");
    const chars = target.split("");

    // Shuffle characters
    const shuffled = [...chars].sort(() => Math.random() - 0.5);
    setScrambledTiles(shuffled.map((char, i) => ({ id: i, char, used: false })));
    setSelectedChars([]);
    sounds.playClick();
  }, []);

  const handleTileClick = (tileId: number, char: string) => {
    sounds.playClick();
    setScrambledTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, used: true } : t))
    );
    setSelectedChars((prev) => [...prev, { tileId, char }]);
  };

  const handleRemoveChar = (index: number) => {
    sounds.playClick();
    const item = selectedChars[index];
    if (!item) return;

    setScrambledTiles((prev) =>
      prev.map((t) => (t.id === item.tileId ? { ...t, used: false } : t))
    );
    setSelectedChars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShuffle = () => {
    sounds.playClick();
    setScrambledTiles((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleReset = () => {
    sounds.playClick();
    setScrambledTiles((prev) => prev.map((t) => ({ ...t, used: false })));
    setSelectedChars([]);
    setIsWrong(false);
  };

  const handleCheckAnswer = () => {
    if (!activeLevel) return;
    const currentWord = selectedChars.map((c) => c.char).join("");
    const targetWord = activeLevel.word.replace(/\s+/g, "");

    if (currentWord.toUpperCase() === targetWord.toUpperCase()) {
      // WIN!
      sounds.playFanfare();
      completeVuaLevel(activeLevel.id, 3, 100);
      setShowWinModal(true);
    } else {
      // WRONG!
      sounds.playWrong();
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 800);
    }
  };

  const handleNextLevel = () => {
    if (!activeLevel) return;
    const nextLvl = VUA_TIENG_VIET_LEVELS.find((lvl) => lvl.id === activeLevel.id + 1);
    if (nextLvl) {
      startLevel(nextLvl);
    } else {
      setActiveLevel(null);
    }
  };

  const completedCount = Object.values(vuaLevels).filter((l) => l.completed).length;
  const progressPercent = Math.min(100, Math.round((completedCount / VUA_TIENG_VIET_LEVELS.length) * 100));

  // Find latest unlocked level
  const latestUnlockedId = Math.max(1, ...Object.keys(vuaLevels).map(Number));

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-[calc(100dvh-76px)] pt-24 pb-8 px-4 flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 rounded-[32px] bg-background/90 backdrop-blur-xl border border-primary/20 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-inner">
            <Lock className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Yêu Cầu Đăng Nhập</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn cần đăng nhập tài khoản để tham gia thử thách Vua Tiếng Việt, chinh phục 30 Level và lưu điểm số!
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
    <div className="relative min-h-[calc(100dvh-76px)] pt-20 md:pt-24 pb-8 px-4 sm:px-8 max-w-6xl mx-auto flex flex-col gap-5">
      {/* Top Navigation Bar */}
      <div className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3.5 rounded-[28px] bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => sounds.playClick()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600">
              <Crown className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Vua Tiếng Việt</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Sắp xếp chữ cái đoán từ</p>
            </div>
          </div>
        </div>

        {/* Progress Bar & Continue button */}
        <div className="flex items-center gap-4 flex-1 md:max-w-md justify-end">
          <div className="flex items-center gap-2 flex-1 max-w-[240px]">
            <div className="relative h-3.5 flex-1 overflow-hidden rounded-full border border-primary/20 bg-muted shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500"
                style={{ width: `${progressPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-amber-900">
                {progressPercent}%
              </span>
            </div>
            <span className="text-xs font-black text-muted-foreground shrink-0">
              {completedCount}/{VUA_TIENG_VIET_LEVELS.length} level
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const target = VUA_TIENG_VIET_LEVELS.find((l) => l.id === latestUnlockedId) || VUA_TIENG_VIET_LEVELS[0];
              startLevel(target);
            }}
            className="btn-wf-primary hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-black text-primary-foreground cursor-pointer shadow-sm"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Chơi tiếp (Màn {latestUnlockedId})</span>
          </button>
        </div>
      </div>

      {/* Main Content: Level Grid OR Interactive Gameplay */}
      {!activeLevel ? (
        /* LEVEL SELECTOR GRID */
        <div className="glass-card flex-1 rounded-[32px] p-5 sm:p-6 bg-background/40 backdrop-blur-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {VUA_TIENG_VIET_LEVELS.map((level) => {
              const isUnlocked = !!vuaLevels[level.id];
              const isCompleted = vuaLevels[level.id]?.completed;
              const stars = vuaLevels[level.id]?.stars || 0;

              return (
                <button
                  key={level.id}
                  disabled={!isUnlocked}
                  onClick={() => startLevel(level)}
                  className={`group relative flex flex-col items-center justify-between p-4 rounded-[24px] border-2 transition-all duration-150 min-h-[130px] ${
                    isUnlocked
                      ? "bg-background/90 border-amber-400/40 hover:border-amber-400 hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                      : "bg-muted/30 border-border/40 opacity-60 cursor-not-allowed"
                  }`}
                >
                  {/* Gems reward top-right */}
                  <div className="w-full flex justify-between items-center text-[10px] font-black">
                    <span className="text-muted-foreground font-semibold">#{level.id}</span>
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      <Gem className="h-3 w-3 text-amber-500" /> +{level.gemsReward}
                    </span>
                  </div>

                  {/* Level title */}
                  <div className="my-auto text-center">
                    <p className={`text-base font-black ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      Màn {level.id}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground truncate max-w-[100px]">
                      {level.category}
                    </p>
                  </div>

                  {/* Stars rating or Lock icon */}
                  <div className="flex items-center gap-1">
                    {isUnlocked ? (
                      [1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= stars
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground/30"
                          }`}
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
        /* INTERACTIVE GAMEPLAY SCREEN */
        <div className="glass-card flex-1 rounded-[32px] p-6 sm:p-8 bg-background/60 backdrop-blur-md flex flex-col items-center justify-between gap-6 max-w-2xl mx-auto w-full">
          {/* Level Header */}
          <div className="w-full flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <span className="text-xs font-black text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Màn {activeLevel.id} • {activeLevel.category}
              </span>
            </div>
            <button
              onClick={() => setActiveLevel(null)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Quay lại danh sách màn
            </button>
          </div>

          {/* Hint Card */}
          <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Gợi Ý Của Màn Chơi
            </p>
            <p className="text-sm font-bold text-foreground">
              &quot;{activeLevel.hint}&quot;
            </p>
          </div>

          {/* Target Answer Slots */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-bold text-muted-foreground">Nhấp vào ô chữ để trả lời:</p>
            <div
              className={`flex flex-wrap items-center justify-center gap-2 min-h-[64px] p-3 rounded-2xl bg-muted/40 border-2 transition-all ${
                isWrong ? "border-red-500 animate-shake" : "border-border/60"
              }`}
            >
              {Array.from({ length: activeLevel.word.replace(/\s+/g, "").length }).map((_, idx) => {
                const item = selectedChars[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => item && handleRemoveChar(idx)}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-lg transition-transform ${
                      item
                        ? "btn-wf-primary text-primary-foreground cursor-pointer shadow-md hover:scale-105"
                        : "border-2 border-dashed border-border/80 bg-background/50 text-transparent"
                    }`}
                  >
                    {item?.char || ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrambled Character Tiles Pool */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg">
            {scrambledTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                disabled={tile.used}
                onClick={() => handleTileClick(tile.id, tile.char)}
                className={`flex h-13 w-13 items-center justify-center rounded-2xl font-black text-xl border-2 transition-all ${
                  tile.used
                    ? "opacity-20 border-border bg-muted cursor-not-allowed scale-90"
                    : "btn-wf-silver text-foreground border-amber-300/60 shadow-md hover:scale-110 active:scale-95 cursor-pointer"
                }`}
              >
                {tile.char}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex items-center justify-between gap-3 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffle}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Shuffle className="h-4 w-4" /> Trộn Lại
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Xóa Hết
              </button>
            </div>

            <button
              type="button"
              disabled={selectedChars.length !== activeLevel.word.replace(/\s+/g, "").length}
              onClick={handleCheckAnswer}
              className="btn-wf-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-primary-foreground disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md"
            >
              <Check className="h-4 w-4" /> Kiểm Tra
            </button>
          </div>
        </div>
      )}

      {/* Level Win Modal */}
      {showWinModal && activeLevel && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border-2 border-amber-400 bg-background/95 p-6 text-center shadow-2xl backdrop-blur-xl space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
              <Crown className="h-10 w-10 fill-amber-400 animate-bounce" />
            </div>

            <div>
              <p className="text-xl font-black text-foreground">XUẤT SẮC! 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bạn đã giải đúng từ: <strong className="text-primary font-black">{activeLevel.word}</strong>
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3].map((s) => (
                <Star key={s} className="h-7 w-7 fill-amber-400 text-amber-500" />
              ))}
            </div>

            {/* Rewards */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2">
              <Gem className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-black text-amber-600">+{activeLevel.gemsReward} Kim Cương</span>
            </div>

            {/* Next Button */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowWinModal(false);
                  setActiveLevel(null);
                }}
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
