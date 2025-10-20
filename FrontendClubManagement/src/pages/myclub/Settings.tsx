import { User, Lock, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Settings = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cài đặt</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý cài đặt câu lạc bộ và tài khoản
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tên hiển thị</label>
              <Input placeholder="Nhập tên của bạn" defaultValue="Nguyễn Văn A" />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="email@example.com" defaultValue="admin@club.com" />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Số điện thoại</label>
              <Input placeholder="0123456789" defaultValue="0987654321" />
            </div>
            
            <Button>Lưu thay đổi</Button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Bảo mật</h2>
          </div>
          
          <div className="space-y-4">
            <Button variant="outline">Đổi mật khẩu</Button>
            <Button variant="outline">Xác thực hai yếu tố</Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Thông báo</h2>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
              <span className="text-sm font-medium">Email thông báo</span>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </label>
            
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
              <span className="text-sm font-medium">Thông báo sự kiện</span>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </label>
            
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary cursor-pointer">
              <span className="text-sm font-medium">Thông báo thành viên mới</span>
              <input type="checkbox" className="h-4 w-4" />
            </label>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Ngôn ngữ</h2>
          </div>
          
          <select className="w-full p-2 border rounded-lg">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );
};

