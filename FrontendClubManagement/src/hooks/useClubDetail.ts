import { useEffect, useState } from "react";
import { getClubDetail } from "@/api/clubs";
import type { ClubDetailDTO } from "@/types/club";

export function useClubDetail(clubId?: number) {
  const [data, setData] = useState<ClubDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(!!clubId);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const d = await getClubDetail(clubId);
        if (!alive) return;
        setData(d);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Cannot load club detail");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [clubId]);

  return { data, loading, error };
}
export default useClubDetail;