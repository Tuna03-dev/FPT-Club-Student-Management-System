import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AxiosError } from "axios"
import type { ApiResponse } from "@/api/axiosClient"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract error message from axios error response
 * Returns Vietnamese error message from backend or fallback message
 */
export function getErrorMessage(error: unknown, fallback: string = "Đã xảy ra lỗi"): string {
  if (error instanceof AxiosError) {
    const response = error.response?.data as ApiResponse<unknown> | undefined;
    
    // Try to get message from ApiResponse
    if (response?.message) {
      return response.message;
    }
    
    // Try to get message from error field
    if (response?.errors && Array.isArray(response.errors) && response.errors.length > 0) {
      return response.errors[0].errorMessage || fallback;
    }
    
    // Fallback to axios error message
    if (error.message) {
      return error.message;
    }
  }
  
  // If it's a regular Error
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  return fallback;
}
