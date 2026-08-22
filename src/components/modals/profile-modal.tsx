"use client";

import React, { useState } from "react";
import { X, User, Trophy, Flame, Gem, Check, LogOut, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";

const AVATAR_GRADIENTS = [
  "from-emerald-400 to-green-600",
  "from-cyan-400 to-blue-600",
  "from-purple-400 to-indigo-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
  "from-slate-700 to-slate-900",
];

export function ProfileModal() {
  const { profile, isLoggedIn, updateNickname, updateAvatarColor, logout, openModal, activeModal, closeModal } = useGame();
  const [nickname, setNickname] = useState(profile.nickname);
  const [selectedColor, setSelectedColor] = useState(profile.avatarColor);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (activeModal !== "profile") return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    updateNickname(nickname.trim());
    updateAvatarColor(selectedColor);
    sounds.playCorrect();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      closeModal();
    }, 600);
  };

  const handleLogout = async () => {
    sounds.playClick();
    await logout();
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-foreground">Hồ Sơ Cá Nhân</h2>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Account Info Bar */}
        <div className="mt-4 p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className={`h-4 w-4 ${isLoggedIn ? "text-emerald-500" : "text-amber-500"}`} />
            <div>
              <p className="font-black text-foreground">
                {isLoggedIn ? (profile.email || "Đã Đăng Nhập") : "Tài Khoản Khách (Chưa Lưu)"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isLoggedIn ? "Dữ liệu được đồng bộ Supabase" : "Đăng ký để lưu tiến độ và kim cương vĩnh viễn"}
              </p>
            </div>
          </div>
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                closeModal();
                openModal("auth");
              }}
              className="btn-wf-primary h-8 px-3 rounded-xl text-[11px] font-black text-primary-foreground flex items-center gap-1 shrink-0"
            >
              <LogIn className="h-3 w-3" /> Đăng Ký
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Avatar Preview & Color Selection */}
          <div className="flex flex-col items-center gap-2.5">
            <div
              className={`flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br ${selectedColor} border-4 border-white/80 shadow-lg text-white font-black text-2xl uppercase`}
            >
              {nickname[0] || profile.nickname[0]}
            </div>
            <p className="text-[11px] font-bold text-muted-foreground">Chọn màu đại diện</p>
            <div className="flex items-center gap-2">
              {AVATAR_GRADIENTS.map((grad) => (
                <button
                  key={grad}
                  type="button"
                  onClick={() => {
                    setSelectedColor(grad);
                    sounds.playClick();
                  }}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${grad} transition-transform ${
                    selectedColor === grad ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110 opacity-75"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Nickname input */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Tên hiển thị (Nickname)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="Nhập tên của bạn..."
              className="w-full h-11 px-4 rounded-2xl border-2 border-border/80 bg-muted/30 font-bold text-xs focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Gem className="h-5 w-5 text-amber-500 mb-0.5" />
              <span className="text-xs font-black text-amber-500">{profile.gems} 💎</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Kim Cương</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Trophy className="h-5 w-5 text-emerald-500 mb-0.5" />
              <span className="text-xs font-black text-emerald-500">{profile.totalWins}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Trận Thắng</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500 mb-0.5" />
              <span className="text-xs font-black text-orange-500">{profile.highestStreak}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Chuỗi Thắng</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-wf-silver h-12 px-4 rounded-2xl font-black text-xs text-rose-600 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Đăng Xuất
              </button>
            )}

            <button
              type="submit"
              className="btn-wf-primary flex-1 h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4" /> Đã lưu thành công!
                </>
              ) : (
                "Lưu Thay Đổi"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
