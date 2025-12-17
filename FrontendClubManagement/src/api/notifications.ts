// src/api/notifications.ts
import { axiosClient } from "./axiosClient";
import type { NotificationItem, NotificationPage } from "@/types/notification";

/**
 * Lấy danh sách thông báo (trang lớn – dùng cho /myclub/:clubId/notifications)
 */
export async function getNotifications(params?: {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
}): Promise<NotificationPage> {
  try {
    const response = await axiosClient.get<NotificationPage>("/notifications", {
      params,
    });

    if (response.code !== 200) {
      throw new Error(response.message || "Failed to fetch notifications");
    }

    return response.data!;
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    throw error;
  }
}

/**
 * Lấy một list nhỏ thông báo mới nhất
 * (dùng cho popup chuông ở header, giống FB).
 */
export async function getLatestNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationItem[]> {
  try {
    const response = await axiosClient.get<NotificationItem[]>(
      "/notifications/latest",
      {
        params: {
          unreadOnly: options?.unreadOnly ?? false,
          limit: options?.limit ?? 10,
        },
      }
    );

    if (response.code !== 200) {
      throw new Error(
        response.message || "Failed to fetch latest notifications"
      );
    }

    return response.data ?? [];
  } catch (error) {
    console.error("❌ Error fetching latest notifications:", error);
    throw error;
  }
}

/**
 * Lấy số lượng thông báo chưa đọc (hiển thị chấm đỏ / badge số).
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const response = await axiosClient.get<number | { count: number }>(
      "/notifications/unread-count"
    );

    if (response.code !== 200) {
      throw new Error(
        response.message || "Failed to fetch unread notification count"
      );
    }

    const data = response.data;
    if (typeof data === "number") return data;
    if (data && typeof (data as any).count === "number") {
      return (data as any).count;
    }

    return 0;
  } catch (error) {
    console.error("❌ Error fetching unread count:", error);
    throw error;
  }
}

/**
 * Đánh dấu 1 thông báo là đã đọc.
 */
export async function markNotificationAsRead(
  notificationId: number
): Promise<void> {
  try {
    const response = await axiosClient.put<null>(
      `/notifications/${notificationId}/read`
    );

    if (response.code !== 200) {
      throw new Error(
        response.message || "Failed to mark notification as read"
      );
    }
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const response = await axiosClient.put<null>("/notifications/mark-all-read");

    if (response.code !== 200) {
      throw new Error(
        response.message || "Failed to mark all notifications as read"
      );
    }
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    throw error;
  }
}
