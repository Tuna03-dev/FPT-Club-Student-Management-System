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

export interface TeamDTO {
  id: number;
  teamName: string;
  description: string;
  linkGroupChat: string;
}

export const clubService = {
  async getSemesters(clubId: number): Promise<ApiResponse<SemesterDTO[]>> {
    const url = `/clubs/${clubId}/semesters`;
    return axiosClient.get<SemesterDTO[]>(url);
  },

  async getRoles(clubId: number): Promise<ApiResponse<ClubRoleDTO[]>> {
    const url = `/clubs/${clubId}/roles`;
    return axiosClient.get<ClubRoleDTO[]>(url);
  },

  async getTeams(clubId: number): Promise<ApiResponse<TeamDTO[]>> {
    const url = `/clubs/${clubId}/teams`;
    return axiosClient.get<TeamDTO[]>(url);
  },
};

export default clubService;
