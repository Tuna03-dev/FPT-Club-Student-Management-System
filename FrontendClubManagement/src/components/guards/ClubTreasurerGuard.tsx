import type { ReactNode } from "react";
import { ClubPermissionGuard } from "./ClubPermissionGuard";

/**
 * Guard component that requires CLUB_TREASURE role
 * 
 * @example
 * ```tsx
 * <ClubTreasurerGuard>
 *   <FinancePage />
 * </ClubTreasurerGuard>
 * ```
 */
export function ClubTreasurerGuard({ 
  children,
  clubId,
}: { 
  children: ReactNode;
  clubId?: number;
}) {
  return (
    <ClubPermissionGuard require="clubTreasurer" clubId={clubId}>
      {children}
    </ClubPermissionGuard>
  );
}

