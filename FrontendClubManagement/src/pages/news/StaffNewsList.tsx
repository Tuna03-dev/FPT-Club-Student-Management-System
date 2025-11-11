// src/pages/news/StaffNewsList.tsx
"use client"

import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { getAllNewsByFilter, getAllClubs, type NewsData as PubNews, type NewsFilterRequest } from "@/service/NewsService"
import { requestsApi } from "@/api/newsRequests"
import { draftsApi } from "@/api/newsDrafts"
import type { NewsRequest, RequestStatus, NewsData, PageResp } from "@/types/news"
import { SkeletonRow } from "@/components/common/Skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  Clock,
  Filter,
  ImageOff,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Pencil,
  Trash2,
  Send,
} from "lucide-react"

// ⚠️ Nếu dự án đã có shadcn/ui Dialog thì dùng các import dưới.
// Nếu bạn chưa có, có thể thay modal bằng 1 overlay tự viết.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const fmt = (dt?: string | null) => (dt ? new Date(dt).toLocaleString("vi-VN") : "—")
const reqBadge = (s?: string) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    PENDING_CLUB: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    APPROVED_CLUB: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    REJECTED_CLUB: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    PENDING_UNIVERSITY: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    APPROVED_UNIVERSITY: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    REJECTED_UNIVERSITY: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    CANCELED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  }
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s || "CANCELED"] || "bg-slate-100"}`
}
const reqLabel: Record<RequestStatus | "CANCELED" | "DRAFT", string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ duyệt (CLB)",
  APPROVED_CLUB: "Đã duyệt (CLB)",
  REJECTED_CLUB: "Từ chối (CLB)",
  PENDING_UNIVERSITY: "Chờ duyệt (Trường)",
  APPROVED_UNIVERSITY: "Đã duyệt (Trường)",
  REJECTED_UNIVERSITY: "Từ chối (Trường)",
  CANCELED: "Đã hủy",
}
type TabKey = "news" | "requests" | "drafts"
type FilterStatus = RequestStatus | "ALL"

export default function StaffNewsList() {
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()

  const tabInUrl = (sp.get("tab") as TabKey) || "news"
  const [tab, setTab] = useState<TabKey>(tabInUrl)
  useEffect(() => {
    if (tab !== tabInUrl) {
      const next = new URLSearchParams(sp)
      next.set("tab", tab)
      setSp(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  /* ===================== NEWS ===================== */
  const [clubs, setClubs] = useState<{ id: number; clubName: string }[]>([])
  const [news, setNews] = useState<PubNews[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsKw, setNewsKw] = useState("")
  const [newsClubId, setNewsClubId] = useState<number | "ALL">("ALL")
  const [newsPage] = useState(1)
  const [newsSize] = useState(30)

  const loadClubs = async () => {
    try {
      setClubs((await getAllClubs()) || [])
    } catch {}
  }
  const loadNews = async () => {
    setNewsLoading(true)
    try {
      const payload: NewsFilterRequest = {
        keyword: newsKw || undefined,
        clubId: newsClubId === "ALL" ? undefined : (newsClubId as number),
        page: newsPage,
        size: newsSize,
      }
      const resp = await getAllNewsByFilter(payload)
      setNews(resp?.data || [])
    } catch (e: any) {
      // có thể thêm toast ở đây nếu muốn
      console.error(e?.message || "Không tải được danh sách news")
    } finally {
      setNewsLoading(false)
    }
  }

  /* ===================== REQUESTS ===================== */
  const [reqList, setReqList] = useState<NewsRequest[]>([])
  const [reqLoading, setReqLoading] = useState(false)
  const [reqKw, setReqKw] = useState("")
  const [reqStatus, setReqStatus] = useState<FilterStatus>("ALL")

  // Modal states cho duyệt / từ chối
  const [approveId, setApproveId] = useState<number | null>(null)
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [doingApprove, setDoingApprove] = useState(false)
  const [doingReject, setDoingReject] = useState(false)

  const loadRequests = async () => {
    setReqLoading(true)
    try {
      const params: Record<string, any> = { page: 1, size: 100 }
      if (reqKw.trim()) params.keyword = reqKw.trim()
      if (reqStatus !== "ALL") params.status = reqStatus as RequestStatus
      const res = await requestsApi.search(params)
      const payload = (res as any)?.data ?? res
      setReqList(Array.isArray(payload?.data) ? payload.data : [])
    } finally {
      setReqLoading(false)
    }
  }

  // Actions cho modal
  const confirmApprove = async () => {
    if (!approveId) return
    setDoingApprove(true)
    try {
      await requestsApi.staffApprovePublish(approveId, {})
      setApproveId(null)
      await loadRequests()
    } catch (e: any) {
      console.error(e?.message || "Không duyệt được.")
    } finally {
      setDoingApprove(false)
    }
  }

  const confirmReject = async () => {
    if (!rejectId) return
    if (!rejectReason.trim()) return // không cho confirm khi chưa có lý do
    setDoingReject(true)
    try {
      await requestsApi.staffReject(rejectId, { reason: rejectReason.trim() })
      setRejectId(null)
      setRejectReason("")
      await loadRequests()
    } catch (e: any) {
      console.error(e?.message || "Không từ chối được.")
    } finally {
      setDoingReject(false)
    }
  }

  /* ===================== DRAFTS ===================== */
  const [drafts, setDrafts] = useState<PageResp<NewsData> | null>(null)
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [doingDraftId, setDoingDraftId] = useState<number | null>(null)

  const loadDrafts = async () => {
    setDraftsLoading(true)
    try {
      const res = await draftsApi.list({ page: 0, size: 24 })
      const body = res as any
      const apiData = body?.data ?? body
      const page: PageResp<NewsData> | null = apiData?.data ?? apiData ?? null
      setDrafts(page)
    } finally {
      setDraftsLoading(false)
    }
  }

  const onDraftPublish = async (id: number) => {
    setDoingDraftId(id)
    try {
      const res = await draftsApi.publish(id)
      if ((res as any)?.code && (res as any).code !== 200) {
        throw new Error((res as any).message || "Publish draft failed")
      }
      await loadDrafts()
    } catch (e: any) {
      console.error(e?.message || "Không publish được nháp")
    } finally {
      setDoingDraftId(null)
    }
  }

  const onDraftDelete = async (id: number) => {
    if (!confirm(`Xóa bản nháp #${id}?`)) return
    setDoingDraftId(id)
    try {
      await draftsApi.remove(id)
      await loadDrafts()
    } catch (e: any) {
      console.error(e?.message || "Không xóa được nháp")
    } finally {
      setDoingDraftId(null)
    }
  }

  useEffect(() => {
    loadClubs()
  }, [])
  useEffect(() => {
    if (tab === "news") loadNews()
    if (tab === "requests") loadRequests()
    if (tab === "drafts") loadDrafts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])
  useEffect(() => {
    if (tab === "news") loadNews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsKw, newsClubId])
  useEffect(() => {
    if (tab === "requests") loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKw, reqStatus])

  /* ===================== TOOLBARS ===================== */
  const NewsToolbar = (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm theo tiêu đề, nội dung…" value={newsKw} onChange={(e) => setNewsKw(e.target.value)} className="pl-9" />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={String(newsClubId)} onValueChange={(v) => setNewsClubId(v === "ALL" ? "ALL" : Number(v))}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Chọn CLB" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả CLB</SelectItem>
            {clubs.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.clubName}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const RequestsToolbar = (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm theo tiêu đề, mô tả…" value={reqKw} onChange={(e) => setReqKw(e.target.value)} className="pl-9" />
      </div>
      <Select value={reqStatus} onValueChange={(v) => setReqStatus(v as FilterStatus)}>
        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
          <SelectItem value="PENDING_CLUB">Chờ duyệt (CLB)</SelectItem>
          <SelectItem value="APPROVED_CLUB">Đã duyệt (CLB)</SelectItem>
          <SelectItem value="REJECTED_CLUB">Từ chối (CLB)</SelectItem>
          <SelectItem value="PENDING_UNIVERSITY">Chờ duyệt (Trường)</SelectItem>
          <SelectItem value="APPROVED_UNIVERSITY">Đã duyệt (Trường)</SelectItem>
          <SelectItem value="REJECTED_UNIVERSITY">Từ chối (Trường)</SelectItem>
          <SelectItem value="CANCELED">Đã hủy</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  /* ===================== TABLES ===================== */
  const NewsTable = (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      {newsLoading ? (
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Kiểu tin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Cập nhật</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(4)].map((_, i) => (
              <SkeletonRow key={i} columns={[{ width: 56 }, { width: "100%" }, { width: 120 }, { width: 140 }, { width: 80 }]} />
            ))}
          </tbody>
        </table>
      ) : news.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Chưa có tin tức.</div>
      ) : (
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Kiểu tin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Cập nhật</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {news.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                    {n.thumbnailUrl ? (
                      <img src={n.thumbnailUrl} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="line-clamp-2 font-medium text-slate-900">{n.title || "—"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-700 inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {n.newsType || "—"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600 inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {fmt(n.updatedAt)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    <button
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                      title="Xem chi tiết"
                      onClick={() => nav(`/staff/news/${n.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  const RequestsTable = (
    <>
      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
        {reqLoading ? (
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">CLB / Ban</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ngày gửi</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} columns={[{ width: 56 }, { width: "100%" }, { width: 180 }, { width: 120 }, { width: 140 }, { width: 80 }]} />
              ))}
            </tbody>
          </table>
        ) : reqList.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Chưa có yêu cầu nào.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">CLB / Ban</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ngày gửi</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reqList.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                      {r.thumbnailUrl ? <img src={r.thumbnailUrl || "/placeholder.svg"} className="w-full h-full object-cover" /> : <ImageOff className="h-5 w-5 text-slate-400" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="line-clamp-2 font-medium text-slate-900">{r.requestTitle || "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-700">
                      <div className="font-medium">{r.clubName || "—"}</div>
                      <div className="text-xs text-slate-500">{r.teamName || ""}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={reqBadge(r.status)}>{reqLabel[(r.status as RequestStatus) || "CANCELED"] || r.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{r.requestDate ? new Date(r.requestDate).toLocaleString("vi-VN") : "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* Xem chi tiết */}
                      <button
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="Xem chi tiết"
                        onClick={() => nav(`/staff/news/requests/${r.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Duyệt & Publish ngay (modal confirm) */}
                      {r.status === "PENDING_UNIVERSITY" && (
                        <button
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          title="Duyệt & đăng tin tức"
                          onClick={() => setApproveId(r.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Từ chối (modal nhập lý do) */}
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
        )}
      </div>

      {/* Modal duyệt */}
      <Dialog open={approveId !== null} onOpenChange={(open) => !open && setApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duyệt & đăng yêu cầu #{approveId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Bạn chắc chắn muốn duyệt và đăng yêu cầu này?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveId(null)} disabled={doingApprove}>
              Hủy
            </Button>
            <Button onClick={confirmApprove} disabled={doingApprove}>
              {doingApprove ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal từ chối */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
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
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }} disabled={doingReject}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmReject} disabled={doingReject || !rejectReason.trim()}>
              {doingReject ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  const DraftsTable = (
    <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
      {draftsLoading ? (
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Kiểu tin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Cập nhật</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...Array(4)].map((_, i) => (
              <SkeletonRow key={i} columns={[{ width: 56 }, { width: "100%" }, { width: 120 }, { width: 140 }, { width: 80 }]} />
            ))}
          </tbody>
        </table>
      ) : (drafts?.content?.length || 0) === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Chưa có bản nháp.</div>
      ) : (
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Ảnh</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tiêu đề</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Kiểu tin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Cập nhật</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {drafts!.content!.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                    {d.thumbnailUrl ? <img src={d.thumbnailUrl} className="w-full h-full object-cover" /> : <ImageOff className="h-5 w-5 text-slate-400" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="line-clamp-2 font-medium text-slate-900">{d.title || "—"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-700">{d.newsType || "—"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">{fmt(d.updatedAt)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* View */}
                    <button
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                      title="Xem chi tiết"
                      onClick={() => nav(`/staff/news/drafts/${d.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Edit */}
                    <button
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      title="Sửa nháp"
                      onClick={() => nav(`/staff/news-editor?draftId=${d.id}`, { state: { draft: d } as any })}
                      disabled={doingDraftId === d.id}
                    >
                      {doingDraftId === d.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    </button>

                    {/* Publish */}
                    <button
                      className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      title="Publish"
                      onClick={() => onDraftPublish(d.id)}
                      disabled={doingDraftId === d.id}
                    >
                      {doingDraftId === d.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>

                    {/* Delete */}
                    <button
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      title="Xóa nháp"
                      onClick={() => onDraftDelete(d.id)}
                      disabled={doingDraftId === d.id}
                    >
                      {doingDraftId === d.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  /* ===================== RENDER ===================== */
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-6 max-w-none mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">News • Staff</h1>
        <Link to="/staff/news-editor" className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">+ Tạo News</Link>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded-lg border text-sm ${tab === "news" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"}`} onClick={() => setTab("news")}>Tin tức</button>
          <button className={`px-3 py-2 rounded-lg border text-sm ${tab === "requests" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"}`} onClick={() => setTab("requests")}>Yêu cầu</button>
          <button className={`px-3 py-2 rounded-lg border text-sm ${tab === "drafts" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"}`} onClick={() => setTab("drafts")}>Bản nháp của bạn</button>
        </div>
        {tab === "news" && NewsToolbar}
        {tab === "requests" && RequestsToolbar}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">
          {tab === "news" ? "Danh sách News" : tab === "requests" ? "Requests từ các CLB" : "Bản nháp của tôi"}
        </h2>
        {tab === "news" ? NewsTable : tab === "requests" ? RequestsTable : DraftsTable}
      </section>
    </div>
  )
}
