import type { TeamMemberDTO } from "./team";

export interface ClubTeamItemDTO {
  teamId: number;
  teamName: string;
  description: string;
  memberCount: number;
  members?: TeamMemberDTO[]; // controller /clubs/:clubId đang trả kèm (OK)
  activities?: any[]; // để đúng với payload hiện tại của bạn
}

export interface ClubDetailDTO {
  clubId: number;
  clubName: string;
  teams: ClubTeamItemDTO[];
}

export interface ClubPresidentData {
  userId: number;
  fullName: string;
  email: string;
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
  isRecruiting: boolean;

  // Presidents info
  presidents: ClubPresidentData[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface UpdateClubInfoRequest {
  clubName?: string;
  clubCode?: string;
  description?: string;
  email?: string;
  phone?: string;
  fbUrl?: string;
  igUrl?: string;
  ttUrl?: string;
  ytUrl?: string;
  categoryId?: number;
  removeLogo?: boolean;
  removeBanner?: boolean;
}
