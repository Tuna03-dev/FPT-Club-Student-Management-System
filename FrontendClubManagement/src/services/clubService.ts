import { axiosClient, type ApiResponse } from "@/api/axiosClient";

export interface SemesterDTO {
  id: number;
  semesterName: string;
  semesterCode: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ClubRoleDTO {
  id: number;
  roleName: string;
  roleCode: string;
  description: string;
  roleLevel: number;
  systemRoleId: number;
  systemRoleName: string;
}

export interface CreateClubRoleRequest {
  roleName: string;
  roleCode: string;
  description?: string;
  roleLevel: number;
  systemRoleId?: number | null;
}

export interface UpdateClubRoleRequest {
  roleName: string;
  roleCode: string;
  description?: string;
  roleLevel: number;
  systemRoleId?: number | null;
}

export interface TeamDTO {
  id: number;
  teamName: string;
  description: string;
  linkGroupChat: string;
}

export interface ClubPresidentData {
  fullName: string;
  email: string;
  avatarUrl: string;
}

export interface ClubDetailData {
  id: number;
  clubName: string;
  clubCode: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  email: string;
  phone: string;
  fbUrl: string;
  igUrl: string;
  ttUrl: string;
  ytUrl: string;
  status: string;

  // Campus info
  campusId: number;
  campusName: string;
  campusCode: string;

  // Category info
  categoryId: number;
  categoryName: string;

  // Statistics
  totalMembers: number;
  totalEvents: number;
  totalNews: number;

  // Recruitment info
  isRecruiting: boolean; // Câu lạc bộ đang mở đợt tuyển (Backend tự động set)

  // President info
  president: ClubPresidentData;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Get club detail by ID
export async function getClubDetailById(
  clubId: number
): Promise<ClubDetailData> {
  const res = await axiosClient.get<ClubDetailData>(`/clubInfo/${clubId}`);
  if (!res.data) throw new Error("Club not found");
  return res.data;
}

// Get club detail by club code
export async function getClubDetailByCode(
  clubCode: string
): Promise<ClubDetailData> {
  const res = await axiosClient.get<ClubDetailData>(
    `/clubInfo/code/${clubCode}`
  );
  if (!res.data) throw new Error("Club not found");
  return res.data;
}

export const clubService = {
  async getSemesters(clubId: number): Promise<ApiResponse<SemesterDTO[]>> {
    const url = `/clubs/${clubId}/semesters`;
    return axiosClient.get<SemesterDTO[]>(url);
  },

  async getRoles(clubId: number): Promise<ApiResponse<ClubRoleDTO[]>> {
    const url = `/management/clubs/${clubId}/roles`;
    return axiosClient.get<ClubRoleDTO[]>(url);
  },

  async createRole(
    clubId: number,
    request: CreateClubRoleRequest
  ): Promise<ApiResponse<ClubRoleDTO>> {
    const url = `/management/clubs/${clubId}/roles`;
    return axiosClient.post<ClubRoleDTO>(url, request);
  },

  async updateRole(
    clubId: number,
    roleId: number,
    request: UpdateClubRoleRequest
  ): Promise<ApiResponse<ClubRoleDTO>> {
    const url = `/management/clubs/${clubId}/roles/${roleId}`;
    return axiosClient.put<ClubRoleDTO>(url, request);
  },

  async deleteRole(clubId: number, roleId: number): Promise<ApiResponse<void>> {
    const url = `/management/clubs/${clubId}/roles/${roleId}`;
    return axiosClient.delete<void>(url);
  },

  async getTeams(clubId: number): Promise<ApiResponse<TeamDTO[]>> {
    const url = `/clubs/${clubId}/teams`;
    return axiosClient.get<TeamDTO[]>(url);
  },

  async getTeamsInClubDetail(clubId: number): Promise<ApiResponse<TeamDTO[]>> {
    const url = `/clubInfo/${clubId}/teams/dto`;
    return axiosClient.get<TeamDTO[]>(url);
  },
};

export default clubService;
