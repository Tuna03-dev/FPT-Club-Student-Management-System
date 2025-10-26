import type { TeamMemberDTO } from "./team";

export interface ClubTeamItemDTO {
  teamId: number;
  teamName: string;
  description: string;
  memberCount: number;
  members?: TeamMemberDTO[];  // controller /clubs/:clubId đang trả kèm (OK)
  activities?: any[];         // để đúng với payload hiện tại của bạn
}

export interface ClubDetailDTO {
  clubId: number;
  clubName: string;
  teams: ClubTeamItemDTO[];
}
