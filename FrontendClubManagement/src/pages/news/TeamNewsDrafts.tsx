"use client";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { draftsApi } from "@/api/newsDrafts";
import type { NewsData, PageResp } from "@/types/news";
import {
  RefreshCw,
  Clock,
  ImageOff,
  Eye,
  Pencil,
  Send,
  Trash2,
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

const fmt = (dt?: string | null) =>
  dt ? new Date(dt).toLocaleDateString("vi-VN") : "";

export default function TeamNewsDrafts() {
  const nav = useNavigate();
  const { clubId: clubIdParam, teamId: teamIdParam } = useParams();
  const clubId = Number(clubIdParam);
  const teamId = Number(teamIdParam);

  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToClub, subscribeToUserQueue } =
    useWebSocket(token);

  const [page] = useState(0);
  const [size] = useState(40);
  const [drafts, setDrafts] = useState<NewsData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [doing, setDoing] = useState<number | null>(null);

  // dialogs
  const [submitId, setSubmitId] = useState<number | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await draftsApi.list({ page, size, clubId, teamId });
      const pageData: PageResp<NewsData> | undefined =
        (res as any)?.data ?? res;
      setDrafts(pageData?.content ?? []);
      setTotal(pageData?.totalElements ?? pageData?.content?.length ?? 0);
    } catch (e: any) {
      toast.error(e?.message || "Không tải được danh sách bản nháp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, teamId, page, size]);

  // Realtime WS — reload khi có sự kiện về draft trong CLB
  useEffect(() => {
    if (!isConnected || !Number.isFinite(clubId)) return;
    const offClub = subscribeToClub(clubId, (msg) => {
      if (msg.type === "NEWS_DRAFT") load();
    });
    const offMe = subscribeToUserQueue((_msg) => {});
    return () => {
      offClub?.();
      offMe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, clubId]);

  const onEdit = (d: NewsData) => {
    nav(`/myclub/${clubId}/teams/${teamId}/news-editor?draftId=${d.id}`, {
      state: { draft: d },
    });
  };

  // ==== Submit (Dialog) ====
  const confirmSubmit = async () => {
    if (!submitId) return;
    setSubmitBusy(true);
    setDoing(submitId);
    try {
      await draftsApi.submit(submitId);
      toast.success(`Đã submit bản nháp lên Chủ nhiệm CLB.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Không submit được nháp.");
    } finally {
      setDoing(null);
      setSubmitBusy(false);
      setSubmitId(null);
    }
  };

  // ==== Delete (Dialog) ====
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteBusy(true);
    setDoing(deleteId);
    try {
      await draftsApi.remove(deleteId);
      toast.success(`Đã xóa bản nháp thành công`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Không xóa được nháp.");
    } finally {
      setDoing(null);
      setDeleteBusy(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="px-0 sm:px-2 lg:px-4 py-4 space-y-6 w-full">
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
                  Loại tin tức
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Cập nhật
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
                    { width: 56 },
                    { width: "100%" },
                    { width: 160 },
                    { width: 140 },
                    { width: 80 },
                  ]}
                />
              ))}
            </tbody>
          </table>
        ) : drafts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Chưa có bản nháp
          </div>
        ) : (
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
                  Loại tin tức
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Cập nhật
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drafts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                      {d.thumbnailUrl ? (
                        <img
                          src={d.thumbnailUrl || "/placeholder.svg"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="line-clamp-2 font-medium text-slate-900">
                      {d.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">
                      {d.newsType || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {fmt(d.updatedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Xem chi tiết"
                        onClick={() =>
                          nav(
                            `/myclub/${clubId}/teams/${teamId}/news/drafts/${d.id}`
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Sửa"
                        onClick={() => onEdit(d)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        disabled={doing === d.id}
                        title="Submit"
                        onClick={() => setSubmitId(d.id)}
                      >
                        {doing === d.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        disabled={doing === d.id}
                        title="Xóa"
                        onClick={() => setDeleteId(d.id)}
                      >
                        {doing === d.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Hiển thị {drafts.length > 0 ? `1-${drafts.length}` : "0"} trên {total}{" "}
          bản nháp
        </span>
      </div>

      {/* Submit dialog */}
      <Dialog
        open={submitId !== null}
        onOpenChange={(open) => {
          if (!open) setSubmitId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit bản nháp #{submitId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Gửi lên Chủ nhiệm CLB để duyệt?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSubmitId(null)}
              disabled={submitBusy}
            >
              Hủy
            </Button>
            <Button onClick={confirmSubmit} disabled={submitBusy}>
              {submitBusy ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa bản nháp #{deleteId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Thao tác này sẽ xóa bản nháp khỏi danh sách.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteBusy}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
