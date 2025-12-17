import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { staffManagementService, type StaffSummary } from "@/services/admin/staffManagementService";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon, Eye, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";


const defaultSort = ["id,desc"];

export default function StaffList() {
  const [data, setData] = useState<StaffSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [onlyActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const debouncedKeyword = useDebounce(keyword, 400);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<{
    email: string;
    fullName: string;
    phoneNumber: string;
    studentCode: string;
    gender: string;
    isActive: boolean;
  }>({
    email: "",
    fullName: "",
    phoneNumber: "",
    studentCode: "",
    gender: "",
    isActive: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await staffManagementService.getAllByFilter({
        page,
        size,
        sort: defaultSort,
        keyword: debouncedKeyword.trim() || undefined,
        isActive: onlyActive,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e?.message || "Tải danh sách staff thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, page, size, onlyActive]);

  const openCreateModal = () => {
    setCreateForm({
      email: "",
      fullName: "",
      phoneNumber: "",
      studentCode: "",
      gender: "",
      isActive: true,
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const email = createForm.email.trim();
    const fullName = createForm.fullName.trim();
    if (!email) {
      toast.error("Vui lòng nhập email");
      return;
    }
    if (!fullName) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    try {
      setCreateLoading(true);
      await staffManagementService.create({
        email,
        fullName,
        phoneNumber: createForm.phoneNumber.trim() || undefined,
        studentCode: createForm.studentCode.trim() || undefined,
        gender: createForm.gender || undefined,
        isActive: createForm.isActive,
      });
      toast.success("Tạo staff thành công");
      setCreateOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || "Tạo staff thất bại");
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleActive = async (s: StaffSummary) => {
    try {
      // Optimistic update
      setData((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: !x.isActive } : x)));
      await staffManagementService.setActive(s.id, { isActive: !s.isActive });
      toast.success("Cập nhật trạng thái thành công");
    } catch (e: any) {
      // Revert on error
      setData((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
      toast.error(e?.message || "Cập nhật trạng thái thất bại");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / size));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Profile modal
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const openProfile = async (id: number) => {
    try {
      setLoadingProfile(true);
      setOpen(true);
      const p = await staffManagementService.getBasicProfile(id);
      setProfile(p);
    } catch (e: any) {
      toast.error(e?.message || "Tải hồ sơ thất bại");
      setOpen(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Update modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState<{
    fullName?: string;
    phoneNumber?: string;
    gender?: string;
    avatarFile?: File | null;
  }>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startEdit = () => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName || "",
      phoneNumber: profile.phoneNumber || "",
      gender: profile.gender || "",
      avatarFile: null,
    });
    setAvatarPreview(profile.avatarUrl || null);
    setEditOpen(true);
  };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, avatarFile: f }));
    if (f) {
      const url = URL.createObjectURL(f);
      setAvatarPreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
    }
  };
  const submitEdit = async () => {
    if (!profile) return;
    try {
      setEditLoading(true);
      await staffManagementService.updateProfile(profile.id, {
        fullName: form.fullName,
        phoneNumber: form.phoneNumber,
        gender: form.gender,
        avatarFile: form.avatarFile ?? undefined,
      });
      toast.success("Cập nhật hồ sơ thành công");
      setEditOpen(false);
      // refresh profile displayed
      const refreshed = await staffManagementService.getBasicProfile(profile.id);
      setProfile(refreshed);
      // refresh list row
      setData((prev) =>
        prev.map((x) => (x.id === profile.id ? { ...x, fullName: refreshed.fullName, phoneNumber: refreshed.phoneNumber, avatarUrl: refreshed.avatarUrl } : x))
      );
    } catch (e: any) {
      toast.error(e?.message || "Cập nhật hồ sơ thất bại");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Quản lý nhân viên</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm kiếm..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm nhân viên mới
          </Button>
          {/* Filter theo trạng thái (tùy chọn) */}
          {/* <Select .../> có thể bổ sung sau */}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>SĐT</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: size }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-56" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.fullName}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.phoneNumber || "-"}</TableCell>
                  <TableCell>{s.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <Switch
                          checked={s.isActive}
                          onCheckedChange={() => toggleActive(s)}
                          aria-label="toggle-active"
                          title={s.isActive ? "Nhấn để ngừng hoạt động staff này" : "Nhấn để kích hoạt staff này"}
                        />
                        <span className="mt-1 text-xs text-muted-foreground">
                          {s.isActive ? "Tắt để ngừng hoạt động" : "Bật để kích hoạt"}
                        </span>
                      </div>
                      <button
                        className="inline-flex p-2 rounded-md hover:bg-secondary transition"
                        title="Xem chi tiết"
                        onClick={() => openProfile(s.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Tổng: {total.toLocaleString()} — Trang {page}/{totalPages}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hiển thị</span>
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={size}
              onChange={(e) => {
                setPage(1);
                setSize(Number(e.target.value));
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (canPrev) setPage((p) => Math.max(1, p - 1));
                  }}
                  className={`${!canPrev ? "pointer-events-none opacity-50" : ""}`}
                  aria-label="Trang trước"
                >
                  <ChevronLeftIcon />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (canNext) setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={`${!canNext ? "pointer-events-none opacity-50" : ""}`}
                  aria-label="Trang sau"
                >
                  <ChevronRightIcon />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Create Staff Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Tạo nhân viên mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email *</label>
              <Input
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="nhanvien@example.com"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Họ tên *</label>
              <Input
                value={createForm.fullName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Số điện thoại</label>
                <Input
                  value={createForm.phoneNumber}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="0123456789"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Mã định danh</label>
                <Input
                  value={createForm.studentCode}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, studentCode: e.target.value }))}
                  placeholder="Nhập mã (nếu có)"
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Giới tính</label>
                <select
                  className="h-9 rounded-md border px-2 bg-background"
                  value={createForm.gender}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, gender: e.target.value }))}
                >
                  <option value="">Chưa chọn</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Trạng thái</label>
                <div className="flex h-9 items-center rounded-md border px-3">
                  <Switch
                    checked={createForm.isActive}
                    onCheckedChange={(checked) => setCreateForm((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <span className="ml-2 text-sm">{createForm.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Đang tạo..." : "Tạo staff"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Thông tin Staff</DialogTitle>
          </DialogHeader>
          {loadingProfile ? (
            <div className="p-4 text-muted-foreground">Đang tải...</div>
          ) : profile ? (
            <div className="p-2 space-y-5">
              <div className="flex items-center gap-5">
                <img
                  src={profile.avatarUrl || "https://placehold.co/120x120"}
                  alt="avatar"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30 shadow-sm"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-2xl leading-tight truncate">{profile.fullName}</div>
                  <div className="text-sm text-muted-foreground mt-1">STAFF</div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3 items-start">
                  <div className="text-muted-foreground col-span-1">Email</div>
                  <div className="col-span-2 break-words">{profile.email || "-"}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 items-start">
                  <div className="text-muted-foreground col-span-1">Số điện thoại</div>
                  <div className="col-span-2">{profile.phoneNumber || "-"}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 items-start">
                  <div className="text-muted-foreground col-span-1">Giới tính</div>
                  <div className="col-span-2">
                    {profile.gender === "MALE"
                      ? "Nam"
                      : profile.gender === "FEMALE"
                      ? "Nữ"
                      : "-"}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 items-start">
                  <div className="text-muted-foreground col-span-1">Trạng thái</div>
                  <div className="col-span-2">
                    {profile.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={startEdit} className="ml-auto">Cập nhật</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="p-4 text-muted-foreground">Không có dữ liệu</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Profile Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Cập nhật hồ sơ</DialogTitle>
          </DialogHeader>
          {profile && (
            <div className="space-y-5">
              {/* Header with avatar + basic fields aligned similar to view modal */}
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  className="relative group rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  title="Chọn ảnh mới"
                >
                  <img
                    src={avatarPreview || profile.avatarUrl || "https://placehold.co/120x120"}
                    alt="avatar"
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30 shadow-sm"
                  />
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                    Đổi ảnh
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <div className="min-w-0 flex-1 grid gap-2">
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div className="text-muted-foreground col-span-1">Họ tên</div>
                    <div className="col-span-2">
                      <Input
                        value={form.fullName ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div className="text-muted-foreground col-span-1">Email</div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate">
                      {profile.email}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="text-muted-foreground col-span-1">Số điện thoại</div>
                  <div className="col-span-2">
                    <Input
                      value={form.phoneNumber ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="text-muted-foreground col-span-1">Giới tính</div>
                  <div className="col-span-2">
                    <select
                      className="h-9 w-full rounded-md border px-2 bg-background"
                      value={form.gender ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                    >
                      <option value="">Chưa chọn</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                    </select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
                  Hủy
                </Button>
                <Button onClick={submitEdit} disabled={editLoading}>
                  {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


