"use client";

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "hero";
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", showText = true, className = "" }: BrandLogoProps) {
  const isHero = size === "hero";
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 3D Modern Interlocking Brand Icon */}
      <div
        className={`relative flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${
          isHero
            ? "w-24 h-24 sm:w-28 sm:h-28"
            : isLarge
            ? "w-14 h-14"
            : isSmall
            ? "w-9 h-9"
            : "w-11 h-11"
        }`}
      >
        {/* Glow ambient background */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500/40 via-teal-400/30 to-cyan-500/40 blur-xl animate-pulse" />

        {/* Outer squircle container */}
        <div
          className={`relative w-full h-full rounded-[26%] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-[2.5px] shadow-xl ${
            isHero ? "shadow-emerald-500/30" : ""
          }`}
        >
          <div className="w-full h-full rounded-[24%] bg-gradient-to-b from-white/95 via-emerald-50/90 to-teal-100/90 dark:from-slate-900 dark:via-teal-950 dark:to-emerald-950 flex items-center justify-center overflow-hidden border border-white/60 dark:border-white/10 shadow-inner">
            {/* Dynamic Vector Chain Link / N & C Letter Monogram */}
            <svg
              viewBox="0 0 100 100"
              className="w-[78%] h-[78%] drop-shadow-[0_4px_8px_rgba(16,185,129,0.35)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="brandGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="brandGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#059669" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Left Interlocking Loop (N-shape link) */}
              <path
                d="M32 24 C 20 24, 16 34, 16 50 C 16 66, 20 76, 32 76 C 42 76, 46 68, 50 56 L 50 36 C 46 28, 40 24, 32 24 Z"
                fill="url(#brandGrad1)"
                filter="url(#glow)"
              />
              <path
                d="M32 34 C 25 34, 24 40, 24 50 C 24 60, 25 66, 32 66 C 37 66, 40 60, 42 52 L 42 42 C 40 36, 37 34, 32 34 Z"
                fill="white"
                className="dark:fill-slate-900"
                opacity="0.95"
              />

              {/* Right Interlocking Loop (C-shape link) */}
              <path
                d="M68 24 C 58 24, 54 32, 50 44 L 50 64 C 54 72, 60 76, 68 76 C 80 76, 84 66, 84 50 C 84 34, 80 24, 68 24 Z"
                fill="url(#brandGrad2)"
                filter="url(#glow)"
              />
              <path
                d="M68 34 C 75 34, 76 40, 76 50 C 76 60, 75 66, 68 66 C 63 66, 60 60, 58 48 L 58 38 C 60 34, 63 34, 68 34 Z"
                fill="white"
                className="dark:fill-slate-900"
                opacity="0.95"
              />

              {/* Central Intersecting Sparkle Accent */}
              <path
                d="M50 40 L53 47 L60 50 L53 53 L50 60 L47 53 L40 50 L47 47 Z"
                fill="#fbbf24"
                className="animate-spin-slow"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Typography Brand Name */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent ${
                isHero
                  ? "text-3xl sm:text-4xl lg:text-5xl"
                  : isLarge
                  ? "text-2xl"
                  : isSmall
                  ? "text-base"
                  : "text-lg sm:text-xl"
              }`}
            >
              Nối Chữ Online
            </span>
          </div>
          {isHero ? (
            <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-1">
              Đấu Trường Trí Tuệ Nối Từ & Đoán Chữ Đỉnh Cao
            </p>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase -mt-0.5">
              Đấu Trường Nối Chữ
            </span>
          )}
        </div>
      )}
    </div>
  );
}
