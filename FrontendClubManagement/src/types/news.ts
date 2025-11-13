export type AuthorRole = "STAFF" | "CLUB";

export type RequestStatus =
  | "DRAFT"
  | "PENDING_CLUB"
  | "APPROVED_CLUB"
  | "REJECTED_CLUB"
  | "PENDING_UNIVERSITY"
  | "APPROVED_UNIVERSITY"
  | "REJECTED_UNIVERSITY"
  | "CANCELED";

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

  // BỔ SUNG thông tin phòng ban (team)
  teamId?: number | null;
  teamName?: string | null;

  thumbnailUrl?: string | null;
  newsType?: string | null;

  departmentName?: string | null;
  departmentCode?: string | null;
}

export interface NewsData {
  id: number;
  title: string;
  content: string;
  thumbnailUrl: string | null;
  newsType: string | null;
  draft: boolean;           
  clubId: number | null;
  clubName: string | null;
  updatedAt: string | null; 
  authorId: number | null;
  authorName: string | null;
  authorEmail: string | null;
  authorRole: AuthorRole | null;
  hidden?: boolean;
  deleted?: boolean;
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

// ⬇️ BỔ SUNG: payload sửa Request khi đang Pending
export interface UpdateNewsRequestPayload {
  title?: string;
  content?: string;
  thumbnailUrl?: string | null;
  newsType?: string | null;
}