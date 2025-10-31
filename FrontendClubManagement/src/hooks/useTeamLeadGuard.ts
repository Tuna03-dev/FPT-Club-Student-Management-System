// src/hooks/useTeamLeadGuard.ts
import { useEffect, useState } from "react";
import { axiosClient } from "@/api/axiosClient";

type MyRoleResp = {
  member: boolean;
  myRoles?: string[];
};

function stripAccents(s: string) {
  return (s || "")
    .normalize("NFD")
    // fallback cho môi trường không hỗ trợ \p{Diacritic}
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLeadByText(roles: string[] = []) {
  const keys = [
    "lead",
    "head",
    "officer",
    "truong ban",
    "trưởng ban",
    "pho ban",
    "phó ban",
    "team lead",
  ].map(stripAccents);
  return roles.some((r) => {
    const rr = stripAccents(r);
    return keys.some((k) => rr.includes(k));
  });
}

export function useTeamLeadGuard(clubId?: number, teamId?: number) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      setAllowed(null);

      if (!clubId || !teamId || isNaN(clubId) || isNaN(teamId)) {
        if (!cancelled) {
          setAllowed(false);
          setLoading(false);
          setError("Thiếu clubId/teamId");
        }
        return;
      }

      try {
        const api = await axiosClient.get<MyRoleResp>(
          `/clubs/${clubId}/teams/${teamId}/my-role`
        );
        const payload = api.data;
        if (!payload) throw new Error("Không nhận được dữ liệu quyền.");

        const isMember = !!payload.member;
        const roles = payload.myRoles || [];
        const leadByText = isLeadByText(roles);

        const ok = isMember && leadByText; // bắt buộc là thành viên & có vai trò lead/deputy
        if (!cancelled) {
          setAllowed(ok);
        }
      } catch (e: any) {
        if (!cancelled) {
          setAllowed(false);
          setError(e?.message || "Không kiểm tra được quyền truy cập.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [clubId, teamId]);

  return { allowed, loading, error };
}
