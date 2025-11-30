import { axiosClient } from "./axiosClient";
import type { MyClubDTO } from "@/types/dto/MyClubDTO";
import type { ClubDetailData, UpdateClubInfoRequest } from "@/types/club";

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
  console.log("[getMyClubs] CALL API /my-clubs");
  const res = await axiosClient.get<MyClubDTO[]>("/management/my-clubs");
  if (res.code !== 200) throw new Error(res.message || "Failed to fetch clubs");
  return res.data ?? [];
}

export async function getClubDetail(clubId: number): Promise<ClubDetailDTO> {
  const res = await axiosClient.get<ClubDetailDTO>(
    `/management/clubs/${clubId}`
  );
  if (res.code !== 200)
    throw new Error(res.message || "Failed to fetch club detail");
  return res.data!;
}

/**
 * Get club information for members to view
 * GET /api/clubs/info/{id}/club-info
 */
export async function getClubInfo(clubId: number): Promise<ClubDetailData> {
  const res = await axiosClient.get<ClubDetailData>(
    `/clubInfo/${clubId}/club-info`
  );
  if (res.code !== 200)
    throw new Error(res.message || "Failed to fetch club info");
  return res.data!;
}

/**
 * Update club information (Club Officer only)
 * PUT /api/clubs/info/{id}/officer-update
 */
export async function updateClubInfo(
  clubId: number,
  request: UpdateClubInfoRequest,
  logoFile?: File,
  bannerFile?: File
): Promise<ClubDetailData> {
  const formData = new FormData();

  // Add request data as JSON blob
  const requestBlob = new Blob([JSON.stringify(request)], {
    type: "application/json",
  });
  formData.append("request", requestBlob);

  // Add files if provided
  if (logoFile) {
    formData.append("logoFile", logoFile);
  }
  if (bannerFile) {
    formData.append("bannerFile", bannerFile);
  }

  const res = await axiosClient.put<ClubDetailData>(
    `/clubInfo/${clubId}/officer-update`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds
    }
  );
  if (res.code !== 200) {
    // Throw object with errors so the UI can render field errors
    throw {
      message: res.message || "Failed to update club info",
      code: res.code,
      errors: res.errors,
    };
  }
  return res.data!;
}
