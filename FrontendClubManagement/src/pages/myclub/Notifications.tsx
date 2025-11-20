import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type { NotificationItem } from "@/types/notification";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/api/notifications";

import { useWebSocket } from "@/hooks/useWebSocket";   

type TabKey = "all" | "unread";

export const Notifications = () => {
  const { clubId = "0" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ⭐ NEW — websocket
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);

  // ===== LOAD DATA =====
  const loadData = useCallback(
    async (currentTab: TabKey) => {
      setLoading(true);
      try {
        const page = await getNotifications({
          page: 0,
          size: 20,
          unreadOnly: currentTab === "unread",
        });
        setNotifications(page.content ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData(tab);
  }, [tab, loadData]);

  // ⭐⭐ NEW: REALTIME UPDATE
  useEffect(() => {
    if (!isConnected) return;

    const off = subscribeToUserQueue((msg) => {
      // message từ backend: { type, action, payload... }
      if (msg.type === "NOTIFICATION") {
        // Khi có NEW, READ-UPDATE, BULK-READ => reload ngay
        loadData(tab);
      }
    });

    return () => off?.();
  }, [isConnected, subscribeToUserQueue, loadData, tab]);

  // ===== MARK ALL =====
  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      await loadData(tab); // load lại tab hiện tại
    } catch {
      // ignore
    }
  };

  // ===== ITEM CLICK =====
  const handleClickItem = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await markNotificationAsRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
      }
    } catch {}

    if (n.actionUrl) {
      navigate(`/myclub/${clubId}${n.actionUrl}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thông báo</h1>
          <p className="text-muted-foreground mt-1">
            Các thông báo và cập nhật mới nhất
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

        {/* TAB ALL */}
        <TabsContent value="all" className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">Không có thông báo nào.</p>
          )}

          {!loading &&
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleClickItem(notification)}
                className={`w-full text-left p-4 rounded-lg border transition shadow-sm ${
                  notification.read
                    ? "bg-card"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      notification.read ? "bg-secondary" : "bg-primary/10"
                    }`}
                  >
                    <Bell
                      className={`h-5 w-5 ${
                        notification.read ? "text-muted-foreground" : "text-primary"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </TabsContent>

        {/* TAB UNREAD */}
        <TabsContent value="unread" className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">Không có thông báo chưa đọc.</p>
          )}

          {!loading &&
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleClickItem(notification)}
                className={`w-full text-left p-4 rounded-lg border transition shadow-sm ${
                  notification.read
                    ? "bg-card"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      notification.read ? "bg-secondary" : "bg-primary/10"
                    }`}
                  >
                    <Bell
                      className={`h-5 w-5 ${
                        notification.read ? "text-muted-foreground" : "text-primary"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{notification.title}</h3>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
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
