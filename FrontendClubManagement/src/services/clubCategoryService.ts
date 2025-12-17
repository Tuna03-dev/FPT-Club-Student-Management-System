import type { ApiResponse } from "@/api/axiosClient";
import { axiosClient } from "@/api/axiosClient";
import type { PageResponse } from "@/types";

export interface ClubCategoryDTO {
  id: number;
  categoryName: string;
}

export const clubCategoryService = {
  // Public - get all categories (no paging)
  async getAll(): Promise<ApiResponse<ClubCategoryDTO[]>> {
    return axiosClient.get<ClubCategoryDTO[]>("/club-categories");
  },

  // Staff - get categories with filter/paging
  async getAllForStaff(
    params: {
      q?: string;
      page?: number;
      size?: number;
      sort?: string;
    } = {}
  ): Promise<ApiResponse<PageResponse<ClubCategoryDTO>>> {
    const query = new URLSearchParams();
    if (params.q) query.set("keyword", params.q);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    if (params.sort) query.set("sort", params.sort);

    const url = `/club-categories/staff/filter?${query.toString()}`;
    return axiosClient.get<PageResponse<ClubCategoryDTO>>(url);
  },

  async getById(id: number): Promise<ApiResponse<ClubCategoryDTO>> {
    const url = `/club-categories/staff/${id}`;
    return axiosClient.get<ClubCategoryDTO>(url);
  },

  async create(payload: {
    categoryName: string;
  }): Promise<ApiResponse<ClubCategoryDTO>> {
    const url = `/club-categories/staff`;
    return axiosClient.post<ClubCategoryDTO>(url, payload);
  },

  async update(
    id: number,
    payload: { categoryName: string }
  ): Promise<ApiResponse<ClubCategoryDTO>> {
    const url = `/club-categories/staff/${id}`;
    return axiosClient.put<ClubCategoryDTO>(url, payload);
  },

  async delete(id: number): Promise<ApiResponse<void>> {
    const url = `/club-categories/staff/${id}`;
    return axiosClient.delete<void>(url);
  },
};

export default clubCategoryService;
