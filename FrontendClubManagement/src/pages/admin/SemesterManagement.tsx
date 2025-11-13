import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { semesterManagementService, type SemesterSummary } from "@/services/admin/semesterManagementService";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { Pencil, Plus, ChevronLeftIcon, ChevronRightIcon, Trash2 } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const defaultSort = ["id,desc"];

export default function SemesterManagement() {
  const [semesters, setSemesters] = useState<SemesterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isCurrentFilter, setIsCurrentFilter] = useState<boolean | undefined>(undefined);
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<{
    semesterName: string;
    semesterCode: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }>({
    semesterName: "",
    semesterCode: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selected, setSelected] = useState<SemesterSummary | null>(null);
  const [editForm, setEditForm] = useState<{
    semesterName: string;
    semesterCode: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }>({
    semesterName: "",
    semesterCode: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const res = await semesterManagementService.getAllByFilter({
        page,
        size,
        sort: defaultSort,
        keyword: debouncedSearch.trim() || undefined,
        isCurrent: isCurrentFilter,
      });
      setSemesters(res.data);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e?.message || "Không thể tải danh sách kỳ học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, size, isCurrentFilter]);

  const openCreateModal = () => {
    setCreateForm({
      semesterName: "",
      semesterCode: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
    setCreateOpen(true);
  };

  const openEditModal = (semester: SemesterSummary) => {
    setSelected(semester);
    setEditForm({
      semesterName: semester.semesterName ?? "",
      semesterCode: semester.semesterCode ?? "",
      startDate: semester.startDate ? semester.startDate.split("T")[0] : "",
      endDate: semester.endDate ? semester.endDate.split("T")[0] : "",
      isCurrent: semester.isCurrent ?? false,
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.semesterName.trim()) {
      toast.error("Vui lòng nhập tên kỳ học");
      return;
    }
    if (!createForm.startDate || !createForm.endDate) {
      toast.error("Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc");
      return;
    }
    if (new Date(createForm.startDate) > new Date(createForm.endDate)) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    try {
      setCreateLoading(true);
      await semesterManagementService.create({
        semesterName: createForm.semesterName.trim(),
        semesterCode: createForm.semesterCode.trim() || undefined,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        isCurrent: createForm.isCurrent,
      });
      toast.success("Tạo kỳ học thành công");
      setCreateOpen(false);
      fetchSemesters();
    } catch (e: any) {
      toast.error(e?.message || "Tạo kỳ học thất bại");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    if (!editForm.semesterName.trim()) {
      toast.error("Vui lòng nhập tên kỳ học");
      return;
    }
    if (!editForm.startDate || !editForm.endDate) {
      toast.error("Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc");
      return;
    }
    if (new Date(editForm.startDate) > new Date(editForm.endDate)) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    try {
      setEditLoading(true);
      await semesterManagementService.update(selected.id, {
        semesterName: editForm.semesterName.trim(),
        semesterCode: editForm.semesterCode.trim() || undefined,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        isCurrent: editForm.isCurrent,
      });
      toast.success("Cập nhật kỳ học thành công");
      setEditOpen(false);
      fetchSemesters();
    } catch (e: any) {
      toast.error(e?.message || "Cập nhật kỳ học thất bại");
    } finally {
      setEditLoading(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [semesterToDelete, setSemesterToDelete] = useState<SemesterSummary | null>(null);

  const confirmDelete = (semester: SemesterSummary) => {
    setSemesterToDelete(semester);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!semesterToDelete) return;
    try {
      setDeleteLoading(true);
      await semesterManagementService.remove(semesterToDelete.id);
      toast.success("Xóa kỳ học thành công");
      setDeleteOpen(false);
      setSemesterToDelete(null);
      fetchSemesters();
    } catch (e: any) {
      toast.error(e?.message || "Xóa kỳ học thất bại");
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quản lý Kỳ học</h1>
          <p className="text-sm text-muted-foreground">Quản lý thông tin các kỳ học trong hệ thống</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo kỳ học mới
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 flex-1">
            <Input
              placeholder="Tìm kiếm theo tên hoặc mã kỳ học..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-sm"
            />
            <Select
              value={isCurrentFilter === undefined ? "all" : isCurrentFilter ? "true" : "false"}
              onValueChange={(value) => {
                setIsCurrentFilter(value === "all" ? undefined : value === "true");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="true">Kỳ hiện tại</SelectItem>
                <SelectItem value="false">Kỳ khác</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên kỳ học</TableHead>
              <TableHead>Mã kỳ học</TableHead>
              <TableHead>Ngày bắt đầu</TableHead>
              <TableHead>Ngày kết thúc</TableHead>
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
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : semesters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              semesters.map((semester) => (
                <TableRow key={semester.id}>
                  <TableCell className="font-medium">{semester.semesterName}</TableCell>
                  <TableCell>{semester.semesterCode ?? "-"}</TableCell>
                  <TableCell>{formatDate(semester.startDate)}</TableCell>
                  <TableCell>{formatDate(semester.endDate)}</TableCell>
                  <TableCell>
                    {semester.isCurrent ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Kỳ hiện tại</Badge>
                    ) : (
                      <Badge variant="secondary"></Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button
                        className="inline-flex p-2 rounded-md hover:bg-secondary transition group"
                        title="Chỉnh sửa"
                        onClick={() => openEditModal(semester)}
                      >
                        <Pencil className="h-4 w-4 group-hover:text-orange-500 transition-colors" />
                      </button>
                      <button
                        className="inline-flex p-2 rounded-md hover:bg-destructive/10 transition group"
                        title="Xóa kỳ học"
                        onClick={() => confirmDelete(semester)}
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
            <DialogTitle className="text-xl">Tạo kỳ học mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Tên kỳ học *</label>
              <Input
                value={createForm.semesterName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, semesterName: e.target.value }))}
                placeholder="Ví dụ: Học kỳ 1 năm học 2024-2025"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Mã kỳ học</label>
              <Input
                value={createForm.semesterCode}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, semesterCode: e.target.value }))}
                placeholder="Ví dụ: HK1-2024-2025"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Ngày bắt đầu *</label>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Ngày kết thúc *</label>
                <Input
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-isCurrent"
                checked={createForm.isCurrent}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="create-isCurrent" className="text-sm font-medium text-muted-foreground cursor-pointer">
                Đặt làm kỳ học hiện tại
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Đang tạo..." : "Tạo kỳ học"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl rounded-xl border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Cập nhật thông tin kỳ học</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Tên kỳ học *</label>
                <Input
                  value={editForm.semesterName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, semesterName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Mã kỳ học</label>
                <Input
                  value={editForm.semesterCode}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, semesterCode: e.target.value }))}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Ngày bắt đầu *</label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Ngày kết thúc *</label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isCurrent"
                  checked={editForm.isCurrent}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="edit-isCurrent" className="text-sm font-medium text-muted-foreground cursor-pointer">
                  Đặt làm kỳ học hiện tại
                </label>
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
            <DialogTitle className="text-xl">Xóa kỳ học</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa kỳ học{" "}
              <span className="font-semibold text-foreground">
                {semesterToDelete?.semesterName ?? ""}
              </span>
              ? Hành động này không thể hoàn tác.
            </p>
            {semesterToDelete?.isCurrent && (
              <p className="text-xs text-destructive">
                Lưu ý: kỳ học này đang là kỳ học hiện tại.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Đang xóa..." : "Xóa ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

