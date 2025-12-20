import { axiosClient, type ApiResponse } from "@/api/axiosClient";

export interface CampusSimpleResponse {
  id: number;
  campusCode: string;
  campusName: string;
}

export interface AdminDepartmentResponse {
  id: number;
  departmentCode: string;
  departmentName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  bannerUrl: string;
  fbLink: string;
  igLink: string;
  ttLink: string;
  ytLink: string;
  sortDescription: string;
  campus: CampusSimpleResponse;
}

export interface AdminDepartmentUpdateRequest {
  departmentName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  fbLink?: string;
  igLink?: string;
  ttLink?: string;
  ytLink?: string;
  sortDescription?: string;
}

export const adminDepartmentService = {
  async getDepartmentById(
    id: number
  ): Promise<ApiResponse<AdminDepartmentResponse>> {
    return axiosClient.get<AdminDepartmentResponse>(
      `/admin-departments/${id}`
    );
  },

  async getDepartmentsByCampus(
    campusId?: number
  ): Promise<ApiResponse<AdminDepartmentResponse[]>> {
    const url = campusId 
      ? `/admin-departments?campusId=${campusId}`
      : `/admin-departments`;
    return axiosClient.get<AdminDepartmentResponse[]>(url);
  },

  async updateDepartment(
    id: number,
    data: AdminDepartmentUpdateRequest
  ): Promise<ApiResponse<AdminDepartmentResponse>> {
    return axiosClient.put<AdminDepartmentResponse>(
      `/admin-departments/${id}`,
      data
    );
  },
};

export default adminDepartmentService;
