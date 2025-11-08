// src/pages/myclub/MyClubRedirect.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyClubs } from "@/api/clubs";
import type { MyClubDTO } from "@/types/dto/MyClubDTO";
import { authService } from "@/services/authService";

export default function MyClubRedirect() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Check if user is Staff - if yes, redirect to staff route
        const user = authService.getCurrentUser();
        const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined;
        if (roleUpper === "STAFF") {
          nav("/myclub/staff/events", { replace: true });
          return;
        }

        // For non-staff users, get their clubs
        const clubs: MyClubDTO[] = await getMyClubs();
        if (!clubs || clubs.length === 0) {
          setErr("Bạn chưa tham gia CLB nào.");
          return;
        }
        if (clubs.length === 1) {
          nav(`/myclub/${clubs[0].clubId}`, { replace: true });
          return;
        }
        const last = Number(localStorage.getItem("lastClubId"));
        const found = clubs.find((c) => c.clubId === last);
        if (found) {
          nav(`/myclub/${found.clubId}`, { replace: true });
          return;
        }
        nav("/myclub/select", { replace: true });
      } catch (e: unknown) {
        if (e instanceof Error) {
          setErr(e.message);
        } else {
          setErr("Có lỗi khi tải danh sách CLB.");
        }
      }
    })();
  }, [nav]);

  return (
    <div className="p-6">
      <p className="text-muted-foreground">Đang xác định CLB của bạn…</p>
      {err && <p className="text-red-600 mt-2">{err}</p>}
    </div>
  );
}
