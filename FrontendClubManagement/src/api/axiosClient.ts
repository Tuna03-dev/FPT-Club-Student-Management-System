import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from "axios";

// ===== Token Helpers =====
const getAccessToken = (): string | null => localStorage.getItem("accessToken");

const setAccessToken = (token: string): void =>
  localStorage.setItem("accessToken", token);

const removeTokens = (): void => {
  localStorage.removeItem("accessToken");
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
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
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
        const refreshResponse = await axios.post<
          ApiResponse<{ accessToken: string }>
        >(
          `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccessToken}`,
          };
          return axiosInstance(originalRequest);
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

export default axiosClient;
