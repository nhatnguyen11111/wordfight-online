"use client";

import { SupabaseService, WithdrawalRequest } from "./supabase";

export const COIN_EXCHANGE_RATE = 1; // 1 Xu = 1 VND (or 1000 Xu = 1000 VND)
export const MIN_WITHDRAWAL_COINS = 10000; // Minimum 10,000 Xu (10,000 VND)

export const POPULAR_BANKS = [
  { code: "MB", name: "MB Bank (Quân Đội)" },
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ICB", name: "VietinBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "ACB", name: "ACB Á Châu" },
  { code: "VPB", name: "VPBank" },
  { code: "TPB", name: "TPBank" },
  { code: "STB", name: "Sacombank" },
  { code: "VIB", name: "VIB" },
  { code: "MSB", name: "MSB" },
  { code: "HDB", name: "HDBank" },
];

export const WALLET_PROVIDERS = [
  { code: "momo", name: "Ví MoMo", color: "bg-pink-500" },
  { code: "zalopay", name: "ZaloPay", color: "bg-blue-500" },
  { code: "viettelpay", name: "Viettel Money", color: "bg-red-500" },
];

export const TELCO_CARRIERS = [
  { code: "viettel", name: "Viettel", color: "bg-emerald-600" },
  { code: "vinaphone", name: "Vinaphone", color: "bg-blue-600" },
  { code: "mobifone", name: "Mobifone", color: "bg-sky-500" },
];

export const TELCO_DENOMINATIONS = [10000, 20000, 50000, 100000, 200000, 500000];

export const WithdrawalService = {
  /**
   * Submit a new withdrawal request
   */
  async requestWithdrawal(req: Omit<WithdrawalRequest, "id" | "status" | "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> {
    if (req.amountCoins < MIN_WITHDRAWAL_COINS) {
      return { success: false, error: `Số xu rút tối thiểu là ${MIN_WITHDRAWAL_COINS.toLocaleString("vi-VN")} Xu.` };
    }

    const fullReq: WithdrawalRequest = {
      ...req,
      id: `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: "PENDING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ok = await SupabaseService.createWithdrawalRequest(fullReq);
    if (!ok) {
      return { success: false, error: "Không thể tạo yêu cầu rút tiền. Vui lòng thử lại!" };
    }

    return { success: true };
  },

  /**
   * Fetch user's withdrawal history
   */
  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    return SupabaseService.fetchWithdrawalRequests(userId);
  },

  /**
   * Fetch all withdrawals for Admin
   */
  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    return SupabaseService.fetchWithdrawalRequests();
  },

  /**
   * Admin approves a withdrawal request
   */
  async approve(reqId: string): Promise<boolean> {
    return SupabaseService.adminApproveWithdrawal(reqId);
  },

  /**
   * Admin rejects a withdrawal request and refunds coins
   */
  async reject(reqId: string, reason?: string): Promise<boolean> {
    return SupabaseService.adminRejectWithdrawal(reqId, reason);
  },
};
