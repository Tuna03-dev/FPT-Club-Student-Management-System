import React, { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useParams } from "react-router-dom";
import type { NotificationItem } from "@/types/notification";
import {
  getLatestNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "@/api/notifications";
import { useWebSocket } from "@/hooks/useWebSocket";

type TabKey = "all" | "unread";

/* ===== Utility: format time ===== */
function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;

  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(date).toLocaleDateString("vi-VN");
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { clubId } = useParams(); // Optional: có thể không có khi dùng trong Header chung

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newPing, setNewPing] = useState(false); // hiệu ứng ping

  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);

  /* ===== Load badge ===== */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {}
  }, []);

  /* ===== Load dropdown mini list ===== */
  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getLatestNotifications({ limit: 10 });
      setItems(list);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (open) loadLatest();
  }, [open, loadLatest]);

  useEffect(() => {
    if (!isConnected) return;

    const off = subscribeToUserQueue((msg) => {
      if (msg.type !== "NOTIFICATION") return;

      // thông báo mới
      if (msg.action === "NEW") {
        refreshUnreadCount();
        setNewPing(true);
        setTimeout(() => setNewPing(false), 1500);

        if (open) {
          loadLatest();
        } else {
          setItems((prev) => {
            const n = msg.payload as NotificationItem;
            return [n, ...prev].slice(0, 10);
          });
        }
      }

      // ĐÁNH DẤU ĐỌC 1 HOẶC ĐỌC TẤT CẢ
      if (msg.action === "READ-UPDATE" || msg.action === "READ-ALL") {
        refreshUnreadCount();
        if (open) loadLatest();
      }
    });

    return () => off?.();
  }, [isConnected, open, loadLatest, refreshUnreadCount, subscribeToUserQueue]);

  /* ===== Filter ===== */
  const filteredItems = tab === "all" ? items : items.filter((n) => !n.read);

  /* ===== Click item ===== */
  const handleItemClick = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await markNotificationAsRead(n.id);
        refreshUnreadCount();
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
      }
    } catch {}

    if (n.actionUrl) {
      // Nếu actionUrl là absolute path (bắt đầu bằng /), navigate trực tiếp
      if (n.actionUrl.startsWith("/")) {
        // Parse actionUrl: /posts/{postId}/comments/{commentId}
        const match = n.actionUrl.match(/\/posts\/(\d+)(?:\/comments\/(\d+))?/);

        if (match && clubId) {
          const postId = match[1];
          const commentId = match[2];

          // Navigate to dashboard with state to scroll to post
          navigate(`/myclub/${clubId}`, {
            state: {
              scrollToPostId: postId,
              highlightCommentId: commentId,
            },
          });
        } else {
          // Navigate trực tiếp với absolute path
          navigate(n.actionUrl);
        }
      } else if (clubId) {
        // Nếu actionUrl là relative path và có clubId, navigate với clubId
        navigate(
          `/myclub/${clubId}${n.actionUrl.startsWith("/") ? n.actionUrl : "/" + n.actionUrl}`
        );
      } else {
        // Nếu không có clubId, navigate trực tiếp (có thể là trang chung)
        navigate(n.actionUrl.startsWith("/") ? n.actionUrl : "/" + n.actionUrl);
      }
      setOpen(false);
    }
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
            onClick={() => {
              navigate("/notifications");
              setOpen(false);
            }}
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
