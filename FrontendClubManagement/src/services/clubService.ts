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

export const clubService = {
  async getSemesters(clubId: number): Promise<ApiResponse<SemesterDTO[]>> {
    const url = `/clubs/${clubId}/semesters`;
    return axiosClient.get<SemesterDTO[]>(url);
  },

  async getRoles(clubId: number): Promise<ApiResponse<ClubRoleDTO[]>> {
    const url = `/clubs/${clubId}/roles`;
    return axiosClient.get<ClubRoleDTO[]>(url);
  },
};

export default clubService;
