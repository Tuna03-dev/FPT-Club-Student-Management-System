import { axiosClient } from "./axiosClient";

export interface MyClubDTO {
  clubId: number;
  clubName: string;
  logoUrl?: string;
  // roleNames?: string[];
}

export interface ClubDetailDTO {
  clubId: number;
  clubName: string;
  teams: Array<{
    teamId: number;
    teamName: string;
    description: string;
    memberCount: number;
  }>;
}

export async function getMyClubs(): Promise<MyClubDTO[]> {
  const res = await axiosClient.get<MyClubDTO[]>("/management/my-clubs");
  if (res.code !== 200) throw new Error(res.message || "Failed to fetch clubs");
  return res.data ?? [];
}

export async function getClubDetail(clubId: number): Promise<ClubDetailDTO> {
  const res = await axiosClient.get<ClubDetailDTO>(`/management/clubs/${clubId}`);
  if (res.code !== 200) throw new Error(res.message || "Failed to fetch club detail");
  return res.data!;
}
