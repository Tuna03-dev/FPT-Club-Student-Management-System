import type { ReactNode } from "react";
import { ClubPermissionGuard } from "./ClubPermissionGuard";

/**
 * Guard component that requires user to be a member of the club
 * 
 * @example
 * ```tsx
 * <ClubMemberGuard>
 *   <MemberPage />
 * </ClubMemberGuard>
 * ```
 */
export function ClubMemberGuard({ 
  children,
  clubId,
}: { 
  children: ReactNode;
  clubId?: number;
}) {
  return (
    <ClubPermissionGuard require="clubMember" clubId={clubId}>
      {children}
    </ClubPermissionGuard>
  );
}

