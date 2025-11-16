import type { ApiResponse } from "@/api/axiosClient";
import axiosClient from "@/api/axiosClient";
export interface ClubCategoryDTO {
    id: number;
    categoryName: string;
}

export const clubCategoryService = {
    async getAll(): Promise<ApiResponse<ClubCategoryDTO[]>> {
        return await axiosClient.get<ClubCategoryDTO[]>("/club-categories");
    }

}