import { createContext, useContext } from "react";

export type PermissionCtx = {
  isOfficer: boolean;
  loading: boolean;
};

export const PermissionContext = createContext<PermissionCtx>({
  isOfficer: false,
  loading: true,
});

export const usePermission = () => useContext(PermissionContext);
