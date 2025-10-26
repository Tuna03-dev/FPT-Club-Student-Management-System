export interface ApiResponse<T> {
  code: number;
  message: string;
  timestamp: string;
  data: T;
}
