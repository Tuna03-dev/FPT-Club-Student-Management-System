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
  clubId?: number;
  page?: number;
  size?: number;
}

export interface ClubDto {
  id: number;
  clubName: string;
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

export async function getNewsById(id: number): Promise<NewsData> {
  const res = await axiosClient.get<NewsData>(`/news/${id}`);
  if (!res.data) throw new Error("News not found");
  return res.data;
}

export async function getAllClubs(): Promise<ClubDto[]> {
  const res = await axiosClient.get<ClubDto[]>("/events/get-all-club");
  return res.data ?? [];
}

// ===== Paginated Response =====
export interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Lấy danh sách tin tức đã được publish của một câu lạc bộ với phân trang và tìm kiếm
 */
export async function getPublishedNewsByClubId(
  clubId: number,
  keyword?: string,
  page: number = 0,
  size: number = 10,
  sort: string = "createdAt,desc"
): Promise<PagedResponse<NewsData>> {
  const res = await axiosClient.get<PagedResponse<NewsData>>(
    `/news/clubs/${clubId}/published`,
    {
      params: { keyword, page, size, sort },
      timeout: 30000,
    }
  );
  if (!res.data) throw new Error("Empty response");
  return res.data;
}
