"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import {
  Mail,
  Phone,
  Save,
  Undo2,
  Users,
  X,
  Image as ImageIcon,
} from "lucide-react";
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
  categoryName: string;
  categoryId: number;
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
    categoryName: "",
    categoryId: 0,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<ClubCategoryDTO[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // File state for logo and banner
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  // Note: drag-and-drop removed; clicking the wrappers opens file picker
  // Refs for hidden file inputs so descriptive text can open file picker
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  // Track explicit removal (user clicked X) to send removal flags
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);

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
          categoryName: data.categoryName || "",
          categoryId: data.categoryId || 0,
        });
        // Set initial previews from existing URLs
        setLogoPreview(data.logoUrl || null);
        setBannerPreview(data.bannerUrl || null);
        setLogoRemoved(false);
        setBannerRemoved(false);
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Kích thước file phải nhỏ hơn hoặc bằng 10MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setHasChanges(true);
      setLogoRemoved(false);
    }
  };

  // (removed drag handlers)

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Kích thước file phải nhỏ hơn hoặc bằng 10MB");
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setHasChanges(true);
      setBannerRemoved(false);
    }
  };

  // (removed drag handlers)

  const isUrl = (value?: string) => {
    if (!value) return false;
    return /^https?:\/\//i.test(value.trim());
  };

  // Handlers to remove selected previews/files (UI only)
  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(true);
    setHasChanges(true);
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerRemoved(true);
    setHasChanges(true);
  };

  const performSave = async () => {
    if (!clubIdNum) return;

    setIsSaving(true);

    // client-side validation
    setFieldErrors({});
    const errors: Record<string, string> = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    // Phone must start with 0 and be 10 or 11 digits long
    const phoneRegex = /^0[0-9]{9,10}$/;

    // Required fields: clubName and clubCode must not be null/empty
    if (!formData.clubName || !formData.clubName.trim()) {
      errors.clubName = "Tên câu lạc bộ không được để trống";
    }
    if (!formData.clubCode || !formData.clubCode.trim()) {
      errors.clubCode = "Mã câu lạc bộ không được để trống";
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Email không hợp lệ";
    }
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.phone = "Số điện thoại phải có 10-11 chữ số và bắt đầu bằng số 0";
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
        categoryId: formData.categoryId || undefined,
        removeLogo: logoRemoved || undefined,
        removeBanner: bannerRemoved || undefined,
      };

      const updatedData = await updateClubInfo(
        clubIdNum,
        request,
        logoFile || undefined,
        bannerFile || undefined
      );
      setClubData(updatedData);
      setIsEditing(false);
      setHasChanges(false);

      // Reset file states and update previews
      setLogoFile(null);
      setBannerFile(null);
      setLogoRemoved(false);
      setBannerRemoved(false);
      setLogoPreview(updatedData.logoUrl || null);
      setBannerPreview(updatedData.bannerUrl || null);

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
        categoryName: clubData.categoryName || "",
        categoryId: clubData.categoryId || 0,
      });
      // Reset file states and previews
      setLogoFile(null);
      setBannerFile(null);
      setLogoRemoved(false);
      setBannerRemoved(false);
      setLogoPreview(clubData.logoUrl || null);
      setBannerPreview(clubData.bannerUrl || null);
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
                <Undo2 className="h-4 w-4 mr-2" /> Hủy
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                <Save className="h-4 w-4 mr-2" />{" "}
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

      {/* Logo & Banner */}
      <Card>
        <CardHeader>
          <CardTitle>Logo và Banner</CardTitle>
          <CardDescription>Hình ảnh đại diện cho câu lạc bộ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-4 md:col-span-1">
              <Label htmlFor="logo">Logo câu lạc bộ</Label>
              <div className="flex items-center justify-center py-6">
                <div
                  className="border-2 border-dashed rounded-full p-4 flex items-center justify-center w-52 h-52 cursor-pointer"
                  onClick={() => isEditing && logoInputRef.current?.click()}
                >
                  {isEditing && (
                    <input
                      ref={logoInputRef}
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  )}

                  {logoPreview ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Club Logo"
                          className="h-40 w-40 object-cover rounded-full"
                        />
                        {isEditing && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLogo();
                            }}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow hover:bg-destructive/90"
                            aria-label="Xóa logo"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center px-2 gap-1">
                      <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Chưa có logo
                      </p>
                      {isEditing && (
                        <p className="text-xs text-muted-foreground">
                          Bấm để chọn file tải lên
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <Label htmlFor="banner">Banner câu lạc bộ</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center min-h-[12rem] w-full cursor-pointer"
                onClick={() => isEditing && bannerInputRef.current?.click()}
              >
                {isEditing && (
                  <input
                    ref={bannerInputRef}
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                )}

                {bannerPreview ? (
                  <div className="relative w-full">
                    <img
                      src={bannerPreview}
                      alt="Club Banner"
                      className="h-48 w-full object-cover rounded"
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBanner();
                        }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-destructive/90"
                        aria-label="Xóa banner"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full text-center py-8">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Chưa có banner
                    </p>
                    {isEditing && (
                      <p className="text-sm text-muted-foreground">
                        Bấm để chọn file tải lên
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin chung</CardTitle>
          <CardDescription>
            Thông tin cơ bản và liên hệ của câu lạc bộ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Thông tin cơ bản
              </h3>

              <div className="space-y-2">
                <Label htmlFor="club-name">Tên câu lạc bộ</Label>
                <Input
                  id="club-name"
                  value={formData.clubName}
                  onChange={(e) =>
                    handleInputChange("clubName", e.target.value)
                  }
                  readOnly={!isEditing}
                  placeholder={isEditing ? "Nhập tên câu lạc bộ" : undefined}
                />
                {fieldErrors.clubName && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.clubName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="club-code">Mã câu lạc bộ</Label>
                <Input
                  id="club-code"
                  value={formData.clubCode}
                  onChange={(e) =>
                    handleInputChange("clubCode", e.target.value)
                  }
                  readOnly={!isEditing}
                  placeholder={isEditing ? "Nhập mã câu lạc bộ" : undefined}
                />
                {fieldErrors.clubCode && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.clubCode}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Thể loại</Label>
                {!isEditing ? (
                  <Input
                    id="category"
                    value={clubData?.categoryName || ""}
                    readOnly
                    placeholder={isEditing ? "Thể loại câu lạc bộ" : undefined}
                  />
                ) : (
                  <Select
                    value={
                      formData.categoryId ? String(formData.categoryId) : ""
                    }
                    onValueChange={(value) =>
                      handleInputChange("categoryId", Number(value))
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
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Thông tin liên hệ
              </h3>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  readOnly={!isEditing}
                  placeholder={isEditing ? "club@example.com" : undefined}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Số điện thoại
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  readOnly={!isEditing}
                  placeholder={isEditing ? "0123456789" : undefined}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive mt-1">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-6 pt-6 border-t">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Mạng xã hội
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fbUrl">Facebook</Label>
                {isEditing ? (
                  <Input
                    id="fbUrl"
                    value={formData.fbUrl || ""}
                    onChange={(e) => handleInputChange("fbUrl", e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                ) : isUrl(formData.fbUrl) ? (
                  <a
                    href={formData.fbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {formData.fbUrl}
                  </a>
                ) : (
                  <Input
                    id="fbUrl"
                    value={formData.fbUrl || ""}
                    readOnly
                    placeholder={
                      isEditing ? "https://facebook.com/..." : undefined
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="igUrl">Instagram</Label>
                {isEditing ? (
                  <Input
                    id="igUrl"
                    value={formData.igUrl || ""}
                    onChange={(e) => handleInputChange("igUrl", e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                ) : isUrl(formData.igUrl) ? (
                  <a
                    href={formData.igUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {formData.igUrl}
                  </a>
                ) : (
                  <Input
                    id="igUrl"
                    value={formData.igUrl || ""}
                    readOnly
                    placeholder={
                      isEditing ? "https://instagram.com/..." : undefined
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ttUrl">TikTok</Label>
                {isEditing ? (
                  <Input
                    id="ttUrl"
                    value={formData.ttUrl || ""}
                    onChange={(e) => handleInputChange("ttUrl", e.target.value)}
                    placeholder="https://tiktok.com/@..."
                  />
                ) : isUrl(formData.ttUrl) ? (
                  <a
                    href={formData.ttUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {formData.ttUrl}
                  </a>
                ) : (
                  <Input
                    id="ttUrl"
                    value={formData.ttUrl || ""}
                    readOnly
                    placeholder={
                      isEditing ? "https://tiktok.com/@..." : undefined
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ytUrl">YouTube</Label>
                {isEditing ? (
                  <Input
                    id="ytUrl"
                    value={formData.ytUrl || ""}
                    onChange={(e) => handleInputChange("ytUrl", e.target.value)}
                    placeholder="https://youtube.com/@..."
                  />
                ) : isUrl(formData.ytUrl) ? (
                  <a
                    href={formData.ytUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {formData.ytUrl}
                  </a>
                ) : (
                  <Input
                    id="ytUrl"
                    value={formData.ytUrl || ""}
                    readOnly
                    placeholder={
                      isEditing ? "https://youtube.com/@..." : undefined
                    }
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                readOnly={!isEditing}
                placeholder={isEditing ? "Mô tả về câu lạc bộ..." : undefined}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Chủ tịch câu lạc bộ
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
                        <Mail className="h-3 w-3 flex-shrink-0" />{" "}
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
