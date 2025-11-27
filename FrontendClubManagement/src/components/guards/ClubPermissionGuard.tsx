import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import Skeleton from "@/components/common/Skeleton";

export interface ClubPermissionGuardProps {
  children: ReactNode;
  require?: "clubOfficer" | "teamOfficer" | "clubTreasurer" | "clubMember" | "hasPermission" | "any";
  clubId?: number;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ClubPermissionGuard({
  children,
  require = "hasPermission",
  clubId: propClubId,
  fallback,
  redirectTo = "/403",
}: ClubPermissionGuardProps) {
  const params = useParams<{ clubId?: string }>();
  
  // Get clubId from prop or route params
  const clubId = propClubId ?? (params.clubId ? Number(params.clubId) : undefined);
  
  const {
    isClubOfficer,
    isTeamOfficer,
    isClubTreasurer,
    isClubMember,
    hasPermission,
    loading,
  } = useClubPermissions(clubId);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Check permission based on require prop
  // Permission hierarchy: CLUB_OFFICER > CLUB_TREASURER > TEAM_OFFICER > CLUB_MEMBER
  let hasAccess = false;
  
  switch (require) {
    case "clubOfficer":
      // Only CLUB_OFFICER
      hasAccess = isClubOfficer;
      break;
    case "teamOfficer":
      // TEAM_OFFICER, CLUB_TREASURER (has all TEAM_OFFICER permissions), or CLUB_OFFICER
      // CLUB_TREASURER has all permissions of TEAM_OFFICER + finance management
      hasAccess = isTeamOfficer || isClubTreasurer || isClubOfficer;
      break;
    case "clubTreasurer":
      // CLUB_TREASURER or CLUB_OFFICER (club officer has higher permission)
      hasAccess = isClubTreasurer || isClubOfficer;
      break;
    case "clubMember":
      hasAccess = isClubMember;
      break;
    case "hasPermission":
      hasAccess = hasPermission;
      break;
    case "any":
      hasAccess = true;
      break;
    default:
      hasAccess = false;
  }

  // If no access, show fallback or redirect
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Render children if access granted
  return <>{children}</>;
}

