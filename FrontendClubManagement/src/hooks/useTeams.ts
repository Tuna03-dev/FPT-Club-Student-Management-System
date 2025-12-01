// src/hooks/useTeams.ts
import { useEffect, useState, useCallback } from "react";
import { getVisibleTeams } from "@/api/teams";
import type { VisibleTeamDTO } from "@/types/team";
import { isCanceled } from "@/utils/isCanceled";

export function useTeams(clubId?: number, semesterId?: number) {
  const [data, setData] = useState<VisibleTeamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!clubId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const res = await getVisibleTeams(clubId, semesterId);
      setData(res);
      setError(null);
    } catch (err: any) {
      if (isCanceled(err)) return; // ✅ bỏ qua cancel
      console.error("getVisibleTeams error:", err);
      if (err.response?.status === 403) {
        setError("Bạn không có quyền xem các phòng ban của CLB này.");
      } else {
        setError("Không thể tải danh sách phòng ban.");
      }
    } finally {
      setLoading(false);
    }
  }, [clubId, semesterId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);
  useEffect(() => {
    function onTeamDeleted(e: any) {
      const { teamId } = e.detail;
      setData((prev) => prev.filter((t) => t.teamId !== teamId));
    }

    window.addEventListener("team-deleted", onTeamDeleted);
    return () => window.removeEventListener("team-deleted", onTeamDeleted);
  }, []);
  return {
    data,
    loading,
    error,
    refetch: fetchTeams,
  };
}
