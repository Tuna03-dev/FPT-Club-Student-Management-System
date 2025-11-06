import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermission } from "@/contexts/PermissionContext";

export default function ClubOfficerGuard({ children }: { children: ReactNode }) {
  const { isOfficer, loading } = usePermission();

  // Chỉ điều hướng sau khi có kết luận dứt khoát
  if (loading) return null;

  return isOfficer ? <>{children}</> : <Navigate to="/403" replace />;
}
