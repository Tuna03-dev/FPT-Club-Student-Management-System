// src/api/newsApi.ts
import { axiosClient } from "./axiosClient";
import type { NewsData, PublishResult } from "@/types/news";

const BASE = "/news";

export const filterNews = (body: {
  keyword?: string;
  clubId?: number | null;
  page?: number;
  size?: number;
}) =>
  axiosClient.post<{ total: number; count: number; data: NewsData[] }>(
    `${BASE}/filter`,
    body
  );

export const getNewsById = (id: number) =>
  axiosClient.get<NewsData>(`${BASE}/${id}`);

export const staffDirectPublish = (body: {
  title: string;
  content: string;
  thumbnailUrl?: string | null;
  newsType?: string | null;
  isSpotlight?: boolean;
  clubId?: number | null;
  teamId?: number | null;
}) =>
  axiosClient.post<PublishResult>(`${BASE}/staff/direct-publish`, body);
