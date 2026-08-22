"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game-context";

export default function ShopPage() {
  const { openModal } = useGame();
  const router = useRouter();

  useEffect(() => {
    openModal("shop");
    router.replace("/");
  }, [openModal, router]);

  return null;
}
