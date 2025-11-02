import { axiosClient, type ApiResponse } from "@/api/axiosClient";

export interface PayOSConfigResponse {
  clubId: number;
  clientId: string | null;
  active: boolean;
  configured: boolean;
}

export interface PayOSConfigRequest {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  active?: boolean;
}

export interface PayOSCreatePaymentResponse {
  orderCode: number;
  paymentLink: string;
  qrCode: string;
  raw?: Record<string, unknown>;
}

export const payosService = {
  async getConfig(clubId: number): Promise<ApiResponse<PayOSConfigResponse>> {
    const url = `/clubs/${clubId}/pay-os/config`;
    return axiosClient.get<PayOSConfigResponse>(url);
  },

  async upsertConfig(
    clubId: number,
    payload: PayOSConfigRequest
  ): Promise<ApiResponse<PayOSConfigResponse>> {
    const url = `/clubs/${clubId}/pay-os/config`;
    return axiosClient.put<PayOSConfigResponse>(url, payload);
  },
  async testConnection(clubId: number): Promise<ApiResponse<{ connected: boolean; message: string }>> {
    const url = `/clubs/${clubId}/pay-os/test`;
    return axiosClient.post<{ connected: boolean; message: string }>(url);
  },
};

export default payosService;
