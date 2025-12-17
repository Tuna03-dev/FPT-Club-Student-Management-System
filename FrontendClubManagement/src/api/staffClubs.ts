import { axiosClient } from "./axiosClient";
import type {
  ClubFilterRequest,
  CreateClubRequest,
  UpdateClubRequest,
  ClubManagementResponse,
  PageResponse,
  Campus,
  ClubCategory,
} from "@/types/staffClub";

/**
 * Get clubs with filter, search and pagination
 * GET /api/staff/clubs
 */
export async function getStaffClubs(
  filter: ClubFilterRequest
): Promise<PageResponse<ClubManagementResponse>> {
  const params = new URLSearchParams();

  if (filter.keyword) params.append("keyword", filter.keyword);
  if (filter.campusId) params.append("campusId", filter.campusId.toString());
  if (filter.categoryId)
    params.append("categoryId", filter.categoryId.toString());
  if (filter.status) params.append("status", filter.status);
  if (filter.page !== undefined) params.append("page", filter.page.toString());
  if (filter.size !== undefined) params.append("size", filter.size.toString());
  if (filter.sort) params.append("sort", filter.sort);

  const res = await axiosClient.get<PageResponse<ClubManagementResponse>>(
    `/staff/clubs?${params.toString()}`,
    {
      timeout: 30000, // 30 seconds
    }
  );

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to fetch clubs");
  }

  return res.data!;
}

/**
 * Get club detail (for editing)
 * GET /api/staff/clubs/{clubId}
 */
export async function getStaffClubDetail(
  clubId: number
): Promise<ClubManagementResponse> {
  const res = await axiosClient.get<ClubManagementResponse>(
    `/staff/clubs/${clubId}`
  );

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to fetch club detail");
  }

  return res.data!;
}

/**
 * Create new club
 * POST /api/staff/clubs
 */
export async function createStaffClub(
  request: CreateClubRequest
): Promise<ClubManagementResponse> {
  const res = await axiosClient.post<ClubManagementResponse>(
    "/staff/clubs",
    request,
    {
      timeout: 60000, // 60 seconds
    }
  );

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to create club");
  }

  return res.data!;
}

/**
 * Update club
 * PUT /api/staff/clubs/{clubId}
 */
export async function updateStaffClub(
  clubId: number,
  request: UpdateClubRequest
): Promise<ClubManagementResponse> {
  const res = await axiosClient.put<ClubManagementResponse>(
    `/staff/clubs/${clubId}`,
    request,
    {
      timeout: 60000, // 60 seconds
    }
  );

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to update club");
  }

  return res.data!;
}

/**
 * Deactivate club
 * PATCH /api/staff/clubs/{clubId}
 */
export async function deActiveStaffClub(clubId: number): Promise<void> {
  const res = await axiosClient.patch<void>(
    `/staff/clubs/${clubId}/deactivate`
  );

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to deactivate club");
  }
}

/**
 * Activate club
 * PATCH /api/staff/clubs/{clubId}/activate
 */
export async function activateStaffClub(clubId: number): Promise<void> {
  const res = await axiosClient.patch<void>(`/staff/clubs/${clubId}/activate`);

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to activate club");
  }
}

/**
 * Get all campuses for selection
 */
export async function getAllCampuses(): Promise<Campus[]> {
  const res = await axiosClient.get<Campus[]>("/campuses");

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to fetch campuses");
  }

  return res.data || [];
}

/**
 * Get all club categories for selection
 */
export async function getAllClubCategories(): Promise<ClubCategory[]> {
  const res = await axiosClient.get<ClubCategory[]>("/club-categories");

  if (res.code !== 200) {
    throw new Error(res.message || "Failed to fetch categories");
  }

  return res.data || [];
}
