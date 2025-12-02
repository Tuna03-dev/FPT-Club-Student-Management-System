import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { NotificationItem } from "@/types/notification";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/api/notifications";

import { useWebSocket } from "@/hooks/useWebSocket";

type TabKey = "all" | "unread";

export const Notifications = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);

  // LOAD DATA
  const loadData = useCallback(async (currentTab: TabKey) => {
    setLoading(true);
    try {
      const page = await getNotifications({
        page: 0,
        size: 20,
        unreadOnly: currentTab === "unread",
      });
      setNotifications(page.content ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(tab);
  }, [tab, loadData]);

  // REALTIME UPDATE
  useEffect(() => {
    if (!isConnected) return;

    const off = subscribeToUserQueue((msg) => {
      if (msg.type === "NOTIFICATION") loadData(tab);
    });

    return () => off?.();
  }, [isConnected, subscribeToUserQueue, loadData, tab]);

  // MARK ALL
  const handleMarkAll = async () => {
    await markAllNotificationsAsRead();
    await loadData(tab);
  };

  // NAVIGATE ITEM
  const handleClickItem = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await markNotificationAsRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
      }
    } catch {}

    if (!n.actionUrl) return;

    /**
     * RULE:
     * - actionUrl đã luôn là full path hợp lệ từ backend
     *   ví dụ:
     *   /myclub/5/events/10
     *   /events/100
     *   /club/20
     *   /staff/news/10
     */
    navigate(n.actionUrl);
  };

  return (
    <div className="p-6 space-y-6">
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

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="unread">Chưa đọc</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading && <p>Đang tải…</p>}
          {!loading && notifications.length === 0 && (
            <p>Không có thông báo nào.</p>
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
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {!loading &&
            notifications
              .filter((n) => !n.read)
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className="w-full text-left p-4 rounded-lg border shadow-sm bg-primary/5 border-primary/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{n.title}</h3>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};
