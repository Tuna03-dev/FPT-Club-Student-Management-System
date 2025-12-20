import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminDepartmentService,
  type AdminDepartmentResponse,
  type AdminDepartmentUpdateRequest,
} from "@/services/adminDepartmentService";
import { uploadImage } from "@/api/uploads";
import { Building2, Save, Loader2, Upload, X } from "lucide-react";

export default function AdminDepartmentManagement() {
  const [department, setDepartment] = useState<AdminDepartmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AdminDepartmentUpdateRequest>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Lấy department ID từ user hoặc từ một nguồn khác
  // Ở đây tạm thời dùng 1, có thể cần lấy từ user context hoặc URL params
  const departmentId = 1; // TODO: Lấy từ user context hoặc URL params

  const fetchDepartment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminDepartmentService.getDepartmentById(departmentId);
      if (response.code === 200 && response.data) {
        const dept = response.data;
        setDepartment(dept);
        setFormData({
          departmentName: dept.departmentName || "",
          email: dept.email || "",
          phone: dept.phone || "",
          avatarUrl: dept.avatarUrl || "",
          bannerUrl: dept.bannerUrl || "",
          fbLink: dept.fbLink || "",
          igLink: dept.igLink || "",
          ttLink: dept.ttLink || "",
          ytLink: dept.ytLink || "",
          sortDescription: dept.sortDescription || "",
        });
      } else {
        toast.error("Không thể tải thông tin phòng ban");
      }
    } catch (error) {
      console.error("Error fetching department:", error);
      toast.error("Đã xảy ra lỗi khi tải thông tin phòng ban");
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    void fetchDepartment();
  }, [fetchDepartment]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Kích thước ảnh tối đa 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await uploadImage(file);
      if (response.code === 200 && response.data) {
        const imageUrl = response.data.url;
        setFormData({ ...formData, avatarUrl: imageUrl });
        toast.success("Đã tải ảnh đại diện lên thành công");
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(error?.message || "Không thể tải ảnh lên. Vui lòng thử lại");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Kích thước ảnh tối đa 5MB");
      return;
    }

    setUploadingBanner(true);
    try {
      const response = await uploadImage(file);
      if (response.code === 200 && response.data) {
        const imageUrl = response.data.url;
        setFormData({ ...formData, bannerUrl: imageUrl });
        toast.success("Đã tải ảnh banner lên thành công");
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("Banner upload error:", error);
      toast.error(error?.message || "Không thể tải ảnh lên. Vui lòng thử lại");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) return;

    try {
      setSaving(true);
      const response = await adminDepartmentService.updateDepartment(
        departmentId,
        formData
      );
      if (response.code === 200 && response.data) {
        setDepartment(response.data);
        toast.success("Cập nhật thông tin phòng ban thành công!");
        void fetchDepartment();
      } else {
        toast.error(response.message || "Không thể cập nhật thông tin");
      }
    } catch (error: any) {
      console.error("Error updating department:", error);
      toast.error(
        error?.response?.data?.message || "Đã xảy ra lỗi khi cập nhật thông tin"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Không tìm thấy thông tin phòng ban</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Quản lý thông tin liên hệ
        </h1>
        <p className="text-muted-foreground">
          Cập nhật thông tin liên hệ và mạng xã hội của phòng ban
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {department.departmentName || department.departmentCode}
          </CardTitle>
          {department.campus && (
            <p className="text-sm text-muted-foreground">
              Cơ sở: {department.campus.campusName} ({department.campus.campusCode})
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="departmentName">Tên phòng ban *</Label>
                <Input
                  id="departmentName"
                  value={formData.departmentName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Ảnh đại diện</Label>
                <div className="flex items-start gap-3">
                  <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 border rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center px-2">
                        Chưa có ảnh
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="w-full"
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Chọn ảnh từ máy
                        </>
                      )}
                    </Button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    {formData.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, avatarUrl: "" });
                        }}
                        className="w-full text-destructive hover:text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Xóa ảnh
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP (tối đa 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Ảnh banner</Label>
                <div className="flex items-start gap-3">
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 border rounded-lg overflow-hidden flex items-center justify-center">
                    {formData.bannerUrl ? (
                      <img
                        src={formData.bannerUrl}
                        alt="Banner"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Chưa có ảnh banner
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Chọn ảnh banner
                      </>
                    )}
                  </Button>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                  {formData.bannerUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, bannerUrl: "" });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Xóa ảnh
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP (tối đa 5MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fbLink">Link Facebook</Label>
                <Input
                  id="fbLink"
                  type="url"
                  value={formData.fbLink || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fbLink: e.target.value })
                  }
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="igLink">Link Instagram</Label>
                <Input
                  id="igLink"
                  type="url"
                  value={formData.igLink || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, igLink: e.target.value })
                  }
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ttLink">Link TikTok</Label>
                <Input
                  id="ttLink"
                  type="url"
                  value={formData.ttLink || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, ttLink: e.target.value })
                  }
                  placeholder="https://tiktok.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ytLink">Link YouTube</Label>
                <Input
                  id="ytLink"
                  type="url"
                  value={formData.ytLink || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, ytLink: e.target.value })
                  }
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sortDescription">Mô tả ngắn</Label>
                <Textarea
                  id="sortDescription"
                  value={formData.sortDescription || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, sortDescription: e.target.value })
                  }
                  rows={4}
                  placeholder="Nhập mô tả ngắn về phòng ban..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (department) {
                    setFormData({
                      departmentName: department.departmentName || "",
                      email: department.email || "",
                      phone: department.phone || "",
                      avatarUrl: department.avatarUrl || "",
                      bannerUrl: department.bannerUrl || "",
                      fbLink: department.fbLink || "",
                      igLink: department.igLink || "",
                      ttLink: department.ttLink || "",
                      ytLink: department.ytLink || "",
                      sortDescription: department.sortDescription || "",
                    });
                  }
                }}
              >
                Đặt lại
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

