import { axiosClient } from "../api/axiosClient";
import type { ApiResponse } from "../api/axiosClient";
export interface GoogleLoginRequest {
  idToken: string;
}

export interface ClubRoleInfo {
  clubId: number;
  clubName: string;
  clubRole: string; // "thành viên", "Chủ nhiệm"
  systemRole: string; // "MEMBER", "CLUB_PRESIDENT"
}

export interface UserInfo {
  id: number | null;
  email: string;
  fullName: string;
  avatarUrl: string;
  systemRole: string;
  clubRoleList?: ClubRoleInfo[]; // Danh sách club roles của user
}

export interface AuthenticationResponse {
  accessToken: string;
  user: UserInfo;
}

export const authService = {
  loginWithGoogle: async (
    idToken: string
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    return axiosClient.post<AuthenticationResponse>("/auth/google", {
      idToken,
    });
  },

  refreshToken: async (): Promise<ApiResponse<AuthenticationResponse>> => {
    return axiosClient.post<AuthenticationResponse>("/auth/refreshToken");
  },

  logoutApi: async (): Promise<ApiResponse<string>> => {
    return axiosClient.post<string>("/auth/logout");
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  },

  logoutWithApi: async (): Promise<boolean> => {
    try {
      await authService.logoutApi();
      authService.logout();
      return true;
    } catch (error) {
      console.error("Logout API error:", error);
      // Even if API fails, clear local storage
      authService.logout();
      return false;
    }
  },

  getCurrentUser: (): UserInfo | null => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  setTokens: (accessToken: string) => {
    localStorage.setItem("accessToken", accessToken);
  },

  setUser: (user: UserInfo) => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  setUserWithRoles: (user: UserInfo, clubRoles: ClubRoleInfo[]) => {
    const userWithRoles = { ...user, clubRoleList: clubRoles };
    localStorage.setItem("user", JSON.stringify(userWithRoles));
  },

  refreshUserRoles: async (): Promise<ClubRoleInfo[]> => {
    try {
      // Gọi API để lấy role mới nhất
      const response = await axiosClient.get<ClubRoleInfo[]>("/auth/my-roles");
      if (response.code === 200 && response.data) {
        const user = authService.getCurrentUser();
        if (user) {
          authService.setUserWithRoles(user, response.data);
        }
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error refreshing user roles:", error);
      return [];
    }
  },

  getClubRole: (clubId: number): ClubRoleInfo | null => {
    const user = authService.getCurrentUser();
    return user?.clubRoleList?.find((r) => r.clubId === clubId) || null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("accessToken");
  },
};
