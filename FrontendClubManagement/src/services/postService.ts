import { axiosClient, type ApiResponse } from "@/api/axiosClient";

// Post DTOs matching backend
export interface PostMediaData {
  id: number;
  title: string;
  mediaUrl: string;
  mediaType: string; // IMAGE, VIDEO, DOCUMENT
  caption: string;
  displayOrder: number;
  createdAt: string;
}

export interface CommentData {
  id: number;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface LikeData {
  id: number;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface PostWithRelationsData {
  id: number;
  title: string;
  content: string;
  status: string;
  withinClub: boolean;
  clubWide: boolean;
  createdAt: string;
  
  teamId?: number;
  teamName?: string;
  clubId: number;
  clubName: string;
  authorId: number;
  authorName: string;
  
  comments: CommentData[];
  likes: LikeData[];
  media: PostMediaData[];
}

export interface CreatePostRequest {
  title: string;
  content: string;
  clubId: number;
  teamId?: number;
  clubWide: boolean;
  withinClub?: boolean;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  teamId?: number;
  clubWide?: boolean;
  withinClub?: boolean;
}

export interface PostSearchParams {
  q: string;
  clubId?: number;
  teamId?: number;
  clubWide?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export const postService = {
  // Get club-wide posts
  async getClubWidePosts(
    clubId: number,
    params: {
      page?: number;
      size?: number;
      sort?: string;
    } = {}
  ): Promise<ApiResponse<{ content: PostWithRelationsData[]; totalElements: number; totalPages: number; hasNext: boolean; hasPrevious: boolean }>> {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    query.set("sort", params.sort ?? "createdAt,desc");

    return axiosClient.get(`/posts/${clubId}/club-wide?${query.toString()}`);
  },

  // Get team posts
  async getTeamPosts(
    clubId: number,
    teamId: number,
    params: {
      page?: number;
      size?: number;
      sort?: string;
    } = {}
  ): Promise<ApiResponse<{ content: PostWithRelationsData[]; totalElements: number; totalPages: number; hasNext: boolean; hasPrevious: boolean }>> {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    query.set("sort", params.sort ?? "createdAt,desc");

    return axiosClient.get(`/posts/${clubId}/teams/${teamId}?${query.toString()}`);
  },

  // Search posts
  async searchPosts(params: PostSearchParams): Promise<ApiResponse<{ content: PostWithRelationsData[]; totalElements: number; totalPages: number; hasNext: boolean; hasPrevious: boolean }>> {
    const query = new URLSearchParams();
    query.set("q", params.q);
    if (params.clubId) query.set("clubId", String(params.clubId));
    if (params.teamId) query.set("teamId", String(params.teamId));
    if (params.clubWide !== undefined) query.set("clubWide", String(params.clubWide));
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    query.set("sort", params.sort ?? "createdAt,desc");

    return axiosClient.get(`/posts/search?${query.toString()}`);
  },

  // Create post with media
  async createPostWithMedia(
    request: CreatePostRequest,
    files?: File[]
  ): Promise<ApiResponse<PostWithRelationsData>> {
    const formData = new FormData();
    formData.append("request", JSON.stringify(request));
    
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append("files", file);
      });
    }

    return axiosClient.post("/posts/create/with-media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Update post
  async updatePost(
    postId: number,
    request: UpdatePostRequest,
    files?: File[]
  ): Promise<ApiResponse<PostWithRelationsData>> {
    const formData = new FormData();
    formData.append("request", JSON.stringify(request));
    
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append("files", file);
      });
    }

    return axiosClient.put(`/posts/update/${postId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Delete post
  async deletePost(postId: number): Promise<ApiResponse<void>> {
    return axiosClient.delete(`/posts/delete/${postId}`);
  },

  // Delete media from post
  async deleteMedia(postId: number, mediaId: number): Promise<ApiResponse<PostWithRelationsData>> {
    return axiosClient.delete(`/posts/delete/${postId}/media/${mediaId}`);
  },
};

export default postService;
