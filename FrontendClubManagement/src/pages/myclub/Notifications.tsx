import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Notifications = () => {
  const notifications = [
    {
      id: "1",
      title: "Sự kiện mới: Workshop kỹ năng mềm",
      message: "Bạn được mời tham gia sự kiện Workshop kỹ năng mềm vào ngày 18/10/2024",
      time: "2 giờ trước",
      read: false,
    },
    {
      id: "2",
      title: "Thông báo họp",
      message: "Họp Ban chấp hành vào 19:00 ngày 15/10/2024 tại phòng họp A",
      time: "5 giờ trước",
      read: false,
    },
    {
      id: "3",
      title: "Chào mừng thành viên mới",
      message: "Nguyễn Văn E đã tham gia câu lạc bộ",
      time: "1 ngày trước",
      read: true,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Thông báo</h1>
          <p className="text-muted-foreground mt-1">
            Các thông báo và cập nhật mới nhất
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <CheckCheck className="h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.read
                ? "bg-card"
                : "bg-primary/5 border-primary/20"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notification.read
                    ? "bg-secondary"
                    : "bg-primary/10"
                }`}
              >
                <Bell
                  className={`h-5 w-5 ${
                    notification.read
                      ? "text-muted-foreground"
                      : "text-primary"
                  }`}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`font-semibold ${
                      notification.read
                        ? "text-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {notification.title}
                  </h3>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {notification.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

