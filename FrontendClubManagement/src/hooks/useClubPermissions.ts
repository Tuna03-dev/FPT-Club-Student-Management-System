import { useState, useEffect } from "react";
import { authService, type UserInfo } from "@/services/authService";
import { useMyClubs } from "./useMyClubs";

export interface ClubPermissions {
  isClubPresident: boolean;
  isClubMember: boolean;
  hasPermission: boolean;
  loading: boolean;
  user: UserInfo | null;
}

/**
 * Hook to check if user has permissions to manage club recruitment
 * Requires: 
 * - User must be an ACTIVE member of the club
 * - User must have CLUB_OFFICER club role in the current semester
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

  // Find the specific club
  const userClub = clubId && myClubs ? myClubs.find((club) => club.clubId === clubId) : null;

  // Check if user is a member of this club
  const isClubMember = !!userClub;

  // Check if user has CLUB_OFFICER role in this club
  const isClubPresident = !!(
    userClub &&
    userClub.clubRoles &&
    userClub.clubRoles.includes("CLUB_OFFICER")
  );

  // User has permission if they have CLUB_OFFICER role in this club
  const hasPermission = isClubPresident;

  return {
    isClubPresident,
    isClubMember,
    hasPermission,
    loading,
    user,
  };
}

