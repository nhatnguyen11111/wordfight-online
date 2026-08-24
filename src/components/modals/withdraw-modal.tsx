"use client";

import React, { useState, useEffect } from "react";
import { useGame } from "@/lib/game-context";
import {
  WithdrawalService,
  POPULAR_BANKS,
  WALLET_PROVIDERS,
  TELCO_CARRIERS,
  TELCO_DENOMINATIONS,
  MIN_WITHDRAWAL_COINS,
} from "@/lib/withdrawal-service";
import { WithdrawalRequest } from "@/lib/supabase";
import { sounds } from "@/lib/sound-effects";
import {
  Coins,
  Building2,
  Smartphone,
  CreditCard,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function WithdrawModal() {
  const { activeModal, closeModal, profile, deductCoins } = useGame();
  const [activeTab, setActiveTab] = useState<"bank" | "wallet" | "card" | "history">("bank");

  // Bank Form State
  const [selectedBank, setSelectedBank] = useState("MB");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankAmount, setBankAmount] = useState<number>(20000);

  // Wallet Form State
  const [selectedWallet, setSelectedWallet] = useState("momo");
  const [walletPhone, setWalletPhone] = useState("");
  const [walletName, setWalletName] = useState("");
  const [walletAmount, setWalletAmount] = useState<number>(20000);

  // Card Form State
  const [selectedCarrier, setSelectedCarrier] = useState("viettel");
  const [cardPrice, setCardPrice] = useState<number>(20000);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<WithdrawalRequest[]>([]);

  const userCoins = profile.coins !== undefined ? profile.coins : 10000;

  // Load history when opening history tab or modal
  const loadHistory = async () => {
    if (profile.id) {
      const list = await WithdrawalService.getUserWithdrawals(profile.id);
      setHistoryList(list);
    }
  };

  useEffect(() => {
    if (activeModal === "withdraw") {
      loadHistory();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [activeModal, profile.id]);

  if (activeModal !== "withdraw") return null;

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!accountNumber.trim() || !accountName.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ số tài khoản và tên chủ thẻ!");
      sounds.playWrong();
      return;
    }

    if (bankAmount < MIN_WITHDRAWAL_COINS) {
      setErrorMsg(`Số xu rút tối thiểu là ${MIN_WITHDRAWAL_COINS.toLocaleString("vi-VN")} Xu!`);
      sounds.playWrong();
      return;
    }

    if (bankAmount > userCoins) {
      setErrorMsg("Số dư Xu Vàng của bạn không đủ để thực hiện yêu cầu này!");
      sounds.playWrong();
      return;
    }

    setSubmitting(true);
    sounds.playClick();

    const ok = deductCoins(bankAmount);
    if (!ok) {
      setErrorMsg("Không đủ số dư Xu Vàng!");
      setSubmitting(false);
      return;
    }

    const res = await WithdrawalService.requestWithdrawal({
      userId: profile.id,
      userNickname: profile.nickname,
      userEmail: profile.email,
      amountCoins: bankAmount,
      amountVnd: bankAmount,
      method: "bank",
      bankName: selectedBank,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim().toUpperCase(),
    });

    setSubmitting(false);

    if (res.success) {
      sounds.playFanfare();
      setSuccessMsg(`Yêu cầu rút ${bankAmount.toLocaleString("vi-VN")} VNĐ về ${selectedBank} đã được gửi thành công! Quản trị viên sẽ xử lý chuyển khoản trong ít phút.`);
      setAccountNumber("");
      setAccountName("");
      loadHistory();
    } else {
      sounds.playWrong();
      setErrorMsg(res.error || "Lỗi khi gửi yêu cầu");
    }
  };

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!walletPhone.trim() || !walletName.trim()) {
      setErrorMsg("Vui lòng điền số điện thoại ví và tên người nhận!");
      sounds.playWrong();
      return;
    }

    if (walletAmount < MIN_WITHDRAWAL_COINS) {
      setErrorMsg(`Số xu rút tối thiểu là ${MIN_WITHDRAWAL_COINS.toLocaleString("vi-VN")} Xu!`);
      sounds.playWrong();
      return;
    }

    if (walletAmount > userCoins) {
      setErrorMsg("Số dư Xu Vàng không đủ!");
      sounds.playWrong();
      return;
    }

    setSubmitting(true);
    sounds.playClick();

    const ok = deductCoins(walletAmount);
    if (!ok) {
      setErrorMsg("Không đủ số dư Xu Vàng!");
      setSubmitting(false);
      return;
    }

    const res = await WithdrawalService.requestWithdrawal({
      userId: profile.id,
      userNickname: profile.nickname,
      userEmail: profile.email,
      amountCoins: walletAmount,
      amountVnd: walletAmount,
      method: "wallet",
      walletName: selectedWallet,
      phoneNumber: walletPhone.trim(),
      accountName: walletName.trim().toUpperCase(),
    });

    setSubmitting(false);

    if (res.success) {
      sounds.playFanfare();
      setSuccessMsg(`Yêu cầu rút ${walletAmount.toLocaleString("vi-VN")} VNĐ về Ví ${selectedWallet.toUpperCase()} đã gửi thành công!`);
      setWalletPhone("");
      setWalletName("");
      loadHistory();
    } else {
      sounds.playWrong();
      setErrorMsg(res.error || "Lỗi khi gửi yêu cầu");
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (cardPrice > userCoins) {
      setErrorMsg("Số dư Xu Vàng không đủ để đổi thẻ này!");
      sounds.playWrong();
      return;
    }

    setSubmitting(true);
    sounds.playClick();

    const ok = deductCoins(cardPrice);
    if (!ok) {
      setErrorMsg("Không đủ số dư Xu Vàng!");
      setSubmitting(false);
      return;
    }

    const res = await WithdrawalService.requestWithdrawal({
      userId: profile.id,
      userNickname: profile.nickname,
      userEmail: profile.email,
      amountCoins: cardPrice,
      amountVnd: cardPrice,
      method: "card",
      cardCarrier: selectedCarrier,
      cardPrice: cardPrice,
    });

    setSubmitting(false);

    if (res.success) {
      sounds.playFanfare();
      setSuccessMsg(`Đã tạo yêu cầu đổi thẻ cào ${selectedCarrier.toUpperCase()} ${cardPrice.toLocaleString("vi-VN")}đ! Mã thẻ sẽ được gửi vào lịch sử duyệt.`);
      loadHistory();
    } else {
      sounds.playWrong();
      setErrorMsg(res.error || "Lỗi khi gửi yêu cầu");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="glass-card relative w-full max-w-lg rounded-[32px] bg-background/95 border border-primary/20 p-5 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            closeModal();
          }}
          className="absolute right-4 top-4 h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* HEADER */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-black">
            <Coins className="h-4 w-4" /> ĐỔI THƯỞNG & RÚT TIỀN THẬT
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">Trung Tâm Rút Tiền</h2>
          <p className="text-xs text-muted-foreground">Tỷ lệ quy đổi: 1.000 Xu = 1.000 VNĐ • Rút tiền nhanh 24/7</p>
        </div>

        {/* BALANCE BANNER */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Coins className="h-6 w-6 fill-current animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground">Số dư Xu Vàng</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                {userCoins.toLocaleString("vi-VN")} Xu
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-muted-foreground">Tương đương</p>
            <p className="text-base font-black text-foreground">
              {userCoins.toLocaleString("vi-VN")} VNĐ
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/50 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("bank");
            }}
            className={`py-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
              activeTab === "bank"
                ? "bg-background text-primary shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Ngân Hàng</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("wallet");
            }}
            className={`py-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
              activeTab === "wallet"
                ? "bg-background text-primary shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Ví Điện Tử</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("card");
            }}
            className={`py-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
              activeTab === "card"
                ? "bg-background text-primary shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Thẻ Cào</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("history");
              loadHistory();
            }}
            className={`py-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
              activeTab === "history"
                ? "bg-background text-primary shadow-sm border border-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Lịch Sử</span>
          </button>
        </div>

        {/* ALERTS */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: BANK */}
        {activeTab === "bank" && (
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-muted-foreground block mb-1.5">1. Chọn Ngân Hàng</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full h-11 px-3.5 rounded-2xl bg-background border border-border text-sm font-bold focus:border-primary focus:outline-none"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-muted-foreground block mb-1.5">2. Số Tài Khoản</label>
                <input
                  type="text"
                  placeholder="Nhập số TK ngân hàng..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-background border border-border text-sm font-bold focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-muted-foreground block mb-1.5">3. Tên Chủ Tài Khoản</label>
                <input
                  type="text"
                  placeholder="NGUYEN VAN A..."
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-background border border-border text-sm font-bold uppercase focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-muted-foreground block mb-1.5">4. Chọn Số Xu Muốn Rút</label>
              <div className="grid grid-cols-3 gap-2">
                {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setBankAmount(amt);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-black border transition-all ${
                      bankAmount === amt
                        ? "bg-amber-500 text-white border-amber-600 shadow-md scale-102"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {amt.toLocaleString("vi-VN")} Xu
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || userCoins < bankAmount}
              className={`btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm ${
                submitting || userCoins < bankAmount ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Đang gửi yêu cầu..." : `Xác Nhận Rút ${bankAmount.toLocaleString("vi-VN")} VNĐ`}
            </button>
          </form>
        )}

        {/* TAB 2: WALLET */}
        {activeTab === "wallet" && (
          <form onSubmit={handleWalletSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-muted-foreground block mb-1.5">1. Chọn Ví Điện Tử</label>
              <div className="grid grid-cols-3 gap-2">
                {WALLET_PROVIDERS.map((w) => (
                  <button
                    key={w.code}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setSelectedWallet(w.code);
                    }}
                    className={`py-2.5 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      selectedWallet === w.code
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${w.color}`} />
                    {w.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-muted-foreground block mb-1.5">2. Số Điện Thoại Ví</label>
                <input
                  type="tel"
                  placeholder="0987654321..."
                  value={walletPhone}
                  onChange={(e) => setWalletPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-background border border-border text-sm font-bold focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-muted-foreground block mb-1.5">3. Tên Người Nhận</label>
                <input
                  type="text"
                  placeholder="NGUYEN VAN A..."
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-background border border-border text-sm font-bold uppercase focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-muted-foreground block mb-1.5">4. Chọn Số Xu Muốn Rút</label>
              <div className="grid grid-cols-3 gap-2">
                {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setWalletAmount(amt);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-black border transition-all ${
                      walletAmount === amt
                        ? "bg-amber-500 text-white border-amber-600 shadow-md scale-102"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {amt.toLocaleString("vi-VN")} Xu
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || userCoins < walletAmount}
              className={`btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm ${
                submitting || userCoins < walletAmount ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Đang gửi yêu cầu..." : `Xác Nhận Rút ${walletAmount.toLocaleString("vi-VN")} VNĐ`}
            </button>
          </form>
        )}

        {/* TAB 3: TELCO CARD */}
        {activeTab === "card" && (
          <form onSubmit={handleCardSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-muted-foreground block mb-1.5">1. Chọn Nhà Mạng</label>
              <div className="grid grid-cols-3 gap-2">
                {TELCO_CARRIERS.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setSelectedCarrier(c.code);
                    }}
                    className={`py-2.5 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      selectedCarrier === c.code
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${c.color}`} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-muted-foreground block mb-1.5">2. Chọn Mệnh Giá Thẻ Cào</label>
              <div className="grid grid-cols-3 gap-2">
                {TELCO_DENOMINATIONS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setCardPrice(amt);
                    }}
                    className={`py-2.5 rounded-2xl text-xs font-black border transition-all ${
                      cardPrice === amt
                        ? "bg-amber-500 text-white border-amber-600 shadow-md scale-102"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {amt.toLocaleString("vi-VN")}đ
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || userCoins < cardPrice}
              className={`btn-wf-primary w-full h-12 rounded-2xl font-black text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all text-sm ${
                submitting || userCoins < cardPrice ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <Zap className="h-4 w-4 fill-current" />
              {submitting ? "Đang tạo mã thẻ..." : `Đổi Thẻ Cào ${cardPrice.toLocaleString("vi-VN")}đ`}
            </button>
          </form>
        )}

        {/* TAB 4: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground">Lịch sử các yêu cầu đổi thưởng & rút tiền của bạn:</p>

            {historyList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs space-y-1.5">
                <Clock className="h-8 w-8 mx-auto opacity-40 animate-pulse" />
                <p>Bạn chưa tạo yêu cầu rút tiền nào.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-black text-foreground">
                        <span>{item.amountVnd.toLocaleString("vi-VN")} VNĐ</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({item.method === "bank" ? item.bankName : item.method === "wallet" ? item.walletName : item.cardCarrier})
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>

                    <div>
                      {item.status === "APPROVED" ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-black text-[11px] border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Đã duyệt
                        </span>
                      ) : item.status === "REJECTED" ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 font-black text-[11px] border border-rose-500/20 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Từ chối
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-black text-[11px] border border-amber-500/20 flex items-center gap-1 animate-pulse">
                          <Clock className="h-3 w-3" /> Chờ duyệt
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
