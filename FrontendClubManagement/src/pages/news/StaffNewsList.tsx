"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  getAllNewsByFilter,
  getAllClubs,
  type NewsData as PubNewsBase,
  type NewsFilterRequest,
} from "@/service/NewsService";
import { requestsApi } from "@/api/newsRequests";
import { draftsApi } from "@/api/newsDrafts";
import { staffNewsAdminApi } from "@/api/staffNewsAdmin";
import type {
  NewsRequest,
  RequestStatus,
  NewsData,
  PageResp,
} from "@/types/news";
import { SkeletonRow } from "@/components/common/Skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Clock,
  Filter,
  ImageOff,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Pencil,
  Trash2,
  RotateCcw,
  Send,
  Info,
  AlertTriangle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Realtime
import { useWebSocket } from "@/hooks/useWebSocket";

const fmt = (dt?: string | null) =>
  dt ? new Date(dt).toLocaleString("vi-VN") : "—";
const reqBadge = (s?: string) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    PENDING_CLUB: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
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
const reqLabel: Record<RequestStatus | "CANCELED" | "DRAFT", string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ duyệt (CLB)",
  APPROVED_CLUB: "Đã duyệt (CLB)",
  REJECTED_CLUB: "Từ chối (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
  REJECTED_UNIVERSITY: "Từ chối (Trường)",
  CANCELED: "Đã hủy",
};
type TabKey = "news" | "requests" | "drafts";
type FilterStatus = RequestStatus | "ALL";

// Bổ sung cờ UI
type PubNews = PubNewsBase & {
  hidden?: boolean;
  deleted?: boolean;
  newsType?: string | null;
};

// page size cho 3 tab
const STAFF_NEWS_PAGE_SIZE = 10;
const STAFF_REQ_PAGE_SIZE = 10;
const STAFF_DRAFT_PAGE_SIZE = 10;

export default function StaffNewsList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToSystemWide, subscribeToUserQueue } =
    useWebSocket(token);

  // banners
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  const [errBanner, setErrBanner] = useState<string | null>(null);

  const tabInUrl = (sp.get("tab") as TabKey) || "news";
  const [tab, setTab] = useState<TabKey>(tabInUrl);
  useEffect(() => {
    if (tab !== tabInUrl) {
      const next = new URLSearchParams(sp);
      next.set("tab", tab);
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ===================== NEWS ===================== */
  const [clubs, setClubs] = useState<{ id: number; clubName: string }[]>([]);
  const [news, setNews] = useState<PubNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsKw, setNewsKw] = useState("");
  const [newsClubId, setNewsClubId] = useState<number | "ALL">("ALL");

  const [newsPage, setNewsPage] = useState(1); // 1-based
  const [newsTotalPages, setNewsTotalPages] = useState(1);

  const loadClubs = async () => {
    try {
      setClubs((await getAllClubs()) || []);
    } catch (e: any) {
      setErrBanner(e?.message || "Không tải được danh sách CLB.");
    }
  };

  const loadNews = async (pageArg?: number) => {
    const page = pageArg ?? newsPage;
    setNewsLoading(true);
    try {
      const payload: NewsFilterRequest = {
        keyword: newsKw || undefined,
        clubId: newsClubId === "ALL" ? undefined : (newsClubId as number),
        page,
        size: STAFF_NEWS_PAGE_SIZE,
      };
      const resp: any = await getAllNewsByFilter(payload);
      // resp = { data, total, page, size } hoặc tương tự
      const content: PubNews[] = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
          ? resp
          : [];
      const total: number =
        typeof resp?.total === "number" ? resp.total : content.length;

      setNews(content);
      setNewsPage(page);
      setNewsTotalPages(Math.max(1, Math.ceil(total / STAFF_NEWS_PAGE_SIZE)));
    } catch (e: any) {
      console.error("loadNews error:", e);
      setErrBanner(e?.message || "Không tải được danh sách tin.");
    } finally {
      setNewsLoading(false);
    }
  };

  const patchNewsLocal = (id: number, patch: Partial<PubNews>) => {
    setNews((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const handleEdit = (n: PubNews) => {
    nav(`/staff/news/${n.id}/edit`, {
      state: { hidden: !!n.hidden, deleted: !!n.deleted },
    });
  };

  // ===== Soft hide/show =====
  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null);
  const handleToggleHide = async (n: PubNews) => {
    const nextHidden = !n.hidden;
    setToggleBusyId(n.id);
    patchNewsLocal(n.id, { hidden: nextHidden });
    try {
      if (nextHidden) await staffNewsAdminApi.hide(n.id);
      else await staffNewsAdminApi.unhide(n.id);
      setInfoBanner(nextHidden ? "Đã ẩn bài." : "Đã hiện bài.");
    } catch (e: any) {
      patchNewsLocal(n.id, { hidden: !nextHidden });
      setErrBanner(e?.message || "Ẩn/hiện thất bại.");
    } finally {
      setToggleBusyId(null);
    }
  };

  // ===== Soft delete / Restore (Dialog thay confirm) =====
  const [softDeleteId, setSoftDeleteId] = useState<number | null>(null);
  const [restoreBusyId, setRestoreBusyId] = useState<number | null>(null);
  const [softDeleteBusy, setSoftDeleteBusy] = useState(false);

  const confirmSoftDelete = async () => {
    if (!softDeleteId) return;
    setSoftDeleteBusy(true);
    const id = softDeleteId;
    const prev = news.find((x) => x.id === id)?.deleted ?? false;
    patchNewsLocal(id, { deleted: true });
    try {
      await staffNewsAdminApi.softDelete(id);
      setInfoBanner(`Đã xóa mềm news #${id}.`);
    } catch (e: any) {
      patchNewsLocal(id, { deleted: prev });
      setErrBanner(e?.message || "Xóa mềm thất bại.");
    } finally {
      setSoftDeleteBusy(false);
      setSoftDeleteId(null);
    }
  };

  const handleRestore = async (n: PubNews) => {
    setRestoreBusyId(n.id);
    patchNewsLocal(n.id, { deleted: false });
    try {
      await staffNewsAdminApi.restore(n.id);
      setInfoBanner(`Đã khôi phục news #${n.id}.`);
    } catch (e: any) {
      patchNewsLocal(n.id, { deleted: true });
      setErrBanner(e?.message || "Khôi phục thất bại.");
    } finally {
      setRestoreBusyId(null);
    }
  };

  /* ===================== REQUESTS ===================== */
  const [reqList, setReqList] = useState<NewsRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqKw, setReqKw] = useState("");
  const [reqStatus, setReqStatus] =
    useState<FilterStatus>("PENDING_UNIVERSITY");
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [doingApprove, setDoingApprove] = useState(false);
  const [doingReject, setDoingReject] = useState(false);

  const [reqPage, setReqPage] = useState(1); // 1-based
  const [reqTotalPages, setReqTotalPages] = useState(1);

  const loadRequests = async (pageArg?: number) => {
    const page = pageArg ?? reqPage;
    setReqLoading(true);

    try {
      const params: Record<string, any> = { page, size: STAFF_REQ_PAGE_SIZE };

      if (reqKw.trim()) params.keyword = reqKw.trim();
      if (reqStatus !== "ALL") params.status = reqStatus as RequestStatus;

      const res: any = await requestsApi.search(params);

      const content: NewsRequest[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

      const total: number =
        typeof res?.total === "number" ? res.total : content.length;

      // ======== 🎯 FILTER CHUẨN CHO STAFF ==========
      const allowed: RequestStatus[] = [
        "PENDING_UNIVERSITY",
        "APPROVED_UNIVERSITY",
        "REJECTED_UNIVERSITY",
      ];

      // Nếu Staff đang chọn filter cụ thể → để nguyên cho BE handle
      const finalList =
        reqStatus === "ALL"
          ? content.filter((r) => allowed.includes(r.status as RequestStatus))
          : content;

      // =============================================

      setReqList(finalList);
      setReqPage(page);
      setReqTotalPages(Math.max(1, Math.ceil(total / STAFF_REQ_PAGE_SIZE)));
    } catch (e: any) {
      console.error("loadRequests error:", e);
      setErrBanner(e?.message || "Không tải được danh sách yêu cầu.");
    } finally {
      setReqLoading(false);
    }
  };

  const confirmApprove = async () => {
    if (!approveId) return;
    setDoingApprove(true);
    try {
      await requestsApi.staffApprovePublish(approveId, {});
      setApproveId(null);
      setInfoBanner(`Đã duyệt & đăng yêu cầu #${approveId}.`);
      await loadRequests();
    } catch (e: any) {
      setErrBanner(e?.message || "Không duyệt được.");
    } finally {
      setDoingApprove(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) return;
    setDoingReject(true);
    try {
      await requestsApi.staffReject(rejectId, { reason: rejectReason.trim() });
      setRejectId(null);
      setRejectReason("");
      setInfoBanner(`Đã từ chối yêu cầu #${rejectId}.`);
      await loadRequests();
    } catch (e: any) {
      setErrBanner(e?.message || "Không từ chối được.");
    } finally {
      setDoingReject(false);
    }
  };

  /* ===================== DRAFTS ===================== */
  const [drafts, setDrafts] = useState<PageResp<NewsData> | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [doingDraftId, setDoingDraftId] = useState<number | null>(null);

  // phân trang drafts: 0-based index cho BE
  const [draftsPageIndex, setDraftsPageIndex] = useState(0); // 0-based
  const [draftsTotalPages, setDraftsTotalPages] = useState(1);

  // Dialog Xóa nháp
  const [deleteDraftId, setDeleteDraftId] = useState<number | null>(null);
  const [deleteDraftBusy, setDeleteDraftBusy] = useState(false);

  const loadDrafts = async (pageIdxArg?: number) => {
    const pageIdx =
      typeof pageIdxArg === "number" ? pageIdxArg : draftsPageIndex;
    setDraftsLoading(true);
    try {
      const res = await draftsApi.list({
        page: pageIdx,
        size: STAFF_DRAFT_PAGE_SIZE,
      });
      const body = (res as any)?.data ?? res;
      const apiData = body?.data ?? body;
      const page: PageResp<NewsData> | null = apiData ?? null;
      setDrafts(page);
      setDraftsPageIndex(pageIdx);

      if (page) {
        const totalElements = page.totalElements ?? page.content?.length ?? 0;
        setDraftsTotalPages(
          Math.max(1, Math.ceil(totalElements / STAFF_DRAFT_PAGE_SIZE))
        );
      }
    } catch (e: any) {
      console.error("loadDrafts error:", e);
      setErrBanner(e?.message || "Không tải được danh sách nháp.");
    } finally {
      setDraftsLoading(false);
    }
  };

  const onDraftPublish = async (id: number) => {
    setDoingDraftId(id);
    try {
      const res = await draftsApi.publish(id);
      if ((res as any)?.code && (res as any).code !== 200) {
        throw new Error((res as any).message || "Publish draft failed");
      }
      setInfoBanner(`Đã publish nháp #${id}.`);
      await loadDrafts();
    } catch (e: any) {
      setErrBanner(e?.message || "Không publish được nháp.");
    } finally {
      setDoingDraftId(null);
    }
  };

  const confirmDeleteDraft = async () => {
    if (!deleteDraftId) return;
    setDeleteDraftBusy(true);
    const id = deleteDraftId;
    try {
      await draftsApi.remove(id);
      setInfoBanner(`Đã xóa nháp #${id}.`);
      await loadDrafts();
    } catch (e: any) {
      setErrBanner(e?.message || "Không xóa được nháp.");
    } finally {
      setDeleteDraftBusy(false);
      setDeleteDraftId(null);
    }
  };

  /* ===================== EFFECTS ===================== */
  useEffect(() => {
    loadClubs();
  }, []);

  // News: khi vào tab hoặc đổi page
  useEffect(() => {
    if (tab !== "news") return;
    loadNews(newsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, newsPage]);

  // News: khi đổi keyword / club -> reset về page 1
  // News: khi đổi keyword / club -> reset về page 1 + reload
  useEffect(() => {
    if (tab !== "news") return;

    if (newsPage === 1) {
      loadNews(1);
    } else {
      setNewsPage(1);
    }
  }, [newsKw, newsClubId]);

  useEffect(() => {
    if (tab !== "requests") return;
    if (reqPage === 1) {
      loadRequests(1);
    } else {
      setReqPage(1);
    }
  }, [reqKw, reqStatus]);

  useEffect(() => {
    if (tab !== "requests") return;
    loadRequests(reqPage);
  }, [tab, reqPage]);

  useEffect(() => {
    if (tab !== "drafts") return;
    loadDrafts(draftsPageIndex);
  }, [tab, draftsPageIndex]);

  useEffect(() => {
    if (!isConnected) return;
    const offAll = subscribeToSystemWide((msg) => {
      if (
        tab === "news" &&
        [
          "NEWS_PUBLISHED",
          "NEWS_UPDATED",
          "NEWS_HIDDEN",
          "NEWS_UNHIDDEN",
          "NEWS_DELETED",
          "NEWS_RESTORED",
        ].includes(msg.type)
      ) {
        loadNews();
      }
      if (tab === "requests" && msg.type === "NEWS_REQUEST") {
        loadRequests();
      }
      if (tab === "drafts" && msg.type === "NEWS_DRAFT") {
        loadDrafts();
      }
    });
    const offMe = subscribeToUserQueue((_msg) => {
      // có thể dùng cho banner chi tiết nếu cần
    });
    return () => {
      offAll?.();
      offMe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, tab]);

  /* ===================== TOOLBARS ===================== */
  const NewsToolbar = (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tiêu đề, nội dung…"
          value={newsKw}
          onChange={(e) => setNewsKw(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={String(newsClubId)}
          onValueChange={(v) => setNewsClubId(v === "ALL" ? "ALL" : Number(v))}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Chọn CLB" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả CLB</SelectItem>
            {clubs.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.clubName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const RequestsToolbar = (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tiêu đề, mô tả…"
          value={reqKw}
          onChange={(e) => setReqKw(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={reqStatus}
        onValueChange={(v) => setReqStatus(v as FilterStatus)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
          <SelectItem value="PENDING_UNIVERSITY">Chờ duyệt (Trường)</SelectItem>
          <SelectItem value="APPROVED_UNIVERSITY">Đã duyệt (Trường)</SelectItem>
          <SelectItem value="REJECTED_UNIVERSITY">Từ chối (Trường)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  /* ===================== HELPERS ===================== */
  const buildPageNumbers = (current: number, total: number) => {
    const pages: number[] = [];
    const maxButtons = 5;
    if (total <= maxButtons) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else if (current <= 3) {
      for (let i = 1; i <= maxButtons; i++) pages.push(i);
    } else if (current >= total - 2) {
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      for (let i = current - 2; i <= current + 2; i++) pages.push(i);
    }
    return pages;
  };

  const handleNewsPageChange = (page: number) => {
    if (page < 1 || page > newsTotalPages) return;
    setNewsPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReqPageChange = (page: number) => {
    if (page < 1 || page > reqTotalPages) return;
    setReqPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDraftPageChange = (page: number) => {
    if (page < 1 || page > draftsTotalPages) return;
    setDraftsPageIndex(page - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const draftsContent = drafts?.content ?? [];

  /* ===================== TABLES ===================== */
  const NewsTable = (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      {newsLoading ? (
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
                Kiểu tin
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                Cập nhật
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(4)].map((_, i) => (
              <SkeletonRow
                key={i}
                columns={[
                  { width: 56 },
                  { width: "100%" },
                  { width: 120 },
                  { width: 140 },
                  { width: 160 },
                  { width: 160 },
                ]}
              />
            ))}
          </tbody>
        </table>
      ) : news.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Chưa có tin tức.
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
                  Kiểu tin
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Cập nhật
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {news.map((n) => {
                const rowMuted = n.deleted
                  ? "opacity-60 line-through"
                  : n.hidden
                    ? "opacity-70 italic"
                    : "";
                const busy = toggleBusyId === n.id || restoreBusyId === n.id;
                return (
                  <tr
                    key={n.id}
                    className={`hover:bg-slate-50 transition-colors ${rowMuted}`}
                  >
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                        {n.thumbnailUrl ? (
                          <img
                            src={n.thumbnailUrl}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 font-medium text-slate-900">
                        {n.title || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />{" "}
                        {n.newsType || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {fmt(n.updatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {n.hidden && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                            ĐÃ ẨN
                          </span>
                        )}
                        {n.deleted && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                            ĐÃ XÓA
                          </span>
                        )}
                        {!n.hidden && !n.deleted && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            HIỆN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* View */}
                        <button
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="Xem chi tiết"
                          onClick={() => nav(`/staff/news/${n.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Sửa */}
                        <button
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="Sửa"
                          onClick={() => handleEdit(n)}
                          disabled={!!n.deleted || busy}
                        >
                          {busy ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </button>

                        {/* Ẩn/Hiện */}
                        {!n.deleted && (
                          <button
                            className={`p-2 rounded-lg hover:bg-slate-100 ${
                              n.hidden ? "text-emerald-600" : "text-slate-600"
                            }`}
                            title={n.hidden ? "Hiện lại" : "Ẩn bài"}
                            onClick={() => handleToggleHide(n)}
                            disabled={busy}
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : n.hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {/* Xóa mềm / Khôi phục */}
                        {!n.deleted ? (
                          <button
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Xóa mềm"
                            onClick={() => setSoftDeleteId(n.id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Khôi phục"
                            onClick={() => handleRestore(n)}
                            disabled={busy}
                          >
                            {busy ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {newsTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 text-sm text-slate-600">
              <span>
                Trang {newsPage} / {newsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewsPageChange(newsPage - 1)}
                  disabled={newsPage === 1}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {buildPageNumbers(newsPage, newsTotalPages).map((p) => (
                    <Button
                      key={p}
                      variant={newsPage === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleNewsPageChange(p)}
                      className="w-10 h-10"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewsPageChange(newsPage + 1)}
                  disabled={newsPage === newsTotalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const RequestsTable = (
    <>
      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        {reqLoading ? (
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
                  CLB / Ban
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
              {[...Array(5)].map((_, i) => (
                <SkeletonRow
                  key={i}
                  columns={[
                    { width: 56 },
                    { width: "100%" },
                    { width: 180 },
                    { width: 120 },
                    { width: 140 },
                    { width: 80 },
                  ]}
                />
              ))}
            </tbody>
          </table>
        ) : reqList.length === 0 ? (
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
                    CLB / Ban
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
                {reqList.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
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
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">
                        <div className="font-medium">{r.clubName || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {r.teamName || ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={reqBadge(r.status)}>
                        {reqLabel[(r.status as RequestStatus) || "CANCELED"] ||
                          r.status}
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
                          onClick={() => nav(`/staff/news/requests/${r.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {r.status === "PENDING_UNIVERSITY" && (
                          <button
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Duyệt & đăng tin tức"
                            onClick={() => setApproveId(r.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {r.status === "PENDING_UNIVERSITY" && (
                          <button
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Từ chối"
                            onClick={() => setRejectId(r.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reqTotalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 text-sm text-slate-600">
                <span>
                  Trang {reqPage} / {reqTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReqPageChange(reqPage - 1)}
                    disabled={reqPage === 1}
                  >
                    Trước
                  </Button>
                  <div className="flex items-center gap-1">
                    {buildPageNumbers(reqPage, reqTotalPages).map((p) => (
                      <Button
                        key={p}
                        variant={reqPage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleReqPageChange(p)}
                        className="w-10 h-10"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReqPageChange(reqPage + 1)}
                    disabled={reqPage === reqTotalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve dialog */}
      <Dialog
        open={approveId !== null}
        onOpenChange={(open) => !open && setApproveId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duyệt & đăng yêu cầu #{approveId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn chắc chắn muốn duyệt và đăng yêu cầu này?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setApproveId(null)}
              disabled={doingApprove}
            >
              Hủy
            </Button>
            <Button onClick={confirmApprove} disabled={doingApprove}>
              {doingApprove ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={rejectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối request #{rejectId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Lý do từ chối</label>
            <textarea
              className="w-full min-h-[100px] rounded-md border p-2 text-sm"
              placeholder="Nhập lý do…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            {!rejectReason.trim() && (
              <p className="text-xs text-rose-600">* Vui lòng nhập lý do.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectId(null);
                setRejectReason("");
              }}
              disabled={doingReject}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={doingReject || !rejectReason.trim()}
            >
              {doingReject ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const DraftsTable = (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      {draftsLoading ? (
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
                Kiểu tin
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
            {[...Array(4)].map((_, i) => (
              <SkeletonRow
                key={i}
                columns={[
                  { width: 56 },
                  { width: "100%" },
                  { width: 120 },
                  { width: 140 },
                  { width: 80 },
                ]}
              />
            ))}
          </tbody>
        </table>
      ) : draftsContent.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Chưa có bản nháp.
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
                  Kiểu tin
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
              {draftsContent.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                      {d.thumbnailUrl ? (
                        <img
                          src={d.thumbnailUrl}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="line-clamp-2 font-medium text-slate-900">
                      {d.title || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">
                      {d.newsType || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      {fmt(d.updatedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Xem chi tiết"
                        onClick={() => nav(`/staff/news/drafts/${d.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        title="Sửa nháp"
                        onClick={() =>
                          nav(`/staff/news-editor?draftId=${d.id}`, {
                            state: { draft: d } as any,
                          })
                        }
                        disabled={doingDraftId === d.id}
                      >
                        {doingDraftId === d.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        title="Publish"
                        onClick={() => onDraftPublish(d.id)}
                        disabled={doingDraftId === d.id}
                      >
                        {doingDraftId === d.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        title="Xóa nháp"
                        onClick={() => setDeleteDraftId(d.id)}
                        disabled={doingDraftId === d.id}
                      >
                        {doingDraftId === d.id ? (
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

          {draftsTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 text-sm text-slate-600">
              <span>
                Trang {draftsPageIndex + 1} / {draftsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDraftPageChange(draftsPageIndex + 1 - 1)}
                  disabled={draftsPageIndex === 0}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {buildPageNumbers(draftsPageIndex + 1, draftsTotalPages).map(
                    (p) => (
                      <Button
                        key={p}
                        variant={
                          draftsPageIndex + 1 === p ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handleDraftPageChange(p)}
                        className="w-10 h-10"
                      >
                        {p}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDraftPageChange(draftsPageIndex + 1 + 1)}
                  disabled={draftsPageIndex + 1 === draftsTotalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}

          {/* Delete draft dialog */}
          <Dialog
            open={deleteDraftId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setDeleteDraftId(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xóa bản nháp #{deleteDraftId}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-600">
                Thao tác này sẽ xóa nháp khỏi danh sách. Bạn chắc chắn?
              </p>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDraftId(null)}
                  disabled={deleteDraftBusy}
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteDraft}
                  disabled={deleteDraftBusy}
                >
                  {deleteDraftBusy ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Xóa nháp
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );

  /* ===================== RENDER ===================== */
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-6 max-w-none mx-auto">
      {/* Banners */}
      {infoBanner && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
          <Info className="h-4 w-4" /> <span>{infoBanner}</span>
        </div>
      )}
      {errBanner && (
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-2 rounded-lg border border-rose-200">
          <AlertTriangle className="h-4 w-4" /> <span>{errBanner}</span>
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">News • Staff</h1>
        <Link
          to="/staff/news-editor"
          className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          + Tạo News
        </Link>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${
              tab === "news"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white"
            }`}
            onClick={() => setTab("news")}
          >
            Tin tức
          </button>
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${
              tab === "requests"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white"
            }`}
            onClick={() => setTab("requests")}
          >
            Yêu cầu
          </button>
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${
              tab === "drafts"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white"
            }`}
            onClick={() => setTab("drafts")}
          >
            Bản nháp của bạn
          </button>
        </div>
        {tab === "news" && NewsToolbar}
        {tab === "requests" && RequestsToolbar}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">
          {tab === "news"
            ? "Danh sách News"
            : tab === "requests"
              ? "Requests từ các CLB"
              : "Bản nháp của tôi"}
        </h2>
        {tab === "news"
          ? NewsTable
          : tab === "requests"
            ? RequestsTable
            : DraftsTable}
      </section>

      {/* Soft delete News dialog */}
      <Dialog
        open={softDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setSoftDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa mềm news #{softDeleteId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bài sẽ được đánh dấu “đã xóa” và có thể khôi phục sau.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSoftDeleteId(null)}
              disabled={softDeleteBusy}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSoftDelete}
              disabled={softDeleteBusy}
            >
              {softDeleteBusy ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Xóa mềm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
