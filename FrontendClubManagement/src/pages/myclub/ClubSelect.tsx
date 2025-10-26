import { useMyClubs } from "@/hooks/useMyClubs";
import { useNavigate } from "react-router-dom";

export default function ClubSelect() {
  const { data: clubs, loading, error } = useMyClubs();
  const nav = useNavigate();

  if (loading) return <div className="p-6">Đang tải…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-lg font-semibold mb-4">Chọn CLB</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubs?.map(c => (
          <button
            key={c.clubId}
            onClick={() => {
              localStorage.setItem("lastClubId", String(c.clubId));
              nav(`/myclub/${c.clubId}`);
            }}
            className="p-4 rounded-lg border hover:bg-secondary text-left"
          >
            <div className="flex items-center gap-3">
              <img
                src={c.logoUrl || "https://via.placeholder.com/48"}
                alt={c.clubName}
                className="h-10 w-10 rounded-md object-cover"
              />
              <div className="font-medium">{c.clubName}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}