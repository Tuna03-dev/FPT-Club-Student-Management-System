import { axiosClient } from "./axiosClient";
import type { VisibleTeamDTO, MyTeamDetailDTO } from "@/types/team";
import type { CreateTeamPayload, TeamResponse, UpdateTeamPayload } from "@/types/team";

export async function getVisibleTeams(
  clubId?: number,
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
    `/management/clubs/${clubId}/team/${teamId}`,
    { params: { semesterId } }
  );
  if (res.code !== 200)
    throw new Error(res.message || "Failed to fetch team detail");
  return res.data!;
}

export async function getAllTeamsForPresident(
  clubId: number
): Promise<VisibleTeamDTO[]> {
  const res = await axiosClient.get<VisibleTeamDTO[]>(
    `/management/clubs/${clubId}/teams/president`
  );
  if (res.code !== 200)
    throw new Error(res.message || "Failed to fetch teams for president");
  return res.data ?? [];
}
export async function createTeam(payload: CreateTeamPayload): Promise<TeamResponse> {
  const res = await axiosClient.post<TeamResponse>("/teams", payload);
  if (res.code !== 200 || !res.data) throw new Error(res.message || "Create team failed");
  try {
    window.dispatchEvent(
      new CustomEvent("team-created", { detail: { clubId: payload.clubId } })
    );
  } catch { }
  return res.data;
}
export async function updateTeam(
  teamId: number,
  payload: UpdateTeamPayload
): Promise<TeamResponse> {
  const res = await axiosClient.patch<TeamResponse>(`/teams/${teamId}`, payload);
  if (res.code !== 200 || !res.data)
    throw new Error(res.message || "Update team failed");
  return res.data;
}
export async function deleteTeam(teamId: number): Promise<void> {
  const res = await axiosClient.delete<null>(`/teams/${teamId}`);
  if (res.code !== 200)
    throw new Error(res.message || "Delete team failed");
}
