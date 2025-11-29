// src/components/notifications/StaffNotificationBell.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItem } from "@/types/notification";
import {
  getLatestNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "@/api/notifications";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNavigate } from "react-router-dom";

type TabKey = "all" | "unread";

/* ===== Utility: format time ===== */
function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();

  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 0) return date.toLocaleString("vi-VN");
  if (diffSec < 10) return "Vừa xong";
  if (diffSec < 60) return `${diffSec} giây trước`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) {
    return `Hôm qua lúc ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
  if (diffDay < 7) {
    const weekdays = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const w = weekdays[date.getDay()];
    return `${w}, ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  return date.toLocaleDateString("vi-VN");
}

export const StaffNotificationBell: React.FC = () => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newPing, setNewPing] = useState(false);

  // ===== WebSocket setup =====
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);

  // ===== FETCH BADGE =====
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {}
  }, []);

  // ===== FETCH LIST =====
  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getLatestNotifications({ limit: 10 });
      setItems(list);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (open) loadLatest();
  }, [open, loadLatest]);

  // ===== REALTIME =====
  useEffect(() => {
    if (!isConnected) return;

    const off = subscribeToUserQueue((msg: any) => {
      try {
        if (msg.type !== "NOTIFICATION") return;

        // thông báo mới
        if (msg.action === "NEW" || msg.action === "CREATED") {
          refreshUnreadCount();
          setNewPing(true);
          setTimeout(() => setNewPing(false), 1500);

          if (open) {
            loadLatest();
          } else if (msg.payload) {
            const newItem = msg.payload as NotificationItem;
            setItems((prev) => [newItem, ...prev].slice(0, 10));
          }
        }

        // đánh dấu 1 cái hoặc tất cả đã đọc
        if (msg.action === "READ-UPDATE" || msg.action === "READ-ALL") {
          refreshUnreadCount();
          if (open) loadLatest(); // popup đang mở thì reload list
        }
      } catch (err) {
        console.error("[StaffNotificationBell] socket error:", err);
      }
    });

    return () => off?.();
  }, [isConnected, subscribeToUserQueue, open, loadLatest, refreshUnreadCount]);

  // ===== FILTER =====
  const filteredItems = tab === "all" ? items : items.filter((n) => !n.read);

  // ===== CLICK ITEM =====
  const handleItemClick = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await markNotificationAsRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
        refreshUnreadCount();
      }
    } catch {}

    if (n.actionUrl) {
      let target = n.actionUrl;

      try {
        const url = new URL(target, window.location.origin);
        target = url.pathname + url.search + url.hash;
      } catch {}

      // if (!target.startsWith("/staff")) {
      //   target = `/staff${target.startsWith("/") ? target : `/${target}`}`;
      // }

      console.log("NAVIGATE STAFF TO:", target);
      navigate(target);
      setOpen(false);
    }
  };

  const goToAll = () => {
    navigate("/staff/notifications");
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative rounded-full transition ${
            newPing ? "animate-bell-shake" : ""
          }`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-ping" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 rounded-xl overflow-hidden shadow-xl border bg-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-sm">Thông báo</h3>
          <button
            onClick={goToAll}
            className="text-xs text-primary hover:underline"
          >
            Xem tất cả
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-sm bg-white">
          <button
            className={`flex-1 py-2 text-center transition ${
              tab === "all"
                ? "font-semibold border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:bg-gray-100"
            }`}
            onClick={() => setTab("all")}
          >
            Tất cả
          </button>
          <button
            className={`flex-1 py-2 text-center transition ${
              tab === "unread"
                ? "font-semibold border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:bg-gray-100"
            }`}
            onClick={() => setTab("unread")}
          >
            Chưa đọc
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Đang tải…
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Không có thông báo.
            </div>
          )}

          {!loading &&
            filteredItems.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 transition-all duration-150 hover:bg-gray-100 ${
                  !n.read ? "bg-blue-50 border-l-4 border-blue-400" : "bg-white"
                } animate-fade-in`}
              >
                <div
                  className={`h-8 w-8 flex items-center justify-center rounded-full ${
                    n.read ? "bg-gray-200" : "bg-blue-200"
                  }`}
                >
                  <Bell
                    className={`h-4 w-4 ${
                      n.read ? "text-gray-600" : "text-blue-700"
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
