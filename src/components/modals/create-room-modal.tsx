"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Users,
  Plus,
  ArrowRight,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  Search,
  Clock,
  Globe2,
  Shield,
  Palette,
  AlertCircle,
  Play,
  Coins,
} from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";
import { RoomRegistry, RoomInfo, ROOM_COLOR_THEMES, BET_COIN_PRESETS } from "@/lib/room-registry";

export function CreateRoomModal() {
  const { activeModal, closeModal, isLoggedIn, openModal, profile } = useGame();
  const router = useRouter();

  const [tab, setTab] = useState<"lobby" | "create" | "join">("lobby");

  // Create room state
  const [roomName, setRoomName] = useState("Đại Chiến Nối Chữ");
  const [selectedColor, setSelectedColor] = useState<"emerald" | "blue" | "purple" | "amber" | "rose" | "cyan">("emerald");
  const [selectedLang, setSelectedLang] = useState<"vi" | "en">("vi");
  const [hasPassword, setHasPassword] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [turnTimeSec, setTurnTimeSec] = useState<number>(20);
  const [betCoins, setBetCoins] = useState<number>(0);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Join room code state
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // Password prompt for locked rooms
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<RoomInfo | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Active rooms list
  const [roomsList, setRoomsList] = useState<RoomInfo[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const refreshRooms = async () => {
    setLoadingRooms(true);
    const rooms = await RoomRegistry.listActiveRooms();
    setRoomsList(rooms);
    setLoadingRooms(false);
  };

  useEffect(() => {
    if (activeModal === "createRoom") {
      refreshRooms();
      const unsub = RoomRegistry.subscribeToRooms((rooms) => {
        setRoomsList(rooms);
      });
      return () => {
        unsub();
      };
    }
  }, [activeModal]);

  if (activeModal !== "createRoom") return null;

  // Handle create custom room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      sounds.playWrong();
      closeModal();
      openModal("auth");
      return;
    }

    setCreatingRoom(true);
    const randomCode = Math.floor(10000 + Math.random() * 90000).toString();

    const newRoom: RoomInfo = {
      id: randomCode,
      name: roomName.trim() || `Phòng Đấu #${randomCode}`,
      themeColor: selectedColor,
      language: selectedLang,
      hasPassword,
      password: hasPassword ? roomPassword.trim() : undefined,
      turnTimeSec,
      betCoins,
      hostId: profile.id,
      hostNickname: profile.nickname,
      hostAvatarColor: profile.avatarColor,
      playerCount: 1,
      maxPlayers: 2,
      status: "WAITING",
      createdAt: Date.now(),
    };

    await RoomRegistry.registerRoom(newRoom);
    setCreatingRoom(false);
    sounds.playFanfare();
    closeModal();
    router.push(
      `/play/friends/room/${randomCode}?create=true&lang=${selectedLang}&theme=${selectedColor}&name=${encodeURIComponent(
        newRoom.name
      )}&time=${turnTimeSec}&bet=${betCoins}`
    );
  };

  // Handle direct join by code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    if (!isLoggedIn) {
      sounds.playWrong();
      closeModal();
      openModal("auth");
      return;
    }

    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      sounds.playWrong();
      setJoinError("Vui lòng nhập mã phòng!");
      return;
    }

    setCheckingCode(true);
    const room = await RoomRegistry.getRoom(code);
    setCheckingCode(false);

    if (!room) {
      sounds.playWrong();
      setJoinError(`Phòng #${code} không tồn tại hoặc đã giải tán!`);
      return;
    }

    if (room.status === "PLAYING") {
      sounds.playWrong();
      setJoinError(`Phòng #${code} đang trong trận đấu!`);
      return;
    }

    if (room.hasPassword && room.password) {
      setPasswordPromptRoom(room);
      return;
    }

    sounds.playCorrect();
    closeModal();
    router.push(`/play/friends/room/${code}`);
  };

  // Handle join from lobby
  const handleJoinFromLobby = (room: RoomInfo) => {
    if (!isLoggedIn) {
      sounds.playWrong();
      closeModal();
      openModal("auth");
      return;
    }

    if (room.status === "PLAYING") {
      sounds.playWrong();
      alert("Phòng này đang trong trận đấu!");
      return;
    }

    if (room.hasPassword && room.password) {
      setPasswordPromptRoom(room);
      setEnteredPassword("");
      setPasswordError(null);
      return;
    }

    sounds.playCorrect();
    closeModal();
    router.push(`/play/friends/room/${room.id}`);
  };

  // Verify password modal submit
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptRoom) return;

    if (enteredPassword.trim() === passwordPromptRoom.password?.trim()) {
      sounds.playCorrect();
      const code = passwordPromptRoom.id;
      setPasswordPromptRoom(null);
      closeModal();
      router.push(`/play/friends/room/${code}`);
    } else {
      sounds.playWrong();
      setPasswordError("Mật khẩu phòng không chính xác!");
    }
  };

  const filteredRooms = roomsList.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.hostNickname.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[36px] border border-primary/20 bg-background/95 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground">Sảnh Đấu Trường Bạn Bè</h2>
              <p className="text-[11px] text-muted-foreground font-medium">Tạo phòng tùy thích, đặt mật khẩu & giao lưu</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-muted/60 p-1.5 mt-4 shrink-0 gap-1">
          <button
            onClick={() => {
              setTab("lobby");
              sounds.playClick();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "lobby" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Phòng Đang Mở ({roomsList.length})</span>
          </button>
          <button
            onClick={() => {
              setTab("create");
              sounds.playClick();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Tạo Phòng Mới</span>
          </button>
          <button
            onClick={() => {
              setTab("join");
              sounds.playClick();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "join" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-blue-500" />
            <span>Nhập Mã</span>
          </button>
        </div>

        {/* ================= TAB 1: LOBBY ACTIVE ROOMS ================= */}
        {tab === "lobby" && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-3.5 wordfight-scrollbar pr-1">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Tìm phòng theo tên, chủ phòng hoặc mã..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-muted/40 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={refreshRooms}
                disabled={loadingRooms}
                className="flex items-center gap-1 h-9 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingRooms ? "animate-spin" : ""}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {loadingRooms ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Đang quét phòng đấu trực tuyến...</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-muted-foreground">Hiện chưa có phòng nào đang mở.</p>
                <button
                  type="button"
                  onClick={() => setTab("create")}
                  className="btn-wf-primary h-10 px-5 rounded-2xl text-xs font-black text-primary-foreground inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tạo Phòng Đầu Tiên Ngay</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredRooms.map((room) => {
                  const theme = ROOM_COLOR_THEMES.find((t) => t.id === room.themeColor) || ROOM_COLOR_THEMES[0];
                  return (
                    <div
                      key={room.id}
                      className={`relative flex flex-col justify-between p-4 rounded-3xl border-2 bg-gradient-to-br ${theme.bg} ${theme.border} transition-all hover:scale-[1.02] shadow-sm`}
                    >
                      <div>
                        {/* Top badges */}
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${theme.badge}`}>
                              #{room.id}
                            </span>
                            {room.betCoins ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <Coins className="h-3 w-3 fill-amber-500" />
                                {room.betCoins.toLocaleString("vi-VN")} Xu
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600">
                                Miễn Phí
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                            <span>{room.language === "vi" ? "🇻🇳" : "🇬🇧"}</span>
                            {room.hasPassword && <Lock className="h-3 w-3 text-amber-500" />}
                          </div>
                        </div>

                        {/* Room Name */}
                        <h3 className="font-black text-sm text-foreground truncate">{room.name}</h3>

                        {/* Host info */}
                        <div className="flex items-center gap-2 mt-2">
                          <div
                            className={`h-6 w-6 rounded-full bg-gradient-to-br ${room.hostAvatarColor} text-white flex items-center justify-center font-black text-[10px]`}
                          >
                            {room.hostNickname[0]}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground truncate">{room.hostNickname}</span>
                        </div>
                      </div>

                      {/* Bottom action row */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {room.playerCount}/2 người
                        </span>
                        <button
                          type="button"
                          onClick={() => handleJoinFromLobby(room)}
                          className="btn-wf-primary h-8 px-4 rounded-xl text-xs font-black text-primary-foreground flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Vào Phòng</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: CREATE CUSTOM ROOM ================= */}
        {tab === "create" && (
          <form onSubmit={handleCreateRoom} className="mt-4 flex-1 overflow-y-auto space-y-4 wordfight-scrollbar pr-1">
            {/* Room Name */}
            <div>
              <label className="block text-xs font-black text-foreground mb-1.5">Tên Phòng Đấu:</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={30}
                placeholder="VD: Phòng Solo Cao Thủ, Đại Chiến Nối Chữ..."
                className="w-full h-11 px-4 rounded-2xl border border-border bg-muted/40 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                required
              />
            </div>

            {/* Coin Wager Selector */}
            <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">Mức Cược Xu Vàng:</span>
                </div>
                <span className="text-[11px] font-black text-foreground">
                  {betCoins === 0 ? "Miễn Phí" : `${betCoins.toLocaleString("vi-VN")} Xu / người`}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {BET_COIN_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setBetCoins(preset);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                      betCoins === preset
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm scale-102"
                        : "bg-background/80 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {preset === 0 ? "Miễn Phí" : `${preset >= 1000 ? `${preset / 1000}k` : preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Theme Color Picker */}
            <div>
              <label className="block text-xs font-black text-foreground mb-1.5">Màu Sắc Phòng Đấu:</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ROOM_COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedColor(theme.id as any)}
                    className={`p-2 rounded-2xl border-2 text-center text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      selectedColor === theme.id
                        ? `${theme.border} bg-background scale-105 shadow-md ring-2 ring-primary/30`
                        : "border-border/60 bg-muted/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${theme.bg.replace('/20', '')}`} />
                    <span className="text-[10px]">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language & Turn Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-foreground mb-1.5">Ngôn Ngữ:</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-2xl border border-border bg-muted/40 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇬🇧 Tiếng Anh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-foreground mb-1.5">Thời Gian / Lượt:</label>
                <select
                  value={turnTimeSec}
                  onChange={(e) => setTurnTimeSec(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-2xl border border-border bg-muted/40 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value={15}>⚡ 15 Giây (Nhanh)</option>
                  <option value={20}>⏱️ 20 Giây (Chuẩn)</option>
                  <option value={30}>⏳ 30 Giây (Thư thả)</option>
                </select>
              </div>
            </div>

            {/* Room Password Toggle */}
            <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasPassword ? <Lock className="h-4 w-4 text-amber-500" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-xs font-bold text-foreground">Đặt Mật Khẩu Khóa Phòng</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasPassword}
                  onChange={(e) => setHasPassword(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {hasPassword && (
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Nhập mật khẩu phòng..."
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                  required={hasPassword}
                />
              )}
            </div>

            {/* Submit Create */}
            <button
              type="submit"
              disabled={creatingRoom}
              className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-xs"
            >
              {creatingRoom ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Tạo Phòng & Mở Cửa Đón Bạn</span>
            </button>
          </form>
        )}

        {/* ================= TAB 3: JOIN BY CODE WITH VALIDATION ================= */}
        {tab === "join" && (
          <form onSubmit={handleJoinByCode} className="mt-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <label className="block text-xs font-black text-foreground">Nhập Mã Số Phòng (5 Số):</label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => {
                  setRoomCodeInput(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                maxLength={8}
                placeholder="VD: 82914"
                className="w-full h-14 px-4 rounded-2xl border-2 border-primary/30 bg-muted/40 font-mono text-center text-2xl font-black tracking-widest text-foreground focus:outline-none focus:border-primary uppercase"
                required
              />

              {joinError && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                💡 Hệ thống sẽ kiểm tra phòng trước khi vào để tránh vào nhầm phòng không tồn tại.
              </p>
            </div>

            <button
              type="submit"
              disabled={checkingCode || !roomCodeInput.trim()}
              className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-xs"
            >
              {checkingCode ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>Kiểm Tra & Vào Phòng</span>
            </button>
          </form>
        )}

        {/* ================= PASSWORD PROMPT MODAL ================= */}
        {passwordPromptRoom && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in zoom-in-95">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-background border border-primary/30 shadow-2xl space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Phòng Có Mật Khẩu</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vui lòng nhập mật khẩu để vào <strong>{passwordPromptRoom.name}</strong>
                </p>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleVerifyPassword} className="space-y-3">
                <input
                  type="password"
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Nhập mật khẩu phòng..."
                  className="w-full h-11 px-4 rounded-xl border border-border bg-muted/40 font-bold text-xs text-foreground focus:outline-none focus:border-primary text-center"
                  autoFocus
                  required
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordPromptRoom(null)}
                    className="flex-1 h-10 rounded-xl border border-border bg-muted/40 text-xs font-bold text-foreground cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-wf-primary flex-1 h-10 rounded-xl text-xs font-black text-primary-foreground cursor-pointer shadow-sm"
                  >
                    Xác Nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
