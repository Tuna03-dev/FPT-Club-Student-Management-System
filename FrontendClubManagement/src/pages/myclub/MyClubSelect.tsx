// src/pages/myclub/MyClubSelect.tsx
import { useEffect, useState } from "react";
import { getMyClubs } from "@/api/clubs";
import type { MyClubDTO } from "@/types/dto/MyClubDTO";
import { useNavigate } from "react-router-dom";

export default function MyClubSelect() {
  const [clubs, setClubs] = useState<MyClubDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyClubs();
        setClubs(data);
      } catch (e: any) {
        setErr(e?.message || "Không tải được danh sách CLB.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickClub = (clubId: number) => {
    localStorage.setItem("lastClubId", String(clubId));
    nav(`/myclub/${clubId}`, { replace: true });
  };

  if (loading) return <div className="p-6">Đang tải danh sách CLB…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Chọn Câu lạc bộ</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs.map((c) => (
          <button
            key={c.clubId}
            onClick={() => pickClub(c.clubId)}
            className="p-4 rounded-xl border hover:shadow bg-card text-left"
          >
            <div className="flex items-center gap-3">
              <img
                src={c.logoUrl || "/logo.png"}
                alt={c.clubName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <div className="font-medium">{c.clubName}</div>
                <div className="text-xs text-muted-foreground">ID: {c.clubId}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
