import { useState, useEffect, useMemo } from "react";
import { authService, type UserInfo } from "@/services/authService";

export interface ClubPermissions {
  isClubOfficer: boolean;
  isTeamOfficer: boolean;
  isClubTreasurer: boolean;
  isClubMember: boolean;
  hasPermission: boolean;
  loading: boolean;
  user: UserInfo | null;
}

export function useClubPermissions(
  clubId: number | undefined
): ClubPermissions {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  // Tìm club role từ localStorage, reactive với clubId và user
  const clubRole = useMemo(() => {
    if (!clubId || !user) return null;
    return authService.getClubRole(clubId);
  }, [clubId, user]);

  // Check if user is a member of this club
  const isClubMember = useMemo(() => !!clubRole, [clubRole]);

  // Check if user has CLUB_PRESIDENT role in this club
  const isClubOfficer = useMemo(() => {
    if (!clubRole) return false;

    // Kiểm tra theo tên tiếng Việt
    const isPresident = clubRole.systemRole === "CLUB_OFFICER";

    return isPresident;
  }, [clubRole]);

  // Check if user has TEAM_OFFICER role in this club
  const isTeamOfficer = useMemo(() => {
    if (!clubRole) return false;

    // Kiểm tra theo systemRole
    const isOfficer = clubRole.systemRole === "TEAM_OFFICER";

    return isOfficer;
  }, [clubRole]);

  // Check if user has CLUB_TREASURE role in this club
  const isClubTreasurer = useMemo(() => {
    if (!clubRole) return false;

    // Kiểm tra theo systemRole
    const isTreasurer = clubRole.systemRole === "CLUB_TREASURE";

    return isTreasurer;
  }, [clubRole]);

  // User has permission if they have CLUB_OFFICER role in this club

  // User has permission if they have CLUB_PRESIDENT role in this club
  const hasPermission = useMemo(() => isClubOfficer, [isClubOfficer]);

  return {
    isClubOfficer,
    isTeamOfficer,
    isClubTreasurer,
    isClubMember,
    hasPermission,
    loading,
    user,
  };
}
