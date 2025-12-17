// src/api/newsRequests.ts
import { axiosClient } from "./axiosClient";
import type {
  NewsRequest,
  RequestStatus,
  ApproveNewsRequest,
  RejectNewsRequest,
  UpdateNewsRequestPayload,
} from "@/types/news";

const BASE = "/news/requests";

export const requestsApi = {
  // ===== Query/List =====
  search: async (params?: {
    clubId?: number;
    teamId?: number;
    status?: RequestStatus | string;
    keyword?: string;
    createdByUserId?: number;
    page?: number;
    size?: number;
  }) => {
    const api: any = await axiosClient.get(BASE, { params });
    return api.data; // { total, data, page, size, count }
  },

  // ===== Detail =====
  getDetail: (id: number) => axiosClient.get<NewsRequest>(`${BASE}/${id}`),

  // ===== Create / Update / Cancel =====
  create: (body: {
    title: string;
    content: string;
    clubId?: number | null;
    teamId?: number | null;
    thumbnailUrl?: string | null;
    newsType?: string | null;
  }) => axiosClient.post<NewsRequest>(BASE, body),

  update: (id: number, payload: UpdateNewsRequestPayload) =>
    axiosClient.put<NewsRequest>(`${BASE}/${id}`, payload),

  cancel: (id: number) => axiosClient.put<void>(`${BASE}/${id}/cancel`),

  // ===== Club actions =====
  clubApproveAndSubmit: (id: number, note?: string) =>
    axiosClient.put<NewsRequest>(
      `${BASE}/${id}/club/approve-submit`,
      note ? { note } : {}
    ),

  clubPresidentReject: (id: number, body: RejectNewsRequest) =>
    axiosClient.put<NewsRequest>(
      `${BASE}/${id}/club/president-reject`,
      body
    ),

  // ===== Staff actions =====
  staffApprovePublish: (id: number, body?: ApproveNewsRequest) =>
    axiosClient.put<NewsRequest>(
      `${BASE}/${id}/staff/approve-publish`,
      body ?? {}
    ),

  staffReject: (id: number, body: RejectNewsRequest) =>
    axiosClient.put<NewsRequest>(`${BASE}/${id}/staff/reject`, body),
};
