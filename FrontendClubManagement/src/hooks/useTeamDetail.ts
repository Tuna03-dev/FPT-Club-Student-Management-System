import { useEffect, useState } from "react";
import { getTeamDetail } from "@/api/teams";
import type { MyTeamDetailDTO } from "@/types/team";

export function useTeamDetail(clubId?: number, teamId?: number, semesterId?: number) {
  const [data, setData] = useState<MyTeamDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(!!clubId && !!teamId);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId || !teamId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const d = await getTeamDetail(clubId, teamId, semesterId);
        if (!alive) return;
        setData(d);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Cannot load team detail");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [clubId, teamId, semesterId]);

  return { data, loading, error };
}
export default useTeamDetail;