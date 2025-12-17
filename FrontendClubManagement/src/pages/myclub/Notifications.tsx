import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import type { NotificationItem, NotificationPage } from "@/types/notification";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/api/notifications";

import { useWebSocket } from "@/hooks/useWebSocket";

type TabKey = "all" | "unread";

export const Notifications = () => {
  const navigate = useNavigate();

  // Tab
  const [tab, setTab] = useState<TabKey>("all");

  // Data
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [totalPages, setTotalPages] = useState(1);

  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);

  // ---------------------------------------------------------
  // LOAD DATA (Có phân trang)
  // ---------------------------------------------------------
  const loadData = useCallback(async (currentTab: TabKey, page: number) => {
    setLoading(true);
    try {
      const res: NotificationPage = await getNotifications({
        page,
        size: 10,
        unreadOnly: currentTab === "unread",
      });

      setNotifications(res.content ?? []);
      setPageIndex(res.number ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load khi đổi tab
  useEffect(() => {
    setPageIndex(0);
    loadData(tab, 0);
  }, [tab, loadData]);

  // ---------------------------------------------------------
  // REALTIME UPDATE (WebSocket)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isConnected) return;

    const off = subscribeToUserQueue((msg) => {
      if (msg.type === "NOTIFICATION") {
        loadData(tab, pageIndex);
      }
    });

    return () => off?.();
  }, [isConnected, subscribeToUserQueue, tab, pageIndex, loadData]);

  // ---------------------------------------------------------
  // MARK ALL READ (UI instant update - MAX PING™)
  // ---------------------------------------------------------
  const handleMarkAll = async () => {
    // ⚡ UI cập nhật ngay lập tức
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Gửi API ngầm
    markAllNotificationsAsRead()
      .then(() => loadData(tab, pageIndex))
      .catch(() => loadData(tab, pageIndex));
  };

  // ---------------------------------------------------------
  // CLICK ITEM
  // ---------------------------------------------------------
  const handleClickItem = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await markNotificationAsRead(n.id);

        // Instant UI update
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
      }
    } catch {}

    // Điều hướng nếu có actionUrl
    if (n.actionUrl) navigate(n.actionUrl);
  };

  // ---------------------------------------------------------
  // PAGINATION HANDLERS
  // ---------------------------------------------------------
  const goPrev = () => {
    if (pageIndex > 0) {
      loadData(tab, pageIndex - 1);
    }
  };

  const goNext = () => {
    if (pageIndex + 1 < totalPages) {
      loadData(tab, pageIndex + 1);
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thông báo hệ thống</h1>
          <p className="text-muted-foreground mt-1">
            Tất cả thông báo dành cho bạn
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={handleMarkAll}>
          <CheckCheck className="h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread">Chưa đọc</TabsTrigger>
        </TabsList>

        {/* TAB ALL */}
        <TabsContent value="all" className="space-y-4">
          {loading && <p>Đang tải…</p>}
          {!loading && notifications.length === 0 && (
            <p>Không có thông báo nào.</p>
          )}

          <div className="space-y-4">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickItem(n)}
                className={`w-full text-left p-4 rounded-lg border transition shadow-sm ${
                  n.read ? "bg-card" : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      n.read ? "bg-secondary" : "bg-primary/10"
                    }`}
                  >
                    <Bell
                      className={`h-5 w-5 ${
                        n.read ? "text-muted-foreground" : "text-primary"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{n.title}</h3>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {n.message}
                    </p>

                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              disabled={pageIndex === 0}
              onClick={goPrev}
            >
              ← Trước
            </Button>

            <span className="text-sm text-muted-foreground">
              Trang {pageIndex + 1} / {totalPages}
            </span>

            <Button
              variant="outline"
              disabled={pageIndex + 1 >= totalPages}
              onClick={goNext}
            >
              Sau →
            </Button>
          </div>
        </TabsContent>

        {/* TAB UNREAD — dùng chung list đã lọc từ backend */}
        <TabsContent value="unread" />
      </Tabs>
    </div>
  );
};
