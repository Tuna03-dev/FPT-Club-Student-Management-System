// src/services/transactionService.ts
import { axiosClient, type ApiResponse } from "@/api/axiosClient";
import type { PageResponse } from "@/types";

// Income Transaction Response từ API
export interface IncomeTransactionResponse {
  id: number;
  reference: string;
  amount: number;
  description: string;
  transactionDate: string;
  source: string; // "PayOS" hoặc nguồn khác
  status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED";
  notes: string | null;
  feeId: number | null;
  feeTitle: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
}

// Outcome Transaction Response từ API (giả định cấu trúc tương tự)
export interface OutcomeTransactionResponse {
  id: number;
  transactionCode: string;
  amount: number;
  description: string;
  transactionDate: string;
  recipient: string;
  purpose: string;
  status: "SUCCESS" | "PENDING" | "COMPLETED" | "CANCELLED" | "FAILED";
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
}

// Request params cho pagination và filter
export interface TransactionQueryParams {
  page?: number;
  size?: number;
  status?: string; // SUCCESS, PENDING, FAILED, CANCELLED
  fromDate?: string; // yyyy-MM-dd
  toDate?: string; // yyyy-MM-dd
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// Income-specific filter params
export interface IncomeTransactionQueryParams extends TransactionQueryParams {
  source?: string; // PayOS, Cash, Bank Transfer, etc.
  feeId?: number;
  userId?: number;
}

// Outcome-specific filter params
export interface OutcomeTransactionQueryParams extends TransactionQueryParams {
  category?: string; // Event, Equipment, Transportation, etc.
}

// Create Income Transaction Request
export interface CreateIncomeTransactionRequest {
  amount: number;
  description: string;
  transactionDate: string;
  source: string;
  notes?: string;
  feeId?: number;
  userId?: number; // ID người đóng tiền (optional)
  receiptUrl?: string; // URL ảnh bằng chứng (optional)
}

// Create Outcome Transaction Request
export interface CreateOutcomeTransactionRequest {
  amount: number;
  description: string;
  transactionDate: string;
  recipient: string;
  purpose: string;
  notes?: string;
  receiptUrl?: string;
}

export const transactionService = {
  // Lấy danh sách Income Transactions với filters
  async getIncomeTransactions(
    clubId: number,
    params?: IncomeTransactionQueryParams
  ): Promise<ApiResponse<PageResponse<IncomeTransactionResponse>>> {
    const url = `/clubs/${clubId}/transactions/income`;
    return axiosClient.get<PageResponse<IncomeTransactionResponse>>(url, {
      params,
    });
  },

  // Lấy danh sách Outcome Transactions với filters
  async getOutcomeTransactions(
    clubId: number,
    params?: OutcomeTransactionQueryParams
  ): Promise<ApiResponse<PageResponse<OutcomeTransactionResponse>>> {
    const url = `/clubs/${clubId}/transactions/outcome`;
    return axiosClient.get<PageResponse<OutcomeTransactionResponse>>(url, {
      params,
    });
  },

  // Lấy chi tiết Income Transaction
  async getIncomeTransactionById(
    clubId: number,
    transactionId: number
  ): Promise<ApiResponse<IncomeTransactionResponse>> {
    const url = `/clubs/${clubId}/transactions/income/${transactionId}`;
    return axiosClient.get<IncomeTransactionResponse>(url);
  },

  // Lấy chi tiết Outcome Transaction
  async getOutcomeTransactionById(
    clubId: number,
    transactionId: number
  ): Promise<ApiResponse<OutcomeTransactionResponse>> {
    const url = `/clubs/${clubId}/transactions/outcome/${transactionId}`;
    return axiosClient.get<OutcomeTransactionResponse>(url);
  },

  // Tạo Income Transaction
  async createIncomeTransaction(
    clubId: number,
    data: CreateIncomeTransactionRequest
  ): Promise<ApiResponse<IncomeTransactionResponse>> {
    const url = `/clubs/${clubId}/transactions/income`;
    return axiosClient.post<IncomeTransactionResponse>(url, data);
  },

  // Tạo Outcome Transaction
  async createOutcomeTransaction(
    clubId: number,
    data: CreateOutcomeTransactionRequest
  ): Promise<ApiResponse<OutcomeTransactionResponse>> {
    const url = `/clubs/${clubId}/transactions/outcome`;
    return axiosClient.post<OutcomeTransactionResponse>(url, data);
  },

  // Cập nhật Income Transaction
  async updateIncomeTransaction(
    clubId: number,
    transactionId: number,
    data: Partial<CreateIncomeTransactionRequest>
  ): Promise<ApiResponse<IncomeTransactionResponse>> {
    const url = `/clubs/${clubId}/transactions/income/${transactionId}`;
    return axiosClient.put<IncomeTransactionResponse>(url, data);
  },

  // Cập nhật Outcome Transaction
  async updateOutcomeTransaction(
    clubId: number,
    transactionId: number,
    data: Partial<CreateOutcomeTransactionRequest>
  ): Promise<ApiResponse<OutcomeTransactionResponse>> {
    const url = `/clubs/${clubId}/transactions/outcome/${transactionId}`;
    return axiosClient.put<OutcomeTransactionResponse>(url, data);
  },

  // Xóa Income Transaction
  async deleteIncomeTransaction(
    clubId: number,
    transactionId: number
  ): Promise<ApiResponse<void>> {
    const url = `/clubs/${clubId}/transactions/income/${transactionId}`;
    return axiosClient.delete<void>(url);
  },

  // Xóa Outcome Transaction
  async deleteOutcomeTransaction(
    clubId: number,
    transactionId: number
  ): Promise<ApiResponse<void>> {
    const url = `/clubs/${clubId}/transactions/outcome/${transactionId}`;
    return axiosClient.delete<void>(url);
  },

  // Duyệt giao dịch (chuyển từ PENDING -> COMPLETED/SUCCESS)
  async approveTransaction(
    clubId: number,
    transactionId: number,
    type: "income" | "outcome"
  ): Promise<
    ApiResponse<IncomeTransactionResponse | OutcomeTransactionResponse>
  > {
    const url = `/clubs/${clubId}/transactions/${type}/${transactionId}/approve`;
    return axiosClient.post<
      IncomeTransactionResponse | OutcomeTransactionResponse
    >(url, {});
  },

  // Hủy giao dịch (chuyển sang CANCELLED)
  async rejectTransaction(
    clubId: number,
    transactionId: number,
    type: "income" | "outcome"
  ): Promise<
    ApiResponse<IncomeTransactionResponse | OutcomeTransactionResponse>
  > {
    const url = `/clubs/${clubId}/transactions/${type}/${transactionId}/reject`;
    return axiosClient.post<
      IncomeTransactionResponse | OutcomeTransactionResponse
    >(url, {});
  },
};

export default transactionService;
