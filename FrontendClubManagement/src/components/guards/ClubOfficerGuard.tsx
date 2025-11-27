import type { ReactNode } from "react";
import { ClubPermissionGuard } from "./ClubPermissionGuard";

/**
 * Guard component that requires CLUB_OFFICER role
 * Uses the new useClubPermissions hook instead of PermissionContext
 * 
 * @example
 * ```tsx
 * <ClubOfficerGuard>
 *   <AdminPage />
 * </ClubOfficerGuard>
 * ```
 */
export default function ClubOfficerGuard({ 
  children,
  clubId,
}: { 
  children: ReactNode;
  clubId?: number;
}) {
  return (
    <ClubPermissionGuard require="clubOfficer" clubId={clubId}>
      {children}
    </ClubPermissionGuard>
  );
}
