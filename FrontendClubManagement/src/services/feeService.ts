import { axiosClient, type ApiResponse } from "@/api/axiosClient";
import type { Fee, CreateFeeRequest, UpdateFeeRequest } from "@/types/fee";
import type { PayOSCreatePaymentResponse } from "./payosService";

export const feeService = {
  async getFees(clubId: number): Promise<ApiResponse<Fee[]>> {
    const url = `/clubs/${clubId}/fees`;
    return axiosClient.get<Fee[]>(url);
  },

  async createFee(clubId: number, payload: CreateFeeRequest): Promise<ApiResponse<Fee>> {
    const url = `/clubs/${clubId}/fees`;
    return axiosClient.post<Fee>(url, payload);
  },

  async updateFee(clubId: number, feeId: number, payload: UpdateFeeRequest): Promise<ApiResponse<Fee>> {
    const url = `/clubs/${clubId}/fees/${feeId}`;
    return axiosClient.put<Fee>(url, payload);
  },

  async deleteFee(clubId: number, feeId: number): Promise<ApiResponse<void>> {
    const url = `/clubs/${clubId}/fees/${feeId}`;
    return axiosClient.delete<void>(url);
  },

  async checkTitleExists(clubId: number, title: string, excludeFeeId?: number): Promise<boolean> {
    const url = `/clubs/${clubId}/fees/check-title`;
    const params: { title: string; excludeFeeId?: number } = { title };
    if (excludeFeeId !== undefined) {
      params.excludeFeeId = excludeFeeId;
    }
    const res = await axiosClient.get<boolean>(url, { params });
    return Boolean(res?.data);
  },

  async lockFee(clubId: number, feeId: number, isLocked: boolean): Promise<ApiResponse<Fee>> {
    const url = `/clubs/${clubId}/fees/${feeId}/lock`;
    return axiosClient.patch<Fee>(url, { isLocked });
  },

  
  async generatePaymentQR(
    clubId: number,
    feeId: number,
    userId: number
  ): Promise<ApiResponse<PayOSCreatePaymentResponse>> {
    const url = `/clubs/${clubId}/fees/${feeId}/generate-payment`;
    return axiosClient.post<PayOSCreatePaymentResponse>(url, null, {
      params: { userId },
    });
  },

  async getUnpaidFees(clubId: number, userId: number): Promise<ApiResponse<Fee[]>> {
    const url = `/clubs/${clubId}/fees/unpaid`;
    return axiosClient.get<Fee[]>(url, { params: { userId } });
  },
  async getPaidFees(clubId: number, userId: number): Promise<ApiResponse<Fee[]>> {
    const url = `/clubs/${clubId}/fees/paid`;
    return axiosClient.get<Fee[]>(url, { params: { userId } });
}
};

export default feeService;

