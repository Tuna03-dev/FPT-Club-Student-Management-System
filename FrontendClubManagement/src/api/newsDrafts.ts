// src/api/draftsApi.ts
import { axiosClient } from "./axiosClient";
import type {
  NewsData,
  CreateDraftRequest,
  UpdateDraftRequest,
  PageResp,
  RequestStatus,
} from "@/types/news";

const BASE = "/news/drafts";

export const draftsApi = {
  list: (params?: { page?: number; size?: number; clubId?: number; teamId?: number }) =>
    axiosClient.get<PageResp<NewsData>>(BASE, { params }),

  create: (data: CreateDraftRequest) =>
    axiosClient.post<NewsData>(BASE, data),

  update: (newsId: number, data: UpdateDraftRequest) =>
    axiosClient.put<NewsData>(`${BASE}/${newsId}`, data),

  remove: (newsId: number) =>
    axiosClient.delete<void>(`${BASE}/${newsId}`),

  submit: (newsId: number) =>
    axiosClient.post<{ requestId: number; status: RequestStatus }>(
      `${BASE}/${newsId}/submit`
    ),

  publish: (newsId: number) =>
    axiosClient.put<NewsData>(`${BASE}/${newsId}/publish`),

  get: (newsId: number) =>
    axiosClient.get<NewsData>(`${BASE}/${newsId}`),
};
