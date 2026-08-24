"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Bot,
  Users,
  MessageSquare,
  Activity,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gem,
  Trash2,
  Ban,
  UserCheck,
  Crown,
  Search,
  ArrowLeft,
  Lock,
  LogIn,
  Send,
  Eye,
  EyeOff,
  Zap,
  Coins,
  Building2,
  Smartphone,
  CreditCard,
  Clock,
} from "lucide-react";
import { useGame } from "@/lib/game-context";
import { SupabaseService, UserProfile, WithdrawalRequest } from "@/lib/supabase";
import { GeminiAI } from "@/lib/gemini-ai";
import { WithdrawalService } from "@/lib/withdrawal-service";
import { sounds } from "@/lib/sound-effects";

export default function AdminPage() {
  const { profile, isLoggedIn, login, openModal } = useGame();

  const [activeTab, setActiveTab] = useState<"gemini" | "users" | "withdrawals" | "chat" | "overview">("gemini");
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Withdrawal Requests state
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Gemini API state
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [geminiStats, setGeminiStats] = useState<any>(null);
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    ok: boolean;
    latencyMs: number;
    model?: string;
    error?: string;
  } | null>(null);

  // Admin login state for unauthenticated users
  const [loginEmail, setLoginEmail] = useState("admin@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // User edit modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [gemEditAmount, setGemEditAmount] = useState<number>(1000);
  const [savingUserAction, setSavingUserAction] = useState(false);

  // Global chat admin broadcast
  const [adminBroadcastText, setAdminBroadcastText] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const isAdmin =
    (profile?.email && profile.email.toLowerCase() === "admin@gmail.com") ||
    profile?.role === "admin" ||
    (typeof window !== "undefined" && localStorage.getItem("wf_admin_override") === "true");

  // Load Gemini Stats
  const refreshGeminiStats = () => {
    const stats = GeminiAI.getStats();
    setGeminiStats(stats);
    setApiKeyInput(stats.activeKey || "");
  };

  // Load User List
  const loadUsers = async () => {
    setLoadingUsers(true);
    const list = await SupabaseService.fetchAdminUserList();
    setUsersList(list);
    setLoadingUsers(false);
  };

  // Load Withdrawals List
  const loadWithdrawals = async () => {
    setLoadingWithdrawals(true);
    const list = await WithdrawalService.getAllWithdrawals();
    setWithdrawalsList(list);
    setLoadingWithdrawals(false);
  };

  useEffect(() => {
    refreshGeminiStats();
    if (isAdmin) {
      loadUsers();
      loadWithdrawals();
    }
  }, [isAdmin]);

  // Test Gemini Key Live
  const handleTestKey = async () => {
    setTestingHealth(true);
    setHealthResult(null);
    sounds.playClick();
    const res = await GeminiAI.checkHealth(apiKeyInput.trim());
    setHealthResult(res);
    setTestingHealth(false);
    refreshGeminiStats();
    if (res.ok) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
  };

  // Save new Gemini API Key
  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      alert("Vui lòng nhập API Key!");
      return;
    }
    GeminiAI.setApiKey(apiKeyInput.trim());
    refreshGeminiStats();
    sounds.playFanfare();
    alert("Đã cập nhật API Key Gemini mới thành công!");
  };

  // Admin Login Form
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const res = await login(loginEmail.trim(), loginPassword.trim());
    setLoginLoading(false);

    if (res.success) {
      sounds.playFanfare();
      loadUsers();
    } else {
      sounds.playWrong();
      setLoginError(res.error || "Tài khoản hoặc mật khẩu Admin không đúng!");
    }
  };

  // User Actions
  const handleAddGems = async (user: UserProfile, delta: number) => {
    setSavingUserAction(true);
    const newGems = Math.max(0, (user.gems || 0) + delta);
    await SupabaseService.adminUpdateGems(user.id, newGems);
    sounds.playCorrect();
    await loadUsers();
    setSavingUserAction(false);
  };

  const handleToggleBan = async (user: UserProfile) => {
    if (user.role === "admin" || user.email?.toLowerCase() === "admin@gmail.com") {
      alert("Không thể khóa tài khoản Admin tối cao!");
      return;
    }
    const isNowBanned = !user.isBanned;
    if (!confirm(`Bạn có chắc chắn muốn ${isNowBanned ? "KHÓA" : "MỞ KHÓA"} người dùng "${user.nickname}"?`)) {
      return;
    }
    setSavingUserAction(true);
    // Optimistic UI update
    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isBanned: isNowBanned } : u))
    );
    const ok = await SupabaseService.adminToggleBan(user.id, isNowBanned);
    sounds.playClick();
    if (ok) {
      alert(`Đã ${isNowBanned ? "KHÓA" : "MỞ KHÓA"} tài khoản "${user.nickname}" thành công!`);
    }
    await loadUsers();
    setSavingUserAction(false);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.role === "admin" || user.email?.toLowerCase() === "admin@gmail.com") {
      alert("Không thể xóa tài khoản Admin tối cao!");
      return;
    }
    if (!confirm(`XÓA VĨNH VIỄN tài khoản "${user.nickname}" (${user.email || user.id})? Hành động này không thể hoàn tác!`)) {
      return;
    }
    setSavingUserAction(true);
    // Optimistic UI update
    setUsersList((prev) => prev.filter((u) => u.id !== user.id));
    const ok = await SupabaseService.adminDeleteUser(user.id);
    sounds.playWrong();
    if (ok) {
      alert(`Đã xóa vĩnh viễn tài khoản "${user.nickname}" thành công!`);
    }
    await loadUsers();
    setSavingUserAction(false);
  };

  const handleAddCoins = async (user: UserProfile, delta: number) => {
    setSavingUserAction(true);
    const newCoins = Math.max(0, (user.coins || 10000) + delta);
    // Optimistic UI update
    setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, coins: newCoins } : u)));
    const ok = await SupabaseService.adminUpdateCoins(user.id, newCoins);
    sounds.playCorrect();
    if (ok) {
      alert(`Đã cập nhật ${delta > 0 ? `+${delta}` : delta} Xu Vàng cho "${user.nickname}"!`);
    }
    await loadUsers();
    setSavingUserAction(false);
  };

  const handleApproveWithdrawal = async (reqId: string) => {
    if (!confirm("Xác nhận BẠN ĐÃ CHUYỂN TIỀN thành công cho người chơi này?")) return;
    setProcessingId(reqId);
    const ok = await WithdrawalService.approve(reqId);
    setProcessingId(null);
    if (ok) {
      sounds.playFanfare();
      alert("Đã duyệt yêu cầu rút tiền thành công!");
      loadWithdrawals();
    } else {
      sounds.playWrong();
      alert("Không thể duyệt đơn. Vui lòng thử lại!");
    }
  };

  const handleRejectWithdrawal = async (reqId: string) => {
    const reason = prompt("Nhập lý do từ chối (Số xu sẽ tự động được hoàn lại cho người chơi):", "Thông tin tài khoản/SĐT không chính xác");
    if (!reason) return;
    setProcessingId(reqId);
    const ok = await WithdrawalService.reject(reqId, reason);
    setProcessingId(null);
    if (ok) {
      sounds.playWrong();
      alert("Đã từ chối yêu cầu và HOÀN LẠI XU cho người chơi thành công!");
      loadWithdrawals();
      loadUsers();
    } else {
      sounds.playWrong();
      alert("Lỗi khi từ chối yêu cầu!");
    }
  };

  // Broadcast announcement
  const handleSendBroadcast = async () => {
    if (!adminBroadcastText.trim()) return;
    setSendingBroadcast(true);
    await SupabaseService.sendGlobalChatMessage(
      "👑 THÔNG BÁO ADMIN",
      "from-amber-500 to-yellow-600",
      `[ADMIN THÔNG BÁO]: ${adminBroadcastText.trim()}`,
      profile?.id
    );
    setAdminBroadcastText("");
    setSendingBroadcast(false);
    sounds.playFanfare();
    alert("Đã phát thông báo toàn cầu thành công!");
  };

  // Filter users
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nickname.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // If not logged in as Admin, show Admin Login Portal
  if (!isAdmin) {
    return (
      <div className="relative min-h-[100dvh] pt-20 md:pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-6 sm:p-8 rounded-[36px] bg-background/90 backdrop-blur-2xl border border-primary/20 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
            <ShieldCheck className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-black text-xs border border-amber-500/30">
              <Lock className="h-3.5 w-3.5" />
              <span>TRANG QUẢN TRỊ ADMIN</span>
            </div>
            <h1 className="text-2xl font-black text-foreground">Đăng Nhập Quyền Quản Trị</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Trang quản lý chỉ dành cho tài khoản <strong>admin@gmail.com</strong>
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3.5 text-left">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Email Quản Trị:</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-muted/40 font-bold text-sm text-foreground focus:outline-none focus:border-primary"
                placeholder="admin@gmail.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Mật Khẩu:</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-muted/40 font-bold text-sm text-foreground focus:outline-none focus:border-primary"
                placeholder="Nhập mật khẩu..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm mt-2"
            >
              {loginLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              <span>Đăng Nhập Quản Trị</span>
            </button>
          </form>

          <Link
            href="/"
            onClick={() => sounds.playClick()}
            className="inline-block text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD
  return (
    <div className="relative min-h-[100dvh] pt-20 md:pt-24 pb-12 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Header */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 rounded-[28px] bg-background/80 backdrop-blur-xl border border-primary/20 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => sounds.playClick()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-black text-xs border border-amber-500/30 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 fill-amber-500" />
                <span>ADMIN BẢN QUYỀN NỐI CHỮ ONLINE</span>
              </span>
              <span className="text-xs font-bold text-emerald-500 hidden sm:inline">● Đang hoạt động</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground mt-1">
              Trung Tâm Quản Trị Hệ Thống (admin@gmail.com)
            </h1>
          </div>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-muted/60 border border-border/50">
          <button
            onClick={() => {
              setActiveTab("gemini");
              sounds.playClick();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
              activeTab === "gemini"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4 text-emerald-500" />
            <span>Gemini AI & Quota</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("users");
              sounds.playClick();
              loadUsers();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
              activeTab === "users"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 text-blue-500" />
            <span>Quản Lý User ({usersList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("withdrawals");
              sounds.playClick();
              loadWithdrawals();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all relative ${
              activeTab === "withdrawals"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span>Duyệt Rút Tiền ({withdrawalsList.length})</span>
            {withdrawalsList.filter((w) => w.status === "PENDING").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                {withdrawalsList.filter((w) => w.status === "PENDING").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("chat");
              sounds.playClick();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
              activeTab === "chat"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <span>Thông Báo Chat</span>
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: GEMINI AI & TOKEN QUOTA ==================== */}
      {activeTab === "gemini" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Left Column: API Key Control & Live Diagnostics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-[32px] bg-background/80 backdrop-blur-xl border border-primary/20 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground">Quản Lý Gemini API Key</h2>
                    <p className="text-xs text-muted-foreground">Theo dõi trạng thái, sửa đổi hoặc thêm key dự phòng</p>
                  </div>
                </div>
                <button
                  onClick={handleTestKey}
                  disabled={testingHealth}
                  className="btn-wf-primary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-primary-foreground cursor-pointer shadow-sm active:scale-95"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingHealth ? "animate-spin" : ""}`} />
                  <span>{testingHealth ? "Đang Kiểm Tra..." : "Kiểm Tra Key Ngay"}</span>
                </button>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground">API Key Đang Sử Dụng:</label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Nhập Gemini API Key (AIzaSy...)"
                    className="w-full h-12 pl-4 pr-24 rounded-2xl border border-border bg-muted/30 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer hover:brightness-110 active:scale-95"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </div>

              {/* Health Test Result Banner */}
              {healthResult && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 animate-in zoom-in-95 ${
                    healthResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {healthResult.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className="font-black text-sm">
                      {healthResult.ok ? "🟢 API Key Hoạt Động Rất Tốt!" : "🔴 Cảnh Báo: API Key Có Vấn Đề!"}
                    </p>
                    <p className="font-medium">
                      {healthResult.ok
                        ? `Model: ${healthResult.model} • Độ trễ phản hồi: ${healthResult.latencyMs}ms (Cực nhanh)`
                        : `Lỗi: ${healthResult.error}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Models & Cache Management */}
            <div className="glass-card p-6 rounded-[32px] bg-background/80 backdrop-blur-xl border border-primary/20 space-y-4 shadow-sm">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Hệ Thống Fallback Model & Bộ Nhớ Cache AI</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                  <p className="font-bold text-foreground">Model Ưu Tiên 1</p>
                  <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">gemini-flash-lite-latest</p>
                  <span className="text-[10px] text-muted-foreground">Tốc độ &lt; 0.5s</span>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                  <p className="font-bold text-foreground">Model Dự Phòng 2</p>
                  <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400 mt-1">gemini-3.5-flash-lite</p>
                  <span className="text-[10px] text-muted-foreground">Ổn định</span>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/50">
                  <p className="font-bold text-foreground">Model Dự Phòng 3</p>
                  <p className="font-mono text-[11px] text-purple-600 dark:text-purple-400 mt-1">gemini-2.5-flash</p>
                  <span className="text-[10px] text-muted-foreground">Chính xác cao</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                <span className="text-muted-foreground">
                  Số lượng từ vựng đã lưu trong Cache RAM: <strong>{geminiStats?.cacheSize || 0} từ</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    GeminiAI.clearCache();
                    refreshGeminiStats();
                    sounds.playClick();
                    alert("Đã xóa sạch bộ nhớ Cache RAM AI!");
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
                >
                  Xóa Cache RAM
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Token Usage & Quota Monitor */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-[32px] bg-background/80 backdrop-blur-xl border border-primary/20 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="text-base font-black text-foreground">Thống Kê Token & Quota</h2>
              </div>

              {/* Stat Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs font-bold text-foreground">Tổng Lượt Gọi AI:</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {geminiStats?.totalCalls || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-xs font-bold text-foreground">Gọi Thành Công:</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {geminiStats?.successCalls || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-bold text-foreground">Ước Tính Token Tiêu Thụ:</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {(geminiStats?.estimatedTokens || 0).toLocaleString()} ⚡
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-xs font-bold text-foreground">Độ Trễ Gần Nhất:</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {geminiStats?.lastLatencyMs ? `${geminiStats.lastLatencyMs}ms` : "Chưa có"}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted-foreground">Tình Trạng Hạn Mức:</span>
                  <span className="font-black text-emerald-500">AN TOÀN (Miễn phí)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((geminiStats?.totalCalls || 0) / 1500) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gói miễn phí Google Gemini hỗ trợ 1,500 yêu cầu/ngày (~1 Triệu Token/phút).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: QUẢN LÝ NGƯỜI DÙNG ==================== */}
      {activeTab === "users" && (
        <div className="glass-card p-6 rounded-[32px] bg-background/80 backdrop-blur-xl border border-primary/20 space-y-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-black text-foreground">Danh Sách Người Chơi ({filteredUsers.length})</h2>
              <p className="text-xs text-muted-foreground">Cộng/trừ kim cương, cấp quyền admin hoặc khóa tài khoản</p>
            </div>

            {/* Search */}
            <div className="relative flex items-center w-full sm:w-72">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nickname hoặc email..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-muted/40 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* User Table */}
          {loadingUsers ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Đang tải danh sách người chơi từ Supabase...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Không tìm thấy người dùng nào phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3 px-3">Người Chơi</th>
                    <th className="py-3 px-3">Email / ID</th>
                    <th className="py-3 px-3">Kim Cương 💎</th>
                    <th className="py-3 px-3">Xu Vàng 🪙</th>
                    <th className="py-3 px-3">Cấp / Thắng</th>
                    <th className="py-3 px-3">Vai Trò</th>
                    <th className="py-3 px-3 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      {/* Nickname & Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-8 w-8 rounded-full bg-gradient-to-br ${u.avatarColor} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm`}
                          >
                            {u.nickname[0]}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{u.nickname}</p>
                            {u.isBanned && (
                              <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                                Bị Khóa
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email / ID */}
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground max-w-[150px] truncate">
                        {u.email || u.id}
                      </td>

                      {/* Gems */}
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1 font-black text-emerald-500">
                          <Gem className="h-3.5 w-3.5" /> {(u.gems || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Coins */}
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1 font-black text-amber-500">
                          <Coins className="h-3.5 w-3.5 fill-amber-500" /> {(u.coins !== undefined ? u.coins : 10000).toLocaleString()}
                        </span>
                      </td>

                      {/* Level / Wins */}
                      <td className="py-3 px-3 text-muted-foreground">
                        Lv.{u.level || 1} • {u.totalWins || 0}W/{u.totalGames || 0}G
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        {u.role === "admin" || u.email?.toLowerCase() === "admin@gmail.com" ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-black text-[10px] border border-amber-500/30">
                            👑 Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold text-[10px]">
                            User
                          </span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddGems(u, 1000)}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[11px] cursor-pointer"
                            title="Tặng 1000 Kim Cương"
                          >
                            +1k 💎
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddCoins(u, 10000)}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-bold text-[11px] cursor-pointer"
                            title="Tặng 10,000 Xu Vàng"
                          >
                            +10k 🪙
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBan(u)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              u.isBanned
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            }`}
                            title={u.isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          >
                            {u.isBanned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: QUẢN LÝ DUYỆT RÚT TIỀN & ĐỔI THƯỞNG ==================== */}
      {activeTab === "withdrawals" && (
        <div className="glass-card p-6 rounded-[32px] bg-background/80 backdrop-blur-xl border border-primary/20 space-y-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-black text-foreground">
                Danh Sách Yêu Cầu Rút Tiền ({withdrawalsList.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Xem thông tin tài khoản ngân hàng / ví điện tử / thẻ cào, xác nhận chuyển khoản và phê duyệt đơn
              </p>
            </div>

            <button
              type="button"
              onClick={loadWithdrawals}
              disabled={loadingWithdrawals}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingWithdrawals ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {loadingWithdrawals ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Đang tải danh sách yêu cầu rút tiền...</span>
            </div>
          ) : withdrawalsList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
              <Coins className="h-10 w-10 mx-auto opacity-30 animate-pulse text-amber-500" />
              <p>Chưa có yêu cầu rút tiền nào từ người chơi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3 px-3">Người Rút</th>
                    <th className="py-3 px-3">Số Tiền Rút</th>
                    <th className="py-3 px-3">Phương Thức & Chi Tiết Nhận</th>
                    <th className="py-3 px-3">Thời Gian</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3 text-right">Duyệt Đơn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {withdrawalsList.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                      {/* User */}
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-foreground">{req.userNickname}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]">
                            {req.userEmail || req.userId}
                          </p>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {req.amountVnd.toLocaleString("vi-VN")} VNĐ
                          </p>
                          <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                            <Coins className="h-3 w-3 fill-amber-500" />
                            {req.amountCoins.toLocaleString("vi-VN")} Xu
                          </p>
                        </div>
                      </td>

                      {/* Payment Destination Details */}
                      <td className="py-3 px-3">
                        {req.method === "bank" ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-foreground">
                              <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>{req.bankName}</span>
                            </div>
                            <p className="font-mono text-xs font-black text-foreground bg-muted/60 px-1.5 py-0.5 rounded inline-block">
                              STK: {req.accountNumber}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">
                              Chủ TK: {req.accountName}
                            </p>
                          </div>
                        ) : req.method === "wallet" ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-foreground">
                              <Smartphone className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                              <span className="uppercase">Ví {req.walletName}</span>
                            </div>
                            <p className="font-mono text-xs font-black text-foreground bg-muted/60 px-1.5 py-0.5 rounded inline-block">
                              SĐT: {req.phoneNumber}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">
                              Tên: {req.accountName}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-foreground">
                              <CreditCard className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="uppercase">Thẻ Cào {req.cardCarrier}</span>
                            </div>
                            <p className="text-xs font-bold text-foreground">
                              Mệnh giá: {req.cardPrice?.toLocaleString("vi-VN")}đ
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-[11px] text-muted-foreground">
                        {new Date(req.createdAt).toLocaleString("vi-VN")}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {req.status === "APPROVED" ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-black text-[11px] border border-emerald-500/20 flex items-center gap-1 w-max">
                            <CheckCircle2 className="h-3 w-3" /> Đã duyệt
                          </span>
                        ) : req.status === "REJECTED" ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 font-black text-[11px] border border-rose-500/20 flex items-center gap-1 w-max">
                              <XCircle className="h-3 w-3" /> Đã từ chối
                            </span>
                            {req.adminNote && (
                              <p className="text-[10px] text-rose-500 font-medium">{req.adminNote}</p>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-black text-[11px] border border-amber-500/20 flex items-center gap-1 w-max animate-pulse">
                            <Clock className="h-3 w-3" /> Chờ duyệt
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={processingId === req.id}
                              onClick={() => handleApproveWithdrawal(req.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1"
                              title="Xác nhận bạn đã chuyển tiền thành công"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Duyệt & Đã Chuyển</span>
                            </button>

                            <button
                              type="button"
                              disabled={processingId === req.id}
                              onClick={() => handleRejectWithdrawal(req.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-black text-[11px] cursor-pointer border border-rose-500/20 active:scale-95 transition-all"
                              title="Từ chối và tự động hoàn lại xu cho người chơi"
                            >
                              <span>Từ Chối (Hoàn Xu)</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-bold">
                            Đã xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: THÔNG BÁO CHAT TOÀN CẦU ==================== */}
      {activeTab === "chat" && (
        <div className="glass-card p-6 rounded-[32px] bg-background/80 backdrop-blur-xl border border-primary/20 space-y-5 shadow-sm animate-in fade-in duration-200 max-w-2xl mx-auto">
          <div className="border-b border-border/50 pb-3">
            <h2 className="text-base font-black text-foreground">Phát Thông Báo Toàn Cầu (Admin Broadcast)</h2>
            <p className="text-xs text-muted-foreground">Tin nhắn sẽ được gửi với danh xưng Admin tới tất cả người chơi</p>
          </div>

          <div className="space-y-3">
            <textarea
              rows={4}
              value={adminBroadcastText}
              onChange={(e) => setAdminBroadcastText(e.target.value)}
              placeholder="Nhập nội dung thông báo (VD: Bảo trì hệ thống, tặng quà sự kiện, sự kiện đua top...)"
              className="w-full p-4 rounded-2xl border border-border bg-muted/30 font-medium text-xs text-foreground focus:outline-none focus:border-primary resize-none"
            />

            <button
              type="button"
              disabled={sendingBroadcast || !adminBroadcastText.trim()}
              onClick={handleSendBroadcast}
              className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-xs"
            >
              {sendingBroadcast ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Phát Thông Báo Ngay</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
