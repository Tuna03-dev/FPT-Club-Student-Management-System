import { axiosClient } from "./axiosClient";
import type {
  NewsRequest,
  PublishResult,
  RejectNewsRequest,
  ApproveNewsRequest,
} from "@/types/news";

// KHÔNG import ApiResp ở đây — axiosClient đã wrap sẵn ApiResponse<T>.
const BASE = "/news";

// Tạo request (CLB/Trưởng ban/Chủ nhiệm)
// Trả về ApiResponse<NewsRequest>
export const createRequest = (body: {
  title: string;
  content: string;
  clubId?: number | null;
  teamId?: number | null;
}) => axiosClient.post<NewsRequest>(`${BASE}/requests`, body);

// CLUB approve & submit — Trả về ApiResponse<NewsRequest>
export const clubApproveAndSubmit = (id: number, note?: string) =>
  axiosClient.put<NewsRequest>(
    `${BASE}/requests/${id}/club/approve-submit`,
    note ? { note } : {}
  );

// CLUB chủ nhiệm reject — Trả về ApiResponse<NewsRequest>
export const clubPresidentReject = (id: number, body: RejectNewsRequest) =>
  axiosClient.put<NewsRequest>(
    `${BASE}/requests/${id}/club/president-reject`,
    body
  );

// STAFF approve & publish — Trả về ApiResponse<PublishResult>
export const staffApprovePublish = (id: number, body?: ApproveNewsRequest) =>
  axiosClient.put<PublishResult>(
    `${BASE}/requests/${id}/staff/approve-publish`,
    body ?? {}
  );

// STAFF reject — Trả về ApiResponse<NewsRequest>
export const staffReject = (id: number, body: RejectNewsRequest) =>
  axiosClient.put<NewsRequest>(
    `${BASE}/requests/${id}/staff/reject`,
    body
  );

// STAFF direct publish — Trả về ApiResponse<PublishResult>
export const staffDirectPublish = (body: {
  title: string;
  content: string;
  thumbnailUrl?: string;
  newsType?: string;
  clubId?: number | null;
  teamId?: number | null;
}) => axiosClient.post<PublishResult>(
  `${BASE}/staff/direct-publish`,
  body
);
