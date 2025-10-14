import axios from 'axios';
import type { HomepageData } from '../types/homepage';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export async function getHomepageData(): Promise<HomepageData> {
  try {
    const response = await apiClient.get<ApiResponse<HomepageData>>('/homepage');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    throw error;
  }
}
