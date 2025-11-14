export interface ClubCard {
  id: number;
  clubCode: string;
  clubName: string;
  shortDescription: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  featured: boolean;
  createdAt: string;
  status: string;
  categoryName: string | null;
  campusName: string | null;
  totalTeams: number;
  topTags: string[];
  tagsOverflow: number;
  hasActiveRecruitment?: boolean;
  activeRecruitmentId?: number | null;
}

export interface ClubTeam {
  id: number;
  teamName: string;
  description?: string;
  linkGroupChat?: string;
  leaderName?: string | null;
  memberCount?: number | null;

}

export interface ClubEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location: string;
}

export interface ClubNews {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  excerpt: string | null;
  publishedAt: string;
  isSpotlight: boolean;
}

export interface ClubDetail {
  id: number;
  clubCode: string;
  clubName: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  fbUrl: string | null;
  igUrl: string | null;
  ttUrl: string | null;
  ytUrl: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  campusName: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  status: string;
  departmentsCount: number;
  teams?: ClubTeam[];
  events?: ClubEvent[];
  news?: ClubNews[];
}

export interface PageResp<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
