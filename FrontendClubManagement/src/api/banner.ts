import { axiosClient } from "./axiosClient";

export interface BannerResponse {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaLink: string;
}

export interface BannerUpdateRequest {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaLink: string;
}

export const bannerApi = {
  get: () => axiosClient.get<BannerResponse>("/admin/banner"),
  update: (data: BannerUpdateRequest) =>
    axiosClient.put<BannerResponse>("/admin/banner", data),
};
