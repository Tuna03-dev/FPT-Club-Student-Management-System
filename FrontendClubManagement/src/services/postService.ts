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
  status?: string; // "DRAFT" | "PUBLISHED"
}

export interface UpdatePostRequest {
  clubId: number; // Required
  title?: string;
  content?: string;
  teamId?: number;
  clubWide?: boolean;
  withinClub?: boolean;
  status?: string;
  deleteMediaIds?: number[];
  newMediasMeta?: Array<{
    title?: string;
    caption?: string;
    displayOrder?: number;
    mediaType?: string;
  }>;
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
interface SpringPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;          // ✅ Quan trọng: true nếu là trang cuối
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;         // ✅ Page number hiện tại
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;         // ✅ true nếu là trang đầu
  numberOfElements: number;
  empty: boolean;
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
  ): Promise<ApiResponse<SpringPageResponse<PostWithRelationsData>>> {
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
    files?: File[],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<PostWithRelationsData>> {
    const formData = new FormData();
    
    // Create a Blob for the JSON request with correct content-type
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: "application/json",
    });
    formData.append("request", requestBlob, "request.json");
    
    // Append files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append("files", file);
      });
    }

    // Config cho upload: timeout dài + progress (kiểu AxiosRequestConfig)
    const config: import('axios').AxiosRequestConfig = {
      timeout: 300000, // 5 phút - adjust nếu cần
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
      // Không set Content-Type: axios tự handle FormData
    };

    return axiosClient.post("/posts/create/with-media", formData, config);
  },

  // Update post
  async updatePost(
    postId: number,
    request: UpdatePostRequest,
    files?: File[]
  ): Promise<ApiResponse<PostWithRelationsData>> {
    const formData = new FormData();
    
    // Create a Blob for the JSON request with correct content-type
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: "application/json",
    });
    formData.append("request", requestBlob, "request.json");
    
    // Append files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append("files", file);
      });
    }

    // Don't set Content-Type header - Axios handles it
    return axiosClient.put(`/posts/update/${postId}`, formData);
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
