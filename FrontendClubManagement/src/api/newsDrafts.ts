import { axiosClient } from "./axiosClient";
import type {
  NewsData,
  CreateDraftRequest,
  UpdateDraftRequest,
  PageResp,
  RequestStatus,
} from "@/types/news";

// KHÔNG import ApiResp ở đây — axiosClient đã wrap sẵn ApiResponse<T>.
const BASE = "/news/drafts";

export const draftsApi = {
  // Trả về ApiResponse<PageResp<NewsData>>
  list: (params?: { page?: number; size?: number; clubId?: number; teamId?: number }) =>
    axiosClient.get<PageResp<NewsData>>(BASE, { params }),

  // Trả về ApiResponse<NewsData>
  create: (data: CreateDraftRequest) =>
    axiosClient.post<NewsData>(BASE, data),

  // Trả về ApiResponse<NewsData>
  update: (newsId: number, data: UpdateDraftRequest) =>
    axiosClient.put<NewsData>(`${BASE}/${newsId}`, data),

  // Trả về ApiResponse<void>
  remove: (newsId: number) =>
    axiosClient.delete<void>(`${BASE}/${newsId}`),

  // Trả về ApiResponse<{ requestId; status }>
  submit: (newsId: number) =>
    axiosClient.post<{ requestId: number; status: RequestStatus }>(
      `${BASE}/${newsId}/submit`
    ),

  // Nếu BE hỗ trợ publish từ draft (STAFF), Trả về ApiResponse<NewsData>
  publish: (newsId: number) =>
    axiosClient.put<NewsData>(`${BASE}/${newsId}/publish`),
  get: (newsId: number) => axiosClient.get<NewsData>(`${BASE}/${newsId}`),

};
