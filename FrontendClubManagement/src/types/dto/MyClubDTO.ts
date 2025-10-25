export interface MyClubDTO {
  clubId: number;
  clubName: string;
  logoUrl?: string | null;
  // có thể thêm roleNames nếu sau này backend trả ra
  // roleNames?: string[];
}
