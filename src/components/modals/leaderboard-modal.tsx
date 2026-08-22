"use client";

import React, { useState } from "react";
import { X, Trophy, Medal, Crown } from "lucide-react";
import { useGame } from "@/lib/game-context";

interface LeaderboardUser {
  rank: number;
  name: string;
  avatarColor: string;
  points: number;
  wins: number;
  level: number;
}

const TOP_PLAYERS: LeaderboardUser[] = [
  { rank: 1, name: "Thánh Nối Từ 👑", avatarColor: "from-yellow-400 to-amber-600", points: 15420, wins: 412, level: 85 },
  { rank: 2, name: "Vua Tiếng Việt VN", avatarColor: "from-slate-300 to-slate-500", points: 13200, wins: 345, level: 74 },
  { rank: 3, name: "Độc Cô Cầu Bại", avatarColor: "from-amber-600 to-orange-700", points: 11980, wins: 298, level: 68 },
  { rank: 4, name: "Minh Anh 2004", avatarColor: "from-emerald-400 to-green-600", points: 9850, wins: 220, level: 52 },
  { rank: 5, name: "Nguyễn Văn Hùng", avatarColor: "from-blue-400 to-indigo-600", points: 8740, wins: 195, level: 46 },
  { rank: 6, name: "Phượng Hoàng Lửa", avatarColor: "from-rose-400 to-red-600", points: 7650, wins: 160, level: 40 },
  { rank: 7, name: "Bảo Trân", avatarColor: "from-purple-400 to-pink-600", points: 6520, wins: 134, level: 35 },
];

export function LeaderboardModal() {
  const { profile, activeModal, closeModal } = useGame();
  const [tab, setTab] = useState<"week" | "allTime">("week");

  if (activeModal !== "leaderboard") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-black text-foreground">Bảng Xếp Hạng</h2>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-muted/60 p-1 mt-4 shrink-0">
          <button
            onClick={() => setTab("week")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tuần Này
          </button>
          <button
            onClick={() => setTab("allTime")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === "allTime" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Toàn Thời Gian
          </button>
        </div>

        {/* List of Players */}
        <div className="wordfight-scrollbar mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {TOP_PLAYERS.map((player) => {
            const isTop1 = player.rank === 1;
            const isTop2 = player.rank === 2;
            const isTop3 = player.rank === 3;

            return (
              <div
                key={player.rank}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                  isTop1
                    ? "bg-amber-500/10 border-amber-500/30"
                    : isTop2
                    ? "bg-slate-500/10 border-slate-500/30"
                    : isTop3
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-muted/30 border-border/50"
                }`}
              >
                {/* Rank number / badge */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center font-black">
                  {isTop1 ? (
                    <Crown className="h-6 w-6 text-yellow-500" />
                  ) : isTop2 ? (
                    <Medal className="h-6 w-6 text-slate-400" />
                  ) : isTop3 ? (
                    <Medal className="h-6 w-6 text-amber-700" />
                  ) : (
                    <span className="text-sm text-muted-foreground">#{player.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${player.avatarColor} font-black text-white text-sm shadow-sm`}
                >
                  {player.name[0]}
                </div>

                {/* Name and Level */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground leading-tight">{player.name}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Cấp {player.level} • {player.wins} trận thắng
                  </p>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-primary">{player.points.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">điểm</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current user rank banner */}
        <div className="mt-4 p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-primary">#99+</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{profile.nickname} (Bạn)</p>
              <p className="text-[10px] text-muted-foreground">Cấp {profile.level}</p>
            </div>
          </div>
          <span className="text-xs font-black text-primary">120 điểm</span>
        </div>
      </div>
    </div>
  );
}
