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
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserInfo;
}

export const authService = {
  loginWithGoogle: async (
    idToken: string
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    return axiosClient.post<AuthenticationResponse>("/v1/auth/google", {
      idToken,
    });
  },

  logoutApi: async (): Promise<ApiResponse<string>> => {
    const refreshToken = localStorage.getItem("refreshToken");
    return axiosClient.post<string>("/v1/auth/logout", refreshToken ? { refreshToken } : {});
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },

  getCurrentUser: (): UserInfo | null => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },

  setUser: (user: UserInfo) => {
    localStorage.setItem("user", JSON.stringify(user));
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("accessToken");
  },
};
