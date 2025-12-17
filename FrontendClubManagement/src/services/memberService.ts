import { axiosClient, type ApiResponse } from "@/api/axiosClient";
import { type PageResponse } from "@/types";
// Shared paging response shape matching backend PageResponse<T>

// Member DTO matching backend MemberResponse
export interface CurrentTermResponse {
  semesterName: string;
  semesterCode: string;
  roleName: string;
  roleCode: string;
  roleLevel: number;
  teamName: string;
  attendanceRate: number;
  isActive: boolean;
  status: string;
  startDate: string;
  endDate: string;
}

export interface MemberHistoryResponse {
  semesterName: string;
  semesterCode: string;
  roleName: string;
  roleCode: string;
  roleLevel: number;
  teamName: string;
  attendanceRate: number;
  isActive: boolean;
  status: string;
  startDate: string;
  endDate: string;
  joinDate: string;
  leaveDate?: string | null;
}

export interface MemberResponseDTO {
  userId: number;
  studentCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  gender: string;
  dateOfBirth: string;
  clubName: string;
  clubCode: string;
  membershipStatus: string; // ACTIVE | LEFT
  joinDate: string;
  endDate?: string | null;
  totalAttendanceRate: number;
  totalTerms: number;
  lastActive: string;
  currentTerm: CurrentTermResponse;
  history: MemberHistoryResponse[];
}

// Simple member response for dropdown/select purposes
export interface SimpleMemberResponse {
  userId: number;
  studentCode: string;
  fullName: string;
  email: string;
  avatarUrl: string;
}

// Simple member response for dropdown/select purposes
export interface SimpleMemberResponse {
  userId: number;
  studentCode: string;
  fullName: string;
  email: string;
  avatarUrl: string;
}

export interface ImportMemberError {
  row: number;
  studentCode: string;
  semesterCode: string;
  message: string;
}

export interface ImportMembersResponse {
  totalRows: number;
  processedUsers: number;
  processedHistories: number;
  createdUsers: number;
  updatedUsers: number;
  createdMemberships: number;
  updatedMemberships: number;
  createdRoleMemberships: number;
  updatedRoleMemberships: number;
  errors: ImportMemberError[];
  summary: string;
}

export interface GetMembersParams {
  status?: string; // ACTIVE | LEFT
  // backend may accept numeric id or semester code string
  semesterId?: number | string;
  roleId?: number;
  isActive?: boolean; // true for active members, false for inactive members
  searchTerm?: string;
  page?: number;
  size?: number;
}

export const memberService = {
  async getAllActiveMembers(
    clubId: number
  ): Promise<ApiResponse<SimpleMemberResponse[]>> {
    const url = `/clubs/${clubId}/members/all-active`;
    return axiosClient.get<SimpleMemberResponse[]>(url, {
      timeout: 15000, // 15 seconds
    });
  },

  async getMembers(
    clubId: number,
    params: GetMembersParams = {}
  ): Promise<ApiResponse<PageResponse<MemberResponseDTO>>> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.semesterId != null)
      query.set("semesterId", String(params.semesterId));
    if (params.roleId != null) query.set("roleId", String(params.roleId));
    if (params.isActive !== undefined)
      query.set("isActive", String(params.isActive));
    if (params.searchTerm) query.set("searchTerm", params.searchTerm);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));

    const url = `/clubs/${clubId}/members?${query.toString()}`;
    return axiosClient.get<PageResponse<MemberResponseDTO>>(url, {
      timeout: 15000, // 15 seconds
    });
  },

  async getLeftMembers(
    clubId: number,
    params: {
      searchTerm?: string;
      page?: number;
      size?: number;
    } = {}
  ): Promise<ApiResponse<PageResponse<MemberResponseDTO>>> {
    const query = new URLSearchParams();
    if (params.searchTerm) query.set("searchTerm", params.searchTerm);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));

    const url = `/clubs/${clubId}/members/left?${query.toString()}`;
    return axiosClient.get<PageResponse<MemberResponseDTO>>(url, {
      timeout: 15000, // 15 seconds
    });
  },
  async changeRole(
    clubId: number,
    userId: number,
    roleId: number,
    currentUserId: number
  ) {
    const url = `/clubs/${clubId}/members/${userId}/role?currentUserId=${currentUserId}`;
    return axiosClient.put(url, { roleId });
  },

  async assignTeam(clubId: number, userId: number, teamId: number) {
    const url = `/clubs/${clubId}/members/${userId}/team`;
    return axiosClient.put(url, { teamId });
  },

  async changeStatus(
    clubId: number,
    userId: number,
    isActive: boolean,
    options?: { semesterId?: number }
  ) {
    const url = `/clubs/${clubId}/members/${userId}/status`;
    return axiosClient.put(url, {
      isActive,
      semesterId: options?.semesterId,
    });
  },

  async removeMember(clubId: number, userId: number) {
    const url = `/clubs/${clubId}/members/${userId}`;
    return axiosClient.delete(url);
  },

  async importMembersFromExcel(
    clubId: number,
    file: File,
    currentUserId: number
  ): Promise<ApiResponse<ImportMembersResponse>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("currentUserId", currentUserId.toString());

    return axiosClient.post<ImportMembersResponse>(
      `clubs/${clubId}/members/import`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },
};

export default memberService;
