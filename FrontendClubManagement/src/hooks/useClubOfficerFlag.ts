import { useEffect, useMemo, useState } from "react";
import { axiosClient } from "@/api/axiosClient";

type ApiResponse<T> = {
  code: number;
  message: string;
  timestamp: string;
  data?: T;
  errors?: { field: string; errorMessage: string }[];
};

function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const id = Number(u?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Trả về:
 *  - amOfficer: true khi chắc chắn là CN/PCN; false nếu chắc chắn không
 *  - checking: true chỉ trong frame đầu khi chưa có cache & đang gọi API
 *
 * Quy ước hiển thị:
 *  - CHỈ hiển thị nút quản trị khi amOfficer === true
 *  - Nếu checking === true thì ẨN (để không nháy)
 */
export function useClubOfficerFlag(clubId?: number) {
  const userId = getCurrentUserId();

  // cache key gắn với userId + clubId để không bị "rò"
  const cacheKey = useMemo(() => {
    if (!clubId || !userId) return null;
    return `amOfficer:${userId}:${clubId}`;
  }, [clubId, userId]);

  // đọc cache một lần khi mount
  const cached = useMemo(() => {
    if (!cacheKey) return null as boolean | null;
    const s = sessionStorage.getItem(cacheKey);
    if (s === "1") return true;
    if (s === "0") return false;
    return null;
  }, [cacheKey]);

  // tri-state: null | true | false
  const [flag, setFlag] = useState<boolean | null>(cached);

  useEffect(() => {
    if (!clubId || !userId) {
      setFlag(false);
      return;
    }

    // Nếu đã có cache, vẫn fire request nền để làm tươi (SWR);
    // nhưng UI bám vào flag hiện tại (không nháy)
    const controller = new AbortController();
    let alive = true;

    axiosClient
      .get<boolean>(`/clubs/${clubId}/am-i-officer`, {
        timeout: 1800,
        signal: controller.signal,
      })
      .then((resp: ApiResponse<boolean>) => {
        if (!alive) return;
        const ok = resp?.data === true;
        setFlag(ok);
        if (cacheKey) sessionStorage.setItem(cacheKey, ok ? "1" : "0");
      })
      .catch((err) => {
        console.debug("am-i-officer error/timeout", err?.code || err?.message);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [clubId, userId, cacheKey]);

  return { amOfficer: flag === true, checking: flag === null };
}