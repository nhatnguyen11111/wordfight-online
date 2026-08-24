"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Crown, Plus, Lock, Sparkles, Swords, Zap, Coins } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { FooterSEO } from "@/components/footer-seo";
import { sounds } from "@/lib/sound-effects";
import { RoomRegistry, RoomInfo, ROOM_COLOR_THEMES } from "@/lib/room-registry";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  const { vuaLevels, viLevels, enLevels, isLoggedIn, openModal } = useGame();
  const router = useRouter();
  const [activeRooms, setActiveRooms] = React.useState<RoomInfo[]>([]);

  React.useEffect(() => {
    const unsub = RoomRegistry.subscribeToRooms((rooms) => {
      setActiveRooms(rooms);
    });
    return () => {
      unsub();
    };
  }, []);

  // 1. Vua Tiếng Việt percentage (30 levels)
  const completedVuaCount = Object.values(vuaLevels || {}).filter((lvl) => lvl.completed).length;
  const vuaPercent = Math.min(100, Math.round((completedVuaCount / 30) * 100));

  // 2. Nối từ Tiếng Việt percentage (10 levels)
  const completedViCount = Object.values(viLevels || {}).filter((lvl) => lvl.completed).length;
  const viPercent = Math.min(100, Math.round((completedViCount / 10) * 100));

  // 3. Nối từ Tiếng Anh percentage (10 levels)
  const completedEnCount = Object.values(enLevels || {}).filter((lvl) => lvl.completed).length;
  const enPercent = Math.min(100, Math.round((completedEnCount / 10) * 100));

  const handleNavigate = (path: string) => {
    if (!isLoggedIn) {
      sounds.playWrong();
      openModal("auth");
      return;
    }
    sounds.playClick();
    router.push(path);
  };

  const handleCreateRoom = () => {
    if (!isLoggedIn) {
      sounds.playWrong();
      openModal("auth");
      return;
    }
    sounds.playClick();
    openModal("createRoom");
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-76px)] flex-col justify-between pt-20 md:pt-24 pb-8 px-4 sm:px-8">
      <h1 className="sr-only">Nối Chữ Online - Đấu Trường Trí Tuệ Nối Từ & Đoán Chữ</h1>

      {/* Main Hero & Game Mode Grid */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center gap-8 xl:flex-row xl:gap-14 my-auto">
        {/* 3D Brand Logo & Hero Banner */}
        <div className="flex w-full flex-col items-center justify-center text-center xl:items-start xl:text-left xl:flex-[0_0_380px] space-y-3">
          <BrandLogo size="hero" showText={false} />
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black mx-auto xl:mx-0">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Đấu Trường Nối Chữ Online 2026</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-sm leading-relaxed mx-auto xl:mx-0">
            Chinh phục từ vựng phong phú, rèn luyện phản xạ ngôn ngữ và so tài đỉnh cao 1vs1 trong thời gian thực cùng bạn bè!
          </p>
        </div>

        {/* Game Mode Cards Grid */}
        <div className="flex w-full max-w-[420px] xl:max-w-[500px] flex-col gap-3.5">
          {/* Card 1: Vua Tiếng Việt */}
          <button
            type="button"
            onClick={() => handleNavigate("/vua-tieng-viet")}
            aria-label="Vua Tiếng Việt"
            className="group relative w-full text-left rounded-[28px] p-[1.8px] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] border-[#efbb4b] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.02)_55%),linear-gradient(135deg,#ffcf63_0%,#ffb347_55%,#ff8f3a_100%)] text-[#5b3200] shadow-[0_5px_0_0_rgba(217,124,18,0.78),0_14px_22px_-18px_rgba(245,158,11,0.65)] cursor-pointer"
          >
            <div className="relative z-10 flex min-h-[66px] w-full items-center gap-3 overflow-hidden rounded-[26.5px] px-4 py-3 bg-[linear-gradient(180deg,rgba(255,249,236,0.95)_0%,rgba(255,241,205,0.88)_40%,rgba(255,233,186,0.6)_100%)]">
              {/* Crown icon badge */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] border border-[#ffdc9f] bg-white/70 text-[#7a4300] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <Crown className="h-5 w-5 fill-amber-400 text-amber-600" />
              </div>

              {/* Text & Progress */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="min-w-0 truncate text-base font-black leading-tight text-[#5b3200]">
                    Vua Tiếng Việt
                  </p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide bg-[#fff4cf] text-[#b45309] border border-[#f5c76a] shadow-sm">
                    30 Level
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative h-3.5 flex-1 overflow-hidden rounded-full border border-[#b87417]/40 bg-[#fff6de] shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-[#fff0b8] via-[#ffd86f] to-[#ffb238]"
                      style={{ width: `${Math.max(vuaPercent, 0)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black tracking-wide text-[#7a4300]">
                      {vuaPercent}%
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-black text-[#7a4300]">
                    {completedVuaCount}/30 level
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Cards Row: Nối từ Tiếng Việt & Nối từ Tiếng Anh & Tạo Phòng */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3.5">
            {/* Column with 2 word chain modes */}
            <div className="flex flex-col gap-3.5">
              {/* Card 2: Nối từ Tiếng Việt */}
              <button
                type="button"
                onClick={() => handleNavigate("/noi-tu-tieng-viet")}
                aria-label="Nối từ Tiếng Việt"
                className="group relative w-full text-left rounded-[28px] p-[1.8px] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] border-[#78c97d] bg-[linear-gradient(135deg,#a5e793_0%,#67cf64_100%)] shadow-[0_5px_0_0_hsl(var(--primary)/0.72),0_14px_22px_-18px_hsl(var(--primary)/0.55)] cursor-pointer"
              >
                <div className="relative z-10 flex min-h-[64px] w-full items-center gap-3 overflow-hidden rounded-[26.5px] px-3.5 py-2.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(249,255,249,0.85)_40%,rgba(244,255,244,0.6)_100%)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] border border-[#78c97d] bg-white/90 text-[#173f21] shadow-sm">
                    <span className="text-[13px] font-black tracking-wider text-[#1d4d28]">vi</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <p className="min-w-0 truncate text-[14px] font-black text-[#1d4d28]">
                        Tiếng Việt
                      </p>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-black bg-[#efffe8] text-[#2f6d35] border border-[#bde9c3]">
                        Nối từ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-[#5ca963]/40 bg-[#f6fff4] shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#edfede] via-[#a5e793] to-[#67cf64] transition-all duration-500"
                          style={{ width: `${viPercent}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#1d4d28]">
                          {viPercent}%
                        </span>
                      </div>
                      <span className="shrink-0 text-[9px] font-black text-[#1d4d28]">
                        {completedViCount}/10 màn
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Card 3: Nối từ Tiếng Anh */}
              <button
                type="button"
                onClick={() => handleNavigate("/noi-tu-tieng-anh")}
                aria-label="Nối từ Tiếng Anh"
                className="group relative w-full text-left rounded-[28px] p-[1.8px] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] border-[#78c97d] bg-[linear-gradient(135deg,#a5e793_0%,#67cf64_100%)] shadow-[0_5px_0_0_hsl(var(--primary)/0.72),0_14px_22px_-18px_hsl(var(--primary)/0.55)] cursor-pointer"
              >
                <div className="relative z-10 flex min-h-[64px] w-full items-center gap-3 overflow-hidden rounded-[26.5px] px-3.5 py-2.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(249,255,249,0.85)_40%,rgba(244,255,244,0.6)_100%)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] border border-[#78c97d] bg-white/90 text-[#173f21] shadow-sm">
                    <span className="text-[13px] font-black tracking-wider text-[#1d4d28]">en</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <p className="min-w-0 truncate text-[14px] font-black text-[#1d4d28]">
                        Tiếng Anh
                      </p>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-black bg-[#efffe8] text-[#2f6d35] border border-[#bde9c3]">
                        Nối từ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-[#5ca963]/40 bg-[#f6fff4] shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#edfede] via-[#a5e793] to-[#67cf64] transition-all duration-500"
                          style={{ width: `${enPercent}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#1d4d28]">
                          {enPercent}%
                        </span>
                      </div>
                      <span className="shrink-0 text-[9px] font-black text-[#1d4d28]">
                        {completedEnCount}/10 màn
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Card 4: Tạo / Tìm phòng */}
            <button
              type="button"
              onClick={handleCreateRoom}
              aria-label="Tạo hoặc tìm phòng"
              className="btn-wf-silver group relative w-full rounded-[28px] p-4 flex flex-col items-center justify-center text-center transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] min-h-[140px] cursor-pointer"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] border border-[#e7e7e7] dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 text-amber-600 shadow-md mb-2">
                <Plus className="h-6 w-6 stroke-[2.5]" />
              </div>
              <span className="rounded-full border border-[#ffd08a] bg-[#fff4df] dark:bg-amber-950/40 dark:border-amber-700 px-2 py-0.5 text-[8px] font-black uppercase text-[#c56a12] dark:text-amber-300 mb-1">
                Phòng Đấu
              </span>
              <p className="text-sm font-black text-foreground leading-tight">
                Tạo / tìm phòng
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                Solo cùng bạn bè
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* LIVE ACTIVE ROOMS SECTION ON DASHBOARD */}
      {activeRooms.length > 0 && (
        <div className="mx-auto w-full max-w-[1400px] mt-10 mb-4 p-5 sm:p-6 rounded-[32px] glass-card bg-background/80 backdrop-blur-xl border border-primary/20 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  Phòng Đấu Trực Tuyến Đang Mở ({activeRooms.length})
                </h2>
                <p className="text-xs text-muted-foreground">Tham gia ngay hoặc tạo phòng riêng cùng bạn bè</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateRoom}
              className="btn-wf-primary h-9 px-4 rounded-xl text-xs font-black text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Phòng</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 mt-4">
            {activeRooms.map((room) => {
              const theme = ROOM_COLOR_THEMES.find((t) => t.id === room.themeColor) || ROOM_COLOR_THEMES[0];
              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl border-2 bg-gradient-to-br ${theme.bg} ${theme.border} flex flex-col justify-between transition-all hover:scale-[1.02] shadow-sm`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${theme.badge}`}>
                          #{room.id}
                        </span>
                        {room.betCoins ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Coins className="h-3 w-3 fill-amber-500" />
                            {room.betCoins.toLocaleString("vi-VN")} Xu
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600">
                            Miễn Phí
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {room.language === "vi" ? "🇻🇳" : "🇬🇧"}
                      </span>
                    </div>
                    <h3 className="font-black text-sm text-foreground truncate">{room.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">Chủ phòng: {room.hostNickname}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40">
                    <span className="text-[11px] font-bold text-muted-foreground">{room.playerCount}/2 người</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          sounds.playWrong();
                          openModal("auth");
                          return;
                        }
                        if (room.hasPassword) {
                          openModal("createRoom");
                          return;
                        }
                        sounds.playCorrect();
                        router.push(
                          `/play/friends/room/${room.id}?lang=${room.language}&theme=${room.themeColor}&name=${encodeURIComponent(
                            room.name
                          )}&time=${room.turnTimeSec}&bet=${room.betCoins || 0}`
                        );
                      }}
                      className="btn-wf-primary h-7 px-3 rounded-lg text-xs font-black text-primary-foreground cursor-pointer active:scale-95"
                    >
                      Vào Đấu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEO Section at bottom */}
      <FooterSEO />
    </div>
  );
}
