import { axiosClient } from "../api/axiosClient";
import type { ApiResponse } from "../api/axiosClient";
export interface GoogleLoginRequest {
  idToken: string;
}

export interface UserInfo {
  id: number | null;
  email: string;
  fullName: string;
  avatarUrl: string;
  systemRole: string;
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
    return axiosClient.post<AuthenticationResponse>(
      "/auth/refreshTokenServerSide"
    );
  },

  logoutApi: async (): Promise<ApiResponse<string>> => {
    return axiosClient.post<string>("/auth/logout");
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
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

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("accessToken");
  },
};
