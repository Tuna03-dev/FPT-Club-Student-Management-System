// src/hooks/useTeamLeadGuard.ts
import { useEffect, useState } from "react";
import { axiosClient } from "@/api/axiosClient";

type ApiResponse<T> = {
  code?: number;
  message?: string;
  data?: T;
  result?: T;
};

type MyTeamRoleResponse = {
  member: boolean;
  myRoles?: string[];
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function isLeadByNames(roles: string[] = []) {
  const r = roles.map(norm);
  return (
    r.some((x) => x.includes("truong ban")) ||
    r.some((x) => x.includes("trưởng ban")) ||
    r.some((x) => x.includes("pho ban")) ||
    r.some((x) => x.includes("phó ban")) ||
    r.some((x) => x.includes("team lead")) ||
    r.some((x) => x.includes("lead")) ||
    r.some((x) => x.includes("head")) ||
    r.some((x) => x.includes("officer"))
  );
}

/** unwrap backend {data:{...}} or {result:{...}} or raw object */
function unwrap<T>(raw: any): T {
  if (raw?.data != null) return raw.data as T;
  if (raw?.result != null) return raw.result as T;
  return raw as T;
}

export function useTeamLeadGuard(clubId?: number, teamId?: number) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setAllowed(null);
      setError(null);
      setLoading(true);

      if (!clubId || !teamId || isNaN(clubId) || isNaN(teamId)) {
        if (!cancelled) {
          setAllowed(false);
          setLoading(false);
          setError("Thiếu clubId/teamId");
        }
        return;
      }

      try {
        const res = await axiosClient.get<ApiResponse<MyTeamRoleResponse> | MyTeamRoleResponse>(
          `/clubs/${clubId}/teams/${teamId}/my-role`,
          { signal: controller.signal }
        );

        const payload = unwrap<MyTeamRoleResponse>((res as any).data ?? res);
        if (!payload) throw new Error("Không nhận được dữ liệu quyền.");

        const isMember = !!payload.member;
        const isTeamLeader = isLeadByNames(payload.myRoles ?? []);

        // Quyền:
        // Trưởng ban / Phó ban: phải thuộc team này
        const ok = isMember && isTeamLeader;

        if (!cancelled) setAllowed(ok);
      } catch (e: any) {
        if (!cancelled) {
          setAllowed(false);
          setError(e?.message || "Không kiểm tra được quyền.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clubId, teamId]);

  return { allowed, loading, error };
}
