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
          src="/images/logo/noi-chu-wordmark-transparent.png"
          alt="Nối Chữ Online"
          width={280}
          height={70}
          priority
          className={`${
            isHero
              ? "w-[260px] sm:w-[320px] h-auto"
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
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-blue-500/20 via-emerald-400/20 to-amber-400/15 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Clean Transparent 3D Logo without any white background or frame */}
          <Image
            src="/images/logo/noi-chu-logo-transparent.png"
            alt="Nối Chữ Online Logo"
            width={400}
            height={400}
            priority
            className="w-[260px] sm:w-[320px] md:w-[360px] h-auto object-contain drop-shadow-[0_12px_24px_rgba(0,102,204,0.18)]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon */}
      <div
        className={`relative shrink-0 ${
          isLarge
            ? "w-11 h-11"
            : isSmall
            ? "w-8 h-8"
            : "w-10 h-10"
        }`}
      >
        <Image
          src="/images/logo/noi-chu-logo-transparent.png"
          alt="Nối Chữ"
          width={80}
          height={80}
          priority
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>

      {/* Wordmark Typography */}
      {showText && (
        <div className="flex items-center">
          <Image
            src="/images/logo/noi-chu-wordmark-transparent.png"
            alt="Nối Chữ Online"
            width={160}
            height={40}
            priority
            className={`${isSmall ? "w-[105px]" : "w-[130px]"} h-auto object-contain`}
          />
        </div>
      )}
    </div>
  );
}
