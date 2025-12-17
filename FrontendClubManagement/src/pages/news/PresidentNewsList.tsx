"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { draftsApi } from "@/api/newsDrafts";
import { requestsApi } from "@/api/newsRequests";
import type {
  NewsData,
  NewsRequest,
  RequestStatus,
  PageResp,
} from "@/types/news";

import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Send,
  FolderOpen,
  ImageOff,
  Eye,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
} from "lucide-react";

import { SkeletonRow } from "@/components/common/Skeleton";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ======================================================================================
   CONSTANTS
   ====================================================================================== */

const DRAFT_PAGE_SIZE = 10;
const REQUEST_PAGE_SIZE = 10;

type DraftPage = {
  content: NewsData[];
  totalElements: number;
  size?: number;
  number?: number;
};

type RequestPage = {
  content: NewsRequest[];
  totalElements: number;
  size?: number;
  number?: number;
};

type TabKey = "drafts" | "requests";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN") : "—";

const VN_STATUS: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ duyệt (CLB)",
  APPROVED_CLUB: "Đã duyệt (CLB)",
  REJECTED_CLUB: "Từ chối (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
  REJECTED_UNIVERSITY: "Từ chối (Trường)",
  CANCELED: "Đã hủy",
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_CLUB", label: "Chờ duyệt (CLB)" },
  { value: "PENDING_UNIVERSITY", label: "Chờ duyệt (Trường)" },
  { value: "REJECTED_CLUB", label: "Từ chối (CLB)" },
  { value: "APPROVED_UNIVERSITY", label: "Đã duyệt (Trường)" },
  { value: "REJECTED_UNIVERSITY", label: "Từ chối (Trường)" },
  { value: "CANCELED", label: "Đã hủy" },
];

const badgeClass = (s?: string) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    PENDING_CLUB: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    PENDING_UNIVERSITY: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    APPROVED_CLUB: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    APPROVED_UNIVERSITY:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    REJECTED_CLUB: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    REJECTED_UNIVERSITY: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    CANCELED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
    map[s || "DRAFT"] || map.DRAFT
  }`;
};

/* ======================================================================================
   MAIN COMPONENT EXPORT
   ====================================================================================== */

export default function PresidentNewsList() {
  return <PresidentNewsListImpl />;
}

/* ======================================================================================
   IMPLEMENTATION
   ====================================================================================== */

function PresidentNewsListImpl() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { clubId: clubIdParam } = useParams();

  const clubId = useMemo(() => {
    const n = Number(clubIdParam);
    return Number.isFinite(n) ? n : null;
  }, [clubIdParam]);

  const token = localStorage.getItem("accessToken");
  const { isConnected, subscribeToClub, subscribeToUserQueue } =
    useWebSocket(token);

  /* ======================================================================================
     STATES
     ====================================================================================== */

  const tabInUrl = (sp.get("tab") as TabKey) || "requests";
  const [tab, setTab] = useState<TabKey>(tabInUrl);

  const [info, setInfo] = useState<string | null>(null);
  const [errBanner, setErrBanner] = useState<string | null>(null);

  // DRAFTS
  const [drafts, setDrafts] = useState<DraftPage | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [doingDraft, setDoingDraft] = useState<number | null>(null);
  const [draftPageIndex, setDraftPageIndex] = useState(0);

  // REQUESTS
  const [reqPage, setReqPage] = useState<RequestPage | null>(null);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [doingReq, setDoingReq] = useState<number | null>(null);
  const [reqPageIndex, setReqPageIndex] = useState(0);
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState<RequestStatus | "">("PENDING_CLUB");

  const [confirmState, setConfirmState] = useState<null | {
    type: "submitDraft" | "deleteDraft" | "approveSubmit";
    id: number;
  }>(null);
  const [rejectState, setRejectState] = useState<null | { id: number }>(null);

  /* ======================================================================================
     URL TAB SYNC
     ====================================================================================== */

  useEffect(() => {
    if (tab !== tabInUrl) {
      const params = new URLSearchParams(sp);
      params.set("tab", tab);
      setSp(params, { replace: true });
    }
  }, [tab]);

  /* ======================================================================================
     LOAD FUNCTIONS
     ====================================================================================== */

  const loadDrafts = async (page?: number) => {
    const p = typeof page === "number" ? page : draftPageIndex;
    setLoadingDrafts(true);
    setErrBanner(null);

    try {
      const res = await draftsApi.list({
        page: p,
        size: DRAFT_PAGE_SIZE,
        clubId: clubId ?? undefined,
      });

      const body = (res as any)?.data ?? res;
      const pageData: PageResp<NewsData> | undefined = body?.data ?? body;

      setDrafts({
        content: pageData?.content ?? [],
        totalElements:
          pageData?.totalElements ?? pageData?.content?.length ?? 0,
        size: pageData?.size,
        number: pageData?.number,
      });

      setDraftPageIndex(p);
    } catch (e: any) {
      setErrBanner(e?.message || "Không tải được danh sách nháp.");
    } finally {
      setLoadingDrafts(false);
    }
  };

  const loadReqs = async (
    page?: number,
    override?: { kw?: string; status?: RequestStatus | "" }
  ) => {
    if (!clubId) {
      setReqPage({
        content: [],
        totalElements: 0,
        size: REQUEST_PAGE_SIZE,
        number: 0,
      });
      return;
    }

    const p = typeof page === "number" ? page : reqPageIndex;
    setLoadingReqs(true);
    setErrBanner(null);

    const curKw = override?.kw ?? kw;
    const curStatus = override?.status ?? status;

    try {
      const pageObj: any = await requestsApi.search({
        clubId,
        page: p + 1,
        size: REQUEST_PAGE_SIZE,
        keyword: curKw || undefined,
        status: (curStatus as RequestStatus) || undefined,
      });

      const content = Array.isArray(pageObj.data) ? pageObj.data : [];
      const total = pageObj.total ?? content.length;
      const number = typeof pageObj.page === "number" ? pageObj.page - 1 : p;

      setReqPage({
        content,
        totalElements: total,
        size: REQUEST_PAGE_SIZE,
        number,
      });

      setReqPageIndex(number);
    } catch (e: any) {
      setErrBanner(e?.message || "Không tải được danh sách request.");
    } finally {
      setLoadingReqs(false);
    }
  };

  /* ======================================================================================
     INIT LOAD
     ====================================================================================== */

  useEffect(() => {
    if (!clubId) return;
    tab === "drafts" ? loadDrafts() : loadReqs();
  }, [tab, clubId]);

  /* ======================================================================================
     DEBOUNCE SEARCH
     ====================================================================================== */

  useEffect(() => {
    if (!clubId || tab !== "requests") return;

    const h = setTimeout(() => {
      setReqPageIndex(0);
      loadReqs(0, { kw });
    }, 400);

    return () => clearTimeout(h);
  }, [kw, clubId, tab]);

  /* ======================================================================================
     WEBSOCKET
     ====================================================================================== */

  useEffect(() => {
    if (!isConnected || !clubId) return;

    const offClub = subscribeToClub(clubId, (msg) => {
      if (msg.type === "NEWS_DRAFT") loadDrafts();
      if (msg.type === "NEWS_REQUEST") loadReqs();
    });

    const offMe = subscribeToUserQueue(() => loadReqs());

    return () => {
      offClub?.();
      offMe?.();
    };
  }, [isConnected, clubId]);

  /* ======================================================================================
     ACTION HANDLERS
     ====================================================================================== */

  const onEditDraft = (d: NewsData) =>
    nav(`/myclub/${clubId}/news-editor?draftId=${d.id}`, {
      state: { draft: d },
    });

  const onSubmitDraft = (id: number) =>
    setConfirmState({ type: "submitDraft", id });

  const onDeleteDraft = (id: number) =>
    setConfirmState({ type: "deleteDraft", id });

  const onApproveSubmit = (id: number) =>
    setConfirmState({ type: "approveSubmit", id });

  const onReject = (req: NewsRequest) => setRejectState({ id: req.id });

  const handleConfirmOk = async () => {
    if (!confirmState) return;
    const { type, id } = confirmState;

    setConfirmState(null);
    setInfo(null);
    setErrBanner(null);

    try {
      if (type === "submitDraft") {
        setDoingDraft(id);
        await draftsApi.submit(id);
        setInfo("Đã submit bản nháp thành request.");
        await loadDrafts();
        await loadReqs();
      } else if (type === "deleteDraft") {
        setDoingDraft(id);
        await draftsApi.remove(id);
        setInfo("Đã xóa bản nháp.");
        await loadDrafts();
      } else if (type === "approveSubmit") {
        setDoingReq(id);
        await requestsApi.clubApproveAndSubmit(id);
        setInfo("Đã duyệt & gửi request lên Staff.");
        await loadReqs();
      }
    } catch (e: any) {
      setErrBanner(e.message || "Có lỗi xảy ra.");
    } finally {
      setDoingDraft(null);
      setDoingReq(null);
    }
  };

  const handleRejectOk = async (
    reason: string,
    setErr: (msg: string | null) => void
  ) => {
    if (!rejectState) return;

    if (!reason.trim()) {
      setErr("Vui lòng nhập lý do từ chối.");
      return;
    }

    const id = rejectState.id;
    setRejectState(null);
    setDoingReq(id);

    try {
      await requestsApi.clubPresidentReject(id, { reason });
      setInfo("Đã từ chối request.");
      await loadReqs();
    } catch (e: any) {
      setErrBanner(e.message || "Không thể từ chối.");
    } finally {
      setDoingReq(null);
    }
  };

  /* ======================================================================================
     UI HELPER COMPONENTS
     ====================================================================================== */

  const ActionBtn = ({
    icon,
    title,
    onClick,
    loading,
    variant = "default",
  }: {
    icon: React.ReactNode;
    title: string;
    onClick?: () => void;
    loading?: boolean;
    variant?: "default" | "success" | "danger";
  }) => {
    const base =
      "p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const theme =
      variant === "success"
        ? "text-emerald-600 hover:bg-emerald-50"
        : variant === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-600 hover:bg-slate-100";

    return (
      <button
        title={title}
        className={`${base} ${theme}`}
        disabled={loading}
        onClick={onClick}
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : icon}
      </button>
    );
  };

  const TablePagination = ({
    page,
    totalPages,
    onChange,
  }: {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    const current = page + 1;
    const pages: number[] = [];
    const max = 5;

    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (current <= 3) {
      for (let i = 1; i <= max; i++) pages.push(i);
    } else if (current >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = current - 2; i <= current + 2; i++) pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 text-sm text-slate-600">
        <span>
          Trang {current} / {totalPages}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(page - 1)}
            disabled={current === 1}
          >
            Trước
          </Button>

          <div className="flex items-center gap-1">
            {pages.map((p) => (
              <Button
                key={p}
                variant={current === p ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(p - 1)}
                className="w-10 h-10"
              >
                {p}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(page + 1)}
            disabled={current === totalPages}
          >
            Sau
          </Button>
        </div>
      </div>
    );
  };

  const ConfirmModal = ({
    title,
    message,
    onOk,
    onCancel,
    okText = "Xác nhận",
    cancelText = "Hủy",
    okVariant = "primary",
  }: {
    title: string;
    message: string;
    onOk: () => void;
    onCancel: () => void;
    okText?: string;
    cancelText?: string;
    okVariant?: "primary" | "danger";
  }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-700">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded-lg border hover:bg-slate-50"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            onClick={onOk}
            className={`px-3 py-1.5 rounded-lg text-white ${
              okVariant === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );

  const RejectModal = ({
    requestId,
    onOk,
    onCancel,
  }: {
    requestId: number;
    onOk: (reason: string, setErr: (msg: string | null) => void) => void;
    onCancel: () => void;
  }) => {
    const [reason, setReason] = useState("");
    const [err, setErr] = useState<string | null>(null);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Từ chối request #{requestId}
          </h3>
          <div className="mt-3">
            <label className="text-sm font-medium text-slate-700">
              Lý do từ chối
            </label>
            <textarea
              className={`mt-1 w-full min-h-[90px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                err
                  ? "border-rose-300 focus:ring-rose-200"
                  : "focus:ring-indigo-200"
              }`}
              placeholder="Nhập lý do…"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (err && e.target.value.trim()) setErr(null);
              }}
            />
            {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border hover:bg-slate-50"
              onClick={onCancel}
            >
              Hủy
            </button>
            <button
              onClick={() => onOk(reason, setErr)}
              className="px-3 py-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700"
            >
              Từ chối
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ======================================================================================
     PAGE RENDER
     ====================================================================================== */

  const draftsContent = drafts?.content ?? [];
  const draftPages = drafts?.totalElements
    ? Math.ceil(drafts.totalElements / DRAFT_PAGE_SIZE)
    : 1;

  const reqs = reqPage?.content ?? [];
  const reqPages = reqPage?.totalElements
    ? Math.ceil(reqPage.totalElements / REQUEST_PAGE_SIZE)
    : 1;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-6 max-w-none mx-auto">
      {/* ==================================================================================
         HEADER + TABS + TOOLBAR (GIỐNG STAFF)
         ================================================================================== */}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">TIN TỨC</h1>
        </div>
        <p className="text-muted-foreground">
          Quản lý tin tức và yêu cầu của CLB
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid w-max grid-cols-2 gap-2">
            <TabsTrigger value="requests">Yêu cầu</TabsTrigger>
            <TabsTrigger value="drafts">Bản nháp</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Toolbar theo tab */}
        {tab === "requests" && (
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <input
                placeholder="Tìm theo tiêu đề, mô tả…"
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={status}
              onChange={(e) => {
                const s = e.target.value as RequestStatus | "";
                setStatus(s);
                setReqPageIndex(0);
                loadReqs(0, { status: s });
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {clubId && (
          <Link
            to={`/myclub/${clubId}/news-editor`}
            className="px-3 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tạo tin tức
          </Link>
        )}
      </div>

      {/* ==================================================================================
         INFO & ERROR BANNER
         ================================================================================== */}

      {info && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
          <Info className="h-4 w-4" /> <span>{info}</span>
        </div>
      )}

      {errBanner && (
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-2 rounded-lg border border-rose-200">
          <AlertTriangle className="h-4 w-4" /> <span>{errBanner}</span>
        </div>
      )}

      {/* ==================================================================================
         TAB CONTENT
         ================================================================================== */}

      {tab === "drafts" ? (
        <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
          {loadingDrafts ? (
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
                    CLB
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Cập nhật lúc
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
                      { width: 120 },
                      { width: 140 },
                      { width: 80 },
                    ]}
                  />
                ))}
              </tbody>
            </table>
          ) : draftsContent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
              <FolderOpen className="h-10 w-10" />
              <div className="text-sm">Chưa có bản nháp</div>
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
                      CLB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                      Cập nhật lúc
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {draftsContent.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {d.thumbnailUrl ? (
                            <img
                              src={d.thumbnailUrl}
                              alt=""
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
                          {d.clubName || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={badgeClass("DRAFT")}>
                          {VN_STATUS.DRAFT}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {fmt(d.updatedAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <ActionBtn
                            icon={<Eye className="h-4 w-4" />}
                            title="Xem chi tiết"
                            onClick={() =>
                              nav(`/myclub/${clubId}/news/drafts/${d.id}`)
                            }
                          />

                          <ActionBtn
                            icon={<Pencil className="h-4 w-4" />}
                            title="Sửa"
                            onClick={() => onEditDraft(d)}
                          />

                          <ActionBtn
                            icon={<Send className="h-4 w-4" />}
                            title="Submit"
                            loading={doingDraft === d.id}
                            onClick={() => onSubmitDraft(d.id)}
                            variant="success"
                          />

                          <ActionBtn
                            icon={<Trash2 className="h-4 w-4" />}
                            title="Xóa"
                            loading={doingDraft === d.id}
                            onClick={() => onDeleteDraft(d.id)}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <TablePagination
                page={draftPageIndex}
                totalPages={draftPages}
                onChange={(next) => loadDrafts(next)}
              />
            </>
          )}
        </div>
      ) : (
        /* ==================================================================================
           REQUESTS TAB
           ================================================================================== */

        <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
          {loadingReqs ? (
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
                    CLB/Ban
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
                      { width: 56 },
                      { width: "100%" },
                      { width: 160 },
                      { width: 120 },
                      { width: 140 },
                      { width: 80 },
                    ]}
                  />
                ))}
              </tbody>
            </table>
          ) : reqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
              <FolderOpen className="h-10 w-10" />
              <div className="text-sm">Không có request</div>
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
                      CLB/Ban
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
                  {reqs.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {r.thumbnailUrl ? (
                            <img
                              src={r.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="line-clamp-2 font-medium text-slate-900">
                          {r.requestTitle}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900">
                            {r.clubName || "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {r.teamName || "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={badgeClass(r.status)}>
                          {VN_STATUS[r.status] || r.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {fmt(r.requestDate)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <ActionBtn
                            icon={<Eye className="h-4 w-4" />}
                            title="Xem chi tiết"
                            onClick={() =>
                              nav(`/myclub/${clubId}/news/requests/${r.id}`)
                            }
                          />

                          {r.status === "PENDING_CLUB" && (
                            <>
                              <ActionBtn
                                icon={<CheckCircle className="h-4 w-4" />}
                                title="Duyệt & Gửi"
                                loading={doingReq === r.id}
                                onClick={() => onApproveSubmit(r.id)}
                                variant="success"
                              />

                              <ActionBtn
                                icon={<XCircle className="h-4 w-4" />}
                                title="Từ chối"
                                loading={doingReq === r.id}
                                onClick={() => onReject(r)}
                                variant="danger"
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <TablePagination
                page={reqPageIndex}
                totalPages={reqPages}
                onChange={(next) => loadReqs(next)}
              />
            </>
          )}
        </div>
      )}

      {/* ==================================================================================
         MODALS
         ================================================================================== */}

      {confirmState && (
        <ConfirmModal
          onCancel={() => setConfirmState(null)}
          onOk={handleConfirmOk}
          title={
            confirmState.type === "submitDraft"
              ? "Submit bản nháp"
              : confirmState.type === "deleteDraft"
                ? "Xóa bản nháp"
                : "Duyệt & gửi request lên Staff"
          }
          message={
            confirmState.type === "submitDraft"
              ? `Bạn có chắc muốn submit bản nháp #${confirmState.id} thành request?`
              : confirmState.type === "deleteDraft"
                ? `Bạn có chắc muốn xóa bản nháp #${confirmState.id}?`
                : `Bạn có chắc duyệt & gửi request #${confirmState.id} lên Staff?`
          }
          okText={confirmState.type === "deleteDraft" ? "Xóa" : "Xác nhận"}
          okVariant={confirmState.type === "deleteDraft" ? "danger" : "primary"}
        />
      )}

      {rejectState && (
        <RejectModal
          requestId={rejectState.id}
          onCancel={() => setRejectState(null)}
          onOk={handleRejectOk}
        />
      )}
    </div>
  );
}
