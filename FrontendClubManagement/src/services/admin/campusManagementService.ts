import { axiosClient } from "@/api/axiosClient";

export type CampusSummary = {
  id: number;
  campusName: string;
  campusCode: string;
  address?: string;
  phone?: string;
  email?: string;
};

export type CampusListResponse = {
  total: number;
  count: number;
  data: CampusSummary[];
};

export type CampusFilterRequest = {
  page?: number;
  size?: number;
  sort?: string[];
  keyword?: string;
};

export type CreateCampusPayload = {
  campusName: string;
  campusCode?: string;
  address?: string;
  phone?: string;
  email?: string;
};

export type UpdateCampusPayload = {
  campusName?: string;
  campusCode?: string;
  address?: string;
  phone?: string;
  email?: string;
};

const baseUrl = "/admin/campus";

export const campusManagementService = {
  async getAllByFilter(request: CampusFilterRequest): Promise<CampusListResponse> {
    const res = await axiosClient.post<CampusListResponse>(`${baseUrl}/all-by-filter`, request);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "Không thể lấy danh sách campus");
    }
    return res.data;
  },

  async create(payload: CreateCampusPayload): Promise<CampusSummary> {
    const res = await axiosClient.post<CampusSummary>(`${baseUrl}/create`, payload);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "Không thể tạo campus");
    }
    return res.data;
  },

  async update(campusId: number, payload: UpdateCampusPayload): Promise<CampusSummary> {
    const res = await axiosClient.post<CampusSummary>(`${baseUrl}/${campusId}/update`, payload);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "Không thể cập nhật campus");
    }
    return res.data;
  },

  async remove(campusId: number): Promise<void> {
    const res = await axiosClient.delete<void>(`${baseUrl}/${campusId}`);
    if (res.code !== 200) {
      throw new Error(res.message || "Không thể xóa campus");
    }
  },
};

export default campusManagementService;


