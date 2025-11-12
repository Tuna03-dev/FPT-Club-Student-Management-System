// src/types/news.ts
export type AuthorRole = "STAFF" | "CLUB";

// Đồng bộ với BE:
export type RequestStatus =
  | "DRAFT"
  | "PENDING_CLUB"
  | "APPROVED_CLUB"
  | "REJECTED_CLUB"
  | "PENDING_UNIVERSITY"
  | "APPROVED_UNIVERSITY"
  | "REJECTED_UNIVERSITY"
  | "CANCELED";

// ⬇️ Dùng đúng wrapper của axiosClient (data?: T)
export type { ApiResponse as ApiResp } from "@/api/axiosClient";

export interface NewsRequest {
  id: number;

  // Quan hệ CLB
  clubId: number | null;
  clubName: string | null;
  clubCode: string | null;
  clubLogoUrl: string | null;

  // Quan hệ người tạo
  createdByUserId: number | null;
  createdByFullName: string | null;
  createdByEmail: string | null;
  createdByAvatarUrl: string | null;
  createdByStudentCode: string | null;

  // Nội dung
  requestTitle: string;
  description: string;
  responseMessage: string | null;
  status: RequestStatus;
  requestDate: string | null;

  // Bài news (nếu đã attach)
  newsId: number | null;

  // ⬇️ BỔ SUNG: thông tin phòng ban (team) để hiển thị/lọc
  teamId?: number | null;
  teamName?: string | null;
  thumbnailUrl?: string | null;
  newsType?: string | null;
   departmentName?: string | null;
  departmentCode?: string | null;
  // (nếu sau này cần) semesterId?: number | null;
}

export interface NewsData {
  id: number;
  title: string;
  content: string;
  thumbnailUrl: string | null;
  newsType: string | null;
  draft: boolean;           // mapper BE đang trả về đúng 'draft'
  clubId: number | null;
  clubName: string | null;
  updatedAt: string | null; // "yyyy-MM-dd HH:mm:ss"
  authorId: number | null;
  authorName: string | null;
  authorEmail: string | null;
  authorRole: AuthorRole | null;
}

export interface PublishResult {
  newsId: number;
  newsData: NewsData;
  message: string;
}

// Spring Page
export interface PageResp<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

// Custom paged list (BE trả cho /news/requests)
export interface PagedList<T> {
  count: number;
  size: number;
  page: number;
  data: T[];
  total: number;
}

// Bodies
export interface CreateDraftRequest {
  title: string;
  content: string;
  thumbnailUrl?: string | null;
  newsType?: string | null;
  clubId?: number | null;
  teamId?: number | null;
}

export interface UpdateDraftRequest {
  title?: string;
  content?: string;
  thumbnailUrl?: string | null;
  newsType?: string | null;
}

export interface ApproveNewsRequest {
  title?: string;
  content?: string;
  thumbnailUrl?: string | null;
  newsType?: string | null;
  note?: string | null;
  clubId?: number | null;
  teamId?: number | null;
}

export interface RejectNewsRequest {
  reason: string;
}
