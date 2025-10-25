export interface Spotlight {
  type: string;
  title: string;
  description: string;
  imageUrl: string;
  callToActionText: string;
  callToActionLink: string;
}

export interface FeaturedClub {
  id: number;
  clubName: string;
  logoUrl: string;
  description: string;
}

export interface UpcomingEvent {
  id: number;
  title: string;
  startTime: string;
  location: string;
  clubName: string;
  imageUrl: string;
}

export interface LatestNews {
  id: number;
  title: string;
  thumbnailUrl: string;
  excerpt: string;
  createdAt: string;
}

export interface HomepageData {
  spotlight: Spotlight;
  featuredClubs: FeaturedClub[];
  upcomingEvents: UpcomingEvent[];
  latestNews: LatestNews[];
}
