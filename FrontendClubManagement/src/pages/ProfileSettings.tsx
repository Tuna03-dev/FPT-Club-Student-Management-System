import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  IdCard,
  Camera,
  Save,
  Building2,
  Shield,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { authService } from "@/services/authService";

export default function ProfileSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const currentUser = authService.getCurrentUser();

  // User data state
  const [userData, setUserData] = useState({
    name: currentUser?.fullName || "",
    email: currentUser?.email || "",
    phone: "", // TODO: Add phone field to UserInfo
    studentId: "", // TODO: Add studentCode field to UserInfo
    avatar: currentUser?.avatarUrl || "",
    role: currentUser?.systemRole || "Sinh viên",
    department: "",
    joinedDate: "01/09/2024",
  });

  // Mock clubs membership data - TODO: Replace with actual API call
  const userClubs = [
    {
      id: "1",
      clubName: "CLB Lập trình FPT",
      role: "Chủ tịch",
      joinedDate: "01/09/2023",
      status: "Đang hoạt động",
    },
    {
      id: "2",
      clubName: "CLB Tiếng Anh",
      role: "Thành viên",
      joinedDate: "15/10/2023",
      status: "Đang hoạt động",
    },
    {
      id: "3",
      clubName: "CLB Thể thao",
      role: "Phó chủ tịch",
      joinedDate: "20/09/2023",
      status: "Đang hoạt động",
    },
  ];

  const handleSaveProfile = async () => {
    try {
      // TODO: Call API to update profile
      toast.success("Cập nhật thành công!", {
        description: "Thông tin cá nhân đã được lưu.",
      });
      setIsEditing(false);
    } catch {
      toast.error("Lỗi", {
        description: "Không thể cập nhật thông tin. Vui lòng thử lại.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Thông tin cá nhân
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Quản lý thông tin tài khoản của bạn
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">
                  Thông tin chung
                </CardTitle>
                <CardDescription className="text-sm">
                  Cập nhật thông tin cá nhân của bạn
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
                className="shadow-md w-full sm:w-auto"
              >
                {isEditing ? "Hủy" : "Chỉnh sửa"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary/20 shadow-lg">
                    <AvatarImage src={userData.avatar} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                      {userData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </button>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">
                    {userData.name}
                  </h3>
                  <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-md">
                      <Shield className="h-3 w-3 mr-1" />
                      {userData.role}
                    </Badge>
                    {userData.department && (
                      <Badge variant="outline" className="border-primary/30">
                        <Building2 className="h-3 w-3 mr-1" />
                        {userData.department}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tham gia: {userData.joinedDate}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Họ và tên
                  </Label>
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) =>
                      setUserData({ ...userData, name: e.target.value })
                    }
                    disabled={!isEditing}
                    className="border-primary/20 focus:border-primary disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId" className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-primary" />
                    Mã số sinh viên
                  </Label>
                  <Input
                    id="studentId"
                    value={userData.studentId}
                    disabled
                    className="border-primary/20 focus:border-primary disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    disabled
                    className="border-primary/20 focus:border-primary disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Số điện thoại
                  </Label>
                  <Input
                    id="phone"
                    value={userData.phone}
                    onChange={(e) =>
                      setUserData({ ...userData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    className="border-primary/20 focus:border-primary disabled:opacity-60"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    className="bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Lưu thay đổi
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clubs Membership Card */}
        <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Các CLB đang tham gia
            </CardTitle>
            <CardDescription className="text-sm">
              Danh sách các câu lạc bộ và vai trò của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userClubs.map((club) => (
                <Card
                  key={club.id}
                  className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg"
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-base sm:text-lg mb-2 text-foreground">
                            {club.clubName}
                          </h4>
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-sm mb-2">
                            <Shield className="h-3 w-3 mr-1" />
                            {club.role}
                          </Badge>
                        </div>
                      </div>
                      <Separator className="bg-primary/10" />
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Tham gia: {club.joinedDate}</p>
                        <p className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          {club.status}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
