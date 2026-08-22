import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/lib/game-context";
import { Header } from "@/components/header";
import { ProfileModal } from "@/components/modals/profile-modal";
import { LeaderboardModal } from "@/components/modals/leaderboard-modal";
import { ShopModal } from "@/components/modals/shop-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import { CreateRoomModal } from "@/components/modals/create-room-modal";
import { GlobalChatDrawer } from "@/components/modals/global-chat-drawer";
import { RulesModal } from "@/components/modals/rules-modal";
import { AuthModal } from "@/components/modals/auth-modal";

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trò Chơi Nối Từ Online - Game Nối Chữ 1vs1 | WordFight",
  description:
    "Tìm kiếm nối từ game vui? Truy cập WordFight để chơi nối từ online miễn phí ngay. Thử thách bản thân thành vua nối từ qua các chế độ nối từ online solo, nối từ với máy hay rủ bạn bè nối từ 2 người.",
  keywords: [
    "word fight",
    "nối từ",
    "game nối từ",
    "vua tiếng việt",
    "word chain game",
    "nối từ tiếng việt",
    "nối từ tiếng anh",
    "game đấu từ online",
  ],
  icons: {
    icon: "/images/logo-header.avif",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${nunito.variable} h-full antialiased font-sans`}>
      <body className="h-full font-normal antialiased bg-background text-foreground select-none overflow-x-hidden">
        <GameProvider>
          <div className="relative flex min-h-screen w-full flex-col">
            <div aria-hidden="true" className="wf-app-static-background" />
            <Header />
            <main className="main-content relative z-10 flex-1 overflow-y-auto">
              {children}
            </main>
          </div>

          {/* Global Modals */}
          <ProfileModal />
          <LeaderboardModal />
          <ShopModal />
          <SettingsModal />
          <CreateRoomModal />
          <GlobalChatDrawer />
          <RulesModal />
          <AuthModal />
        </GameProvider>
      </body>
    </html>
  );
}
