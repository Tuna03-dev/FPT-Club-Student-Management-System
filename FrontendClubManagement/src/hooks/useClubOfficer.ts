import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "@/api/axiosClient";
import { getVisibleTeams } from "@/api/teams";
import axios from "axios";

type ApiResp<T> = { data?: T; result?: T } | T;
type TeamMyRoleResp = { myRoles?: string[] };

const TTL = 5 * 60 * 1000; // 5 phút

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const isCNorPCN = (roles: string[] = []) => {
  const keys = [
    "chủ nhiệm","chu nhiem",
    "phó chủ nhiệm","pho chu nhiem",
    "president","club president",
    "vice president","vice-president","vice pres","vp",
  ].map(norm);
  const r = roles.map(norm);
  return r.some((role) => keys.some((k) => role.includes(k)));
};

const isCanceled = (e: any) =>
  (axios.isCancel && axios.isCancel(e)) ||
  e?.code === "ERR_CANCELED" ||
  e?.message === "canceled";

function unwrap<T>(raw: any): T {
  if (raw && typeof raw === "object") {
    if ("data" in raw && raw.data != null) return raw.data as T;
    if ("result" in raw && raw.result != null) return raw.result as T;
  }
  return raw as T;
}

export function useClubOfficer(clubId?: number, teamIdFromUrl?: number) {
  const [isOfficer, setIsOfficer] = useState(false);
  const [loading, setLoading] = useState(true);

  const cacheKey = clubId ? `officer:${clubId}` : "";
  const firstTeamKey = clubId ? `firstTeamId:${clubId}` : "";

  const cachedFirstTeamId = useMemo(() => {
    if (!clubId) return undefined;
    try {
      const s = sessionStorage.getItem(firstTeamKey);
      if (!s) return undefined;
      const { value, at } = JSON.parse(s);
      if (Date.now() - at > TTL) return undefined;
      return typeof value === "number" ? value : undefined;
    } catch { return undefined; }
  }, [clubId]);

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }

    // đọc cache officer để giảm nháy
    try {
      const s = sessionStorage.getItem(cacheKey);
      if (s) {
        const { value, at } = JSON.parse(s);
        if (Date.now() - at < TTL && typeof value === "boolean") {
          setIsOfficer(value);
        }
      }
    } catch {}

    let dead = false;
    const controller = new AbortController(); // 👈 controller để abort khi unmount

    (async () => {
      setLoading(true);

      // Ưu tiên teamId: URL -> cached -> fetch visible
      let teamId = teamIdFromUrl ?? cachedFirstTeamId;

      if (!teamId) {
        try {
          const teams = await getVisibleTeams(clubId);
          teamId = teams?.[0]?.teamId ? Number(teams[0].teamId) : undefined;
          if (teamId) {
            sessionStorage.setItem(
              firstTeamKey,
              JSON.stringify({ value: teamId, at: Date.now() })
            );
          }
        } catch (e) {
          if (!isCanceled(e)) {
            // bỏ qua lỗi khác, không crash
          }
        }
      }

      let ok = false;
      if (teamId) {
        try {
          const res = await axiosClient.get<ApiResp<TeamMyRoleResp>>(
            `/clubs/${clubId}/teams/${teamId}/my-role`,
            { timeout: 5000, signal: controller.signal } // 👈 truyền signal
          );
          const payload = unwrap<TeamMyRoleResp>((res as any).data ?? res);
          ok = isCNorPCN(payload?.myRoles ?? []);
        } catch (e) {
          if (isCanceled(e)) return; // 👈 bị hủy do chuyển trang -> im lặng
          ok = false;
        }
      }

      if (!dead) {
        setIsOfficer(ok);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ value: ok, at: Date.now() }));
        } catch {}
        setLoading(false);
      }
    })();

    return () => {
      dead = true;
      controller.abort(); // 👈 hủy request đang chạy
    };
  }, [clubId, teamIdFromUrl]);

  return { isOfficer, loading };
}
