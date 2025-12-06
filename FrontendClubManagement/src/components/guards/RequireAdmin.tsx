import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "@/services/authService";

interface Props {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: Props) {
  const user = authService.getCurrentUser();

  if (!user || user.systemRole !== "ADMIN") {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
