import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from "axios";

// Import AuthenticationResponse type
import type { UserInfo } from "@/services/authService";

interface AuthenticationResponse {
  accessToken: string;
  user: UserInfo;
}

// ===== Token Helpers =====
const getAccessToken = (): string | null => localStorage.getItem("accessToken");

const setAccessToken = (token: string): void =>
  localStorage.setItem("accessToken", token);

const removeTokens = (): void => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
};

// ===== API Response wrapper (match backend ApiResponse<T>) =====
export interface ApiResponse<T> {
  code: number;
  message: string;
  timestamp: string;
  data?: T;
  errors?: { field: string; errorMessage: string }[];
}

// ===== Axios instance =====
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: import.meta.env.VITE_TIMEOUT || 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ===== Request Interceptor =====
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If data is FormData, let axios set Content-Type automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ===== Response Interceptor =====
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Refresh token flow
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Use server-side refresh token API (refresh token is sent via HttpOnly cookie)
        const refreshResponse = await axios.post<
          ApiResponse<AuthenticationResponse>
        >(
          `${import.meta.env.VITE_API_URL || "/api"}/auth/refreshToken`,
          {},
          {
            withCredentials: true,
          }
        );

        if (refreshResponse.data.code === 200 && refreshResponse.data.data) {
          const authData = refreshResponse.data.data;
          setAccessToken(authData.accessToken);

          // ✅ Cập nhật user info với roles mới khi refresh token
          if (authData.user) {
            // Import authService dynamically để tránh circular dependency
            const { authService } = await import("../services/authService");
            authService.setUser(authData.user);
            
            // Dispatch event để notify các components về sự thay đổi
            window.dispatchEvent(new Event("auth-state-changed"));
          }

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${authData.accessToken}`,
          };
          return axiosInstance(originalRequest);
        } else {
          throw new Error("Invalid refresh response");
        }
      } catch (refreshError) {
        removeTokens();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      removeTokens();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ===== API Wrapper =====
export const axiosClient = {
  get: async <T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    const res = await axiosInstance.get<ApiResponse<T>>(url, config);
    return res.data;
  },

  post: async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    const res = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return res.data;
  },

  put: async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    const res = await axiosInstance.put<ApiResponse<T>>(url, data, config);
    return res.data;
  },

  patch: async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    const res = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return res.data;
  },

  delete: async <T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> => {
    const res = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return res.data;
  },
};

// Export axiosInstance để dùng cho blob response
export { axiosInstance };

export default axiosClient;