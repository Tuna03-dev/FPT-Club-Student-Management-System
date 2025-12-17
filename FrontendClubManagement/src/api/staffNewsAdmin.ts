// src/api/staffNewsAdmin.ts
import axiosClient from "@/api/axiosClient";

export type Id = number;

export interface StaffUpdateNewsPayload {
  title: string;
  content: string;
  type: string;
  thumbnailUrl: string | null;
}

export interface NewsData {
  id: number;
  title: string;
  content: string;
  newsType: string;    
  hidden: boolean;
  deleted: boolean;
}

function assertRequiredString(name: string, v: unknown) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`Field "${name}" is required and must be a non-empty string.`);
  }
}
function validatePayload(p: StaffUpdateNewsPayload) {
  assertRequiredString("title", p.title);
  assertRequiredString("content", p.content);
  assertRequiredString("type", p.type);
  assertRequiredString("thumbnailUrl", p.thumbnailUrl);
}

const BASE = "/staff/news";

export const staffNewsAdminApi = {
  async update(id: Id, payload: StaffUpdateNewsPayload) {
    validatePayload(payload);
    const res = await axiosClient.patch<NewsData>(`${BASE}/${id}`, payload);
    return res; 
  },

  async hide(id: Id) {
    const res = await axiosClient.post<void>(`${BASE}/${id}/hide`, {});
    return res; 
  },

  async unhide(id: Id) {
    const res = await axiosClient.post<void>(`${BASE}/${id}/unhide`, {});
    return res; 
  },

  /** Xóa mềm: DELETE /api/staff/news/{id} */
  async softDelete(id: Id) {
    const res = await axiosClient.delete<void>(`${BASE}/${id}`);
    return res;
  },

  async restore(id: Id) {
    const res = await axiosClient.post<void>(`${BASE}/${id}/restore`, {});
    return res; 
  },
};

export default staffNewsAdminApi;
