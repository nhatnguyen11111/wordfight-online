"use client";

import React from "react";
import { X, Settings, Volume2, VolumeX, Moon, Sun, BookOpen, Globe } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";

export function SettingsModal() {
  const { soundEnabled, setSoundEnabled, isDarkMode, setIsDarkMode, activeModal, openModal, closeModal } = useGame();

  if (activeModal !== "settings") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-foreground" />
            <h2 className="text-xl font-black text-foreground">Cài Đặt</h2>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="mt-5 space-y-3">
          {/* Sound toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-bold text-foreground">Âm thanh (SFX)</p>
                <p className="text-[11px] text-muted-foreground">Hiệu ứng click, đúng, sai, thắng</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) sounds.playClick();
              }}
              className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer ${
                soundEnabled ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
              <div>
                <p className="text-sm font-bold text-foreground">Giao diện (Theme)</p>
                <p className="text-[11px] text-muted-foreground">{isDarkMode ? "Chế độ Tối (Dark)" : "Chế độ Sáng (Light)"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                sounds.playClick();
              }}
              className={`h-7 w-12 rounded-full p-1 transition-colors cursor-pointer ${
                isDarkMode ? "bg-indigo-500" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  isDarkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* View Rules */}
          <button
            type="button"
            onClick={() => openModal("rules")}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60 hover:border-primary/40 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">Luật Chơi & Hướng Dẫn</p>
                <p className="text-[11px] text-muted-foreground">Xem cách chơi nối từ & Vua Tiếng Việt</p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary">Xem</span>
          </button>

          {/* Language display */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-bold text-foreground">Ngôn ngữ giao diện</p>
                <p className="text-[11px] text-muted-foreground">Tiếng Việt (Mặc định)</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              VI
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Word Fight Clone • Version 1.0.0
        </p>
      </div>
    </div>
  );
}
