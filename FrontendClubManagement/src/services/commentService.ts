import { axiosClient, type ApiResponse } from "@/api/axiosClient";

export interface CommentDTO {
  id: number;
  postId: number;
  parentId: number | null;
  // rootParentId: id of the top-level comment this comment belongs to (null for top-level)
  rootParentId?: number | null;
  userId: number;
  userName: string;
  userAvatar: string | null;
  content: string;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: CommentDTO[];
}

export interface CreateCommentRequest {
  userId: number;
  content: string;
  parentId?: number | null;
}

export interface EditCommentRequest {
  content: string;
}

export const commentService = {
  /**
   * Lấy tất cả comments của một post (flat structure)
   */
  getAllFlat: async (postId: number): Promise<ApiResponse<CommentDTO[]>> => {
    return axiosClient.get<CommentDTO[]>(`/comments/posts/${postId}/comments`);
  },

  /**
   * Lấy top-level comments (phân trang)
   */
  getTopLevel: async (
    postId: number,
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<CommentDTO[]>> => {
    return axiosClient.get<CommentDTO[]>(`/comments/posts/${postId}`, {
      params: { page, size },
    });
  },

  /**
   * Lấy replies của một comment
   */
  getReplies: async (parentId: number): Promise<ApiResponse<CommentDTO[]>> => {
    return axiosClient.get<CommentDTO[]>(`/comments/${parentId}/replies`);
  },

  /**
   * Tạo comment mới hoặc reply
   */
  create: async (
    postId: number,
    request: CreateCommentRequest
  ): Promise<ApiResponse<CommentDTO>> => {
    return axiosClient.post<CommentDTO>(`/comments/posts/${postId}`, request);
  },

  /**
   * Sửa comment
   */
  edit: async (
    commentId: number,
    request: EditCommentRequest
  ): Promise<ApiResponse<CommentDTO>> => {
    return axiosClient.patch<CommentDTO>(`/comments/${commentId}`, request);
  },

  /**
   * Xóa comment (soft delete)
   */
  delete: async (commentId: number): Promise<ApiResponse<void>> => {
    return axiosClient.delete<void>(`/comments/${commentId}`);
  },
};

export default commentService;
