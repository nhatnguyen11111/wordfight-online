import type { Metadata } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
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

const baloo2 = Baloo_2({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nối Chữ Online - Đấu Trường Trí Tuệ Nối Từ & Đoán Chữ Đỉnh Cao",
  description:
    "Trải nghiệm game Nối Chữ Online miễn phí số 1 Việt Nam. Đấu trường trí tuệ đối kháng 1vs1, solo cùng bạn bè, luyện tập cùng AI thông minh và chinh phục Vua Tiếng Việt!",
  keywords: [
    "nối chữ online",
    "nối từ online",
    "game nối chữ",
    "đấu từ trí tuệ",
    "vua tiếng việt",
    "word chain game",
    "nối từ tiếng việt",
    "nối từ tiếng anh",
    "game trí tuệ online",
  ],
  icons: {
    icon: "/images/logo/noi-chu-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${nunito.variable} ${baloo2.variable} h-full antialiased font-sans`}>
      <body className="h-full font-normal antialiased bg-background text-foreground select-none overflow-x-hidden font-sans">
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
