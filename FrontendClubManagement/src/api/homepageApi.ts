import { axiosClient } from "./axiosClient";
import type { HomepageData } from "../types/homepage";


export async function getHomepageData(): Promise<HomepageData> {
  try {
    const response = await axiosClient.get<HomepageData>("/homepage");

    if (response.code !== 200) {
      throw new Error(response.message || "Failed to fetch homepage data");
    }

    return response.data!;
  } catch (error) {
    console.error("❌ Error fetching homepage data:", error);
    throw error;
  }
}
