"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game-context";

export default function LeaderboardPage() {
  const { openModal } = useGame();
  const router = useRouter();

  useEffect(() => {
    openModal("leaderboard");
    router.replace("/");
  }, [openModal, router]);

  return null;
}
