import { axiosClient } from "./axiosClient";

export interface AvailableMemberDTO {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

export async function getAvailableMembers(clubId: number) {
  const res = await axiosClient.get<any>(`teams/clubs/${clubId}/available-members`);
  if (res.code !== 200) throw new Error(res.message || "Fetch members failed");
  return res.data ?? [];
}