// src/services/financeService.ts
import { axiosClient, type ApiResponse } from "@/api/axiosClient";

/**
 * Finance Summary Response from API
 */
export interface FinanceSummaryResponse {
  /**
   * Current wallet balance (remaining money)
   */
  balance: number;

  /**
   * Total income from all SUCCESS income transactions
   */
  totalIncome: number;

  /**
   * Total expense from all SUCCESS outcome transactions
   */
  totalExpense: number;

  /**
   * Total budget (initial balance + total income)
   * This represents all money the club has received
   */
  totalBudget: number;

  /**
   * Remaining amount (balance)
   * Same as balance but included for clarity
   */
  remaining: number;

  /**
   * Currency code (usually VND)
   */
  currency: string;

  /**
   * Wallet ID for reference
   */
  walletId: number;
}

export const financeService = {
  /**
   * Get finance summary for a club
   * GET /api/clubs/{clubId}/finance/summary
   */
  async getFinanceSummary(
    clubId: number
  ): Promise<ApiResponse<FinanceSummaryResponse>> {
    const url = `/clubs/${clubId}/finance/summary`;
    return axiosClient.get<FinanceSummaryResponse>(url);
  },
};

export default financeService;
