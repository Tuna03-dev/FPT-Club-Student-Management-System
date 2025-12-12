"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { requestsApi } from "@/api/newsRequests";
import type { NewsRequest, RequestStatus } from "@/types/news";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  ImageOff,
  Eye,
  Pencil,
  XCircle,
} from "lucide-react";
import { SkeletonRow } from "@/components/common/Skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

type FilterStatus = RequestStatus | "ALL";

const PAGE_SIZE = 10;

const badgeClass = (s?: string) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    PENDING_CLUB: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    APPROVED_CLUB: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    REJECTED_CLUB: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    PENDING_UNIVERSITY: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    APPROVED_UNIVERSITY:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    REJECTED_UNIVERSITY: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    CANCELED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
    map[s || "CANCELED"] || "bg-slate-100"
  }`;
};

const statusLabel: Record<RequestStatus | "CANCELED" | "DRAFT", string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ duyệt (CLB)",
  APPROVED_CLUB: "Đã duyệt (CLB)",
  REJECTED_CLUB: "Từ chối (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
  REJECTED_UNIVERSITY: "Từ chối (Trường)",
  CANCELED: "Đã hủy",
};

export default function TeamNewsRequests() {
  const nav = useNavigate();
  const { clubId: clubIdParam, teamId: teamIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const teamId = Number(teamIdParam);

  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToClub, subscribeToUserQueue } =
    useWebSocket(token);

  const [list, setList] = useState<NewsRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [doing, setDoing] = useState<number | null>(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1); // 1-based
  const [totalPages, setTotalPages] = useState(1);

  // cancel dialog
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  // ====== LOAD DATA (có phân trang) ======
  const load = async (pageArg?: number) => {
    const page = pageArg ?? currentPage;

    setLoading(true);

    try {
      const params: Record<string, any> = {
        page,
        size: PAGE_SIZE,
      };
      if (kw.trim()) params.keyword = kw.trim();
      if (status !== "ALL") params.status = status as RequestStatus;
      if (Number.isFinite(clubId)) params.clubId = clubId;
      if (Number.isFinite(teamId)) params.teamId = teamId;

      const res: any = await requestsApi.search(params);
      // res = { total, data, page, size, count }
      const content: NewsRequest[] = Array.isArray(res.data) ? res.data : [];
      const total: number =
        typeof res.total === "number" ? res.total : content.length;

      setList(content);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (e: any) {
      console.error("load TeamNewsRequests error:", e);
      toast.error(e?.message || "Không tải được danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  // Khi đổi filter -> reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [clubIdParam, teamIdParam, kw, status]);

  // Khi currentPage / clubId / teamId thay đổi -> load
  useEffect(() => {
    if (!Number.isFinite(clubId)) return;
    load(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, teamId, currentPage]);

  // Realtime: khi có NEWS_REQUEST trong CLB thì reload trang hiện tại
  useEffect(() => {
    if (!isConnected || !Number.isFinite(clubId)) return;

    const offClub = subscribeToClub(clubId, (msg) => {
      if (msg.type === "NEWS_REQUEST") {
        load(currentPage);
      }
    });
    const offMe = subscribeToUserQueue((_msg) => {});

    return () => {
      offClub?.();
      offMe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, clubId, currentPage]);

  const canEdit = (r: NewsRequest) => r.status === "PENDING_CLUB";
  const canCancel = (r: NewsRequest) => r.status === "PENDING_CLUB";

  const onEdit = (r: NewsRequest) => {
    nav(`/myclub/${clubId}/teams/${teamId}/news/requests/${r.id}?edit=1`);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelBusy(true);
    setDoing(cancelId);

    try {
      await requestsApi.cancel(cancelId);
      toast.success(`Đã hủy request`);
      await load(currentPage);
    } catch (e: any) {
      console.error("cancel request error:", e);
      toast.error(e?.message || "Hủy thất bại.");
    } finally {
      setDoing(null);
      setCancelBusy(false);
      setCancelId(null);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // build list trang giống EventPage
  const buildPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxButtons; i++) pages.push(i);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-4 py-4 max-w-none mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, mô tả…"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as FilterStatus)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="PENDING_CLUB">Chờ duyệt (CLB)</SelectItem>
            <SelectItem value="APPROVED_CLUB">Đã duyệt (CLB)</SelectItem>
            <SelectItem value="REJECTED_CLUB">Từ chối (CLB)</SelectItem>
            <SelectItem value="PENDING_UNIVERSITY">
              Chờ duyệt (Trường)
            </SelectItem>
            <SelectItem value="APPROVED_UNIVERSITY">
              Đã duyệt (Trường)
            </SelectItem>
            <SelectItem value="REJECTED_UNIVERSITY">
              Từ chối (Trường)
            </SelectItem>
            <SelectItem value="CANCELED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        {loading ? (
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Ảnh
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Tiêu đề
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Ngày gửi
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...Array(6)].map((_, i) => (
                <SkeletonRow
                  key={i}
                  columns={[
                    { width: 64 },
                    { width: "100%" },
                    { width: 120 },
                    { width: 140 },
                    { width: 80 },
                  ]}
                />
              ))}
            </tbody>
          </table>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Chưa có yêu cầu nào.
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Ảnh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Ngày gửi
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                        {r.thumbnailUrl ? (
                          <img
                            src={r.thumbnailUrl || "/placeholder.svg"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 font-medium text-slate-900">
                        {r.requestTitle || "—"}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">
                        {r.description ?? "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={badgeClass(r.status)}>
                        {statusLabel[
                          (r.status as RequestStatus) || "CANCELED"
                        ] || r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {r.requestDate
                          ? new Date(r.requestDate).toLocaleString("vi-VN")
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="Xem chi tiết"
                          onClick={() =>
                            nav(
                              `/myclub/${clubId}/teams/${teamId}/news/requests/${r.id}`
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canEdit(r) && (
                          <button
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            disabled={doing === r.id}
                            title="Sửa"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(r);
                            }}
                          >
                            {doing === r.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {canCancel(r) && (
                          <button
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            disabled={doing === r.id}
                            title="Hủy"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelId(r.id);
                            }}
                          >
                            {doing === r.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 text-sm text-slate-600">
                <span>
                  Trang {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>

                  <div className="flex items-center gap-1">
                    {buildPageNumbers().map((p) => (
                      <Button
                        key={p}
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(p)}
                        className="w-10 h-10"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel dialog */}
      <Dialog
        open={cancelId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy request #{cancelId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn chắc chắn muốn hủy yêu cầu này?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelId(null)}
              disabled={cancelBusy}
            >
              Không
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelBusy}
            >
              {cancelBusy ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
