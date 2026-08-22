"use client";

import React, { useState } from "react";
import { X, ShoppingBag, Gem, Sparkles, Check, Lock } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";

interface ShopItem {
  id: string;
  name: string;
  price: number;
  type: "frame" | "badge" | "gems";
  description: string;
  previewColor: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "frame_gold",
    name: "Khung Vàng Hoàng Kim",
    price: 30,
    type: "frame",
    description: "Khung đại diện viền vàng lấp lánh sang trọng",
    previewColor: "border-amber-400 ring-4 ring-amber-400/30",
  },
  {
    id: "frame_neon",
    name: "Khung Neon Cyber",
    price: 50,
    type: "frame",
    description: "Khung đại diện phát sáng viền xanh neon công nghệ",
    previewColor: "border-cyan-400 ring-4 ring-cyan-400/40 shadow-[0_0_12px_#22d3ee]",
  },
  {
    id: "frame_ruby",
    name: "Khung Hồng Ngọc",
    price: 80,
    type: "frame",
    description: "Khung rực lửa quý tộc với tinh thể Ruby",
    previewColor: "border-rose-500 ring-4 ring-rose-500/30 shadow-[0_0_12px_#f43f5e]",
  },
  {
    id: "badge_king",
    name: "Huy Hiệu Vua Từ Vựng",
    price: 100,
    type: "badge",
    description: "Huy hiệu vương miện hiển thị cạnh tên trong phòng đấu",
    previewColor: "bg-gradient-to-r from-amber-400 to-yellow-500",
  },
];

export function ShopModal() {
  const { profile, addGems, updateAvatarFrame, activeModal, closeModal } = useGame();
  const [purchased, setPurchased] = useState<string[]>(["default"]);
  const [activeTab, setActiveTab] = useState<"items" | "gems">("items");

  if (activeModal !== "shop") return null;

  const handleBuyItem = (item: ShopItem) => {
    if (purchased.includes(item.id)) {
      // Equip item
      updateAvatarFrame(item.id);
      sounds.playCorrect();
      return;
    }

    if (profile.gems < item.price) {
      sounds.playWrong();
      alert("Bạn không đủ Kim Cương! Hãy vượt các màn Vua Tiếng Việt để nhận thêm.");
      return;
    }

    // Deduct gems and add item
    addGems(-item.price);
    setPurchased((prev) => [...prev, item.id]);
    updateAvatarFrame(item.id);
    sounds.playCorrect();
  };

  const handleBuyGemPack = (amount: number) => {
    addGems(amount);
    sounds.playGem();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-black text-foreground">Cửa Hàng Vật Phẩm</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Gem className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-black text-amber-500">{profile.gems}</span>
            </div>
            <button
              onClick={closeModal}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-muted/60 p-1 mt-4 shrink-0">
          <button
            onClick={() => setActiveTab("items")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "items" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Khung & Hiệu Ứng
          </button>
          <button
            onClick={() => setActiveTab("gems")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "gems" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nhận Kim Cương (Gems)
          </button>
        </div>

        {/* Content */}
        <div className="wordfight-scrollbar mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === "items" ? (
            SHOP_ITEMS.map((item) => {
              const isOwned = purchased.includes(item.id);
              const isEquipped = profile.avatarFrame === item.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3 rounded-2xl border border-border/60 bg-muted/30 hover:border-primary/40 transition-colors"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted border-2 ${item.previewColor}`}>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyItem(item)}
                    className={`h-9 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
                      isEquipped
                        ? "bg-muted text-muted-foreground"
                        : isOwned
                        ? "btn-wf-silver text-foreground"
                        : "btn-wf-primary text-primary-foreground"
                    }`}
                  >
                    {isEquipped ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Đang dùng
                      </>
                    ) : isOwned ? (
                      "Trang bị"
                    ) : (
                      <>
                        <Gem className="h-3.5 w-3.5 text-amber-300" /> {item.price}
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">Gói Tân Thủ 🎁</p>
                  <p className="text-xs text-muted-foreground">Nhận 50 Kim Cương miễn phí</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuyGemPack(50)}
                  className="btn-wf-primary h-9 px-4 rounded-xl text-xs font-black text-primary-foreground cursor-pointer"
                >
                  +50 Gems
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">Gói Chiến Binh ⚔️</p>
                  <p className="text-xs text-muted-foreground">Nhận 100 Kim Cương miễn phí</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuyGemPack(100)}
                  className="btn-wf-primary h-9 px-4 rounded-xl text-xs font-black text-primary-foreground cursor-pointer"
                >
                  +100 Gems
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
