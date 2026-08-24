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
        <div className="pointer-events-auto border-b bg-background/60 backdrop-blur-md transition-[border-color,background-color] duration-200 border-primary/20">
          <div className="flex w-full items-center justify-between gap-6 px-6 lg:px-8 py-3 min-h-[76px]">
            {/* Left elements */}
            <div className="flex min-w-0 shrink-0 items-center gap-5">
              <Link href="/" className="flex shrink-0 items-center">
                <BrandLogo size="md" showText={true} />
              </Link>

              {/* Profile button */}
              <button
                type="button"
                onClick={() => openModal(isLoggedIn ? "profile" : "auth")}
                className="flex min-w-0 items-center gap-3 rounded-full transition-transform duration-150 hover:scale-105 active:scale-[0.97] cursor-pointer text-left group ml-2 pl-3 border-l border-border/60"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-primary/70 bg-gradient-to-br ${profile.avatarColor} text-white shadow-sm`}
                >
                  <span className="text-base font-black uppercase">{profile.nickname[0]}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold leading-none text-muted-foreground">
                      {isLoggedIn ? "Đã đăng nhập" : "Khách chơi"}
                    </span>
                    {isLoggedIn ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                    ) : (
                      <span className="text-[10px] font-bold text-amber-500 uppercase">Đăng nhập</span>
                    )}
                  </div>
                  <p className="max-w-[150px] truncate text-sm font-bold leading-tight text-foreground">
                    {profile.nickname}
                  </p>
                </div>
              </button>

              {/* Leaderboard icon */}
              <button
                type="button"
                onClick={() => openModal("leaderboard")}
                aria-label="Xếp hạng"
                className="flex h-[44px] w-[44px] items-center justify-center hover:scale-110 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
              >
                <Image
                  src="/images/icon-leaderboard.avif"
                  alt="Xếp hạng"
                  width={42}
                  height={42}
                  className="h-[42px] w-[42px] object-contain drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]"
                />
              </button>
            </div>

            {/* Middle: Global Chat preview */}
            <div className="min-w-0 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => openModal("globalChat")}
                aria-label="Mở chat"
                className="group flex h-12 w-full min-w-0 items-center gap-3 overflow-hidden rounded-full border border-primary/20 bg-background/50 backdrop-blur-sm px-4 text-left transition-[border-color,background-color] duration-150 hover:border-primary/50 hover:bg-background/70 cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="flex shrink-0 items-center">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
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
            <div className="flex shrink-0 items-center gap-2.5">
              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => openModal("auth")}
                  className="btn-wf-primary h-11 px-4 rounded-full font-black text-xs text-primary-foreground flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Đăng Nhập</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openModal("shop")}
                aria-label="Cửa hàng"
                className="btn-wf-primary flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-primary/70 text-primary-foreground transition-transform duration-150 hover:scale-105 active:scale-[0.97] cursor-pointer"
              >
                <ShoppingBag className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => openModal("settings")}
                aria-label="Cài đặt"
                className="btn-wf-silver flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-[#ececec] text-gray-700 dark:text-gray-200 transition-transform duration-150 hover:scale-105 active:scale-[0.97] cursor-pointer"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top Floating Bars */}
      <div className="relative z-30 flex shrink-0 items-start justify-between px-4 pb-2 pt-4 md:hidden">
        {/* Left Mobile: Brand + Profile & Leaderboard */}
        <div className="flex flex-col items-start gap-3">
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo size="sm" showText={true} />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModal(isLoggedIn ? "profile" : "auth")}
              className="flex cursor-pointer items-center gap-2 rounded-2xl transition-all active:scale-[0.97] text-left"
            >
              <div
                className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-primary/70 bg-gradient-to-br ${profile.avatarColor} text-white shadow-sm`}
              >
                <span className="text-sm font-black uppercase">{profile.nickname[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="mb-0.5 text-[9px] font-bold leading-none text-muted-foreground">
                  {isLoggedIn ? "Tài khoản" : "Đăng nhập"}
                </p>
                <p className="max-w-[110px] truncate text-xs font-bold leading-tight">
                  {profile.nickname}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openModal("leaderboard")}
              aria-label="Xếp hạng"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-muted/60 transition-transform duration-150 active:scale-[0.97]"
            >
              <Image
                src="/images/icon-leaderboard.avif"
                alt="Xếp hạng"
                width={28}
                height={28}
                className="h-6 w-6 object-contain drop-shadow-[0_0_6px_hsl(var(--primary)/0.7)]"
              />
            </button>
          </div>
        </div>

        {/* Right Mobile: Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => openModal("auth")}
                className="btn-wf-primary h-9 px-3 rounded-full text-xs font-black text-primary-foreground flex items-center gap-1 shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openModal("globalChat")}
              aria-label="Chat toàn cầu"
              className="btn-wf-primary flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-primary-foreground active:scale-[0.97]"
            >
              <MessageCircle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => openModal("shop")}
              aria-label="Cửa hàng"
              className="btn-wf-silver flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground active:scale-[0.97]"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => openModal("settings")}
              aria-label="Cài đặt"
              className="btn-wf-silver flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground active:scale-[0.97]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
