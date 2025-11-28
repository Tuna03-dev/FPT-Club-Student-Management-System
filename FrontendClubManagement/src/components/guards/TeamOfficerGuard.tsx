import type { ReactNode } from "react";
import { ClubPermissionGuard } from "./ClubPermissionGuard";

/**
 * Guard component that requires TEAM_OFFICER role or higher
 * 
 * @example
 * ```tsx
 * <TeamOfficerGuard>
 *   <TeamManagementPage />
 * </TeamOfficerGuard>
 * ```
 */
export function TeamOfficerGuard({ 
  children,
  clubId,
}: { 
  children: ReactNode;
  clubId?: number;
}) {
  return (
    <ClubPermissionGuard require="teamOfficer" clubId={clubId}>
      {children}
    </ClubPermissionGuard>
  );
}

