import { useEffect, useState } from "react";
import { getVisibleTeams } from "@/api/teams";
import type { VisibleTeamDTO } from "@/types/team";
import { isCanceled } from "@/utils/isCanceled";

export function useTeams(clubId?: number, semesterId?: number) {
  const [data, setData] = useState<VisibleTeamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getVisibleTeams(clubId, semesterId)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (isCanceled(err)) return; // ✅ bỏ qua cancel
        console.error("getVisibleTeams error:", err);
        if (err.response?.status === 403)
          setError("Bạn không có quyền xem các phòng ban của CLB này.");
        else setError("Không thể tải danh sách phòng ban.");
      })
      .finally(() => setLoading(false));
  }, [clubId, semesterId]);

  return { data, loading, error };
}
