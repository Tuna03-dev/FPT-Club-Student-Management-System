import { useEffect, useState } from "react";
import { getMyClubs } from "@/api/clubs";
import type { MyClubDTO } from "@/types/dto/MyClubDTO";

export function useMyClubs() {
  const [data, setData] = useState<MyClubDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true; 
    (async () => {
      try {
        const clubs = await getMyClubs();
        if (!alive) return;
        setData(clubs);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Cannot load clubs");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { data, loading, error };
}
export default useMyClubs;