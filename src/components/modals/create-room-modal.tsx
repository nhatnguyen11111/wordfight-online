"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Users, Plus, ArrowRight } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";

export function CreateRoomModal() {
  const { activeModal, closeModal, isLoggedIn, openModal } = useGame();
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [selectedLang, setSelectedLang] = useState<"vi" | "en">("vi");

  if (activeModal !== "createRoom") return null;

  const handleCreate = () => {
    if (!isLoggedIn) {
      sounds.playWrong();
      closeModal();
      openModal("auth");
      return;
    }
    const randomCode = Math.floor(10000 + Math.random() * 90000).toString();
    sounds.playCorrect();
    closeModal();
    router.push(`/play/friends/room/${randomCode}?create=true&lang=${selectedLang}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      sounds.playWrong();
      closeModal();
      openModal("auth");
      return;
    }
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      sounds.playWrong();
      return;
    }
    sounds.playCorrect();
    closeModal();
    router.push(`/play/friends/room/${code}`);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-black text-foreground">Phòng Đấu Bạn Bè</h2>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-muted/60 p-1 mt-4">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tạo Phòng Mới
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === "join" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nhập Mã Phòng
          </button>
        </div>

        {/* Create Mode Tab */}
        {tab === "create" ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Chọn Ngôn Ngữ Game
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedLang("vi")}
                  className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    selectedLang === "vi"
                      ? "border-primary bg-primary/10 text-primary font-black shadow-sm"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border"
                  }`}
                >
                  🇻🇳 Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLang("en")}
                  className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    selectedLang === "en"
                      ? "border-primary bg-primary/10 text-primary font-black shadow-sm"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border"
                  }`}
                >
                  🇬🇧 Tiếng Anh
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed">
              💡 Sau khi tạo phòng, bạn có thể copy link phòng hoặc chia sẻ mã 5 số để bạn bè cùng tham gia đấu trí thời gian thực!
            </div>

            <button
              type="button"
              onClick={handleCreate}
              className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="h-5 w-5" /> Tạo Phòng Ngay
            </button>
          </div>
        ) : (
          /* Join Mode Tab */
          <form onSubmit={handleJoin} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Mã Phòng (Room Code)
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="VD: 93367"
                maxLength={8}
                className="w-full h-12 px-4 rounded-2xl border-2 border-border/80 bg-muted/30 font-black text-center text-lg tracking-widest focus:border-primary focus:outline-none transition-colors uppercase"
              />
            </div>

            <button
              type="submit"
              className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <ArrowRight className="h-5 w-5" /> Tham Gia Phòng
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
