import { axiosClient } from "./axiosClient";

export interface AvailableMemberDTO {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

export interface ImportMemberError {
  row: number;
  studentCode: string;
  semesterCode: string;
  message: string;
}

export interface ImportMembersResponse {
  totalRows: number;
  processedUsers: number;
  processedHistories: number;
  createdUsers: number;
  updatedUsers: number;
  createdMemberships: number;
  updatedMemberships: number;
  createdRoleMemberships: number;
  updatedRoleMemberships: number;
  errors: ImportMemberError[];
  summary: string;
}

export async function getAvailableMembers(clubId: number) {
  const res = await axiosClient.get<any>(
    `teams/clubs/${clubId}/available-members`
  );
  if (res.code !== 200) throw new Error(res.message || "Fetch members failed");
  return res.data ?? [];
}


