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
import { Pencil, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quản lý Campus</h1>
          <p className="text-sm text-muted-foreground">Theo dõi và chỉnh sửa thông tin các cơ sở</p>
        </div>
        <Input
          placeholder="Tìm kiếm theo tên, mã hoặc địa chỉ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-72"
        />
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
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
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
                    <button
                      className="inline-flex p-2 rounded-md hover:bg-secondary transition group"
                      title="Chỉnh sửa"
                      onClick={() => openEditModal(campus)}
                    >
                      <Pencil className="h-4 w-4 group-hover:text-orange-500 transition-colors" />
                    </button>
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
    </div>
  );
}


