export interface TeamMemberDTO {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  roleName: string;        // vai trò của member trong team
  email: string;
  studentCode: string;
}

export interface VisibleTeamDTO {
  teamId: number;
  teamName: string;
  description: string;
  memberCount: number;
  myRoles: string[];       // vai trò của current user trong team (nếu có)
}

export interface MyTeamDetailDTO {
  teamId: number;
  teamName: string;
  description: string;
  member: boolean;         // current user có thuộc team không
  myRoles: string[];       // vai trò của current user
  memberCount: number;     // tổng TV distinct
  members: TeamMemberDTO[];// danh sách thành viên (admin xem được hết)
  linkGroupChat: string | null;
}
export interface CreateTeamPayload {
  clubId: number;
  teamName: string;
  description?: string;
  linkGroupChat?: string;
  leaderUserId?: number;
  viceLeaderUserId?: number;
  memberUserIds?: number[];
}
export interface UpdateTeamPayload {
  teamName?: string;
  description?: string;
  linkGroupChat?: string;
}

export interface TeamResponse {
  id: number;
  teamName: string;
  description: string;
  linkGroupChat: string | null;
}