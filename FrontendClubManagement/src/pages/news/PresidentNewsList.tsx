"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom"
import { draftsApi } from "@/api/newsDrafts"
import { requestsApi } from "@/api/newsRequests"
import type { NewsData, NewsRequest, RequestStatus, PageResp } from "@/types/news"
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  Send,
  FolderOpen,
  ImageOff,
  Eye,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
} from "lucide-react"
import { SkeletonRow } from "@/components/common/Skeleton"
import { useWebSocket } from "@/hooks/useWebSocket"

type DraftPage = { content: NewsData[]; totalElements: number; size?: number; number?: number }
type TabKey = "drafts" | "requests"
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN") : "—")
const VN_STATUS: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ duyệt (CLB)",
  APPROVED_CLUB: "Đã duyệt (CLB)",
  REJECTED_CLUB: "Từ chối (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
  REJECTED_UNIVERSITY: "Từ chối (Trường)",
  CANCELED: "Đã hủy",
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_CLUB", label: "Chờ duyệt (CLB)" },
  { value: "PENDING_UNIVERSITY", label: "Chờ duyệt (Trường)" },
  { value: "APPROVED_CLUB", label: "Đã duyệt (CLB)" },
  { value: "REJECTED_CLUB", label: "Từ chối (CLB)" },
  { value: "APPROVED_UNIVERSITY", label: "Đã duyệt (Trường)" },
  { value: "REJECTED_UNIVERSITY", label: "Từ chối (Trường)" },
  { value: "CANCELED", label: "Đã hủy" },
]

const badgeClass = (s?: string) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    PENDING_CLUB: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    PENDING_UNIVERSITY: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    APPROVED_CLUB: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    APPROVED_UNIVERSITY: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    REJECTED_CLUB: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    REJECTED_UNIVERSITY: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    CANCELED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  }
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s || "DRAFT"] || map.DRAFT}`
}

export default function PresidentNewsList() {
  return <PresidentNewsListImpl />
}

function PresidentNewsListImpl() {
  const nav = useNavigate()
  const { clubId: clubIdParam } = useParams()
  const [sp, setSp] = useSearchParams()
  const clubId = useMemo(() => {
    const n = Number(clubIdParam)
    return Number.isFinite(n) ? n : null
  }, [clubIdParam])

  const token = localStorage.getItem("accessToken")
  const { isConnected, subscribeToClub, subscribeToUserQueue } = useWebSocket(token)

  const tabInUrl = (sp.get("tab") as TabKey) || "drafts"
  const [tab, setTab] = useState<TabKey>(tabInUrl)
  useEffect(() => {
    if (tab !== tabInUrl) {
      const next = new URLSearchParams(sp)
      next.set("tab", tab)
      setSp(next, { replace: true })
    }
  }, [tab, tabInUrl, sp, setSp])

  // Banners (info / error)
  const [info, setInfo] = useState<string | null>(null)
  const [errBanner, setErrBanner] = useState<string | null>(null)

  // Drafts
  const [drafts, setDrafts] = useState<DraftPage | null>(null)
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [doingDraft, setDoingDraft] = useState<number | null>(null)

  // Requests
  const [reqs, setReqs] = useState<NewsRequest[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [doingReq, setDoingReq] = useState<number | null>(null)
  const [kw, setKw] = useState("")
  const [status, setStatus] = useState<RequestStatus | "">("")

  // Confirm / Reject modals
  const [confirmState, setConfirmState] = useState<null | { type: "submitDraft" | "deleteDraft" | "approveSubmit"; id: number }>(null)
  const [rejectState, setRejectState] = useState<null | { id: number }>(null)

  const loadDrafts = async () => {
    setLoadingDrafts(true)
    setErrBanner(null)
    try {
      const res = await draftsApi.list({ page: 0, size: 40, clubId: clubId ?? undefined })
      const body = (res as any)?.data ?? res
      const page: PageResp<NewsData> | undefined = body?.data ?? body
      setDrafts({
        content: page?.content ?? [],
        totalElements: page?.totalElements ?? page?.content?.length ?? 0,
        size: page?.size,
        number: page?.number,
      })
    } catch (e: any) {
      setErrBanner(e?.message || "Không tải được danh sách bản nháp.")
    } finally {
      setLoadingDrafts(false)
    }
  }

  const loadReqs = async () => {
    if (!clubId) {
      setReqs([])
      return
    }
    setLoadingReqs(true)
    setErrBanner(null)
    try {
      const res = await requestsApi.search({
        clubId,
        page: 1,
        size: 100,
        keyword: kw || undefined,
        status: (status as RequestStatus) || undefined,
      } as any)
      const payload = (res as any)?.data ?? res
      setReqs(Array.isArray(payload?.data) ? payload.data : [])
    } catch (e: any) {
      setErrBanner(e?.message || "Không tải được danh sách request.")
    } finally {
      setLoadingReqs(false)
    }
  }

  useEffect(() => {
    if (tab === "drafts") loadDrafts()
    else loadReqs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    if (tab === "requests") loadReqs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kw, status])

  // ===== Realtime via WebSocket =====
  useEffect(() => {
    if (!isConnected || !clubId) return

    const offClub = subscribeToClub(clubId, (msg) => {
      // payload shape linh hoạt → ép kiểu nhẹ để TS im lặng
      // const payload = (msg.payload as any) || {}
      if (msg.type === "NEWS_DRAFT") {
        // khi submit/ xóa/ cập nhật → reload draft + request
        if (["SUBMITTED", "DELETED", "UPDATED"].includes(msg.action)) {
          loadDrafts()
          loadReqs()
          if (msg.action === "SUBMITTED") setInfo("Một bản nháp vừa được submit thành request.")
          if (msg.action === "DELETED") setInfo("Một bản nháp vừa được xóa.")
          if (msg.action === "UPDATED") setInfo("Một bản nháp vừa được cập nhật.")
        }
      }
      if (msg.type === "NEWS_REQUEST") {
        if (["CREATED", "UPDATED", "APPROVED_CLUB", "REJECTED_CLUB", "PENDING_UNIVERSITY", "CANCELED"].includes(msg.action)) {
          loadReqs()
          // thông báo gọn
          const map: Record<string, string> = {
            CREATED: "Vừa có request mới.",
            UPDATED: "Request vừa được cập nhật.",
            APPROVED_CLUB: "Request đã được duyệt ở cấp CLB.",
            REJECTED_CLUB: "Request đã bị từ chối ở cấp CLB.",
            PENDING_UNIVERSITY: "Request đã gửi lên cấp Trường.",
            CANCELED: "Request đã bị hủy.",
          }
          setInfo(map[msg.action] || "Request thay đổi trạng thái.")
        }
      }
    })

    const offMe = subscribeToUserQueue((msg) => {
      // các thông báo trực tiếp tới user (nếu BE gửi theo /user/…)
      if (msg.type === "NEWS_REQUEST") {
        if (["APPROVED_CLUB", "REJECTED_CLUB"].includes(msg.action)) {
          loadReqs()
        }
      }
    })

    return () => {
      offClub?.()
      offMe?.()
    }
  }, [isConnected, clubId, subscribeToClub, subscribeToUserQueue])

  // ===== Actions (không dùng alert/confirm/prompt nữa) =====
  const onEditDraft = (d: NewsData) => {
    if (!clubId) {
      setErrBanner("Thiếu clubId trên URL.")
      return
    }
    nav(`/myclub/${clubId}/news-editor?draftId=${d.id}`, { state: { draft: d } })
  }

  const onSubmitDraft = (newsId: number) => {
    setConfirmState({ type: "submitDraft", id: newsId })
  }

  const onDeleteDraft = (newsId: number) => {
    setConfirmState({ type: "deleteDraft", id: newsId })
  }

  const onApproveSubmit = (reqId: number) => {
    setConfirmState({ type: "approveSubmit", id: reqId })
  }

  const onReject = (r: NewsRequest) => {
    setRejectState({ id: r.id })
  }

  // Xử lý confirm OK
  const handleConfirmOk = async () => {
    if (!confirmState) return
    const { type, id } = confirmState
    setConfirmState(null)
    setInfo(null)
    setErrBanner(null)

    try {
      if (type === "submitDraft") {
        setDoingDraft(id)
        await draftsApi.submit(id)
        setInfo("Đã submit bản nháp thành request.")
        await loadDrafts()
        await loadReqs()
      } else if (type === "deleteDraft") {
        setDoingDraft(id)
        await draftsApi.remove(id)
        setInfo("Đã xóa bản nháp.")
        await loadDrafts()
      } else if (type === "approveSubmit") {
        setDoingReq(id)
        await requestsApi.clubApproveAndSubmit(id)
        setInfo("Đã duyệt và gửi lên Staff.")
        await loadReqs()
        await loadDrafts()
      }
    } catch (e: any) {
      setErrBanner(e?.message || "Có lỗi khi thực hiện thao tác.")
    } finally {
      setDoingDraft(null)
      setDoingReq(null)
    }
  }

  const handleConfirmCancel = () => setConfirmState(null)

  // Xử lý reject modal
  const handleRejectOk = async (reason: string, setReasonErr: (s: string | null) => void) => {
    if (!rejectState) return
    if (!reason.trim()) {
      setReasonErr("Vui lòng nhập lý do từ chối.")
      return
    }
    setReasonErr(null)
    const id = rejectState.id
    setRejectState(null)
    setDoingReq(id)
    setInfo(null)
    setErrBanner(null)
    try {
      await requestsApi.clubPresidentReject(id, { reason: reason.trim() })
      setInfo("Đã từ chối request.")
      await loadReqs()
    } catch (e: any) {
      setErrBanner(e?.message || "Không từ chối được.")
    } finally {
      setDoingReq(null)
    }
  }

  const Header = (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
      <div className="max-w-none mx-auto flex items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-semibold text-slate-900">News • Quản lý tin tức</h1>
        </div>
        {clubId && (
          <Link
            to={`/myclub/${clubId}/news-editor`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 shadow-sm active:scale-[.99] transition-colors"
          >
            <Plus className="h-4 w-4" /> Tạo News
          </Link>
        )}
      </div>
    </header>
  )

  const Tabs = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="inline-flex p-1 rounded-xl border bg-white shadow-sm">
        <TabButton active={tab === "drafts"} onClick={() => setTab("drafts")}>
          Bản nháp
        </TabButton>
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          Requests
        </TabButton>
      </div>
      {tab === "requests" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              className="border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              placeholder="Tìm kiếm…"
              value={kw}
              onChange={(e) => setKw(e.target.value)}
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            value={status}
            onChange={(e) => setStatus(e.target.value as RequestStatus | "")}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 active:scale-[.99] transition-colors"
            onClick={loadReqs}
          >
            <RefreshCw className="h-4 w-4" /> Áp dụng
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-slate-50 transition-colors"
            onClick={() => {
              setKw("")
              setStatus("")
            }}
          >
            Đặt lại
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-6 max-w-none mx-auto">
      {Header}

      {/* Banners */}
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

      {Tabs}

      {tab === "drafts" ? (
        <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
          {loadingDrafts ? (
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">CLB</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Cập nhật lúc</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...Array(6)].map((_, i) => (
                  <SkeletonRow key={i} columns={[{ width: 56 }, { width: "100%" }, { width: 160 }, { width: 120 }, { width: 140 }, { width: 80 }]} />
                ))}
              </tbody>
            </table>
          ) : (drafts?.content ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
              <FolderOpen className="h-10 w-10" />
              <div className="text-sm">Chưa có bản nháp</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">CLB</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Cập nhật lúc</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(drafts?.content ?? []).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {d.thumbnailUrl ? (
                          <img
                            src={d.thumbnailUrl || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 font-medium text-slate-900">{d.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{d.clubName || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={badgeClass("DRAFT")}>{VN_STATUS.DRAFT}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{fmt(d.updatedAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <ActionBtn
                          icon={<Eye className="h-4 w-4" />}
                          title="Xem chi tiết"
                          onClick={() => nav(`/myclub/${clubId}/news/drafts/${d.id}`)}
                        />
                        <ActionBtn icon={<Pencil className="h-4 w-4" />} title="Sửa" onClick={() => onEditDraft(d)} />
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
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
          {loadingReqs ? (
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">CLB</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ngày gửi</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...Array(6)].map((_, i) => (
                  <SkeletonRow key={i} columns={[{ width: 56 }, { width: "100%" }, { width: 160 }, { width: 120 }, { width: 140 }, { width: 80 }]} />
                ))}
              </tbody>
            </table>
          ) : reqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
              <FolderOpen className="h-10 w-10" />
              <div className="text-sm">Không có request</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">CLB</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ngày gửi</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reqs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {r.thumbnailUrl ? (
                          <img
                            src={r.thumbnailUrl || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 font-medium text-slate-900">{r.requestTitle}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">{r.clubName || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={badgeClass(r.status)}>{VN_STATUS[r.status] || r.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{fmt(r.requestDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <ActionBtn
                          icon={<Eye className="h-4 w-4" />}
                          title="Xem chi tiết"
                          onClick={() => nav(`/myclub/${clubId}/news/requests/${r.id}`)}
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
          )}
        </div>
      )}

      {/* Confirm modal */}
      {confirmState && (
        <ConfirmModal
          onCancel={handleConfirmCancel}
          onOk={handleConfirmOk}
          title={
            confirmState.type === "submitDraft"
              ? "Submit bản nháp"
              : confirmState.type === "deleteDraft"
              ? "Xóa bản nháp"
              : "Duyệt & gửi lên Staff"
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

      {/* Reject modal */}
      {rejectState && (
        <RejectModal
          onCancel={() => setRejectState(null)}
          onOk={handleRejectOk}
          requestId={rejectState.id}
        />
      )}
    </div>
  )
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-orange-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  )
}

function ActionBtn({
  icon,
  title,
  onClick,
  loading,
  variant = "default",
}: {
  icon: React.ReactNode
  title: string
  onClick?: () => void
  loading?: boolean
  variant?: "default" | "success" | "danger"
}) {
  const baseStyles =
    "p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  const variantStyles =
    variant === "success"
      ? "text-emerald-600 hover:bg-emerald-50"
      : variant === "danger"
        ? "text-rose-600 hover:bg-rose-50"
        : "text-slate-600 hover:bg-slate-100"

  return (
    <button title={title} className={`${baseStyles} ${variantStyles}`} disabled={loading} onClick={onClick}>
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : icon}
    </button>
  )
}

/* ===== Lightweight modals (no external deps) ===== */
function ConfirmModal({
  title,
  message,
  onOk,
  onCancel,
  okText = "Xác nhận",
  cancelText = "Hủy",
  okVariant = "primary",
}: {
  title: string
  message: string
  onOk: () => void
  onCancel: () => void
  okText?: string
  cancelText?: string
  okVariant?: "primary" | "danger"
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-700">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border hover:bg-slate-50" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            onClick={onOk}
            className={`px-3 py-1.5 rounded-lg text-white ${
              okVariant === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({
  requestId,
  onOk,
  onCancel,
}: {
  requestId: number
  onOk: (reason: string, setReasonErr: (s: string | null) => void) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState("")
  const [reasonErr, setReasonErr] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
        <h3 className="text-base font-semibold text-slate-900">Từ chối request #{requestId}</h3>
        <div className="mt-3">
          <label className="text-sm font-medium text-slate-700">Lý do từ chối</label>
          <textarea
            className={`mt-1 w-full min-h-[90px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              reasonErr ? "border-rose-300 focus:ring-rose-200" : "focus:ring-indigo-200"
            }`}
            placeholder="Nhập lý do…"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (reasonErr && e.target.value.trim()) setReasonErr(null)
            }}
          />
          {reasonErr && <p className="mt-1 text-xs text-rose-600">{reasonErr}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border hover:bg-slate-50" onClick={onCancel}>
            Hủy
          </button>
          <button
            onClick={() => onOk(reason, setReasonErr)}
            className="px-3 py-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700"
          >
            Từ chối
          </button>
        </div>
      </div>
    </div>
  )
}