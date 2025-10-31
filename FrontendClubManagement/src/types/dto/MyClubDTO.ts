export interface MyClubDTO {
  clubId: number;
  clubName: string;
  logoUrl?: string | null;
  clubRoles?: string[]; // Danh sách club roles (roleCode) của user trong club này
}
