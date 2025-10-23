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

export interface GetMembersParams {
  status?: string; // ACTIVE | LEFT
  semesterId?: number;
  roleId?: number;
  searchTerm?: string;
  page?: number;
  size?: number;
}

export const memberService = {
  async getMembers(
    clubId: number,
    params: GetMembersParams = {}
  ): Promise<ApiResponse<PageResponse<MemberResponseDTO>>> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.semesterId != null)
      query.set("semesterId", String(params.semesterId));
    if (params.roleId != null) query.set("roleId", String(params.roleId));
    if (params.searchTerm) query.set("searchTerm", params.searchTerm);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));

    const url = `/clubs/${clubId}/members?${query.toString()}`;
    return axiosClient.get<PageResponse<MemberResponseDTO>>(url);
  },
  async changeRole(clubId: number, userId: number, roleId: number) {
    const url = `/clubs/${clubId}/members/${userId}/role`;
    return axiosClient.put(url, { roleId });
  },

  async assignTeam(clubId: number, userId: number, teamId: number) {
    const url = `/clubs/${clubId}/members/${userId}/team`;
    return axiosClient.put(url, { teamId });
  },

  async changeStatus(clubId: number, userId: number, status: string) {
    // status could be ACTIVE, INACTIVE, LEFT
    const url = `/clubs/${clubId}/members/${userId}/status`;
    return axiosClient.put(url, { status });
  },

  async removeMember(clubId: number, userId: number) {
    const url = `/clubs/${clubId}/members/${userId}`;
    return axiosClient.delete(url);
  },
};

export default memberService;
