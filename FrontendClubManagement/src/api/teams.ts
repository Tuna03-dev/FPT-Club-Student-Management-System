import { axiosClient } from "./axiosClient";
import type { ApiResponse } from "@/types/api";
import type { VisibleTeamDTO, MyTeamDetailDTO } from "@/types/team";

export async function getVisibleTeams(
  clubId: number,
  semesterId?: number
): Promise<VisibleTeamDTO[]> {
  const res = await axiosClient.get<VisibleTeamDTO[]>(
    `/management/clubs/${clubId}/teams`,
    { params: { semesterId } }
  );
  if (res.code !== 200) throw new Error(res.message || "Failed to fetch teams");
  return res.data ?? [];
}

export async function getTeamDetail(
  clubId: number,
  teamId: number,
  semesterId?: number
): Promise<MyTeamDetailDTO> {
  const res = await axiosClient.get<MyTeamDetailDTO>(
    `/management/clubs/${clubId}/team/${teamId}`, // BE của bạn là `/team/:teamId`
    { params: { semesterId } }
  );
  if (res.code !== 200) throw new Error(res.message || "Failed to fetch team detail");
  return res.data!;
}
