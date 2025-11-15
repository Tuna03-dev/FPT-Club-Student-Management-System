import { axiosClient, type ApiResponse } from "@/api/axiosClient";

export interface LikeDTO {
  id: number;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface ToggleLikeResponse {
  liked: boolean;
  count: number;
}

interface SpringPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export const likeService = {
  // Toggle like (like/unlike)
  async toggleLike(postId: number): Promise<ApiResponse<ToggleLikeResponse>> {
    return axiosClient.post(`/posts/${postId}/likes/toggle`);
  },

  // Check if current user liked the post
  async isLikedByMe(postId: number): Promise<ApiResponse<boolean>> {
    return axiosClient.get(`/posts/${postId}/likes/me`);
  },

  // Get like count
  async getLikeCount(postId: number): Promise<ApiResponse<number>> {
    return axiosClient.get(`/posts/${postId}/likes/count`);
  },

  // Get list of users who liked
  async getLikeList(
    postId: number,
    params: {
      page?: number;
      size?: number;
    } = {}
  ): Promise<ApiResponse<SpringPageResponse<LikeDTO>>> {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));

    return axiosClient.get(`/posts/${postId}/likes?${query.toString()}`);
  },
};

export default likeService;
