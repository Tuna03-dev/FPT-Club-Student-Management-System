// DTOs for Staff Club Management APIs

export interface ClubFilterRequest {
  keyword?: string;
  campusId?: number;
  categoryId?: number;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateClubRequest {
  clubName: string;
  clubCode: string;
  description?: string;
  status?: string;
  campusId: number;
  categoryId: number;
  presidentEmail: string;
}

export interface UpdateClubRequest {
  clubName?: string;
  clubCode?: string;
  description?: string;
  status?: string;
  campusId?: number;
  categoryId?: number;
}

export interface ClubPresidentData {
  fullName: string;
  email: string;
  avatarUrl?: string;
}

export interface ClubManagementResponse {
  id: number;
  clubName: string;
  clubCode: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  email?: string;
  phone?: string;
  fbUrl?: string;
  igUrl?: string;
  ttUrl?: string;
  ytUrl?: string;
  status: string;
  campusName: string;
  campusId: number;
  categoryName: string;
  categoryId: number;
  totalMembers: number;
  totalEvents: number;
  totalPosts: number;
  presidents: ClubPresidentData[]; // Changed from presidentName and presidentEmail to presidents array
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Campus {
  id: number;
  campusName: string;
  address?: string;
}

export interface ClubCategory {
  id: number;
  categoryName: string;
  clubCount?: number;
}
