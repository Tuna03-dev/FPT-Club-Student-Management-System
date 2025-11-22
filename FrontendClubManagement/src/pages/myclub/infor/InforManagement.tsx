"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Save, Undo2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clubCategoryService,
  type ClubCategoryDTO,
} from "@/services/clubCategoryService";
import { getClubInfo, updateClubInfo } from "@/api/clubs";
import type { ClubDetailData, UpdateClubInfoRequest } from "@/types/club";

interface ClubFormData {
  clubName: string;
  clubCode: string;
  description: string;
  email: string;
  phone: string;
  fbUrl: string;
  igUrl: string;
  ttUrl: string;
  ytUrl: string;
  logoUrl: string;
  bannerUrl: string;
  categoryName: string;
}

export function ClubInforManagement() {
  const { clubId } = useParams<{ clubId: string }>();
  const clubIdNum = clubId ? Number(clubId) : undefined;
  const { isClubOfficer, loading } = useClubPermissions(clubIdNum);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [clubData, setClubData] = useState<ClubDetailData | null>(null);
  const [formData, setFormData] = useState<ClubFormData>({
    clubName: "",
    clubCode: "",
    description: "",
    email: "",
    phone: "",
    fbUrl: "",
    igUrl: "",
    ttUrl: "",
    ytUrl: "",
    logoUrl: "",
    bannerUrl: "",
    categoryName: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<ClubCategoryDTO[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // stable sorted presidents list to avoid swapping when clubData updates
  const presidents = useMemo(() => {
    const list = (clubData?.presidents ?? []).slice();
    list.sort((a, b) => {
      const ai = a?.userId ?? 0;
      const bi = b?.userId ?? 0;
      if (ai !== bi) return ai - bi;
      const ae = (a?.email || "").toString();
      const be = (b?.email || "").toString();
      if (ae !== be) return ae.localeCompare(be);
      const an = (a?.fullName || "").toString();
      const bn = (b?.fullName || "").toString();
      return an.localeCompare(bn);
    });
    return list;
  }, [clubData?.presidents]);

  // Fetch club data on mount
  useEffect(() => {
    const fetchClubData = async () => {
      if (!clubIdNum) return;

      setIsLoading(true);
      try {
        const data = await getClubInfo(clubIdNum);
        setClubData(data);
        setFormData({
          clubName: data.clubName || "",
          clubCode: data.clubCode || "",
          description: data.description || "",
          email: data.email || "",
          phone: data.phone || "",
          fbUrl: data.fbUrl || "",
          igUrl: data.igUrl || "",
          ttUrl: data.ttUrl || "",
          ytUrl: data.ytUrl || "",
          logoUrl: data.logoUrl || "",
          bannerUrl: data.bannerUrl || "",
          categoryName: data.categoryName || "",
        });
      } catch (error) {
        console.error("Error fetching club data:", error);
        toast.error("Không thể tải thông tin câu lạc bộ");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubData();
  }, [clubIdNum]);

  const handleInputChange = (field: keyof ClubFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const performSave = async () => {
    if (!clubIdNum) return;

    setIsSaving(true);

    // client-side validation
    setFieldErrors({});
    const errors: Record<string, string> = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneRegex = /^[0-9]{10,11}$/;

    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Email không hợp lệ";
    }
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.phone = "Số điện thoại phải có 10-11 chữ số";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Vui lòng sửa các lỗi trong biểu mẫu");
      setIsSaving(false);
      return;
    }

    try {
      const request: UpdateClubInfoRequest = {
        clubName: formData.clubName,
        clubCode: formData.clubCode,
        description: formData.description,
        email: formData.email,
        phone: formData.phone,
        fbUrl: formData.fbUrl,
        igUrl: formData.igUrl,
        ttUrl: formData.ttUrl,
        ytUrl: formData.ytUrl,
        logoUrl: formData.logoUrl,
        bannerUrl: formData.bannerUrl,
      };

      const updatedData = await updateClubInfo(clubIdNum, request);
      setClubData(updatedData);
      setIsEditing(false);
      setHasChanges(false);

      toast.success("Đã cập nhật thông tin câu lạc bộ thành công");
    } catch (error: any) {
      console.error("Error saving club info:", error);
      // If API returned structured validation errors, map them to fields
      if (error && error.errors && Array.isArray(error.errors)) {
        const apiFieldErrors: Record<string, string> = {};
        for (const e of error.errors) {
          if (e.field) apiFieldErrors[e.field] = e.errorMessage || e.field;
        }
        setFieldErrors(apiFieldErrors);
        // show first error via toast
        const first = error.errors[0];
        toast.error(
          first?.errorMessage ||
            error.message ||
            "Không thể cập nhật thông tin câu lạc bộ"
        );
      } else {
        toast.error(error.message || "Không thể cập nhật thông tin câu lạc bộ");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Open confirm dialog to ask user before saving
  const handleSave = () => {
    setConfirmOpen(true);
  };

  const handleCancel = () => {
    if (clubData) {
      setFormData({
        clubName: clubData.clubName || "",
        clubCode: clubData.clubCode || "",
        description: clubData.description || "",
        email: clubData.email || "",
        phone: clubData.phone || "",
        fbUrl: clubData.fbUrl || "",
        igUrl: clubData.igUrl || "",
        ttUrl: clubData.ttUrl || "",
        ytUrl: clubData.ytUrl || "",
        logoUrl: clubData.logoUrl || "",
        bannerUrl: clubData.bannerUrl || "",
        categoryName: clubData.categoryName || "",
      });
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleStartEdit = async () => {
    setIsEditing(true);

    // Load categories from API when entering edit mode (only once)
    if (categories.length === 0) {
      setLoadingCategories(true);
      try {
        const resp = await clubCategoryService.getAll();
        if (resp?.data) setCategories(resp.data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 pt-6 pb-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2 max-w-lg">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>

        {/* Main card skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-64" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="space-y-4 mt-6 pt-6 border-t">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Presidents skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-48" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-64" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clubData) {
    return (
      <div className="container mx-auto px-4 md:px-6 pt-6 pb-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Không tìm thấy thông tin câu lạc bộ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thông tin câu lạc bộ</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý thông tin chung của câu lạc bộ
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </>
          ) : (
            isClubOfficer &&
            !loading && (
              <Button onClick={handleStartEdit}>Chỉnh sửa thông tin</Button>
            )
          )}
        </div>
      </div>
      {/* Confirm Save Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle>Xác nhận lưu thay đổi</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn lưu những thay đổi này cho câu lạc bộ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                setConfirmOpen(false);
                await performSave();
              }}
              disabled={isSaving}
            >
              {isSaving ? "Đang lưu..." : "Xác nhận và lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Card for All Content */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin chung</CardTitle>
          <CardDescription>
            Thông tin cơ bản và liên hệ của câu lạc bộ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Thông tin cơ bản
              </h3>

              {/* Club Name */}
              <div className="space-y-2">
                <Label htmlFor="club-name">Tên câu lạc bộ</Label>
                <Input
                  id="club-name"
                  value={formData.clubName}
                  onChange={(e) =>
                    handleInputChange("clubName", e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="Nhập tên câu lạc bộ"
                />
              </div>

              {/* Club Code */}
              <div className="space-y-2">
                <Label htmlFor="club-code">Mã câu lạc bộ</Label>
                <Input
                  id="club-code"
                  value={formData.clubCode}
                  onChange={(e) =>
                    handleInputChange("clubCode", e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="Nhập mã câu lạc bộ"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Thể loại</Label>
                {!isEditing ? (
                  <Input
                    id="category"
                    value={formData.categoryName}
                    disabled={true}
                    placeholder="Thể loại câu lạc bộ"
                  />
                ) : (
                  <Select
                    value={formData.categoryName}
                    onValueChange={(value) =>
                      handleInputChange("categoryName", value)
                    }
                    disabled={loadingCategories}
                  >
                    <SelectTrigger disabled={loadingCategories}>
                      <SelectValue
                        placeholder={
                          loadingCategories ? "Đang tải..." : "Chọn thể loại"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.categoryName}>
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Right Column: Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Thông tin liên hệ
              </h3>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={!isEditing}
                  placeholder="club@example.com"
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={!isEditing}
                  placeholder="0123456789"
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Full Width: Social Media Links and Description */}
          <div className="space-y-4 mt-6 pt-6 border-t">
            {/* Social Media Links */}
            <h3 className="font-semibold text-sm text-muted-foreground">
              Mạng xã hội
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fbUrl">Facebook</Label>
                <Input
                  id="fbUrl"
                  value={formData.fbUrl || ""}
                  onChange={(e) => handleInputChange("fbUrl", e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="igUrl">Instagram</Label>
                <Input
                  id="igUrl"
                  value={formData.igUrl || ""}
                  onChange={(e) => handleInputChange("igUrl", e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ttUrl">TikTok</Label>
                <Input
                  id="ttUrl"
                  value={formData.ttUrl || ""}
                  onChange={(e) => handleInputChange("ttUrl", e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://tiktok.com/@..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ytUrl">YouTube</Label>
                <Input
                  id="ytUrl"
                  value={formData.ytUrl || ""}
                  onChange={(e) => handleInputChange("ytUrl", e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://youtube.com/@..."
                />
              </div>
            </div>
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                disabled={!isEditing}
                placeholder="Mô tả về câu lạc bộ..."
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presidents Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chủ tịch câu lạc bộ
          </CardTitle>
          <CardDescription>
            Danh sách các chủ tịch hiện tại của câu lạc bộ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {presidents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presidents.map((president, idx) => {
                const key = president?.userId ?? president?.email ?? idx;
                const initial = (
                  (president?.fullName || "").trim().charAt(0) || "?"
                ).toUpperCase();
                const name = president?.fullName ?? "—";
                const email = president?.email ?? "—";

                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {initial}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{name}</h4>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{email}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                Chưa có thông tin chủ tịch câu lạc bộ
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
