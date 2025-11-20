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
  Calendar,
  Briefcase,
  CalendarDays,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Skeleton from "@/components/common/Skeleton";
import { toast } from "sonner";
import { userService, type UserProfile } from "@/services/userService";

export default function ProfileSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // User data state for editing
  const [userData, setUserData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
  });

  // Load profile data from backend
  useState(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await userService.getMyProfile();
        if (response.code === 200 && response.data) {
          setProfileData(response.data);
          setUserData({
            name: response.data.fullName,
            phone: response.data.phoneNumber || "",
            dateOfBirth: response.data.dateOfBirth || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Không thể tải thông tin cá nhân");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  });

  // Helper function to get system role display name
  const getSystemRoleDisplay = (systemRole: string) => {
    switch (systemRole) {
      case "CLUB_OFFICER":
        return "Cán bộ CLB";
      case "STAFF":
        return "Nhân viên";
      case "ADMIN":
        return "Quản trị viên";
      case "STUDENT":
      default:
        return "Sinh viên";
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await userService.updateMyProfile({
        fullName: userData.name,
        phoneNumber: userData.phone || null,
        dateOfBirth: userData.dateOfBirth || null,
      });

      if (response.code === 200 && response.data) {
        setProfileData(response.data);
        toast.success("Cập nhật thành công!", {
          description: "Thông tin cá nhân đã được lưu.",
        });
        setIsEditing(false);
      } else {
        toast.error("Lỗi", {
          description: response.message || "Không thể cập nhật thông tin.",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Lỗi", {
        description: "Không thể cập nhật thông tin. Vui lòng thử lại.",
      });
    }
  };

  const handleConfirmAvatar = async () => {
    const fileInput = document.getElementById(
      "avatar-upload"
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const response = await userService.uploadAvatar(file);

      if (response.code === 200 && response.data) {
        setProfileData(response.data);
        toast.success("Cập nhật avatar thành công!");
        setPreviewAvatar(null);
        setSelectedFile(null);
      } else {
        toast.error("Lỗi", {
          description: response.message || "Không thể tải ảnh lên.",
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Lỗi", {
        description: "Không thể tải ảnh lên. Vui lòng thử lại.",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInput) fileInput.value = "";
    }
  };

  const handleCancelPreview = () => {
    setPreviewAvatar(null);
    setSelectedFile(null);
    const fileInput = document.getElementById(
      "avatar-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Lỗi", {
        description: "Vui lòng chọn file ảnh (jpg, png, gif...)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Lỗi", {
        description: "Kích thước ảnh không được vượt quá 5MB",
      });
      return;
    }

    // Store file info
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
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
        <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300 !py-0">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 !p-4 sm:!p-6 rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
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
          <CardContent className="!px-4 sm:!px-6 !py-6">
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary/20 shadow-lg">
                    <AvatarImage src={profileData?.avatarUrl} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                      {userData.name.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploadingAvatar ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                        ) : (
                          <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        )}
                      </label>
                    </>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">
                    {userData.name || "Người dùng"}
                  </h3>
                  <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-md">
                      <Shield className="h-3 w-3 mr-1" />
                      {getSystemRoleDisplay(
                        profileData?.systemRoleName || "STUDENT"
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    MSSV: {profileData?.studentCode || "N/A"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="dateOfBirth"
                    className="flex items-center gap-2"
                  >
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Ngày sinh
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={userData.dateOfBirth}
                    onChange={(e) =>
                      setUserData({ ...userData, dateOfBirth: e.target.value })
                    }
                    disabled={!isEditing}
                    className="border-primary/20 focus:border-primary disabled:opacity-60"
                  />
                </div>

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
                  <Label
                    htmlFor="studentId"
                    className="flex items-center gap-2"
                  >
                    <IdCard className="h-4 w-4 text-primary" />
                    Mã số sinh viên
                  </Label>
                  <Input
                    id="studentId"
                    value={profileData?.studentCode || ""}
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
                    value={profileData?.email || ""}
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
                    placeholder="Chưa có số điện thoại"
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

        {/* Clubs Activity History Card */}
        {!loading && profileData && profileData.clubMemberships.length > 0 && (
          <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300 !py-0">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 !p-4 sm:!p-6 rounded-t-xl">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Lịch sử hoạt động CLB
                </CardTitle>
                <CardDescription className="text-sm">
                  Theo dõi quá trình hoạt động và vai trò của bạn trong các câu
                  lạc bộ
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="!px-4 sm:!px-6 !py-6">
              <Tabs
                defaultValue={profileData.clubMemberships[0]?.clubId.toString()}
                className="w-full"
              >
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                  {profileData.clubMemberships.map((club) => (
                    <TabsTrigger
                      key={club.clubId}
                      value={club.clubId.toString()}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      {club.clubName}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {profileData.clubMemberships.map((club) => (
                  <TabsContent
                    key={club.clubId}
                    value={club.clubId.toString()}
                    className="mt-6 space-y-6"
                  >
                    {/* Club Overview */}
                    <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-xl text-foreground">
                          {club.clubName}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Tham gia từ{" "}
                          {new Date(club.joinDate).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <Badge
                        className={`shadow-md hover:shadow-lg transition-shadow ${
                          club.membershipStatus === "ACTIVE"
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                            : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                        }`}
                      >
                        {club.membershipStatus === "ACTIVE" && (
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2"></span>
                        )}
                        {club.membershipStatus === "ACTIVE"
                          ? "Đang hoạt động"
                          : "Đã rời"}
                      </Badge>
                    </div>

                    {/* Activity History Timeline */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-foreground text-lg">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        Lịch sử vai trò
                      </h4>

                      {club.roles.length > 0 ? (
                        <div className="space-y-3 relative pl-8">
                          {/* Timeline line */}
                          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent"></div>

                          {club.roles.map((role) => (
                            <div
                              key={role.roleMembershipId}
                              className="relative group"
                            >
                              {/* Timeline dot */}
                              <div
                                className={`absolute -left-8 top-3 w-6 h-6 rounded-full border-4 border-background transition-all duration-300 group-hover:scale-110 ${
                                  role.isActive && role.semesterIsCurrent
                                    ? "bg-green-500 shadow-lg shadow-green-500/30"
                                    : "bg-gray-400"
                                }`}
                              >
                                {role.isActive && role.semesterIsCurrent && (
                                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
                                )}
                              </div>

                              {/* Activity Card */}
                              <Card className="border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 overflow-hidden">
                                <CardContent className="p-5">
                                  <div className="space-y-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h5 className="font-bold text-lg text-foreground">
                                            {role.semesterName}
                                          </h5>
                                          <Badge
                                            variant="outline"
                                            className={`${
                                              role.isActive &&
                                              role.semesterIsCurrent
                                                ? "border-green-500/50 bg-green-500/10 text-green-700"
                                                : "border-gray-400/50 bg-gray-400/10"
                                            }`}
                                          >
                                            {role.isActive &&
                                            role.semesterIsCurrent
                                              ? "Đang hoạt động"
                                              : "Hoàn thành"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    <Separator className="bg-primary/10" />

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                          <Shield className="h-4 w-4 text-primary" />
                                          Vai trò
                                        </div>
                                        <Badge className="bg-gradient-to-r from-primary to-primary/80 shadow-sm text-sm">
                                          {role.clubRoleName}
                                        </Badge>
                                      </div>

                                      <div className="space-y-2 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                          <Briefcase className="h-4 w-4 text-primary" />
                                          Phân ban
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="border-primary/40 bg-background text-sm"
                                        >
                                          <Building2 className="h-3 w-3 mr-1" />
                                          {role.teamName}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Chưa có vai trò nào trong CLB này
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Avatar Preview Dialog */}
        <Dialog
          open={!!previewAvatar}
          onOpenChange={(open) => !open && handleCancelPreview()}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Xác nhận thay đổi avatar</DialogTitle>
              <DialogDescription>
                Kiểm tra lại ảnh trước khi cập nhật
              </DialogDescription>
            </DialogHeader>

            {/* File Info */}
            {selectedFile && (
              <div className="px-6 py-3 bg-secondary/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Định dạng:</span>
                  <span className="font-medium">
                    {selectedFile.type.split("/")[1].toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Kích thước:</span>
                  <span className="font-medium">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                    {selectedFile.size > 1024 * 1024 && (
                      <span className="text-muted-foreground ml-1">
                        ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-center py-6">
              {previewAvatar && (
                <Avatar className="h-48 w-48 border-4 border-primary/20 shadow-lg">
                  <AvatarImage src={previewAvatar} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-primary/5">
                    {userData.name.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleCancelPreview}
                disabled={uploadingAvatar}
                className="w-full sm:w-auto"
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmAvatar}
                disabled={uploadingAvatar}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80"
              >
                {uploadingAvatar ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Đang tải lên...
                  </>
                ) : (
                  "Xác nhận"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Loading State */}
        {loading && (
          <>
            {/* Profile Card Skeleton */}
            <Card className="border-primary/20 shadow-lg !py-0">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 !p-4 sm:!p-6 rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardHeader>
              <CardContent className="!px-4 sm:!px-6 !py-6">
                <div className="space-y-6">
                  {/* Avatar Section Skeleton */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-32" />
                      </div>
                      <Skeleton className="h-4 w-36" />
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clubs Activity Skeleton */}
            <Card className="border-primary/20 shadow-lg !py-0">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/10 !p-4 sm:!p-6 rounded-t-xl">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </CardHeader>
              <CardContent className="!px-4 sm:!px-6 !py-6">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-40" />
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
