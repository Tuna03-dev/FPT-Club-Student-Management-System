import { axiosClient } from "@/api/axiosClient";

export type SemesterSummary = {
  id: number;
  semesterName: string;
  semesterCode?: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type SemesterListResponse = {
  total: number;
  count: number;
  data: SemesterSummary[];
};

export type SemesterFilterRequest = {
  page?: number;
  size?: number;
  sort?: string[];
  keyword?: string;
  isCurrent?: boolean;
};

export type CreateSemesterPayload = {
  semesterName: string;
  semesterCode?: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
};

export type UpdateSemesterPayload = {
  semesterName?: string;
  semesterCode?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
};

const baseUrl = "/admin/semester";

export const semesterManagementService = {
  async getAllByFilter(request: SemesterFilterRequest): Promise<SemesterListResponse> {
    const res = await axiosClient.post<SemesterListResponse>(`${baseUrl}/all-by-filter`, request);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "Không thể lấy danh sách kỳ học");
    }
    return res.data;
  },

  async create(payload: CreateSemesterPayload): Promise<SemesterSummary> {
    const res = await axiosClient.post<SemesterSummary>(`${baseUrl}/create`, payload);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "Không thể tạo kỳ học");
    }
    return res.data;
  },

  async update(semesterId: number, payload: UpdateSemesterPayload): Promise<SemesterSummary> {
    const res = await axiosClient.post<SemesterSummary>(`${baseUrl}/${semesterId}/update`, payload);
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "Không thể cập nhật kỳ học");
    }
    return res.data;
  },

  async remove(semesterId: number): Promise<void> {
    const res = await axiosClient.delete<void>(`${baseUrl}/${semesterId}`);
    if (res.code !== 200) {
      throw new Error(res.message || "Không thể xóa kỳ học");
    }
  },
};

export default semesterManagementService;

