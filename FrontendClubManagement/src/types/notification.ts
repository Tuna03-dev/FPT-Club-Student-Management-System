export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notificationType?: string | null;
  priority?: string | null;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  actionUrl?: string | null;

  actorId?: number | null;
  actorName?: string | null;
  actorAvatarUrl?: string | null;
}

// Page<NotificationResponse> từ BE
export interface NotificationPage {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
}
