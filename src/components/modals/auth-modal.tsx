"use client";

import React, { useState } from "react";
import { X, Lock, Mail, User, Eye, EyeOff, Sparkles, Check, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { sounds } from "@/lib/sound-effects";

const AVATAR_COLORS = [
  { name: "Lục Bảo", value: "from-emerald-400 to-green-600" },
  { name: "Đại Dương", value: "from-cyan-400 to-blue-600" },
  { name: "Hoàng Gia", value: "from-purple-400 to-indigo-600" },
  { name: "Hổ Phách", value: "from-amber-400 to-orange-600" },
  { name: "Hồng Ngọc", value: "from-rose-400 to-pink-600" },
  { name: "Huyền Bí", value: "from-slate-700 to-slate-900" },
];

export function AuthModal() {
  const { activeModal, closeModal, login, register } = useGame();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (activeModal !== "auth") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const ident = emailOrUsername.trim();
    if (!ident || !password.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ Tên tài khoản/Email và Mật khẩu!");
      sounds.playWrong();
      return;
    }

    if (tab === "register") {
      const nick = nickname.trim() || ident;
      if (password.length < 6) {
        setErrorMessage("Mật khẩu phải có tối thiểu 6 ký tự!");
        sounds.playWrong();
        return;
      }

      setLoading(true);
      const res = await register(ident, password, nick, selectedColor);
      setLoading(false);

      if (res.success) {
        sounds.playFanfare();
        setSuccessMessage("Đăng ký thành công! Đã nhận 50 💎 khởi đầu.");
        setTimeout(() => {
          closeModal();
        }, 1200);
      } else {
        sounds.playWrong();
        setErrorMessage(res.error || "Lỗi đăng ký tài khoản!");
      }
    } else {
      setLoading(true);
      const res = await login(ident, password);
      setLoading(false);

      if (res.success) {
        sounds.playCorrect();
        setSuccessMessage("Đăng nhập thành công! Chào mừng bạn trở lại.");
        setTimeout(() => {
          closeModal();
        }, 1000);
      } else {
        sounds.playWrong();
        setErrorMessage(res.error || "Tài khoản hoặc Mật khẩu không chính xác!");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-primary/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">
                {tab === "login" ? "Đăng Nhập Tài Khoản" : "Tạo Tài Khoản Mới"}
              </h2>
              <p className="text-[11px] font-medium text-muted-foreground">
                Lưu trữ tiến độ, kim cương & chơi cùng bạn bè
              </p>
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
        <div className="flex rounded-2xl bg-muted/60 p-1 mt-4">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              tab === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Đăng Ký
          </button>
        </div>

        {/* Error / Success alert */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 mt-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 animate-bounce">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {tab === "register" && (
            <>
              {/* Nickname input */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Tên Hiển Thị (Nickname)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="VD: Chiến Binh Rồng"
                    maxLength={20}
                    className="w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-border/80 bg-muted/30 text-xs font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Chọn Màu Avatar
                </label>
                <div className="flex items-center justify-between gap-1.5 p-2 rounded-2xl bg-muted/30 border border-border/60">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${c.value} transition-transform ${
                        selectedColor === c.value ? "scale-110 ring-2 ring-primary ring-offset-2" : "opacity-75 hover:opacity-100"
                      }`}
                    >
                      {selectedColor === c.value && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email or Username input */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              {tab === "register" ? "Email hoặc Tên Tài Khoản" : "Email hoặc Tên Đăng Nhập"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="VD: user123 hoặc name@example.com"
                className="w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-border/80 bg-muted/30 text-xs font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Mật Khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full h-11 pl-10 pr-10 rounded-2xl border-2 border-border/80 bg-muted/30 text-xs font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {tab === "register" && (
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-600">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Đăng ký ngay nhận ngay 50 💎 Kim Cương khởi nghiệp!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : tab === "login" ? (
              <>
                <ArrowRight className="h-4 w-4" /> Đăng Nhập Ngay
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Đăng Ký Tài Khoản
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
