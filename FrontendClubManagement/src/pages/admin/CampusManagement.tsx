import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { campusManagementService, type CampusSummary } from "@/services/admin/campusManagementService";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { Pencil, Plus, ChevronLeftIcon, ChevronRightIcon, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";

const defaultSort = ["id,desc"];

export default function CampusManagement() {
  const [campuses, setCampuses] = useState<CampusSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<{
    campusName: string;
    campusCode: string;
    address: string;
    phone: string;
    email: string;
  }>({
    campusName: "",
    campusCode: "",
    address: "",
    phone: "",
    email: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selected, setSelected] = useState<CampusSummary | null>(null);
  const [form, setForm] = useState<{
    campusName: string;
    campusCode: string;
    address: string;
    phone: string;
    email: string;
  }>({
    campusName: "",
    campusCode: "",
    address: "",
    phone: "",
    email: "",
  });

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const res = await campusManagementService.getAllByFilter({
        page,
        size,
        sort: defaultSort,
        keyword: debouncedSearch.trim() || undefined,
      });
      setCampuses(res.data);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e?.message || "Không thể tải danh sách campus");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, size]);

  const openCreateModal = () => {
    setCreateForm({
      campusName: "",
      campusCode: "",
      address: "",
      phone: "",
      email: "",
    });
    setCreateOpen(true);
  };

  const openEditModal = (campus: CampusSummary) => {
    setSelected(campus);
    setForm({
      campusName: campus.campusName ?? "",
      campusCode: campus.campusCode ?? "",
      address: campus.address ?? "",
      phone: campus.phone ?? "",
      email: campus.email ?? "",
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.campusName.trim()) {
      toast.error("Vui lòng nhập tên campus");
      return;
    }
    try {
      setCreateLoading(true);
      await campusManagementService.create({
        campusName: createForm.campusName.trim(),
        campusCode: createForm.campusCode.trim() || undefined,
        address: createForm.address || undefined,
        phone: createForm.phone || undefined,
        email: createForm.email || undefined,
      });
      toast.success("Tạo campus thành công");
      setCreateOpen(false);
      fetchCampuses();
    } catch (e: any) {
      toast.error(e?.message || "Tạo campus thất bại");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      setEditLoading(true);
      const updated = await campusManagementService.update(selected.id, {
        campusName: form.campusName,
        campusCode: form.campusCode,
        address: form.address,
        phone: form.phone,
        email: form.email,
      });
      toast.success("Cập nhật campus thành công");
      setCampuses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditOpen(false);
      fetchCampuses();
    } catch (e: any) {
      toast.error(e?.message || "Cập nhật campus thất bại");
    } finally {
      setEditLoading(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [campusToDelete, setCampusToDelete] = useState<CampusSummary | null>(null);

  const confirmDelete = (campus: CampusSummary) => {
    setCampusToDelete(campus);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!campusToDelete) return;
    try {
      setDeleteLoading(true);
      await campusManagementService.remove(campusToDelete.id);
      toast.success("Xóa campus thành công");
      setDeleteOpen(false);
      setCampusToDelete(null);
      fetchCampuses();
    } catch (e: any) {
      toast.error(e?.message || "Xóa campus thất bại");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quản lý Campus</h1>
          <p className="text-sm text-muted-foreground">Theo dõi và chỉnh sửa thông tin các cơ sở</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <Input
            placeholder="Tìm kiếm theo tên, mã hoặc địa chỉ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-72"
          />
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo campus mới
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên campus</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Email</TableHead>
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
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : campuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              campuses.map((campus) => (
                <TableRow key={campus.id}>
                  <TableCell className="font-medium">{campus.campusName}</TableCell>
                  <TableCell>{campus.campusCode ?? "-"}</TableCell>
                  <TableCell className="max-w-sm truncate" title={campus.address ?? "-"}>{campus.address ?? "-"}</TableCell>
                  <TableCell>{campus.phone ?? "-"}</TableCell>
                  <TableCell>{campus.email ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button
                        className="inline-flex p-2 rounded-md hover:bg-secondary transition group"
                        title="Chỉnh sửa"
                        onClick={() => openEditModal(campus)}
                      >
                        <Pencil className="h-4 w-4 group-hover:text-orange-500 transition-colors" />
                      </button>
                      <button
                        className="inline-flex p-2 rounded-md hover:bg-destructive/10 transition group"
                        title="Xóa campus"
                        onClick={() => confirmDelete(campus)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive" />
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
          Tổng: {total.toLocaleString()} — Trang {page}/{Math.max(1, Math.ceil(total / size))}
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
                    if (page > 1) setPage((p) => Math.max(1, p - 1));
                  }}
                  className={`${page <= 1 ? "pointer-events-none opacity-50" : ""} px-3 gap-2`}
                  aria-label="Trang trước"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const totalPages = Math.max(1, Math.ceil(total / size));
                    if (page < totalPages) setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={`${page >= Math.max(1, Math.ceil(total / size)) ? "pointer-events-none opacity-50" : ""} px-3 gap-2`}
                  aria-label="Trang sau"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Tạo campus mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Tên campus *</label>
              <Input
                value={createForm.campusName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, campusName: e.target.value }))}
                placeholder="Ví dụ: Cơ sở Hà Nội"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Mã campus</label>
              <Input
                value={createForm.campusCode}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, campusCode: e.target.value }))}
                placeholder="Ví dụ: HN"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Địa chỉ</label>
              <Textarea
                value={createForm.address}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
                rows={3}
                placeholder="Nhập địa chỉ campus"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Số điện thoại</label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ví dụ: 0123456789"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <Input
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Ví dụ: campus@fpt.edu.vn"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Đang tạo..." : "Tạo campus"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Cập nhật thông tin campus</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Tên campus</label>
                <Input
                  value={form.campusName}
                  onChange={(e) => setForm((prev) => ({ ...prev, campusName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Mã campus</label>
                <Input
                  value={form.campusCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, campusCode: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Địa chỉ</label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Số điện thoại</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
                  Hủy
                </Button>
                <Button onClick={handleUpdate} disabled={editLoading}>
                  {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Xóa campus</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa campus{" "}
              <span className="font-semibold text-foreground">
                {campusToDelete?.campusName ?? ""}
              </span>
              ? Hành động này không thể hoàn tác.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Đang xóa..." : "Xóa ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


