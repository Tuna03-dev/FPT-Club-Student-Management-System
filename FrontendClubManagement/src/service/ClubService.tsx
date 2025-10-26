import axiosClient from "@/api/axiosClient";

export interface ClubPresidentData {
  fullName: string;
  email: string;
  avatarUrl: string;
}

export interface ClubDetailData {
  id: number;
  clubName: string;
  clubCode: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  email: string;
  phone: string;
  fbUrl: string;
  igUrl: string;
  ttUrl: string;
  ytUrl: string;
  status: string;
  
  // Campus info
  campusId: number;
  campusName: string;
  campusCode: string;
  
  // Category info
  categoryId: number;
  categoryName: string;
  
  // Statistics
  totalMembers: number;
  totalEvents: number;
  totalPosts: number;
  
  // Recruitment info
  isRecruiting: boolean; // Câu lạc bộ đang mở đợt tuyển (Backend tự động set)
  
  // President info
  president: ClubPresidentData;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Get club detail by ID
export async function getClubDetailById(clubId: number): Promise<ClubDetailData> {
  const res = await axiosClient.get<ClubDetailData>(`/clubs/${clubId}`);
  if (!res.data) throw new Error("Club not found");
  return res.data;
}

// Get club detail by club code
export async function getClubDetailByCode(clubCode: string): Promise<ClubDetailData> {
  const res = await axiosClient.get<ClubDetailData>(`/clubs/code/${clubCode}`);
  if (!res.data) throw new Error("Club not found");
  return res.data;
}

