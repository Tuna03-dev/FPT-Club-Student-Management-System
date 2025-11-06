import { axiosClient } from "./axiosClient";
import type { ClubCard, ClubDetail, PageResp } from "../types/publicClub";

export async function getPublicClubs(params?: {
  q?: string;
  campusId?: number;
  categoryId?: number;
  page?: number;
  size?: number;
}): Promise<PageResp<ClubCard>> {
  try {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const url = `/public/clubs${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await axiosClient.get<PageResp<ClubCard>>(url);

    if (response.code !== 200) {
      throw new Error(response.message || "Failed to fetch clubs");
    }

    return response.data!;
  } catch (error) {
    console.error("❌ Error fetching public clubs:", error);
    throw error;
  }
}

export async function getPublicClubDetail(
  id: number,
  expand?: string
): Promise<ClubDetail> {
  try {
    const url = `/public/clubs/${id}${expand ? `?expand=${expand}` : ""}`;
    const response = await axiosClient.get<ClubDetail>(url);

    if (response.code !== 200) {
      throw new Error(response.message || "Failed to fetch club detail");
    }

    return response.data!;
  } catch (error) {
    console.error(`❌ Error fetching club detail (id=${id}):`, error);
    throw error;
  }
}
