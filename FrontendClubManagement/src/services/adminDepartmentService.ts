// src/services/adminDepartmentService.ts
import axiosClient from "@/api/axiosClient";
import { type ApiResponse } from "@/types";

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

class AdminDepartmentService {
  // Lấy thông tin phòng ban theo id
  async getDepartmentById(
    id: number
  ): Promise<ApiResponse<AdminDepartmentResponse>> {
    return axiosClient.get<AdminDepartmentResponse>(
      `/admin-departments/${id}`
    );
  }

  // Cập nhật thông tin phòng ban
  async updateDepartment(
    id: number,
    data: AdminDepartmentUpdateRequest
  ): Promise<ApiResponse<AdminDepartmentResponse>> {
    return axiosClient.put<AdminDepartmentResponse>(
      `/admin-departments/${id}`,
      data
    );
  }
}

export const adminDepartmentService = new AdminDepartmentService();
export default adminDepartmentService;
