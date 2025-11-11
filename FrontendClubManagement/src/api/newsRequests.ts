import { axiosClient } from "./axiosClient";
import type { NewsRequest, RequestStatus, PagedList } from "@/types/news";

// CHỈ để /news/requests (KHÔNG có /api)
const BASE = "/news/requests";

export const requestsApi = {
  search: (params?: {
    clubId?: number;
    teamId?: number;
    status?: RequestStatus | string;
    keyword?: string;
    createdByUserId?: number;
    page?: number;
    size?: number;
  }) => axiosClient.get<PagedList<NewsRequest>>(`${BASE}`, { params }),

  staffApprovePublish: (id: number) =>
    axiosClient.put<NewsRequest>(`${BASE}/${id}/staff/approve-publish`),

  staffReject: (id: number, payload: { message?: string; reason?: string }) =>
    axiosClient.put<NewsRequest>(`${BASE}/${id}/staff/reject`, payload),
};
