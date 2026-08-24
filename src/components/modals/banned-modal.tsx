"use client";

import React from "react";
import { ShieldAlert, LogOut, AlertTriangle } from "lucide-react";
import { useGame } from "@/lib/game-context";

export function BannedModal() {
  const { profile, logout } = useGame();

  if (!profile?.isBanned) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border-2 border-red-500/40 bg-gradient-to-b from-card via-background to-card p-6 sm:p-8 shadow-2xl text-center">
        {/* Glow behind icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/15 border-2 border-red-500/30 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] mb-5">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-red-500 tracking-tight">
          Tài Khoản Đã Bị Khóa
        </h2>

        <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-2 leading-relaxed">
          Tài khoản của bạn đã bị <strong className="text-foreground font-bold">Quản Trị Viên</strong> khóa quyền truy cập do vi phạm quy định hoặc bị cấm sử dụng hệ thống.
        </p>

        {/* Account Details Box */}
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Người chơi:</span>
            <span className="font-bold text-foreground truncate max-w-[200px]">{profile.nickname}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Email / ID:</span>
            <span className="font-bold text-foreground truncate max-w-[200px]">{profile.email || profile.id}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Trạng thái:</span>
            <span className="font-black text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Bị Chặn Vĩnh Viễn
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/80 mt-4 italic">
          Bạn không thể tham gia đấu từ, tạo phòng hoặc sử dụng bất kỳ tính năng nào. Vui lòng đăng xuất để tiếp tục với tài khoản khác.
        </p>

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              logout();
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 hover:opacity-95 active:scale-98 cursor-pointer transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng Xuất Khỏi Tài Khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
}
