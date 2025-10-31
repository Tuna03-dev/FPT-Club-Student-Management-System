import { axiosClient, type ApiResponse } from "@/api/axiosClient";
import type { Fee, CreateFeeRequest } from "@/types/fee";

export const feeService = {
  async getFees(clubId: number): Promise<ApiResponse<Fee[]>> {
    const url = `/clubs/${clubId}/fees`;
    return axiosClient.get<Fee[]>(url);
  },

  async createFee(clubId: number, payload: CreateFeeRequest): Promise<ApiResponse<Fee>> {
    const url = `/clubs/${clubId}/fees`;
    return axiosClient.post<Fee>(url, payload);
  },
};

export default feeService;

