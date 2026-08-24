"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { User, MessageCircle, ShoppingBag, Settings, LogIn, Sparkles } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { BrandLogo } from "@/components/brand-logo";

export function Header() {
  const { profile, isLoggedIn, openModal } = useGame();

  return (
    <>
      {/* Desktop Header */}
      <header className="fixed inset-x-0 top-0 z-[120] hidden md:block">
        <div className="pointer-events-auto border-b bg-background/70 backdrop-blur-md transition-[border-color,background-color] duration-200 border-primary/20">
          <div className="flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-2.5 min-h-[72px] max-w-7xl mx-auto">
            {/* Left elements */}
            <div className="flex min-w-0 shrink-0 items-center gap-4">
              <Link href="/" className="flex shrink-0 items-center">
                <BrandLogo size="md" showText={true} />
              </Link>

              {/* Profile button */}
              <button
                type="button"
                onClick={() => openModal(isLoggedIn ? "profile" : "auth")}
                className="flex min-w-0 items-center gap-2.5 rounded-full transition-transform duration-150 hover:scale-105 active:scale-[0.97] cursor-pointer text-left group ml-2 pl-3 border-l border-border/60"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-primary/70 bg-gradient-to-br ${profile.avatarColor} text-white shadow-sm`}
                >
                  <span className="text-sm font-black uppercase">{profile.nickname[0]}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold leading-none text-muted-foreground">
                      {isLoggedIn ? "Đã đăng nhập" : "Khách chơi"}
                    </span>
                    {isLoggedIn ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                    ) : (
                      <span className="text-[9px] font-bold text-amber-500 uppercase">Đăng nhập</span>
                    )}
                  </div>
                  <p className="max-w-[130px] lg:max-w-[160px] truncate text-sm font-bold leading-tight text-foreground">
                    {profile.nickname}
                  </p>
                </div>
              </button>

              {/* Leaderboard icon */}
              <button
                type="button"
                onClick={() => openModal("leaderboard")}
                aria-label="Xếp hạng"
                className="flex h-10 w-10 items-center justify-center hover:scale-110 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
              >
                <Image
                  src="/images/icon-leaderboard.avif"
                  alt="Xếp hạng"
                  width={38}
                  height={38}
                  className="h-[38px] w-[38px] object-contain drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]"
                />
              </button>
            </div>

            {/* Middle: Global Chat preview */}
            <div className="min-w-0 flex-1 max-w-sm lg:max-w-md mx-2">
              <button
                type="button"
                onClick={() => openModal("globalChat")}
                aria-label="Mở chat"
                className="group flex h-11 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-full border border-primary/20 bg-background/60 backdrop-blur-sm px-3.5 text-left transition-[border-color,background-color] duration-150 hover:border-primary/50 hover:bg-background/80 cursor-pointer"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <MessageCircle className="h-3.5 w-3.5" />
                </div>
                <div className="flex shrink-0 items-center">
                  <div className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Kênh chat
                  </div>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-xs text-muted-foreground">
                    Cộng đồng Nối Chữ Online: Trò chuyện trực tiếp! 💬
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground xl:inline">
                  Mở chat
                </span>
              </button>
            </div>

            {/* Right: Auth / Shop & Settings */}
            <div className="flex shrink-0 items-center gap-2">
              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => openModal("auth")}
                  className="btn-wf-primary h-10 px-3.5 rounded-full font-black text-xs text-primary-foreground flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Đăng Nhập</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openModal("shop")}
                aria-label="Cửa hàng"
                className="btn-wf-primary flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-primary/70 text-primary-foreground transition-transform duration-150 hover:scale-105 active:scale-[0.97] cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => openModal("settings")}
                aria-label="Cài đặt"
                className="btn-wf-silver flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-[#ececec] text-gray-700 dark:text-gray-200 transition-transform duration-150 hover:scale-105 active:scale-[0.97] cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top Header (iPhone & Android Optimized) */}
      <div className="fixed inset-x-0 top-0 z-[120] md:hidden pointer-events-auto bg-background/80 backdrop-blur-md border-b border-primary/15 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 px-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo size="sm" showText={true} />
          </Link>

          {/* Right: Actions Row */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Profile Avatar / Login */}
            <button
              type="button"
              onClick={() => openModal(isLoggedIn ? "profile" : "auth")}
              className="flex items-center gap-1.5 p-1 rounded-full bg-muted/50 border border-border/60 cursor-pointer active:scale-95 transition-all text-left"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${profile.avatarColor} text-white font-black text-xs`}
              >
                {profile.nickname[0]}
              </div>
              <span className="text-[11px] font-bold text-foreground truncate max-w-[65px] sm:max-w-[90px] pr-1.5">
                {isLoggedIn ? profile.nickname : "Đăng nhập"}
              </span>
            </button>

            {/* Leaderboard */}
            <button
              type="button"
              onClick={() => openModal("leaderboard")}
              aria-label="Xếp hạng"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 active:scale-90 transition-transform cursor-pointer"
            >
              <Image
                src="/images/icon-leaderboard.avif"
                alt="Xếp hạng"
                width={24}
                height={24}
                className="h-5 w-5 object-contain drop-shadow-sm"
              />
            </button>

            {/* Global Chat */}
            <button
              type="button"
              onClick={() => openModal("globalChat")}
              aria-label="Chat toàn cầu"
              className="btn-wf-primary flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground active:scale-90 transition-transform cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
            </button>

            {/* Shop */}
            <button
              type="button"
              onClick={() => openModal("shop")}
              aria-label="Cửa hàng"
              className="btn-wf-silver flex h-8 w-8 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => openModal("settings")}
              aria-label="Cài đặt"
              className="btn-wf-silver flex h-8 w-8 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
