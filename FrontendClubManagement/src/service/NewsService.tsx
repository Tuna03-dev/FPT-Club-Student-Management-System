import axiosClient from "@/api/axiosClient";

export interface NewsData {
  id: number;
  title: string;
  content: string;
  thumbnailUrl?: string;
  newsType?: string;
  draft: boolean;
  clubId: number;
  clubName?: string;
  updatedAt: string; // ISO string
}

export interface NewsResponse {
  total: number;
  count: number;
  data: NewsData[];
}

export interface NewsFilterRequest {
  keyword?: string;
  page?: number;
  size?: number;
}

export async function getAllNewsByFilter(
  payload: NewsFilterRequest
): Promise<NewsResponse> {
  const res = await axiosClient.post<NewsResponse>(
    "/news/get-all-by-filter",
    payload
  );
  if (!res.data) throw new Error("Empty response");
  return res.data;
}
