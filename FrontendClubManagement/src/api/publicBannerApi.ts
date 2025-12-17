import { axiosClient } from "./axiosClient";
export interface BannerResponse {
    id: number;
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaLabel: string;
    ctaLink: string;
}
export const publicBannerApi = {
    get: () => axiosClient.get<BannerResponse>("/public/banner")
};
