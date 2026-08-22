"use client";

import React from "react";
import { X, BookOpen, Crown, Globe2 } from "lucide-react";
import { useGame } from "@/lib/game-context";

export function RulesModal() {
  const { activeModal, closeModal } = useGame();

  if (activeModal !== "rules") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-black text-foreground">Luật Chơi & Hướng Dẫn</h2>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="wordfight-scrollbar mt-4 flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
          {/* Rule 1: Nối từ Tiếng Việt */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">1</span>
              Nối Từ Tiếng Việt
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Người chơi lần lượt đưa ra một <strong>từ ghép gồm đúng 2 âm tiết</strong> có nghĩa trong từ điển tiếng Việt. Âm tiết đầu tiên của từ mới phải trùng khớp với âm tiết cuối cùng của từ do đối thủ đưa ra trước đó.
            </p>
            <div className="p-2.5 rounded-xl bg-background/70 font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              Ví dụ: Học sinh ➔ Sinh viên ➔ Viên gạch ➔ Gạch men
            </div>
          </div>

          {/* Rule 2: Nối từ Tiếng Anh */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2">
            <div className="flex items-center gap-2 font-black text-blue-600 dark:text-blue-400">
              <Globe2 className="h-5 w-5" />
              Nối Từ Tiếng Anh (English Word Chain)
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn cần nối một từ vựng tiếng Anh bắt đầu bằng <strong>chữ cái kết thúc</strong> của từ trước đó.
            </p>
            <div className="p-2.5 rounded-xl bg-background/70 font-mono text-xs text-blue-700 dark:text-blue-300 font-bold">
              Example: Apple ➔ Elephant ➔ Tiger ➔ Rabbit
            </div>
          </div>

          {/* Rule 3: Vua Tiếng Việt */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-600 dark:text-amber-400">
              <Crown className="h-5 w-5" />
              Chế Độ Vua Tiếng Việt
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nhiệm vụ của bạn là sắp xếp lại các ký tự bị xáo trộn để tạo thành một từ ghép có nghĩa theo gợi ý. Hoàn thành để nhận đánh giá sao và kim cương (gems)!
            </p>
          </div>

          {/* General Constraints */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-1.5">
            <p className="font-bold text-foreground">⚠️ Quy định chung:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Mỗi lượt đấu có thời gian đếm ngược (15 - 20 giây).</li>
              <li>Từ đã sử dụng trong ván đấu không được lặp lại.</li>
              <li>Hết thời gian mà không đưa ra được từ hợp lệ sẽ bị tính là thua cuộc.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
