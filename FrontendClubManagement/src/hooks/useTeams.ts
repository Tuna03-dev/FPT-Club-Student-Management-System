import { useEffect, useState } from "react";
import { getVisibleTeams } from "@/api/teams";
import type { VisibleTeamDTO } from "@/types/team";

export function useTeams(clubId?: number) {
  const [data, setData] = useState<VisibleTeamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return; // ⛔ KHÔNG gọi khi chưa có clubId
    setLoading(true);
    getVisibleTeams(clubId)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error("getVisibleTeams error:", err);
        setError("Failed to fetch teams");
      })
      .finally(() => setLoading(false));
  }, [clubId]);

  return { data, loading, error };
}
