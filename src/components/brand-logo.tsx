"use client";

import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "hero";
  showText?: boolean;
  className?: string;
  variant?: "logo" | "wordmark" | "combo";
}

export function BrandLogo({ size = "md", showText = true, className = "", variant = "combo" }: BrandLogoProps) {
  const isHero = size === "hero";
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  if (variant === "wordmark") {
    return (
      <div className={`relative flex items-center select-none ${className}`}>
        <Image
          src="/images/logo/noi-chu-wordmark.png"
          alt="Nối Chữ Online"
          width={280}
          height={70}
          priority
          className={`${
            isHero
              ? "w-[240px] sm:w-[300px] h-auto"
              : isLarge
              ? "w-[180px] h-auto"
              : isSmall
              ? "w-[120px] h-auto"
              : "w-[150px] h-auto"
          } object-contain`}
        />
      </div>
    );
  }

  if (isHero) {
    return (
      <div className={`flex flex-col items-center select-none ${className}`}>
        <div className="relative group cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95">
          {/* Ambient Glow */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/30 via-emerald-400/30 to-amber-400/20 blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative overflow-hidden rounded-[32px] border-4 border-white/80 dark:border-slate-700/80 shadow-[0_16px_36px_rgba(0,102,204,0.22)] bg-white dark:bg-slate-900">
            <Image
              src="/images/logo/noi-chu-logo.jpg"
              alt="Nối Chữ Online Logo"
              width={340}
              height={340}
              priority
              className="w-[220px] sm:w-[260px] md:w-[300px] h-auto object-contain rounded-[28px]"
            />
          </div>
        </div>

        {/* Wordmark under logo */}
        <div className="mt-4">
          <Image
            src="/images/logo/noi-chu-wordmark.png"
            alt="Nối Chữ Online"
            width={260}
            height={65}
            priority
            className="w-[200px] sm:w-[240px] h-auto object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-white/80 dark:border-slate-700 shadow-md bg-white dark:bg-slate-900 shrink-0 ${
          isLarge
            ? "w-12 h-12"
            : isSmall
            ? "w-8 h-8"
            : "w-10 h-10"
        }`}
      >
        <Image
          src="/images/logo/noi-chu-logo.jpg"
          alt="Nối Chữ"
          width={60}
          height={60}
          priority
          className="w-full h-full object-contain"
        />
      </div>

      {/* Wordmark Typography */}
      {showText && (
        <div className="flex items-center">
          <Image
            src="/images/logo/noi-chu-wordmark.png"
            alt="Nối Chữ Online"
            width={160}
            height={40}
            priority
            className={`${isSmall ? "w-[110px]" : "w-[135px]"} h-auto object-contain`}
          />
        </div>
      )}
    </div>
  );
}
