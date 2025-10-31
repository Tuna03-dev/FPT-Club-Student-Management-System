import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { requestsApi } from "@/api/newsRequests";
import { draftsApi } from "@/api/newsDrafts";
import type { NewsRequest, RequestStatus, NewsData, PageResp } from "@/types/news";

function fmt(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

const badge = (s?: string) => {
  const map: Record<string, string> = {
    PENDING_UNIVERSITY: "bg-amber-500",
    PENDING_CLUB: "bg-violet-600",
    APPROVED: "bg-emerald-600",
    APPROVED_UNIVERSITY: "bg-emerald-600",
    REJECTED: "bg-rose-600",
    REJECTED_CLUB: "bg-rose-600",
    REJECTED_UNIVERSITY: "bg-rose-600",
    CANCELLED: "bg-slate-500",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${
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

type TabKey = "requests" | "drafts";

export default function StaffNewsList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  // --- Tabs ---
  const tabInUrl = (sp.get("tab") as TabKey) || "requests";
  const [tab, setTab] = useState<TabKey>(tabInUrl);
  useEffect(() => {
    if (tab !== tabInUrl) {
      const next = new URLSearchParams(sp);
      next.set("tab", tab);
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // --- Requests state ---
  const [reqs, setReqs] = useState<NewsRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState<RequestStatus | "">("PENDING_UNIVERSITY");
  const [actingId, setActingId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<NewsRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // --- Drafts state ---
  const [drafts, setDrafts] = useState<PageResp<NewsData> | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const draftsCount = drafts?.content?.length ?? 0;
  const draftsTotal = drafts?.totalElements ?? draftsCount;

  // ----------- Loaders -----------
  const loadRequests = async () => {
    setLoadingReqs(true);
    try {
      const res = await requestsApi.search({
        status: (status as any) || undefined,
        keyword: kw || undefined,
        page: 1,
        size: 100,
      });
      setReqs(extractRequests(res));
    } finally {
      setLoadingReqs(false);
    }
  };

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await draftsApi.list({ page: 0, size: 20 });
      const body = res as any;
      const apiData = body?.data ?? body;
      const page: PageResp<NewsData> | null = apiData?.data ?? apiData ?? null;
      setDrafts(page);
    } finally {
      setLoadingDrafts(false);
    }
  };

  // Tải dữ liệu lần đầu theo tab hiện tại
  useEffect(() => {
    if (tab === "requests") loadRequests();
    else loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Re-load requests khi search/filter đổi
  useEffect(() => {
    if (tab === "requests") loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kw, status, tab]);

  const onEditStaffDraft = (draft: NewsData) => {
    nav(`/staff/news-editor?draftId=${draft.id}`, { state: { draft } });
  };

  // ---- ACTIONS (Staff) ----
  const approve = async (r: NewsRequest) => {
    if (!r?.id) return;
    setActingId(r.id);
    try {
      await requestsApi.staffApprovePublish(r.id);
      setReqs((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: "APPROVED_UNIVERSITY" as any } : x))
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Duyệt thất bại");
    } finally {
      setActingId(null);
    }
  };

  const openReject = (r: NewsRequest) => {
    setRejecting(r);
    setRejectNote("");
  };

  const submitReject = async () => {
    if (!rejecting?.id || !rejectNote.trim()) return;
    setActingId(rejecting.id);
    try {
      await requestsApi.staffReject(rejecting.id, { message: rejectNote.trim() });
      setReqs((prev) =>
        prev.map((x) => (x.id === rejecting.id ? { ...x, status: "REJECTED_UNIVERSITY" as any } : x))
      );
      setRejecting(null);
      setRejectNote("");
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Từ chối thất bại");
    } finally {
      setActingId(null);
    }
  };

  // -------------------- UI --------------------
  const RequestsToolbar = (
    <div className="flex flex-wrap gap-2">
      <input
        className="border rounded p-2 text-sm"
        placeholder="Từ khóa…"
        value={kw}
        onChange={(e) => setKw(e.target.value)}
      />
      <select
        className="border rounded p-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value as RequestStatus | "")}
      >
        <option value="">Tất cả</option>
        <option value="PENDING_UNIVERSITY">PENDING_UNIVERSITY</option>
        <option value="PENDING_CLUB">PENDING_CLUB</option>
        <option value="APPROVED_UNIVERSITY">APPROVED_UNIVERSITY</option>
        <option value="REJECTED_UNIVERSITY">REJECTED_UNIVERSITY</option>
        <option value="REJECTED_CLUB">REJECTED_CLUB</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
      <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={loadRequests}>
        Áp dụng
      </button>
      <button
        className="px-3 py-2 rounded border"
        onClick={() => {
          setKw("");
          setStatus("");
        }}
      >
        Đặt lại
      </button>
    </div>
  );

  const RequestsTable = (
    <>
      {loadingReqs ? (
        <div className="p-3 text-xs text-slate-500">Đang tải…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                <th>ID</th>
                <th>CLB / Creator</th>
                <th>Title / Description</th>
                <th>Response</th>
                <th>Status</th>
                <th>Request Date</th>
                <th>News ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 align-top">
              {reqs.map((r) => (
                <tr key={r.id} className="border-t">
                  <td>#{r.id}</td>
                  <td>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {r.clubLogoUrl && <img src={r.clubLogoUrl} className="h-6 w-6 rounded" />}
                        <div>
                          <div className="font-medium">{r.clubName ?? "-"}</div>
                          <div className="text-xs text-slate-500">
                            {r.clubCode ?? "-"} {r.clubId ? `• #${r.clubId}` : ""}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{r.createdByFullName ?? "-"}</div>
                        <div className="text-xs text-slate-500">
                          {r.createdByEmail ?? "-"}
                          {r.createdByStudentCode ? ` • ${r.createdByStudentCode}` : ""}
                          {r.createdByUserId ? ` • #${r.createdByUserId}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="font-medium">{r.requestTitle}</div>
                    <div className="text-xs text-slate-600 whitespace-pre-wrap mt-1">
                      {r.description ?? "-"}
                    </div>
                  </td>
                  <td className="text-xs text-slate-600 whitespace-pre-wrap">
                    {r.responseMessage ?? "-"}
                  </td>
                  <td>
                    <span className={badge(r.status)}>{r.status}</span>
                  </td>
                  <td>{fmt(r.requestDate)}</td>
                  <td>{r.newsId ?? "-"}</td>
                  <td>
                    {r.status === "PENDING_UNIVERSITY" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-2 py-1 rounded bg-emerald-600 text-white disabled:opacity-60"
                          disabled={actingId === r.id}
                          onClick={() => approve(r)}
                        >
                          {actingId === r.id ? "Đang duyệt..." : "Duyệt & Publish"}
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-rose-600 text-white disabled:opacity-60"
                          disabled={actingId === r.id}
                          onClick={() => openReject(r)}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {reqs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-500">
                    Không có request
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const DraftsTable = (
    <>
      {loadingDrafts ? (
        <div className="p-3 text-xs text-slate-500">Đang tải…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                <th>ID</th>
                <th>Title</th>
                <th>Content</th>
                <th>Thumbnail</th>
                <th>NewsType</th>
                <th>Updated At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 align-top">
              {(drafts?.content || []).map((d) => (
                <tr key={d.id} className="border-t">
                  <td>#{d.id}</td>
                  <td className="font-medium">{d.title}</td>
                  <td className="text-slate-600 max-w-[420px] truncate">{d.content}</td>
                  <td>
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
                      "-"
                    )}
                  </td>
                  <td>{d.newsType ?? "-"}</td>
                  <td>{d.updatedAt ? fmt(d.updatedAt) : "-"}</td>
                  <td>
                    <button className="px-2 py-1 rounded border" onClick={() => onEditStaffDraft(d)}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
              {(drafts?.content?.length || 0) === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-slate-500">
                    Chưa có bản nháp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header cố định */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">News • Staff</h1>
        <Link
          to="/staff/news-editor"
          className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
          + Tạo News
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${
              tab === "requests" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"
            }`}
            onClick={() => setTab("requests")}
          >
            Requests
          </button>
          <button
            className={`px-3 py-2 rounded-lg border text-sm ${
              tab === "drafts" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"
            }`}
            onClick={() => setTab("drafts")}
          >
            Drafts
          </button>
        </div>

        {tab === "requests" && RequestsToolbar}
      </div>

      <section className="border rounded-lg bg-white">
        <div className="p-3 border-b">
          <h2 className="font-semibold">
            {tab === "requests" ? "Requests từ các CLB" : "Bản nháp của tôi"}
          </h2>
        </div>
        {tab === "requests" ? RequestsTable : DraftsTable}
      </section>

      {/* Modal reject */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejecting(null)} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-2">Từ chối request #{rejecting.id}</h3>
            <p className="text-sm text-slate-600 mb-3">
              CLB: <span className="font-medium">{rejecting.clubName ?? "-"}</span>
            </p>
            <textarea
              className="w-full border rounded p-2 text-sm min-h-[100px]"
              placeholder="Lý do / ghi chú từ chối…"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={() => setRejecting(null)}>
                Hủy
              </button>
              <button
                className="px-3 py-2 rounded bg-rose-600 text-white disabled:opacity-60"
                disabled={!rejectNote.trim() || actingId === rejecting.id}
                onClick={submitReject}
              >
                {actingId === rejecting.id ? "Đang gửi…" : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
