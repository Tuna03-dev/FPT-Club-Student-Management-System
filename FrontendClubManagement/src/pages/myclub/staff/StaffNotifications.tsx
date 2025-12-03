// src/pages/staff/StaffNotifications.tsx
import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationItem, NotificationPage } from "@/types/notification";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/api/notifications";
import { useNavigate } from "react-router-dom";

type TabKey = "all" | "unread";

export default function StaffNotifications() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("all");

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [totalPages, setTotalPages] = useState(1);

  // ============================================================
  // LOAD DATA — CÓ PHÂN TRANG
  // ============================================================
  const loadData = useCallback(async (currentTab: TabKey, page: number) => {
    setLoading(true);
    try {
      const res: NotificationPage = await getNotifications({
        page,
        size: 10,
        unreadOnly: currentTab === "unread",
      });

      setNotifications(res.content ?? []);
      setTotalPages(res.totalPages ?? 1);
      setPageIndex(res.number ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load khi đổi tab
  useEffect(() => {
    setPageIndex(0);
    loadData(tab, 0);
  }, [tab, loadData]);

  // ============================================================
  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC — INSTANT UI UPDATE
  // ============================================================
  const handleMarkAll = async () => {
    // UI update ngay lập tức
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // API chạy ngầm
    markAllNotificationsAsRead()
      .then(() => loadData(tab, pageIndex))
      .catch(() => loadData(tab, pageIndex));
  };

  // ============================================================
  // CLICK ITEM
  // ============================================================
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

    if (n.actionUrl) navigate(n.actionUrl);
  };

  // ============================================================
  // PAGINATION HANDLERS
  // ============================================================
  const goPrev = () => {
    if (pageIndex > 0) loadData(tab, pageIndex - 1);
  };

  const goNext = () => {
    if (pageIndex + 1 < totalPages) loadData(tab, pageIndex + 1);
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Thông báo (Staff)
          </h1>
          <p className="text-muted-foreground mt-1">
            Các thông báo hệ thống gửi cho tài khoản Staff
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={handleMarkAll}>
          <CheckCheck className="h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6 text-sm">
        <button
          className={`pb-2 border-b-2 -mb-px ${
            tab === "all"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("all")}
        >
          Tất cả
        </button>
        <button
          className={`pb-2 border-b-2 -mb-px ${
            tab === "unread"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("unread")}
        >
          Chưa đọc
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Đang tải…</p>}

        {!loading && notifications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Không có thông báo nào.
          </p>
        )}

        {!loading &&
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClickItem(n)}
              className={`w-full text-left p-4 rounded-lg border transition shadow-sm ${
                n.read ? "bg-card" : "bg-primary/5 border-primary/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                    <h3 className="font-semibold text-foreground">{n.title}</h3>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {n.message}
                  </p>

                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
            </button>
          ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button variant="outline" disabled={pageIndex === 0} onClick={goPrev}>
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
    </div>
  );
}
