import { useState, useEffect } from "react";
import { authService, type UserInfo } from "@/services/authService";
import { useMyClubs } from "./useMyClubs";

export interface ClubPermissions {
  isClubOfficer: boolean;
  isClubMember: boolean;
  hasPermission: boolean;
  loading: boolean;
  user: UserInfo | null;
}

/**
 * Hook to check if user has permissions to manage club
 * Requires: CLUB_OFFICER system role AND active membership in the club
 */
export function useClubPermissions(clubId: number | undefined): ClubPermissions {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: myClubs, loading: clubsLoading } = useMyClubs();

  useEffect(() => {
    // Get current user
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Loading is done when both user and clubs data are ready
    if (!clubsLoading) {
      setLoading(false);
    }
  }, [clubsLoading]);

  // Check if user has CLUB_OFFICER system role
  const isClubOfficer = user?.systemRole === "CLUB_OFFICER";

  // Check if user is a member of this club
  const isClubMember = !!(
    clubId &&
    myClubs &&
    myClubs.some((club) => club.clubId === clubId)
  );

  // User has permission if they are BOTH a club officer AND a member of this club
  const hasPermission = isClubOfficer && isClubMember;

  return {
    isClubOfficer,
    isClubMember,
    hasPermission,
    loading,
    user,
  };
}

