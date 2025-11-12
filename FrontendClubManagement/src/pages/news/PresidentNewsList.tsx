import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { draftsApi } from "@/api/newsDrafts";
import { requestsApi } from "@/api/newsRequests";
import { clubApproveAndSubmit, clubPresidentReject } from "@/api/newsWorkflow";
import type { NewsData, NewsRequest, RequestStatus, PageResp } from "@/types/news";
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Send,
  FolderOpen,
} from "lucide-react";

// ----------------- utils -----------------
type DraftPage = { content: NewsData[]; totalElements: number; size?: number; number?: number };

export default function PresidentNewsList() {
  return <PresidentNewsListImpl />;
}

function fmt(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt! : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

const VN_STATUS: Record<string, string> = {
  PENDING_CLUB: "Chờ duyệt (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED: "Đã duyệt",
  APPROVED_CLUB: "CLB đã duyệt",
  APPROVED_UNIVERSITY: "Trường đã duyệt",
  REJECTED: "Từ chối",
  REJECTED_CLUB: "CLB từ chối",
  REJECTED_UNIVERSITY: "Trường từ chối",
  CANCELLED: "Đã hủy",
};

const badge = (s?: string) => {
  const map: Record<string, string> = {
    PENDING_CLUB: "bg-amber-500",
    PENDING_UNIVERSITY: "bg-amber-500",
    APPROVED: "bg-emerald-600",
    APPROVED_CLUB: "bg-emerald-600",
    APPROVED_UNIVERSITY: "bg-emerald-600",
    REJECTED: "bg-rose-600",
    REJECTED_CLUB: "bg-rose-600",
    REJECTED_UNIVERSITY: "bg-rose-600",
    CANCELLED: "bg-slate-500",
  };
  return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${
    map[s || "CANCELLED"] || "bg-slate-500"
  }`;
};

function extractRequests(res: any): NewsRequest[] {
  const level1 = res?.data ?? res?.Data ?? res?.result ?? res;
  if (Array.isArray(level1)) return level1 as NewsRequest[];
  if (Array.isArray(level1?.data)) return level1.data as NewsRequest[];
  const level2 = level1?.data ?? level1?.result;
  if (Array.isArray(level2)) return level2 as NewsRequest[];
  if (Array.isArray(level2?.data)) return level2.data as NewsRequest[];
  return [];
}

type TabKey = "drafts" | "requests";

function PresidentNewsListImpl() {
  const nav = useNavigate();
  const { clubId: clubIdParam } = useParams();
  const [sp, setSp] = useSearchParams();

  const clubId = useMemo(() => {
    const n = Number(clubIdParam);
    return Number.isFinite(n) ? n : null;
  }, [clubIdParam]);

  const tabInUrl = (sp.get("tab") as TabKey) || "drafts";
  const [tab, setTab] = useState<TabKey>(tabInUrl);

  useEffect(() => {
    if (tab !== tabInUrl) {
      const next = new URLSearchParams(sp);
      next.set("tab", tab);
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // --------- drafts ---------
  const [drafts, setDrafts] = useState<DraftPage | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [doingDraft, setDoingDraft] = useState<number | null>(null);

  // --------- requests ---------
  const [reqs, setReqs] = useState<NewsRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [doingReq, setDoingReq] = useState<number | null>(null);
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState<RequestStatus | "">("");

  // --------- reject modal state ---------
  const [rejecting, setRejecting] = useState<NewsRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // data loaders
  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await draftsApi.list({ page: 0, size: 20, clubId: clubId ?? undefined });
      const body = res as any;
      const apiData = body?.data ?? body;
      const page: PageResp<NewsData> | undefined = apiData?.data ?? apiData;
      setDrafts({
        content: page?.content ?? [],
        totalElements: page?.totalElements ?? (page?.content?.length ?? 0),
        size: page?.size,
        number: page?.number,
      });
    } finally {
      setLoadingDrafts(false);
    }
  };

  const loadReqs = async () => {
    if (!clubId) return setReqs([]);
    setLoadingReqs(true);
    try {
      const res = await requestsApi.search({
        clubId,
        page: 1,
        size: 100,
        keyword: kw || undefined,
        status: (status as RequestStatus) || undefined,
      } as any);
      setReqs(extractRequests(res));
    } finally {
      setLoadingReqs(false);
    }
  };

  useEffect(() => {
    if (tab === "drafts") loadDrafts();
    else loadReqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "requests") loadReqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kw, status]);

  // --------- actions (drafts) ---------
  const onEditDraft = (draft: NewsData) => {
    if (!clubId) return;
    nav(`/myclub/${clubId}/news-editor?draftId=${draft.id}`, { state: { draft } });
  };

  const onSubmitDraft = async (newsId: number) => {
    if (!clubId) return alert("Thiếu clubId trên URL.");
    if (!confirm(`Submit bản nháp #${newsId} thành request?`)) return;
    setDoingDraft(newsId);
    try {
      await draftsApi.submit(newsId);
      await loadDrafts();
      await loadReqs();
    } catch (e: any) {
      alert(e?.message || "Không submit được nháp");
    } finally {
      setDoingDraft(null);
    }
  };

  const onDeleteDraft = async (newsId: number) => {
    if (!confirm(`Xóa bản nháp #${newsId}?`)) return;
    setDoingDraft(newsId);
    try {
      await draftsApi.remove(newsId);
      await loadDrafts();
    } catch (e: any) {
      alert(e?.message || "Không xóa được nháp");
    } finally {
      setDoingDraft(null);
    }
  };

  // --------- actions (requests) ---------
  const onApproveSubmit = async (reqId: number) => {
    if (!confirm(`Duyệt và gửi lên Staff request #${reqId}?`)) return;
    setDoingReq(reqId);
    try {
      await clubApproveAndSubmit(reqId);
      await loadReqs();
      await loadDrafts();
    } catch (e: any) {
      alert(e?.message || "Không duyệt được");
    } finally {
      setDoingReq(null);
    }
  };

  // MỞ MODAL thay vì prompt()
  const onReject = (req: NewsRequest) => {
    setRejecting(req);
    setRejectReason("");
  };

  // XÁC NHẬN TỪ CHỐI từ modal
  const confirmReject = async () => {
    if (!rejecting || !rejectReason.trim()) return;
    setDoingReq(rejecting.id);
    try {
      await clubPresidentReject(rejecting.id, { reason: rejectReason.trim() });
      await loadReqs();
      setRejecting(null);
    } catch (e: any) {
      alert(e?.message || "Không từ chối được");
    } finally {
      setDoingReq(null);
    }
  };

  // ==================== UI ====================
  const RequestsToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <input
          className="border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="Từ khóa…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>
      <select
        className="border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        value={status}
        onChange={(e) => setStatus(e.target.value as RequestStatus | "")}
      >
        <option value="">Tất cả</option>
        <option value="PENDING_CLUB">PENDING_CLUB</option>
        <option value="PENDING_UNIVERSITY">PENDING_UNIVERSITY</option>
        <option value="APPROVED_CLUB">APPROVED_CLUB</option>
        <option value="REJECTED_CLUB">REJECTED_CLUB</option>
      </select>
      <button
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[.99]"
        onClick={loadReqs}
      >
        <RefreshCw className="h-4 w-4" /> Áp dụng
      </button>
      <button
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50"
        onClick={() => {
          setKw("");
          setStatus("");
        }}
      >
        Đặt lại
      </button>
    </div>
  );

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-semibold">News • Chủ nhiệm CLB</h1>
          </div>
          {clubId && (
            <Link
              to={`/myclub/${clubId}/news-editor`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[.99]"
            >
              <Plus className="h-4 w-4" /> Tạo News
            </Link>
          )}
        </div>
      </header>

      {/* Tabs + toolbar */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 rounded-xl border bg-white shadow-sm">
          <TabButton active={tab === "drafts"} onClick={() => setTab("drafts")}>
            Bản nháp
          </TabButton>
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
            Request từ trưởng ban
          </TabButton>
        </div>
        {tab === "requests" && RequestsToolbar}
      </div>

      {/* Card container */}
      <section className="border rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">
            {tab === "drafts" ? "Bản nháp của tôi" : "Requests từ cấp trưởng ban"}
          </h2>
          {tab === "drafts" && (
            <span className="text-xs text-slate-500">
              Tổng: {drafts?.totalElements ?? drafts?.content?.length ?? 0}
            </span>
          )}
        </div>

        {tab === "drafts" ? (
          <TableWrap minW="900px">
            <thead className="bg-slate-50/60">
              <TrHead>
                <th>ID</th>
                <th>Tiêu đề</th>
                <th>Nội dung</th>
                <th>Ảnh</th>
                <th>Loại</th>
                <th>Cập nhật</th>
                <th className="text-right">Thao tác</th>
              </TrHead>
            </thead>
            <tbody>
              {loadingDrafts && <SkeletonRows cols={7} rows={4} />}
              {!loadingDrafts &&
                (drafts?.content ?? []).map((d) => (
                  <tr key={d.id} className="border-t hover:bg-slate-50/60 transition-colors">
                    <Td>#{d.id}</Td>
                    <Td className="font-medium">{d.title}</Td>
                    <Td>
                      <div className="line-clamp-2 max-w-[520px] text-slate-600">{d.content}</div>
                    </Td>
                    <Td>
                      {d.thumbnailUrl ? (
                        <a
                          href={d.thumbnailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-indigo-600"
                        >
                          link
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>{d.newsType ?? <span className="text-slate-400">—</span>}</Td>
                    <Td>{fmt(d.updatedAt)}</Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button ghost onClick={() => onEditDraft(d)}>Sửa</Button>
                        <Button intent="primary" loading={doingDraft === d.id} onClick={() => onSubmitDraft(d.id)}>
                          <Send className="h-4 w-4" /> Submit
                        </Button>
                        <Button intent="danger" loading={doingDraft === d.id} onClick={() => onDeleteDraft(d.id)}>
                          <XCircle className="h-4 w-4" /> Xóa
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              {!loadingDrafts && (drafts?.content?.length ?? 0) === 0 && (
                <EmptyRow cols={7} label="Chưa có bản nháp" />
              )}
            </tbody>
          </TableWrap>
        ) : (
          <TableWrap minW="1040px">
            <thead className="bg-slate-50/60">
              <TrHead>
                <th>ID</th>
                <th>Người tạo</th>
                <th>Nội dung</th>
                <th>Phản hồi</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
                <th className="text-right">Thao tác</th>
              </TrHead>
            </thead>
            <tbody>
              {loadingReqs && <SkeletonRows cols={7} rows={5} />}
              {!loadingReqs &&
                reqs.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50/60 transition-colors">
                    <Td>#{r.id}</Td>
                    <Td>
                      <div className="font-medium">{r.createdByFullName ?? "-"}</div>
                      <div className="text-xs text-slate-500">{r.createdByEmail ?? "-"}</div>
                    </Td>
                    <Td>
                      <div className="font-medium line-clamp-1" title={r.requestTitle}>
                        {r.requestTitle}
                      </div>
                      <div
                        className="text-xs text-slate-600 line-clamp-2 max-w-[520px]"
                        title={r.description ?? ""}
                      >
                        {r.description ?? "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-slate-600 line-clamp-2 max-w-[300px]">
                        {r.responseMessage ?? <span className="text-slate-400">—</span>}
                      </div>
                    </Td>
                    <Td>
                      <span className={badge(r.status)}>
                        <span className="hidden sm:inline">{VN_STATUS[r.status || ""] ?? r.status}</span>
                        <span className="sm:hidden">{r.status}</span>
                      </span>
                    </Td>
                    <Td>{fmt(r.requestDate)}</Td>
                    <Td className="text-right">
                      {r.status === "PENDING_CLUB" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button intent="primary" loading={doingReq === r.id} onClick={() => onApproveSubmit(r.id)}>
                            <CheckCircle className="h-4 w-4" /> Approve & Submit
                          </Button>
                          <Button intent="danger" loading={doingReq === r.id} onClick={() => onReject(r)}>
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Không có action</span>
                      )}
                    </Td>
                  </tr>
                ))}
              {!loadingReqs && reqs.length === 0 && <EmptyRow cols={7} label="Không có request" />}
            </tbody>
          </TableWrap>
        )}
      </section>

      {/* ====== Reject Modal ====== */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-rose-600">
              Từ chối request #{rejecting.id}
            </h3>
            <p className="text-sm text-slate-600">
              Vui lòng nhập lý do từ chối bài: <b>{rejecting.requestTitle}</b>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-400"
              placeholder="Nhập lý do..."
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRejecting(null)} ghost>
                Hủy
              </Button>
              <Button
                intent="danger"
                loading={doingReq === rejecting.id}
                onClick={confirmReject}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------- small UI primitives -----------------
function TableWrap({ children, minW }: { children: React.ReactNode; minW: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[${minW}] text-sm`}>{children}</table>
    </div>
  );
}

function TrHead({ children }: { children: React.ReactNode }) {
  return (
    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold text-slate-700">
      {children}
    </tr>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-3 py-2">
              <div className="h-4 w-full max-w-[220px] animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="p-10">
        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
          <FolderOpen className="h-10 w-10" />
          <div className="text-sm">{label}</div>
        </div>
      </td>
    </tr>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Button({
  children,
  onClick,
  intent = "default",
  loading,
  ghost,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  intent?: "default" | "primary" | "danger";
  loading?: boolean;
  ghost?: boolean;
}) {
  const base = "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm active:scale-[.99]";
  const styles = ghost
    ? "border hover:bg-slate-50"
    : intent === "primary"
    ? "bg-emerald-600 text-white hover:bg-emerald-700"
    : intent === "danger"
    ? "bg-rose-600 text-white hover:bg-rose-700"
    : "border hover:bg-slate-50";
  return (
    <button className={`${base} ${styles} disabled:opacity-50`} disabled={loading} onClick={onClick}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Đang xử lý…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
