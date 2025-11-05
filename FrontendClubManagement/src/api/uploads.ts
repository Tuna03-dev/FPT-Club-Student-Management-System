import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "./axiosClient";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

// Trả về đúng wrapper ApiResponse<UploadResult>
export async function uploadImage(file: File): Promise<ApiResponse<UploadResult>> {
  const form = new FormData();
  form.append("file", file);

  // LƯU Ý: baseURL đã là "/api", nên path chỉ là "/uploads/image"
  return axiosClient.post<UploadResult>("/uploads/image", form);
}

// Nếu bạn thích hàm tiện ích chỉ trả về UploadResult:
export async function uploadImageOnly(file: File): Promise<UploadResult> {
  const resp = await uploadImage(file);
  if (resp.code !== 200 || !resp.data) {
    throw new Error(resp.message || "Upload image failed");
  }
  return resp.data;
}
